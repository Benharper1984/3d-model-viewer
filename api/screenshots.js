// Vercel Serverless Function for Screenshot Storage
import { put, list, del } from '@vercel/blob';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { method } = req;
        
        if (method === 'POST') {
            // Upload new screenshot
            const { imageData, metadata, jobId } = req.body;
            
            if (!imageData || !metadata || !jobId) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Convert base64 to buffer
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `screenshots/${jobId}/${timestamp}.png`;
            
            // Upload to Vercel Blob
            const blob = await put(filename, buffer, {
                access: 'public',
                contentType: 'image/png'
            });

            // Store metadata separately
            const screenshotRecord = {
                id: timestamp,
                url: blob.url,
                filename: filename,
                timestamp: new Date().toISOString(),
                jobId: jobId,
                user: metadata.user || 'unknown',
                comments: [],
                ...metadata
            };

            // Store metadata in blob as JSON
            const metadataFilename = `metadata/${jobId}/${timestamp}.json`;
            await put(metadataFilename, JSON.stringify(screenshotRecord), {
                access: 'public',
                contentType: 'application/json'
            });

            return res.status(200).json({
                success: true,
                screenshot: screenshotRecord
            });
        }
        
        if (method === 'GET') {
            // Get screenshots for a job
            const { jobId, limit = 20, offset = 0 } = req.query;
            
            if (!jobId) {
                return res.status(400).json({ error: 'jobId is required' });
            }

            // List metadata files for this job
            const { blobs } = await list({
                prefix: `metadata/${jobId}/`,
                limit: parseInt(limit),
                cursor: offset > 0 ? `metadata/${jobId}/${offset}` : undefined
            });

            // Fetch metadata for each screenshot
            const screenshots = [];
            for (const blob of blobs) {
                try {
                    const response = await fetch(blob.url);
                    const metadata = await response.json();
                    screenshots.push(metadata);
                } catch (error) {
                    console.error('Error fetching metadata:', error);
                }
            }

            // Sort by timestamp (newest first)
            screenshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return res.status(200).json({
                success: true,
                screenshots: screenshots,
                hasMore: blobs.length === parseInt(limit)
            });
        }
        
        if (method === 'DELETE') {
            // Delete screenshot
            const { filename, metadataFilename } = req.body;
            
            if (!filename || !metadataFilename) {
                return res.status(400).json({ error: 'Missing filename or metadataFilename' });
            }

            // Delete both image and metadata
            await del(filename);
            await del(metadataFilename);

            return res.status(200).json({
                success: true,
                message: 'Screenshot deleted'
            });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}
