import api from './api';

/**
 * Uploads a file directly to Cloudflare R2 using a secure presigned URL.
 * 
 * @param file The file object to upload
 * @param folder The destination folder in the R2 bucket
 * @returns Object containing the path to save in DB and the public_url to display
 */
export const uploadToR2 = async (file: File, folder: string = 'uploads') => {
  // 1. Get the file extension
  const extension = file.name.split('.').pop() || 'png';
  
  // 2. Request a Presigned URL from Laravel Backend
  const response = await api.post('/upload/presigned-url', {
    extension,
    folder,
  });
  
  const { upload_url, path, public_url } = response.data.data;

  // 3. Upload file directly to Cloudflare R2 using the presigned URL
  // We use standard fetch here because we don't want Axios interceptors (like auth headers) to interfere with AWS S3 signature
  const uploadResponse = await fetch(upload_url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to Cloudflare R2');
  }

  // 4. Return the path (to save in database) and public_url (to preview)
  return { path, public_url };
};
