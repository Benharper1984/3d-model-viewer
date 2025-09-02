import { del } from '@vercel/blob';

export default async function handler(request, response) {
  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
    const url = searchParams.get('url');
    
    if (!url) {
      return response.status(400).json({ error: 'URL is required' });
    }
    
    await del(url);
    
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return response.status(500).json({ error: 'Delete failed', details: error.message });
  }
}
