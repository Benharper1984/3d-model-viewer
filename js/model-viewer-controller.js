/**
 * Model Viewer Controller
 * Handles 3D model loading and controls
 */

class ModelViewerController {
    constructor() {
        this.modelViewer = null;
        this.autoRotateEnabled = false;
        this.currentModelName = 'current-design.glb';
    }

    initialize() {
        this.modelViewer = document.getElementById('modelViewer');
        
        // Only auto-load if no model is already set
        if (!this.modelViewer.src) {
            this.loadCurrentDesign();
        }
        
        return this.modelViewer;
    }

    loadCurrentDesign() {
        // Check if we're in a client context, otherwise use default
        const clientPath = window.currentClient ? 
            `public/models/${window.currentClient}/current-design.glb` : 
            'public/models/the-thoughtful-father/current-design.glb';
            
        this.modelViewer.src = clientPath;
        
        // Update model info and name
        const modelInfo = document.getElementById('modelInfo');
        const modelNameDisplay = document.getElementById('currentModelName');
        
        this.currentModelName = 'current-design.glb';
        modelInfo.textContent = 'Loaded: Current Design Model';
        modelNameDisplay.textContent = this.currentModelName;
        
        // Handle loading errors
        this.modelViewer.addEventListener('error', (e) => {
            document.getElementById('modelInfo').textContent = 'Current design model not available';
            modelNameDisplay.textContent = 'Model not found';
            this.currentModelName = 'model-not-found';
        }, { once: true });
    }

    resetCamera() {
        if (this.modelViewer.src) {
            this.modelViewer.resetTurntableRotation();
            this.modelViewer.jumpCameraToGoal();
        }
    }

    toggleAutoRotate() {
        const btn = document.getElementById('autoRotateBtn');
        this.autoRotateEnabled = !this.autoRotateEnabled;
        
        if (this.autoRotateEnabled) {
            this.modelViewer.setAttribute('auto-rotate', '');
            btn.textContent = 'Auto Rotate: ON';
            btn.classList.remove('active');
        } else {
            this.modelViewer.removeAttribute('auto-rotate');
            btn.textContent = 'Auto Rotate: OFF';
            btn.classList.add('active');
        }
    }

    getModelViewer() {
        return this.modelViewer;
    }

    getCurrentModelName() {
        return this.currentModelName;
    }
}
