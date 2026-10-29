<?php

namespace App\Contracts\Services;

use App\Models\ClientDocument;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface ESignServiceInterface
{
    /**
     * Upload / create a new document for client signature.
     */
    public function createDocument(int $clientId, array $data, User $uploader): ClientDocument;

    /**
     * Submit legal e-signature on a document.
     */
    public function signDocument(int $documentId, array $signatureData, string $ip): ClientDocument;

    /**
     * Get documents for a client.
     */
    public function getDocuments(int $clientId): Collection;

    /**
     * Update pending document details or file.
     */
    public function updateDocument(int $documentId, array $data, User $updater): ClientDocument;

    /**
     * Delete a pending document.
     */
    public function deleteDocument(int $documentId): bool;
}
