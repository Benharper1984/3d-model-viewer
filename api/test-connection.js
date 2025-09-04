export default async function handler(request, response) {
  try {
    // Check if we're in the right environment
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    // Basic diagnostic info
    const diagnostics = {
      timestamp: new Date().toISOString(),
      method: request.method,
      hasBloodToken: hasToken,
      tokenPrefix: hasToken ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 25) + '...' : 'Not configured',
      nodeVersion: process.version,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV
      }
    };
    
    // Test if we can import @vercel/blob
    try {
      const { put, list } = await import('@vercel/blob');
      diagnostics.blobModuleLoaded = true;
      
      if (hasToken) {
        // Try a simple list operation
        try {
          const { blobs } = await list({ prefix: 'test/' });
          diagnostics.blobConnectionWorking = true;
          diagnostics.testBlobCount = blobs.length;
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
      status: 'API endpoint working',
      diagnostics
    });
    
  } catch (error) {
    return response.status(500).json({
      status: 'API endpoint error',
      error: error.message,
      stack: error.stack
    });
  }
}
