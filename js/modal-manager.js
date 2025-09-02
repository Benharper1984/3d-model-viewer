/**
 * Modal Manager Module
 * Handles screenshot modal display
 */

class ModalManager {
    constructor() {
        this.setupEventListeners();
    }

    openModal(imageSrc) {
        const modal = document.getElementById('screenshotModal');
        const modalImage = document.getElementById('modalImage');
        
        modalImage.src = imageSrc;
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('screenshotModal').style.display = 'none';
    }

    setupEventListeners() {
        // Close modal when clicking outside
        document.addEventListener('DOMContentLoaded', () => {
            const modal = document.getElementById('screenshotModal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal();
                    }
                });
            }
        });
    }
}

// Global modal functions for backward compatibility
function openModal(imageSrc) {
    if (window.modalManager) {
        window.modalManager.openModal(imageSrc);
    }
}

function closeModal() {
    if (window.modalManager) {
        window.modalManager.closeModal();
    }
}
