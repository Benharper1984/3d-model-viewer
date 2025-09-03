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
        this.availableTags = []; // Store available tags with colors
        this.loadTagsFromStorage(); // Load existing tags
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
                <div class="screenshot-tags"></div>
            </div>
            <div class="comment-section">
                <div id="comments-list-${screenshot.id}" class="comments-list"></div>
                <textarea class="comment-input" placeholder="Add a comment about this screenshot..." data-id="${screenshot.id}"></textarea>
                <div class="comment-buttons">
                    <button class="save-comment-btn" onclick="galleryManager.addComment(${screenshot.id})">Add Comment</button>
                    <button class="add-tag-btn" onclick="galleryManager.showTagModal(${screenshot.id})">🏷️ Add Tag</button>
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

        // Display existing tags
        this.updateScreenshotTags(screenshot.id);
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

    // Tag Management Methods
    loadTagsFromStorage() {
        try {
            const storedTags = localStorage.getItem('screenshot-tags');
            if (storedTags) {
                this.availableTags = JSON.parse(storedTags);
                // Ensure all tags have permission settings
                this.availableTags.forEach(tag => {
                    if (!tag.hasOwnProperty('clientCanUse')) {
                        tag.clientCanUse = (tag.name === 'Client approval' || tag.name === 'Needs Review');
                    }
                });
            } else {
                // Initialize with default tags including permission settings
                this.availableTags = [
                    { id: 1, name: 'Client approval', color: '#28a745', clientCanUse: true, adminOnly: false },
                    { id: 2, name: 'Needs Review', color: '#ffc107', clientCanUse: true, adminOnly: false },
                    { id: 3, name: 'Admin Approved', color: '#007bff', clientCanUse: false, adminOnly: true },
                    { id: 4, name: 'Rejected', color: '#dc3545', clientCanUse: false, adminOnly: true },
                    { id: 5, name: 'Feedback Required', color: '#17a2b8', clientCanUse: false, adminOnly: true }
                ];
                this.saveTagsToStorage();
            }
        } catch (error) {
            console.error('Failed to load tags:', error);
            this.availableTags = [];
        }
    }

    saveTagsToStorage() {
        try {
            localStorage.setItem('screenshot-tags', JSON.stringify(this.availableTags));
        } catch (error) {
            console.error('Failed to save tags:', error);
        }
    }

    showTagModal(screenshotId) {
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        if (!screenshot) return;

        const isAdmin = this.currentUser && this.currentUser.role === 'admin';
        const userCanManageTags = isAdmin;

        // Create modal for tag selection/creation
        const modal = document.createElement('div');
        modal.className = 'tag-modal';
        modal.innerHTML = `
            <div class="tag-modal-content">
                <div class="tag-modal-header">
                    <h3>Manage Tags</h3>
                    <button class="close-tag-modal" onclick="this.closest('.tag-modal').remove()">×</button>
                </div>
                <div class="tag-modal-body">
                    <div class="existing-tags-section">
                        <h4>Available Tags</h4>
                        <div class="existing-tags-grid" id="existingTagsGrid"></div>
                    </div>
                    ${isAdmin ? `
                        <div class="admin-tag-section">
                            <h4>Admin Tag Management</h4>
                            <div class="create-tag-form">
                                <input type="text" id="newTagName" placeholder="Tag name" maxlength="20">
                                <input type="color" id="newTagColor" value="#667eea">
                                <label class="permission-checkbox">
                                    <input type="checkbox" id="clientCanUseTag"> Allow clients to use this tag
                                </label>
                                <button onclick="galleryManager.createAndApplyTag(${screenshotId})">Create & Apply</button>
                            </div>
                            <div class="tag-permissions-section">
                                <h5>Edit Tag Permissions</h5>
                                <div id="tagPermissionsList"></div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="current-tags-section">
                        <h4>Current Tags for this Screenshot</h4>
                        <div class="current-tags" id="currentTags-${screenshotId}"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Populate existing tags
        this.populateExistingTags(screenshotId);
        this.displayCurrentTags(screenshotId);
        
        // Populate admin tag permissions if admin
        if (isAdmin) {
            this.populateTagPermissions();
        }

        // Close modal on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    populateExistingTags(screenshotId) {
        const grid = document.getElementById('existingTagsGrid');
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        const currentTagIds = screenshot.tags ? screenshot.tags.map(t => t.id) : [];
        const isAdmin = this.currentUser && this.currentUser.role === 'admin';

        grid.innerHTML = '';
        
        // Filter tags based on user permissions
        const availableTags = this.availableTags.filter(tag => {
            return isAdmin || tag.clientCanUse;
        });

        if (availableTags.length === 0) {
            grid.innerHTML = '<p class="no-tags-available">No tags available for your permission level</p>';
            return;
        }

        availableTags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = `existing-tag ${currentTagIds.includes(tag.id) ? 'applied' : ''}`;
            tagElement.style.backgroundColor = tag.color;
            tagElement.style.color = this.getContrastColor(tag.color);
            
            const permissionIndicator = !isAdmin && tag.clientCanUse ? ' 👤' : (isAdmin && !tag.clientCanUse ? ' 🔒' : '');
            
            tagElement.innerHTML = `
                <span>${tag.name}${permissionIndicator}</span>
                <button onclick="galleryManager.toggleTag(${screenshotId}, ${tag.id})" 
                        title="${currentTagIds.includes(tag.id) ? 'Remove tag' : 'Apply tag'}">
                    ${currentTagIds.includes(tag.id) ? '−' : '+'}
                </button>
            `;
            grid.appendChild(tagElement);
        });
    }
            });
    }

    toggleTag(screenshotId, tagId) {
    }

    toggleTag(screenshotId, tagId) {
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        if (!screenshot) return;

        if (!screenshot.tags) screenshot.tags = [];

        const tagIndex = screenshot.tags.findIndex(t => t.id === tagId);
        const tag = this.availableTags.find(t => t.id === tagId);

        if (tagIndex >= 0) {
            // Remove tag
            screenshot.tags.splice(tagIndex, 1);
        } else {
            // Add tag
            screenshot.tags.push({...tag});
        }

        // Update display
        this.populateExistingTags(screenshotId);
        this.displayCurrentTags(screenshotId);
        this.updateScreenshotTags(screenshotId);
    }

    createAndApplyTag(screenshotId) {
        const nameInput = document.getElementById('newTagName');
        const colorInput = document.getElementById('newTagColor');
        
        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) {
            alert('Please enter a tag name');
            return;
        }

        // Check if tag already exists
        if (this.availableTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            alert('A tag with this name already exists');
            return;
        }

        // Create new tag
        const newTag = {
            id: Date.now(),
            name: name,
            color: color
        };

        this.availableTags.push(newTag);
        this.saveTagsToStorage();

        // Apply to current screenshot
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        if (screenshot) {
            if (!screenshot.tags) screenshot.tags = [];
            screenshot.tags.push({...newTag});
        }

        // Clear form
        nameInput.value = '';
        colorInput.value = '#667eea';

        // Update display
        this.populateExistingTags(screenshotId);
        this.displayCurrentTags(screenshotId);
        this.updateScreenshotTags(screenshotId);
    }

    displayCurrentTags(screenshotId) {
        const container = document.getElementById(`currentTags-${screenshotId}`);
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        
        if (!screenshot || !screenshot.tags || screenshot.tags.length === 0) {
            container.innerHTML = '<p class="no-tags">No tags applied</p>';
            return;
        }

        container.innerHTML = screenshot.tags.map(tag => `
            <span class="current-tag" style="background-color: ${tag.color}; color: ${this.getContrastColor(tag.color)}">
                ${tag.name}
                <button onclick="galleryManager.toggleTag(${screenshotId}, ${tag.id})" title="Remove tag">×</button>
            </span>
        `).join('');
    }

    updateScreenshotTags(screenshotId) {
        // Update the tags display in the gallery
        const screenshotItem = document.querySelector(`[data-screenshot-id="${screenshotId}"]`);
        if (!screenshotItem) return;

        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        let tagsContainer = screenshotItem.querySelector('.screenshot-tags');
        
        if (!tagsContainer) {
            tagsContainer = document.createElement('div');
            tagsContainer.className = 'screenshot-tags';
            const metadata = screenshotItem.querySelector('.screenshot-metadata');
            metadata.appendChild(tagsContainer);
        }

        if (!screenshot.tags || screenshot.tags.length === 0) {
            tagsContainer.innerHTML = '';
            return;
        }

        tagsContainer.innerHTML = screenshot.tags.map(tag => `
            <span class="tag-chip" style="background-color: ${tag.color}; color: ${this.getContrastColor(tag.color)}">
                ${tag.name}
            </span>
        `).join('');
    }

    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black or white based on luminance
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
}
