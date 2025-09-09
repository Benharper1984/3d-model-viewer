export default async function handler(request, response) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      method: request.method,
      hasBloodToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      nodeVersion: process.version,
      vercelEnv: process.env.VERCEL_ENV || 'unknown'
    };
    
    // Test blob module import
    try {
      const { list } = await import('@vercel/blob');
      diagnostics.blobModuleLoaded = true;
      
      if (diagnostics.hasBloodToken) {
        try {
          const { blobs } = await list({ prefix: 'test/', limit: 1 });
          diagnostics.blobConnectionWorking = true;
          diagnostics.blobCount = blobs.length;
        } catch (error) {
          diagnostics.blobConnectionWorking = false;
          diagnostics.blobError = error.message;
        }
      }
    } catch (error) {
      diagnostics.blobModuleLoaded = false;
      diagnostics.moduleError = error.message;
    }
    
    return response.status(200).json({
      status: 'API working',
      diagnostics
    });
    
  } catch (error) {
    return response.status(500).json({
      status: 'API error',
      error: error.message
    });
  }
}
