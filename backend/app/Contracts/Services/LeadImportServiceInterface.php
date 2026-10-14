<?php

namespace App\Contracts\Services;

use App\Models\LeadImport;
use App\Models\User;
use Illuminate\Http\UploadedFile;

interface LeadImportServiceInterface
{
    /**
     * Parse and preview uploaded CSV or Excel file, returning sample rows and detected headers.
     */
    public function previewFile(UploadedFile $file): array;

    /**
     * Process mapped rows into leads, handling deduplication strategies and auto-assignment.
     */
    public function processImport(
        array $rows,
        array $columnMapping,
        string $duplicateStrategy = 'skip', // 'skip', 'update', 'add'
        ?int $assignedAgentId = null,
        ?User $actor = null
    ): LeadImport;
}
