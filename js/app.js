/**
 * Main Application Controller
 * Coordinates all modules and handles initialization
 */

class App {
    constructor() {
        this.userManager = new UserManager();
        this.galleryManager = new GalleryManager();
        this.modelViewerController = new ModelViewerController();
        this.modalManager = new ModalManager();
        this.screenshotCore = null;
    }

    initialize() {
        // Initialize model viewer (but don't auto-load if model is already set)
        const modelViewer = this.modelViewerController.initialize();
        
        // Detect user and set permissions
        const currentUser = this.userManager.detectUserFromSession();
        this.galleryManager.setCurrentUser(currentUser);
        
        // Initialize screenshot core with dependencies
        this.screenshotCore = new ScreenshotCore(
            modelViewer, 
            this.modelViewerController.getCurrentModelName(), 
            currentUser
        );
        
        // Load stored data (use global client context if available)
        const clientContext = window.currentClient || 'default';
        this.galleryManager.loadStoredScreenshots();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Make managers globally available for backward compatibility
        window.galleryManager = this.galleryManager;
        window.modalManager = this.modalManager;
    }

    setupEventListeners() {
        // Listen for screenshot saved events
        window.addEventListener('screenshotSaved', (e) => {
            this.galleryManager.addScreenshot(e.detail);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'escape':
                    if (this.screenshotCore.isSelectingArea) {
                        this.screenshotCore.cancelScreenshot();
                    } else {
                        this.modalManager.closeModal();
                    }
                    break;
                case 'r':
                    if (!this.screenshotCore.isSelectingArea) {
                        this.modelViewerController.resetCamera();
                    }
                    break;
                case 'a':
                    if (!this.screenshotCore.isSelectingArea) {
                        this.modelViewerController.toggleAutoRotate();
                    }
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.screenshotCore.startScreenshot();
                    }
                    break;
            }
        });
    }

    // Global functions for backward compatibility
    startScreenshot() {
        this.screenshotCore.startScreenshot();
    }

    resetCamera() {
        this.modelViewerController.resetCamera();
    }

    toggleAutoRotate() {
        this.modelViewerController.toggleAutoRotate();
    }

    clearAllScreenshots() {
        this.galleryManager.clearAllScreenshots();
    }
}

// Global functions for backward compatibility
let app;

function startScreenshot() {
    if (app) app.startScreenshot();
}

function resetCamera() {
    if (app) app.resetCamera();
}

function toggleAutoRotate() {
    if (app) app.toggleAutoRotate();
}

function clearAllScreenshots() {
    if (app) app.clearAllScreenshots();
}

async function testBlobConnection() {
    if (!app || !app.galleryManager || !app.galleryManager.cloudStorage) {
        alert('❌ App not initialized properly');
        return;
    }
    
    const button = document.querySelector('.test-connection-btn');
    const originalText = button.textContent;
    
    // Show loading state
    button.textContent = '🔄 Testing...';
    button.disabled = true;
    
    try {
        const result = await app.galleryManager.cloudStorage.testConnection();
        
        if (result.success) {
            alert(`✅ ${result.message}\n\nTest file: ${result.testUrl}`);
            console.log('Blob storage test successful:', result);
        } else {
            alert(`❌ ${result.message}\n\nPlease check:\n- Vercel Blob is configured\n- BLOB_READ_WRITE_TOKEN is set\n- API routes are working`);
            console.error('Blob storage test failed:', result);
        }
    } catch (error) {
        alert(`❌ Connection test error: ${error.message}`);
        console.error('Connection test error:', error);
    } finally {
        // Restore button state
        button.textContent = originalText;
        button.disabled = false;
    }
}

// This will be called by the main HTML file
function initializeApp() {
    app = new App();
    app.initialize();
    
    // Make app globally available
    window.app = app;
}
