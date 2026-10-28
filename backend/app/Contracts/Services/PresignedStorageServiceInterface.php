<?php

namespace App\Contracts\Services;

interface PresignedStorageServiceInterface
{
    /**
     * Generate a presigned upload payload for images, documents, or files.
     *
     * @param string $fileName
     * @param string $fileType
     * @param int $fileSizeBytes
     * @param string $folder
     * @return array
     */
    public function generatePresignedUpload(string $fileName, string $fileType, int $fileSizeBytes, string $folder = 'chat_attachments'): array;

    /**
     * Store directly uploaded file to target storage path (fallback / local driver).
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $folder
     * @return array
     */
    public function storeDirectUpload(\Illuminate\Http\UploadedFile $file, string $folder = 'chat_attachments'): array;
}
