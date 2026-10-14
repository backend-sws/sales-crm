<?php

namespace App\Services;

use App\Contracts\Services\ESignServiceInterface;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\ClientDocument;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ESignService implements ESignServiceInterface
{
    /**
     * Upload / create a new document for client signature.
     */
    public function createDocument(int $clientId, array $data, User $uploader): ClientDocument
    {
        $client = Client::findOrFail($clientId);

        $document = ClientDocument::create([
            'client_id'          => $client->id,
            'type'               => $data['type'] ?? 'contract',
            'title'              => $data['title'],
            'file_url'           => $data['file_url'],
            'status'             => 'pending_signature',
            'uploaded_by'        => $uploader->id,
        ]);

        ActivityLog::create([
            'log_name'     => 'documents',
            'description'  => "Prepared document '{$document->title}' (#{$document->id}) for e-signature by {$client->name}",
            'subject_type' => ClientDocument::class,
            'subject_id'   => $document->id,
            'causer_type'  => User::class,
            'causer_id'    => $uploader->id,
            'created_at'   => now(),
        ]);

        return $document->load(['client', 'uploader']);
    }

    /**
     * Submit legal e-signature on a document.
     */
    public function signDocument(int $documentId, array $signatureData, string $ip): ClientDocument
    {
        $document = ClientDocument::findOrFail($documentId);

        $document->update([
            'signer_name'        => $signatureData['signer_name'] ?? 'Authorized Signer',
            'signature_data_url' => $signatureData['signature_data_url'] ?? null,
            'signed_at'          => now(),
            'signer_ip'          => $ip,
            'status'             => 'signed',
            'signed_file_url'    => $document->file_url, // In production, compiled with stamp watermark
        ]);

        ActivityLog::create([
            'log_name'     => 'documents',
            'description'  => "E-signed document #{$document->id} ('{$document->title}') by {$document->signer_name} (IP: {$ip})",
            'subject_type' => ClientDocument::class,
            'subject_id'   => $document->id,
            'causer_type'  => User::class,
            'causer_id'    => auth()->id(),
            'properties'   => [
                'signer_ip'   => $ip,
                'signer_name' => $document->signer_name,
                'signed_at'   => now()->toIso8601String(),
            ],
            'created_at'   => now(),
        ]);

        return $document->fresh(['client', 'uploader']);
    }

    /**
     * Get documents for a client.
     */
    public function getDocuments(int $clientId): Collection
    {
        return ClientDocument::where('client_id', $clientId)
            ->with('uploader:id,name,email')
            ->latest()
            ->get();
    }
}
