/**
 * Gallery Manager Module
 * Handles screenshot gallery and comment management with cloud storage and admin tag permissions
 */

class GalleryManager {
    constructor() {
        this.screenshots = [];
        this.currentUser = null;
        this.cloudStorage = new CloudStorageManager();
        this.visibleRows = 2; // Show only 2 rows initially
        this.screenshotsPerRow = 4; // Assuming 4 screenshots per row
        this.availableTags = []; // Store available tags with colors and permissions
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
            
            // Sort and re-render to maintain unresolved-first order
            this.sortAndReorderScreenshots();
            
            // Show gallery if first screenshot
            if (this.screenshots.length === 1) {
                document.getElementById('screenshotGallery').style.display = 'block';
            }
            
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
        const isAdmin = this.currentUser && this.currentUser.role === 'admin';
        
        // Initialize resolution status if not set
        if (typeof screenshot.isResolved === 'undefined') {
            screenshot.isResolved = false;
        }
        
        const item = document.createElement('div');
        item.className = 'screenshot-item';
        item.dataset.screenshotId = screenshot.id;
        
        // Add resolved class if screenshot is resolved
        if (screenshot.isResolved) {
            item.classList.add('resolved-screenshot');
        } else {
            item.classList.add('unresolved-screenshot');
        }
        
        // Check if this should be hidden initially (beyond first 2 rows)
        const currentIndex = this.screenshots.length - 1;
        const maxVisible = this.visibleRows * this.screenshotsPerRow;
        if (currentIndex >= maxVisible) {
            item.style.display = 'none';
            item.classList.add('hidden-screenshot');
        }
        
        const resolvedBadge = screenshot.isResolved ? 
            '<span class="resolution-badge resolved">✓ Resolved</span>' : 
            '<span class="resolution-badge unresolved">⏳ Unresolved</span>';
        
        item.innerHTML = `
            <img src="${screenshot.url}" alt="Screenshot" class="screenshot-preview" onclick="openModal('${screenshot.url}')">
            <div class="screenshot-header">
                <div class="screenshot-timestamp">${screenshot.timestamp}</div>
                ${resolvedBadge}
            </div>
            <div class="screenshot-metadata">
                <div class="model-version-info">Model File: ${screenshot.modelVersion || 'Current Version'}</div>
                <div class="created-by-info">Created by: <strong>${screenshot.createdBy || 'Unknown'}</strong></div>
                <div class="screenshot-tags"></div>
            </div>
            <div class="comment-section">
                <div class="comment-thread-header">
                    <button class="toggle-comments-btn" onclick="galleryManager.toggleCommentThread(${screenshot.id})">
                        💬 Comments (${screenshot.comments ? screenshot.comments.length : 0})
                    </button>
                    ${isAdmin ? `<button class="resolve-btn ${screenshot.isResolved ? 'resolved' : ''}" onclick="galleryManager.toggleResolution(${screenshot.id})">${screenshot.isResolved ? '↩️ Unresolve' : '✅ Mark Resolved'}</button>` : ''}
                </div>
                <div id="comments-thread-${screenshot.id}" class="comments-thread" style="display: none;">
                    <div id="comments-list-${screenshot.id}" class="comments-list"></div>
                    <div class="add-comment-section">
                        <textarea class="comment-input" placeholder="Add a comment about this screenshot..." data-id="${screenshot.id}"></textarea>
                        <div class="comment-buttons">
                            <button class="save-comment-btn" onclick="galleryManager.addComment(${screenshot.id})">Add Comment</button>
                            <button class="add-tag-btn" onclick="galleryManager.showTagModal(${screenshot.id})">🏷️ Add Tag</button>
                            ${canDeleteScreenshot ? `<button class="delete-screenshot-btn" onclick="galleryManager.deleteScreenshot(${screenshot.id})">Delete Screenshot</button>` : ''}
                        </div>
                    </div>
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
                
                // Update comment count in toggle button
                this.updateCommentCount(screenshotId);
                
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
                
                // Update comment count
                this.updateCommentCount(screenshotId);
                
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
                
                // Sort screenshots with unresolved first
                this.sortAndReorderScreenshots();
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

    // Tag Management Methods with Admin Permissions
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
                    if (!tag.hasOwnProperty('adminOnly')) {
                        tag.adminOnly = !tag.clientCanUse;
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
                                <div class="color-palette">
                                    <div class="color-palette-label">Choose a color:</div>
                                    <div class="color-options" id="colorOptions">
                                        <div class="color-option" data-color="#667eea" style="background-color: #667eea" title="Blue"></div>
                                        <div class="color-option" data-color="#28a745" style="background-color: #28a745" title="Green"></div>
                                        <div class="color-option" data-color="#ffc107" style="background-color: #ffc107" title="Yellow"></div>
                                        <div class="color-option" data-color="#dc3545" style="background-color: #dc3545" title="Red"></div>
                                        <div class="color-option" data-color="#17a2b8" style="background-color: #17a2b8" title="Cyan"></div>
                                        <div class="color-option" data-color="#6f42c1" style="background-color: #6f42c1" title="Purple"></div>
                                        <div class="color-option" data-color="#fd7e14" style="background-color: #fd7e14" title="Orange"></div>
                                        <div class="color-option" data-color="#e83e8c" style="background-color: #e83e8c" title="Pink"></div>
                                        <div class="color-option" data-color="#20c997" style="background-color: #20c997" title="Teal"></div>
                                        <div class="color-option" data-color="#6c757d" style="background-color: #6c757d" title="Gray"></div>
                                        <div class="color-option" data-color="#343a40" style="background-color: #343a40" title="Dark Gray"></div>
                                        <div class="color-option" data-color="#007bff" style="background-color: #007bff" title="Primary Blue"></div>
                                        <div class="color-option" data-color="#795548" style="background-color: #795548" title="Brown"></div>
                                        <div class="color-option" data-color="#9c27b0" style="background-color: #9c27b0" title="Magenta"></div>
                                        <div class="color-option" data-color="#ff5722" style="background-color: #ff5722" title="Deep Orange"></div>
                                    </div>
                                    <input type="hidden" id="newTagColor" value="#667eea">
                                </div>
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
            this.setupColorPalette();
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

    setupColorPalette() {
        const colorOptions = document.querySelectorAll('.color-option');
        const hiddenInput = document.getElementById('newTagColor');
        
        // Set initial selection
        colorOptions[0].classList.add('selected');
        
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove previous selection
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Select clicked option
                option.classList.add('selected');
                
                // Update hidden input value
                hiddenInput.value = option.dataset.color;
            });
        });
    }

    populateTagPermissions() {
        const container = document.getElementById('tagPermissionsList');
        if (!container) return;

        container.innerHTML = '';
        this.availableTags.forEach(tag => {
            const permissionElement = document.createElement('div');
            permissionElement.className = 'tag-permission-item';
            permissionElement.innerHTML = `
                <div class="tag-info">
                    <span class="tag-preview" style="background-color: ${tag.color}; color: ${this.getContrastColor(tag.color)}">${tag.name}</span>
                </div>
                <div class="permission-controls">
                    <label class="permission-toggle">
                        <input type="checkbox" ${tag.clientCanUse ? 'checked' : ''} 
                               onchange="galleryManager.updateTagPermission(${tag.id}, this.checked)">
                        Client can use
                    </label>
                    <button class="delete-tag-btn" onclick="galleryManager.deleteTag(${tag.id})" title="Delete tag">🗑️</button>
                </div>
            `;
            container.appendChild(permissionElement);
        });
    }

    updateTagPermission(tagId, canUse) {
        const tag = this.availableTags.find(t => t.id === tagId);
        if (tag) {
            tag.clientCanUse = canUse;
            tag.adminOnly = !canUse;
            this.saveTagsToStorage();
            
            // Refresh the tag modal if it's open
            const existingGrid = document.getElementById('existingTagsGrid');
            if (existingGrid) {
                const screenshotId = parseInt(existingGrid.closest('.tag-modal').querySelector('[onclick*="toggleTag"]').getAttribute('onclick').match(/\d+/)[0]);
                this.populateExistingTags(screenshotId);
            }
        }
    }

    deleteTag(tagId) {
        if (confirm('Are you sure you want to delete this tag? It will be removed from all screenshots.')) {
            // Remove from available tags
            this.availableTags = this.availableTags.filter(t => t.id !== tagId);
            this.saveTagsToStorage();
            
            // Remove from all screenshots
            this.screenshots.forEach(screenshot => {
                if (screenshot.tags) {
                    screenshot.tags = screenshot.tags.filter(t => t.id !== tagId);
                    this.updateScreenshotTags(screenshot.id);
                }
            });
            
            // Refresh the permissions list
            this.populateTagPermissions();
            
            // Refresh existing tags if modal is open
            const existingGrid = document.getElementById('existingTagsGrid');
            if (existingGrid) {
                const screenshotId = parseInt(existingGrid.closest('.tag-modal').querySelector('[onclick*="toggleTag"]').getAttribute('onclick').match(/\d+/)[0]);
                this.populateExistingTags(screenshotId);
            }
        }
    }

    toggleTag(screenshotId, tagId) {
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        if (!screenshot) return;

        const tag = this.availableTags.find(t => t.id === tagId);
        if (!tag) return;

        // Check permissions for non-admin users
        const isAdmin = this.currentUser && this.currentUser.role === 'admin';
        if (!isAdmin && !tag.clientCanUse) {
            alert('You do not have permission to use this tag.');
            return;
        }

        if (!screenshot.tags) screenshot.tags = [];

        const tagIndex = screenshot.tags.findIndex(t => t.id === tagId);

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
        const isAdmin = this.currentUser && this.currentUser.role === 'admin';
        if (!isAdmin) {
            alert('Only administrators can create new tags.');
            return;
        }

        const nameInput = document.getElementById('newTagName');
        const colorInput = document.getElementById('newTagColor');
        const clientCanUseInput = document.getElementById('clientCanUseTag');
        
        const name = nameInput.value.trim();
        const color = colorInput.value;
        const clientCanUse = clientCanUseInput.checked;

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
            color: color,
            clientCanUse: clientCanUse,
            adminOnly: !clientCanUse
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
        clientCanUseInput.checked = false;
        
        // Reset color palette selection
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        colorOptions[0].classList.add('selected');

        // Update display
        this.populateExistingTags(screenshotId);
        this.displayCurrentTags(screenshotId);
        this.updateScreenshotTags(screenshotId);
        this.populateTagPermissions();
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

    // Comment thread and resolution management
    toggleCommentThread(screenshotId) {
        const thread = document.getElementById(`comments-thread-${screenshotId}`);
        const button = thread.parentElement.querySelector('.toggle-comments-btn');
        
        if (thread.style.display === 'none') {
            thread.style.display = 'block';
            button.innerHTML = `💬 Comments (${this.getCommentCount(screenshotId)}) - Hide`;
        } else {
            thread.style.display = 'none';
            button.innerHTML = `💬 Comments (${this.getCommentCount(screenshotId)})`;
        }
    }

    getCommentCount(screenshotId) {
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        return screenshot && screenshot.comments ? screenshot.comments.length : 0;
    }

    updateCommentCount(screenshotId) {
        const button = document.querySelector(`[data-screenshot-id="${screenshotId}"] .toggle-comments-btn`);
        const thread = document.getElementById(`comments-thread-${screenshotId}`);
        const count = this.getCommentCount(screenshotId);
        
        if (button) {
            if (thread && thread.style.display === 'block') {
                button.innerHTML = `💬 Comments (${count}) - Hide`;
            } else {
                button.innerHTML = `💬 Comments (${count})`;
            }
        }
    }

    toggleResolution(screenshotId) {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            alert('Only administrators can mark screenshots as resolved.');
            return;
        }

        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        if (!screenshot) return;

        // Toggle resolution status
        screenshot.isResolved = !screenshot.isResolved;

        // Update UI
        this.updateResolutionStatus(screenshotId);
        
        // Re-sort and re-render gallery to maintain unresolved-first order
        this.sortAndReorderScreenshots();

        // Save to cloud storage
        this.cloudStorage.saveMetadata(screenshot);
    }

    updateResolutionStatus(screenshotId) {
        const item = document.querySelector(`[data-screenshot-id="${screenshotId}"]`);
        const screenshot = this.screenshots.find(s => s.id === screenshotId);
        
        if (!item || !screenshot) return;

        // Update classes
        if (screenshot.isResolved) {
            item.classList.remove('unresolved-screenshot');
            item.classList.add('resolved-screenshot');
        } else {
            item.classList.remove('resolved-screenshot');
            item.classList.add('unresolved-screenshot');
        }

        // Update badge
        const badge = item.querySelector('.resolution-badge');
        if (badge) {
            badge.className = screenshot.isResolved ? 'resolution-badge resolved' : 'resolution-badge unresolved';
            badge.textContent = screenshot.isResolved ? '✓ Resolved' : '⏳ Unresolved';
        }

        // Update button
        const resolveBtn = item.querySelector('.resolve-btn');
        if (resolveBtn) {
            resolveBtn.className = screenshot.isResolved ? 'resolve-btn resolved' : 'resolve-btn';
            resolveBtn.textContent = screenshot.isResolved ? '↩️ Unresolve' : '✅ Mark Resolved';
        }
    }

    sortAndReorderScreenshots() {
        // Sort screenshots: unresolved first, then resolved, maintaining timestamp order within each group
        this.screenshots.sort((a, b) => {
            // First sort by resolution status (unresolved first)
            if (a.isResolved !== b.isResolved) {
                return a.isResolved ? 1 : -1;
            }
            // Then sort by timestamp (newest first within each group)
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // Clear and re-render the gallery
        const container = document.getElementById('screenshotsContainer');
        container.innerHTML = '';
        
        // Check if we should show empty state
        if (this.screenshots.length === 0) {
            this.showEmptyState();
            return;
        }

        // Re-add all screenshots in the new order
        this.screenshots.forEach((screenshot, index) => {
            this.addScreenshotToGallery(screenshot, false);
        });

        this.updateShowMoreButton();
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
