/**
 * Cloud Storage Manager
 * Handles Vercel Blob storage for screenshots and metadata
 */

class CloudStorageManager {
    constructor() {
        this.apiBase = '/api';
        this.currentJobId = this.getCurrentJobId();
    }

    // Test blob storage connection
    async testConnection() {
        try {
            console.log('Testing Vercel Blob storage connection...');
            
            // Test 1: Check if list endpoint works
            console.log('Testing list-screenshots endpoint...');
            const listResponse = await fetch(`${this.apiBase}/list-screenshots?prefix=test/`);
            console.log('List endpoint test - Status:', listResponse.status);
            
            if (!listResponse.ok) {
                const listError = await listResponse.text();
                console.error('List endpoint failed:', listResponse.status, listError);
            }
            
            // Test 2: Check if upload endpoint exists
            const testResponse = await fetch(`${this.apiBase}/upload-screenshot`, {
                method: 'OPTIONS'
            });
            
            console.log('Upload endpoint test - Status:', testResponse.status);
            
            // Test 3: Try a small test upload
            console.log('Testing file upload...');
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 10;
            testCanvas.height = 10;
            const ctx = testCanvas.getContext('2d');
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, 10, 10);
            
            const testBlob = await this.canvasToBlob(testCanvas);
            const testFilename = `test/connection-test-${Date.now()}.jpg`;
            
            const uploadResponse = await fetch(`${this.apiBase}/upload-screenshot?filename=${encodeURIComponent(testFilename)}`, {
                method: 'POST',
                body: testBlob,
                headers: {
                    'Content-Type': 'image/jpeg'
                }
            });
            
            if (uploadResponse.ok) {
                const result = await uploadResponse.json();
                console.log('✅ Blob storage connection successful!');
                console.log('Test file uploaded to:', result.url);
                
                // Test 4: Verify the file was actually uploaded by listing it
                const verifyResponse = await fetch(`${this.apiBase}/list-screenshots?prefix=test/`);
                if (verifyResponse.ok) {
                    const verifyResult = await verifyResponse.json();
                    const foundTestFile = verifyResult.screenshots?.some(blob => blob.url === result.url);
                    
                    return {
                        success: true,
                        message: `Vercel Blob storage is working correctly${foundTestFile ? ' (verified file listing)' : ''}`,
                        testUrl: result.url,
                        endpoints: {
                            list: listResponse.status,
                            upload: uploadResponse.status,
                            verify: verifyResponse.status
                        }
                    };
                } else {
                    return {
                        success: true,
                        message: 'Upload works but listing verification failed',
                        testUrl: result.url,
                        warning: 'List endpoint may have issues'
                    };
                }
            } else {
                const errorText = await uploadResponse.text();
                console.error('❌ Blob storage connection failed:', uploadResponse.status, errorText);
                return {
                    success: false,
                    message: `Upload failed: ${uploadResponse.status} ${errorText}`,
                    error: errorText,
                    endpoints: {
                        list: listResponse.status,
                        upload: uploadResponse.status
                    }
                };
            }
            
        } catch (error) {
            console.error('❌ Blob storage connection test failed:', error);
            return {
                success: false,
                message: 'Connection test failed: ' + error.message,
                error: error.message
            };
        }
    }

    // Generate or get current job ID (you can customize this logic)
    getCurrentJobId() {
        let jobId = sessionStorage.getItem('currentJobId');
        if (!jobId) {
            jobId = `job-${Date.now()}`;
            sessionStorage.setItem('currentJobId', jobId);
        }
        return jobId;
    }

    // Convert canvas to blob for upload
    async canvasToBlob(canvas, quality = 0.8) {
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', quality);
        });
    }

    // Upload screenshot to Vercel Blob
    async uploadScreenshot(canvas, metadata) {
        try {
            // Try cloud storage first
            const blob = await this.canvasToBlob(canvas);
            const timestamp = Date.now();
            const filename = `screenshots/${this.currentJobId}/screenshot-${timestamp}.jpg`;
            
            console.log('Attempting to upload to:', `${this.apiBase}/upload-screenshot?filename=${encodeURIComponent(filename)}`);
            
            // Upload image
            const uploadResponse = await fetch(`${this.apiBase}/upload-screenshot?filename=${encodeURIComponent(filename)}`, {
                method: 'POST',
                body: blob,
                headers: {
                    'Content-Type': 'image/jpeg'
                }
            });
            
            console.log('Upload response status:', uploadResponse.status);
            console.log('Upload response headers:', uploadResponse.headers);
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('Upload failed with status:', uploadResponse.status, 'Error:', errorText);
                throw new Error(`Vercel Blob upload failed: ${uploadResponse.status} ${errorText}`);
            }
            
            const responseData = await uploadResponse.json();
            console.log('Upload successful:', responseData);
            
            // Create screenshot record with cloud URL
            const screenshotRecord = {
                id: timestamp,
                url: responseData.url,
                timestamp: new Date().toLocaleString(),
                comments: [],
                jobId: this.currentJobId,
                user: metadata.user || 'Unknown',
                isCloudStored: true,
                ...metadata
            };
            
            // Store metadata in localStorage (much smaller footprint)
            await this.saveMetadata(screenshotRecord);
            
            return screenshotRecord;
        } catch (error) {
            console.warn('Cloud storage failed, using localStorage fallback:', error.message);
            
            // Fallback to localStorage
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            const timestamp = Date.now();
            
            const screenshotRecord = {
                id: timestamp,
                url: dataURL, // Store base64 as fallback
                timestamp: new Date().toLocaleString(),
                comments: [],
                jobId: this.currentJobId,
                user: metadata.user || 'Unknown',
                isCloudStored: false,
                ...metadata
            };
            
            await this.saveMetadata(screenshotRecord);
            return screenshotRecord;
        }
    }

    // Save metadata to localStorage
    async saveMetadata(screenshotRecord) {
        const metadata = this.getStoredMetadata();
        metadata.push(screenshotRecord);
        localStorage.setItem(`screenshots_metadata_${this.currentJobId}`, JSON.stringify(metadata));
    }

    // Get stored metadata
    getStoredMetadata() {
        const stored = localStorage.getItem(`screenshots_metadata_${this.currentJobId}`);
        return stored ? JSON.parse(stored) : [];
    }

    // Load all screenshots for current job
    async loadScreenshots() {
        try {
            // Get metadata from localStorage
            const metadata = this.getStoredMetadata();
            
            // Verify cloud images still exist (optional)
            const validScreenshots = [];
            for (const screenshot of metadata) {
                // You could add a HEAD request here to verify the image exists
                // For now, we'll trust the metadata
                validScreenshots.push(screenshot);
            }
            
            return validScreenshots;
        } catch (error) {
            console.error('Failed to load screenshots:', error);
            return [];
        }
    }

    // Add comment to screenshot
    async addComment(screenshotId, comment, user) {
        const metadata = this.getStoredMetadata();
        const screenshot = metadata.find(s => s.id === screenshotId);
        
        if (screenshot) {
            screenshot.comments.push({
                id: Date.now(),
                text: comment,
                user: user,
                timestamp: new Date().toLocaleString()
            });
            
            await this.saveMetadata(screenshot);
            localStorage.setItem(`screenshots_metadata_${this.currentJobId}`, JSON.stringify(metadata));
        }
    }

    // Delete screenshot
    async deleteScreenshot(screenshotId) {
        try {
            const metadata = this.getStoredMetadata();
            const screenshotIndex = metadata.findIndex(s => s.id === screenshotId);
            
            if (screenshotIndex === -1) {
                throw new Error('Screenshot not found');
            }
            
            const screenshot = metadata[screenshotIndex];
            
            // Only try to delete from cloud if it was stored there
            if (screenshot.isCloudStored) {
                const deleteResponse = await fetch(`${this.apiBase}/delete-screenshot?url=${encodeURIComponent(screenshot.url)}`, {
                    method: 'DELETE'
                });
                
                if (!deleteResponse.ok) {
                    console.warn('Failed to delete from cloud, removing from metadata anyway');
                }
            }
            
            // Remove from metadata
            metadata.splice(screenshotIndex, 1);
            localStorage.setItem(`screenshots_metadata_${this.currentJobId}`, JSON.stringify(metadata));
            
            return true;
        } catch (error) {
            console.error('Delete failed:', error);
            throw error;
        }
    }

    // Clear all screenshots for current job
    async clearAllScreenshots() {
        try {
            const metadata = this.getStoredMetadata();
            
            // Delete cloud-stored screenshots
            const cloudDeletePromises = metadata
                .filter(screenshot => screenshot.isCloudStored)
                .map(screenshot => 
                    fetch(`${this.apiBase}/delete-screenshot?url=${encodeURIComponent(screenshot.url)}`, {
                        method: 'DELETE'
                    }).catch(console.warn) // Don't fail if some deletions fail
                );
            
            await Promise.allSettled(cloudDeletePromises);
            
            // Clear metadata
            localStorage.removeItem(`screenshots_metadata_${this.currentJobId}`);
            
            return true;
        } catch (error) {
            console.error('Clear all failed:', error);
            throw error;
        }
    }

    // Get current job info
    getJobInfo() {
        return {
            jobId: this.currentJobId,
            screenshotCount: this.getStoredMetadata().length
        };
    }
}
