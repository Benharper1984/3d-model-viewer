/**
 * User Manager Module
 * Handles user authentication and permissions
 */

class UserManager {
    constructor() {
        this.currentUser = null;
        this.USER_ROLES = {
            'testing123': { name: 'Admin', role: 'admin', canDelete: true },
            'LotuS': { name: 'The Thoughtful Father', role: 'client', canDelete: false },
            'DeckinRear': { name: 'The Favorite Neighbors', role: 'client', canDelete: false }
        };
    }

    detectUserFromSession() {
        const urlParams = new URLSearchParams(window.location.search);
        const userPassword = urlParams.get('user') || sessionStorage.getItem('currentUser');
        
        if (userPassword && this.USER_ROLES[userPassword]) {
            this.currentUser = this.USER_ROLES[userPassword];
            sessionStorage.setItem('currentUser', userPassword);
            this.updateUIForUser();
        } else {
            // Default to admin for testing page
            this.currentUser = this.USER_ROLES['testing123'];
        }
        
        return this.currentUser;
    }

    updateUIForUser() {
        if (this.currentUser) {
            // Add user indicator to header
            const header = document.querySelector('.viewer-header h2');
            header.innerHTML = `Current Design Model <span style="font-size: 14px; color: #667eea; font-weight: normal;">(${this.currentUser.name})</span>`;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    canUserDelete() {
        return this.currentUser && this.currentUser.canDelete;
    }
}
