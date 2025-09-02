import { put } from '@vercel/blob';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return response.status(400).json({ error: 'Filename is required' });
    }
    
    // Get the blob data from the request body
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: false,
    });
    
    return response.status(200).json(blob);
  } catch (error) {
    console.error('Upload error:', error);
    return response.status(500).json({ error: 'Upload failed', details: error.message });
  }
}
