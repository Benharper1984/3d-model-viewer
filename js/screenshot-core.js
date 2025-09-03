/**
 * Screenshot Core Module
 * Handles screenshot capture functionality
 */

class ScreenshotCore {
    constructor(modelViewer, currentModelName, currentUser) {
        this.modelViewer = modelViewer;
        this.currentModelName = currentModelName;
        this.currentUser = currentUser;
        this.isSelectingArea = false;
        this.selectionStart = null;
        this.selectionBox = null;
    }

    startScreenshot() {
        if (!this.modelViewer.src) {
            alert('Please load a 3D model first!');
            return;
        }
        
        this.isSelectingArea = true;
        const overlay = document.getElementById('screenshotOverlay');
        
        if (!overlay) {
            alert('Screenshot overlay not found. Please refresh the page.');
            return;
        }
        
        overlay.style.display = 'block';
        
        // Temporarily disable model controls
        this.modelViewer.removeAttribute('camera-controls');
        this.modelViewer.style.pointerEvents = 'none';
        
        this.setupScreenshotSelection();
    }

    setupScreenshotSelection() {
        const overlay = document.getElementById('screenshotOverlay');
        
        // Remove any existing event listeners to avoid duplicates
        overlay.removeEventListener('mousedown', this.startSelection.bind(this));
        overlay.removeEventListener('mousemove', this.updateSelection.bind(this));
        overlay.removeEventListener('mouseup', this.endSelection.bind(this));
        
        // Add fresh event listeners
        overlay.addEventListener('mousedown', this.startSelection.bind(this));
        overlay.addEventListener('mousemove', this.updateSelection.bind(this));
        overlay.addEventListener('mouseup', this.endSelection.bind(this));
    }

    startSelection(e) {
        if (!this.isSelectingArea) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        this.selectionStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Create selection box
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.left = this.selectionStart.x + 'px';
        this.selectionBox.style.top = this.selectionStart.y + 'px';
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
        
        e.currentTarget.appendChild(this.selectionBox);
    }

    updateSelection(e) {
        if (!this.isSelectingArea || !this.selectionStart || !this.selectionBox) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const width = Math.abs(currentX - this.selectionStart.x);
        const height = Math.abs(currentY - this.selectionStart.y);
        const left = Math.min(currentX, this.selectionStart.x);
        const top = Math.min(currentY, this.selectionStart.y);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }

    endSelection(e) {
        if (!this.isSelectingArea || !this.selectionStart || !this.selectionBox) return;
        
        // Get overlay rect for accurate positioning
        const overlayRect = e.currentTarget.getBoundingClientRect();
        const currentX = e.clientX - overlayRect.left;
        const currentY = e.clientY - overlayRect.top;
        
        // Calculate selection dimensions based on start and end points
        const width = Math.abs(currentX - this.selectionStart.x);
        const height = Math.abs(currentY - this.selectionStart.y);
        const left = Math.min(currentX, this.selectionStart.x);
        const top = Math.min(currentY, this.selectionStart.y);
        
        // Create selection object with overlay-relative coordinates
        const selection = {
            x: left,
            y: top,
            width: width,
            height: height
        };
        
        // Ensure minimum size
        if (selection.width < 10 || selection.height < 10) {
            alert('Selection too small. Please select a larger area.');
            this.cancelScreenshot();
            return;
        }
        
        // Take screenshot
        this.takeScreenshot(selection);
    }

    takeScreenshot(selection) {
        // Since the overlay is positioned absolutely within the model-viewer-container,
        // the selection coordinates are already relative to the model viewer
        const viewerContainer = document.querySelector('.model-viewer-container');
        const rect = viewerContainer.getBoundingClientRect();
        
        // Ensure selection is within bounds
        const actualSelection = {
            x: Math.max(0, Math.min(selection.x, rect.width)),
            y: Math.max(0, Math.min(selection.y, rect.height)),
            width: Math.min(selection.width, rect.width - selection.x),
            height: Math.min(selection.height, rect.height - selection.y)
        };
        
        // Capture the model viewer
        this.captureModelViewer(actualSelection);
    }

    captureModelViewer(selection) {
        // Debug: Log the selection coordinates
        console.log('Screenshot selection:', selection);
        
        // Try to capture the actual model-viewer content
        try {
            // Method 1: Try to access the model-viewer's canvas directly
            const modelViewerCanvas = this.modelViewer.querySelector('canvas') || 
                                    this.modelViewer.shadowRoot?.querySelector('canvas');
            
            if (modelViewerCanvas) {
                console.log('Using direct canvas capture');
                this.captureRealModelContent(modelViewerCanvas, selection);
            } else {
                console.log('Using html2canvas capture');
                this.captureWithHtml2Canvas(selection);
            }
        } catch (error) {
            console.log('Using fallback enhanced screenshot');
            this.createEnhancedModelScreenshot(selection);
        }
    }

    captureRealModelContent(sourceCanvas, selection) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = selection.width;
        canvas.height = selection.height;
        
        console.log('Canvas capture - Source canvas size:', sourceCanvas.width, 'x', sourceCanvas.height);
        console.log('Canvas capture - Selection:', selection);
        
        try {
            // Draw the selected portion of the model-viewer canvas
            ctx.drawImage(sourceCanvas, 
                selection.x, selection.y, selection.width, selection.height,
                0, 0, selection.width, selection.height
            );
            
            this.saveScreenshot(canvas);
            
        } catch (error) {
            console.error('Canvas capture failed:', error);
            this.captureWithHtml2Canvas(selection);
        }
    }

    captureWithHtml2Canvas(selection) {
        if (typeof html2canvas === 'undefined') {
            this.createEnhancedModelScreenshot(selection);
            return;
        }
        
        const modelViewerElement = document.getElementById('modelViewer');
        
        html2canvas(modelViewerElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            width: selection.width,
            height: selection.height,
            x: selection.x,
            y: selection.y,
            scale: 1
        }).then(canvas => {
            this.saveScreenshot(canvas);
        }).catch(error => {
            this.createEnhancedModelScreenshot(selection);
        });
    }

    createEnhancedModelScreenshot(selection) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = selection.width;
        canvas.height = selection.height;
        
        // Create a more accurate representation
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
        );
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(0.7, '#e9ecef');
        gradient.addColorStop(1, '#dee2e6');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add "MODEL CONTENT NOT ACCESSIBLE" notice
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(10, 10, canvas.width - 20, 70);
        
        ctx.fillStyle = '#dc3545';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ MODEL VIEWER CONTENT PROTECTED', canvas.width / 2, 35);
        
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.fillText('Browser security prevents direct model capture', canvas.width / 2, 50);
        ctx.fillText('This represents the selected area of your 3D model', canvas.width / 2, 65);
        
        // Add model info overlay at bottom
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(10, canvas.height - 80, canvas.width - 20, 70);
        
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('📸 Screenshot Area Selected', 20, canvas.height - 55);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(`Model: ${this.currentModelName}`, 20, canvas.height - 35);
        ctx.fillText(`Selected Area: ${canvas.width}×${canvas.height}px`, 20, canvas.height - 20);
        ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 5);
        
        // Add selection border
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        ctx.setLineDash([]);
        
        this.saveScreenshot(canvas);
    }

    saveScreenshot(canvas) {
        const screenshot = {
            id: Date.now(),
            canvas: canvas,
            timestamp: new Date().toLocaleString(),
            modelVersion: this.currentModelName,
            createdBy: this.currentUser ? this.currentUser.name : 'Unknown User',
            createdByRole: this.currentUser ? this.currentUser.role : 'unknown',
            comments: []
        };
        
        // Trigger custom event for screenshot saved
        window.dispatchEvent(new CustomEvent('screenshotSaved', { 
            detail: screenshot 
        }));
        
        // Clean up the screenshot process
        this.cancelScreenshot();
    }

    cancelScreenshot() {
        this.isSelectingArea = false;
        const overlay = document.getElementById('screenshotOverlay');
        overlay.style.display = 'none';
        
        // Re-enable model controls
        this.modelViewer.setAttribute('camera-controls', '');
        this.modelViewer.style.pointerEvents = 'auto';
        
        // Clean up selection box
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        
        this.selectionStart = null;
    }
}
