const { list } = require('@vercel/blob');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
    const prefix = searchParams.get('prefix') || 'screenshots/';
    
    const { blobs } = await list({
      prefix: prefix,
      limit: 100
    });
    
    return response.status(200).json({ screenshots: blobs });
  } catch (error) {
    console.error('List error:', error);
    return response.status(500).json({ error: 'Failed to list screenshots', details: error.message });
  }
};
