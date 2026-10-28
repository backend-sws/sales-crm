<?php

namespace App\Services;

use App\Contracts\Services\PresignedStorageServiceInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PresignedStorageService implements PresignedStorageServiceInterface
{
    /**
     * Generate presigned upload metadata.
     */
    public function generatePresignedUpload(string $fileName, string $fileType, int $fileSizeBytes, string $folder = 'chat_attachments'): array
    {
        $extension = pathinfo($fileName, PATHINFO_EXTENSION) ?: 'bin';
        $safeName = Str::slug(pathinfo($fileName, PATHINFO_FILENAME));
        $uniqueId = (string) Str::uuid();
        $relativePath = "{$folder}/" . date('Y/m') . "/{$uniqueId}_{$safeName}.{$extension}";

        $diskName = config('filesystems.default', 'public');
        $disk = Storage::disk($diskName);

        // Check if disk supports AWS S3 temporary presigned URLs
        if (config("filesystems.disks.{$diskName}.driver") === 's3' && method_exists($disk, 'temporaryUploadUrl')) {
            $expiry = now()->addMinutes(15);
            $uploadUrl = $disk->temporaryUploadUrl($relativePath, $expiry, [
                'ContentType' => $fileType,
            ]);
            $publicUrl = $disk->url($relativePath);

            return [
                'mode'            => 's3_presigned',
                'storage_path'    => $relativePath,
                'upload_url'      => $uploadUrl,
                'public_url'      => $publicUrl,
                'method'          => 'PUT',
                'headers'         => ['Content-Type' => $fileType],
                'expires_at'      => $expiry->toISOString(),
                'file_name'       => $fileName,
                'file_type'       => $fileType,
                'file_size_bytes' => $fileSizeBytes,
            ];
        }

        // Default / Local / Public disk: provide signed direct upload endpoint
        $uploadUrl = url("/api/v1/storage/upload-direct");
        $publicUrl = url("storage/{$relativePath}");

        return [
            'mode'            => 'direct_upload',
            'storage_path'    => $relativePath,
            'upload_url'      => $uploadUrl,
            'public_url'      => $publicUrl,
            'method'          => 'POST',
            'headers'         => [],
            'expires_at'      => now()->addMinutes(30)->toISOString(),
            'file_name'       => $fileName,
            'file_type'       => $fileType,
            'file_size_bytes' => $fileSizeBytes,
        ];
    }

    /**
     * Store directly uploaded file into public disk.
     */
    public function storeDirectUpload(UploadedFile $file, string $folder = 'chat_attachments'): array
    {
        $fileName = $file->getClientOriginalName();
        $fileType = $file->getClientMimeType() ?: $file->getMimeType();
        $fileSize = $file->getSize();

        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $safeName = Str::slug(pathinfo($fileName, PATHINFO_FILENAME));
        $uniqueId = (string) Str::uuid();
        $storedName = "{$uniqueId}_{$safeName}.{$extension}";
        $folderPath = "{$folder}/" . date('Y/m');

        $path = $file->storeAs($folderPath, $storedName, 'public');
        $publicUrl = url("storage/{$path}");

        return [
            'file_name'       => $fileName,
            'file_type'       => $fileType,
            'file_size_bytes' => $fileSize,
            'storage_path'    => $path,
            'public_url'      => $publicUrl,
        ];
    }
}
