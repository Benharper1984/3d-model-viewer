const { put, list } = require('@vercel/blob');

module.exports = async function handler(request, response) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      method: request.method,
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenPreview: process.env.BLOB_READ_WRITE_TOKEN ? 
        `${process.env.BLOB_READ_WRITE_TOKEN.substring(0, 20)}...` : 'NOT_FOUND'
    };
    
    // Test @vercel/blob import
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        // Try a simple list operation
        const { blobs } = await list({ prefix: 'test/', limit: 1 });
        diagnostics.blobTestWorking = true;
        diagnostics.message = 'Vercel Blob connection successful!';
        diagnostics.testBlobCount = blobs.length;
      } else {
        diagnostics.message = 'Token not found but API working';
      }
      diagnostics.blobModuleLoaded = true;
    } catch (error) {
      diagnostics.blobModuleLoaded = false;
      diagnostics.error = error.message;
    }
    
    return response.status(200).json({
      status: 'API Working',
      diagnostics
    });
    
  } catch (error) {
    return response.status(500).json({
      status: 'API Error',
      error: error.message
    });
  }
};
