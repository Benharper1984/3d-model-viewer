/**
 * Gallery Manager Module
 * Handles screenshot gallery and comment management with cloud storage
 */

class GalleryManager {
    constructor() {
        this.screenshots = [];
        this.currentUser = null;
        this.cloudStorage = new CloudStorageManager();
        this.visibleRows = 2; // Show only 2 rows initially
        this.screenshotsPerRow = 4; // Assuming 4 screenshots per row
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    getScreenshots() {
        return this.screenshots;
    }

    async addScreenshot(screenshot) {
        try {
            // Upload to cloud storage instead of storing locally
            const cloudScreenshot = await this.cloudStorage.uploadScreenshot(screenshot.canvas, {
                modelVersion: screenshot.modelVersion,
                createdBy: this.currentUser ? this.currentUser.name : 'Unknown User',
                user: this.currentUser
            });
            
            this.screenshots.push(cloudScreenshot);
            this.addScreenshotToGallery(cloudScreenshot, false); // Don't save to localStorage
            
            // Show gallery if first screenshot
            if (this.screenshots.length === 1) {
                document.getElementById('screenshotGallery').style.display = 'block';
            }
            
            this.updateShowMoreButton();
            
        } catch (error) {
            console.error('Failed to save screenshot:', error);
            
            // More specific error message
            if (error.message.includes('Vercel Blob not configured')) {
                alert('Screenshots are being saved locally. For cloud storage, please configure Vercel Blob in your dashboard.');
            } else {
                alert('Failed to save screenshot. Please try again.');
            }
        }
    }

    addScreenshotToGallery(screenshot, shouldSave = false) {
        const container = document.getElementById('screenshotsContainer');
        
        // Hide empty state if this is the first screenshot
        const emptyState = container.querySelector('.empty-gallery');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Determine if current user can delete this screenshot
        const canDeleteScreenshot = this.currentUser && this.currentUser.canDelete;
        
        const item = document.createElement('div');
        item.className = 'screenshot-item';
        item.dataset.screenshotId = screenshot.id;
        
        // Check if this should be hidden initially (beyond first 2 rows)
        const currentIndex = this.screenshots.length - 1;
        const maxVisible = this.visibleRows * this.screenshotsPerRow;
        if (currentIndex >= maxVisible) {
            item.style.display = 'none';
            item.classList.add('hidden-screenshot');
        }
        
        item.innerHTML = `
            <img src="${screenshot.url}" alt="Screenshot" class="screenshot-preview" onclick="openModal('${screenshot.url}')">
            <div class="screenshot-timestamp">${screenshot.timestamp}</div>
            <div class="screenshot-metadata">
                <div class="model-version-info">Model File: ${screenshot.modelVersion || 'Current Version'}</div>
                <div class="created-by-info">Created by: <strong>${screenshot.createdBy || 'Unknown'}</strong></div>
            </div>
            <div class="comment-section">
                <div id="comments-list-${screenshot.id}" class="comments-list"></div>
                <textarea class="comment-input" placeholder="Add a comment about this screenshot..." data-id="${screenshot.id}"></textarea>
                <div class="comment-buttons">
                    <button class="save-comment-btn" onclick="galleryManager.addComment(${screenshot.id})">Add Comment</button>
                    ${canDeleteScreenshot ? `<button class="delete-screenshot-btn" onclick="galleryManager.deleteScreenshot(${screenshot.id})">Delete Screenshot</button>` : ''}
                </div>
            </div>
        `;
        
        container.appendChild(item);
        
        // Load existing comments
        if (screenshot.comments && screenshot.comments.length > 0) {
            screenshot.comments.forEach(comment => {
                this.displayComment(screenshot.id, comment);
            });
        }
    }

    async addComment(screenshotId) {
        const input = document.querySelector(`[data-id="${screenshotId}"]`);
        const commentText = input.value.trim();
        
        if (!commentText) {
            alert('Please enter a comment first!');
            return;
        }
        
        try {
            // Add comment via cloud storage
            await this.cloudStorage.addComment(screenshotId, commentText, this.currentUser ? this.currentUser.name : 'Unknown User');
            
            // Find screenshot and update local copy
            const screenshot = this.screenshots.find(s => s.id === screenshotId);
            if (screenshot) {
                const comment = {
                    id: Date.now(),
                    text: commentText,
                    timestamp: new Date().toLocaleString(),
                    user: this.currentUser ? this.currentUser.name : 'Unknown User',
                    role: this.currentUser ? this.currentUser.role : 'unknown'
                };
                
                screenshot.comments.push(comment);
                this.displayComment(screenshotId, comment);
                
                // Clear input
                input.value = '';
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('Failed to add comment. Please try again.');
        }
    }

    displayComment(screenshotId, comment) {
        const commentsList = document.getElementById(`comments-list-${screenshotId}`);
        
        // Determine if current user can delete this comment
        const canDeleteComment = this.currentUser && (this.currentUser.canDelete || comment.author === this.currentUser.name);
        
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.innerHTML = `
            ${canDeleteComment ? `<button class="delete-comment-btn" onclick="galleryManager.deleteComment(${screenshotId}, ${comment.id})" title="Delete comment">×</button>` : ''}
            <div class="comment-author">
                <strong>${comment.author}</strong>
                <span class="comment-role">${comment.authorRole === 'admin' ? '(Admin)' : '(Client)'}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-timestamp">${comment.timestamp}</div>
        `;
        
        commentsList.appendChild(commentDiv);
    }

    deleteComment(screenshotId, commentId) {
        if (confirm('Delete this comment?')) {
            // Remove from screenshot data
            const screenshot = this.screenshots.find(s => s.id === screenshotId);
            if (screenshot) {
                screenshot.comments = screenshot.comments.filter(c => c.id !== commentId);
                
                // Save to storage
                this.saveToStorage();
            }
            
            // Remove from DOM
            const commentElement = event.target.closest('.comment-item');
            commentElement.remove();
        }
    }

    async deleteScreenshot(screenshotId) {
        if (!this.currentUser || !this.currentUser.canDelete) {
            alert('You do not have permission to delete screenshots.');
            return;
        }
        
        if (confirm('Are you sure you want to delete this screenshot?')) {
            try {
                // Delete from cloud storage
                await this.cloudStorage.deleteScreenshot(screenshotId);
                
                // Remove from local array
                this.screenshots = this.screenshots.filter(s => s.id !== screenshotId);
                
                // Remove from DOM
                const item = document.querySelector(`[data-screenshot-id="${screenshotId}"]`);
                if (item) {
                    item.remove();
                }
                
                // Update show more button
                this.updateShowMoreButton();
                
                // Show empty state if no screenshots remain
                if (this.screenshots.length === 0) {
                    this.showEmptyState();
                }
            } catch (error) {
                console.error('Failed to delete screenshot:', error);
                alert('Failed to delete screenshot. Please try again.');
            }
        }
    }

    async clearAllScreenshots() {
        if (!this.currentUser || !this.currentUser.canDelete) {
            alert('You do not have permission to clear all screenshots.');
            return;
        }
        
        if (confirm('Are you sure you want to delete all screenshots?')) {
            try {
                // Clear from cloud storage
                await this.cloudStorage.clearAllScreenshots();
                
                this.screenshots = [];
                this.showEmptyState();
                this.updateShowMoreButton();
            } catch (error) {
                console.error('Failed to clear all screenshots:', error);
                alert('Failed to clear all screenshots. Please try again.');
            }
        }
    }

    async loadStoredScreenshots() {
        try {
            // Load from cloud storage
            this.screenshots = await this.cloudStorage.loadScreenshots();
            
            if (this.screenshots.length > 0) {
                document.getElementById('screenshotGallery').style.display = 'block';
                
                // Add each screenshot to gallery
                this.screenshots.forEach((screenshot, index) => {
                    this.addScreenshotToGallery(screenshot, false);
                });
                
                this.updateShowMoreButton();
            }
        } catch (error) {
            console.error('Failed to load screenshots:', error);
        }
    }

    showMoreScreenshots() {
        const hiddenItems = document.querySelectorAll('.screenshot-item.hidden-screenshot');
        const maxVisible = this.visibleRows * this.screenshotsPerRow;
        
        // Show next batch
        for (let i = 0; i < Math.min(maxVisible, hiddenItems.length); i++) {
            hiddenItems[i].style.display = 'block';
            hiddenItems[i].classList.remove('hidden-screenshot');
        }
        
        this.updateShowMoreButton();
    }

    updateShowMoreButton() {
        const hiddenItems = document.querySelectorAll('.screenshot-item.hidden-screenshot');
        let showMoreBtn = document.getElementById('showMoreBtn');
        
        if (hiddenItems.length > 0) {
            if (!showMoreBtn) {
                showMoreBtn = document.createElement('button');
                showMoreBtn.id = 'showMoreBtn';
                showMoreBtn.className = 'show-more-btn';
                showMoreBtn.textContent = `Show ${hiddenItems.length} more screenshots`;
                showMoreBtn.onclick = () => this.showMoreScreenshots();
                
                const gallery = document.getElementById('screenshotGallery');
                gallery.appendChild(showMoreBtn);
            } else {
                showMoreBtn.textContent = `Show ${hiddenItems.length} more screenshots`;
            }
        } else if (showMoreBtn) {
            showMoreBtn.remove();
        }
    }

    showEmptyState() {
        const container = document.getElementById('screenshotsContainer');
        container.innerHTML = `
            <div class="empty-gallery">
                <div class="empty-gallery-icon">📷</div>
                <div class="empty-gallery-text">No screenshots yet</div>
                <div class="empty-gallery-subtext">Drag to select an area on the model above to take a screenshot</div>
            </div>
        `;
        
        // Remove show more button
        const showMoreBtn = document.getElementById('showMoreBtn');
        if (showMoreBtn) {
            showMoreBtn.remove();
        }
    }
}
