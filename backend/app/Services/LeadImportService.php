<?php

namespace App\Services;

use App\Contracts\Services\LeadImportServiceInterface;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadImport;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class LeadImportService implements LeadImportServiceInterface
{
    /**
     * Parse and preview uploaded CSV file, returning sample rows and detected headers.
     */
    public function previewFile(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        $rows = [];
        $headers = [];

        if (($handle = fopen($path, 'r')) !== false) {
            $rowIndex = 0;
            while (($data = fgetcsv($handle, 2048, ',')) !== false && $rowIndex < 15) {
                // Remove BOM if present on first header
                if ($rowIndex === 0) {
                    $data[0] = preg_replace('/^\xEF\xBB\xBF/', '', $data[0] ?? '');
                    $headers = array_map('trim', $data);
                } else {
                    $rowAssoc = [];
                    foreach ($headers as $colIdx => $colName) {
                        $rowAssoc[$colName] = $data[$colIdx] ?? '';
                    }
                    $rows[] = $rowAssoc;
                }
                $rowIndex++;
            }
            fclose($handle);
        }

        // Auto-suggest column mappings
        $suggestedMapping = [];
        foreach ($headers as $header) {
            $hLower = strtolower(trim($header));
            if (in_array($hLower, ['name', 'full name', 'contact person', 'lead name'])) {
                $suggestedMapping['name'] = $header;
            } elseif (in_array($hLower, ['phone', 'mobile', 'contact', 'telephone', 'phone number'])) {
                $suggestedMapping['phone'] = $header;
            } elseif (in_array($hLower, ['email', 'email address', 'mail'])) {
                $suggestedMapping['email'] = $header;
            } elseif (in_array($hLower, ['company', 'organization', 'business name', 'company name'])) {
                $suggestedMapping['company'] = $header;
            } elseif (in_array($hLower, ['city', 'location', 'town'])) {
                $suggestedMapping['city'] = $header;
            } elseif (in_array($hLower, ['budget', 'deal value', 'value', 'amount'])) {
                $suggestedMapping['budget'] = $header;
            } elseif (in_array($hLower, ['source', 'channel', 'lead source'])) {
                $suggestedMapping['source'] = $header;
            } elseif (in_array($hLower, ['priority', 'lead stage'])) {
                $suggestedMapping['priority'] = $header;
            }
        }

        return [
            'filename'          => $file->getClientOriginalName(),
            'headers'           => $headers,
            'suggested_mapping' => $suggestedMapping,
            'sample_rows'       => $rows,
            'sample_count'      => count($rows),
        ];
    }

    /**
     * Process mapped rows into leads, handling deduplication strategies and auto-assignment.
     */
    public function processImport(
        array $rows,
        array $columnMapping,
        string $duplicateStrategy = 'skip',
        ?int $assignedAgentId = null,
        ?User $actor = null
    ): LeadImport {
        $importRecord = LeadImport::create([
            'user_id'         => $actor?->id,
            'filename'        => 'web_import_batch_' . now()->format('Ymd_His') . '.csv',
            'total_rows'      => count($rows),
            'processed_rows'  => 0,
            'imported_count'  => 0,
            'duplicate_count' => 0,
            'error_count'     => 0,
            'status'          => 'processing',
            'error_log'       => [],
        ]);

        $imported = 0;
        $duplicates = 0;
        $errors = [];

        DB::transaction(function () use (
            $rows,
            $columnMapping,
            $duplicateStrategy,
            $assignedAgentId,
            $actor,
            $importRecord,
            &$imported,
            &$duplicates,
            &$errors
        ) {
            foreach ($rows as $index => $row) {
                try {
                    $name    = trim($row[$columnMapping['name'] ?? ''] ?? '');
                    $phone   = trim($row[$columnMapping['phone'] ?? ''] ?? '');
                    $email   = trim($row[$columnMapping['email'] ?? ''] ?? '');
                    $company = trim($row[$columnMapping['company'] ?? ''] ?? '');
                    $city    = trim($row[$columnMapping['city'] ?? ''] ?? '');
                    $budget  = floatval($row[$columnMapping['budget'] ?? ''] ?? 0);
                    $source  = trim($row[$columnMapping['source'] ?? ''] ?? 'Import Wizard');
                    $priority = strtolower(trim($row[$columnMapping['priority'] ?? ''] ?? 'warm'));

                    if (! in_array($priority, ['hot', 'warm', 'cold'])) {
                        $priority = 'warm';
                    }

                    if (empty($name) && empty($company) && empty($phone)) {
                        $errors[] = ['row' => $index + 1, 'error' => 'Row missing both name, company and phone.'];
                        continue;
                    }

                    if (empty($name)) {
                        $name = $company ?: 'Unknown Contact';
                    }

                    // Check for existing lead by email or phone
                    $existingLead = null;
                    if (! empty($email)) {
                        $existingLead = Lead::where('email', $email)->first();
                    }
                    if (! $existingLead && ! empty($phone)) {
                        $existingLead = Lead::where('phone', $phone)->first();
                    }

                    if ($existingLead) {
                        $duplicates++;
                        if ($duplicateStrategy === 'skip') {
                            continue;
                        } elseif ($duplicateStrategy === 'update') {
                            $existingLead->update(array_filter([
                                'name'        => $name,
                                'company'     => $company,
                                'city'        => $city,
                                'budget'      => $budget ?: $existingLead->budget,
                                'value'       => $budget ?: $existingLead->value,
                                'assigned_to' => $assignedAgentId ?: $existingLead->assigned_to,
                            ]));
                            continue;
                        }
                    }

                    // Create new Lead
                    $lead = Lead::create([
                        'name'             => $name,
                        'phone'            => $phone ?: null,
                        'email'            => $email ?: null,
                        'company'          => $company ?: null,
                        'city'             => $city ?: null,
                        'budget'           => $budget,
                        'value'            => $budget,
                        'source'           => $source,
                        'priority'         => $priority,
                        'status'           => 'new',
                        'score'            => 25,
                        'assigned_to'      => $assignedAgentId,
                        'created_by'       => $actor?->id,
                        'import_id'        => $importRecord->id,
                        'last_activity_at' => now(),
                    ]);

                    LeadActivity::create([
                        'lead_id'    => $lead->id,
                        'user_id'    => $actor?->id,
                        'type'       => 'imported',
                        'payload'    => [
                            'batch_id' => $importRecord->id,
                            'strategy' => $duplicateStrategy,
                        ],
                        'created_at' => now(),
                    ]);

                    $imported++;
                } catch (\Throwable $e) {
                    $errors[] = ['row' => $index + 1, 'error' => $e->getMessage()];
                }
            }
        });

        $importRecord->update([
            'processed_rows'  => count($rows),
            'imported_count'  => $imported,
            'duplicate_count' => $duplicates,
            'error_count'     => count($errors),
            'status'          => 'completed',
            'error_log'       => $errors,
        ]);

        return $importRecord->fresh();
    }
}
