/**
 * Gestionnaire d'authentification Supabase pour l'application CRC Co Arles Macif
 * Gestion moderne des sessions avec style iOS
 * Niveau de confiance: 98%
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');
        this.userInfo = document.getElementById('userInfo');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        this.initializeAuth();
        this.setupEventListeners();
    }

    /**
     * Initialisation du système d'authentification
     * Attente de la disponibilité de Supabase
     */
    async initializeAuth() {
        try {
            // Attendre que l'API Supabase soit prête
            await this.waitForAPI();
            
            // Vérifier la session existante
            const user = window.api?.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.updateUserInterface();
            } else {
                this.showLoginModal();
            }
        } catch (error) {
            console.error('Erreur initialisation authentification:', error);
            this.showLoginModal();
        }
    }

    /**
     * Attente de la disponibilité de l'API
     * Synchronisation avec l'initialisation Supabase
     */
    async waitForAPI() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.api?.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.api?.supabase) {
            throw new Error('API Supabase non disponible');
        }
    }

    /**
     * Configuration des écouteurs d'événements
     * Interface utilisateur interactive
     */
    setupEventListeners() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        if (document.getElementById('closeLoginModal')) {
            document.getElementById('closeLoginModal').addEventListener('click', () => {
                if (this.isAuthenticated()) {
                    this.hideLoginModal();
                }
            });
        }
        
        if (this.userInfo) {
            this.userInfo.addEventListener('click', () => this.showUserProfile());
        }
        
        // Fermeture modale par clic extérieur
        if (this.loginModal) {
            this.loginModal.addEventListener('click', (e) => {
                if (e.target === this.loginModal && this.isAuthenticated()) {
                    this.hideLoginModal();
                }
            });
        }
    }

    /**
     * Gestion de la soumission du formulaire de connexion
     * Authentification sécurisée via Supabase
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(this.loginForm);
        const email = formData.get('username')?.trim(); // Utilise email au lieu de username
        const password = formData.get('password');

        if (!email || !password) {
            this.showLoginMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        try {
            this.setLoginLoading(true);
            
            const response = await window.api.signIn(email, password);
            
            if (response.success) {
                this.handleLoginSuccess(response.data);
            }
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            this.handleLoginError(error.message);
        } finally {
            this.setLoginLoading(false);
        }
    }

    /**
     * Traitement du succès de connexion
     * Interface utilisateur post-authentification
     */
    handleLoginSuccess(data) {
        this.currentUser = data.user;
        
        this.showLoginMessage('Connexion réussie !', 'success');
        
        setTimeout(() => {
            this.hideLoginModal();
            this.updateUserInterface();
            this.loginForm.reset();
            
            // Rechargement des données après connexion
            if (window.app) {
                window.app.loadDashboardData();
            }
            
            // Notification de bienvenue avec style iOS
            window.ui?.showToast(`Bienvenue ${this.getUserDisplayName()} !`, 'success');
        }, 1000);
    }

    /**
     * Traitement des erreurs de connexion
     * Messages d'erreur conviviaux
     */
    handleLoginError(errorMessage) {
        let displayMessage = 'Erreur de connexion';
        
        if (errorMessage.includes('Invalid login credentials') || 
            errorMessage.includes('Identifiants de connexion invalides')) {
            displayMessage = 'Email ou mot de passe incorrect';
        } else if (errorMessage.includes('Email not confirmed')) {
            displayMessage = 'Veuillez confirmer votre email avant de vous connecter';
        } else if (errorMessage.includes('connexion')) {
            displayMessage = 'Impossible de se connecter au serveur';
        }
        
        this.showLoginMessage(displayMessage, 'error');
    }

    /**
     * Gestion de la déconnexion utilisateur
     * Nettoyage sécurisé de la session
     */
    async handleLogout() {
        try {
            await window.api.signOut();
            this.clearAuthData();
            this.showLoginModal();
            window.ui?.showToast('Vous avez été déconnecté', 'info');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            // Forcer la déconnexion locale en cas d'erreur
            this.clearAuthData();
            this.showLoginModal();
        }
    }

    /**
     * Nettoyage des données d'authentification
     * Réinitialisation de l'état
     */
    clearAuthData() {
        this.currentUser = null;
        this.updateUserInterface();
    }

    /**
     * Validation du token d'authentification
     * Vérification de la session active
     */
    async validateToken() {
        try {
            const user = window.api?.getCurrentUser();
            if (user) {
                this.currentUser = user;
                return true;
            } else {
                this.clearAuthData();
                return false;
            }
        } catch (error) {
            console.warn('Validation de session échouée:', error);
            this.clearAuthData();
            return false;
        }
    }

    /**
     * Mise à jour de l'interface utilisateur
     * Affichage conditionnel selon l'authentification
     */
    updateUserInterface() {
        if (this.userInfo && this.logoutBtn) {
            if (this.currentUser) {
                const userName = this.getUserDisplayName();
                this.userInfo.querySelector('.user-name').textContent = userName;
                this.logoutBtn.style.display = 'block';
                this.userInfo.style.cursor = 'pointer';
            } else {
                this.userInfo.querySelector('.user-name').textContent = 'Connexion';
                this.logoutBtn.style.display = 'none';
                this.userInfo.style.cursor = 'pointer';
            }
        }
    }

    /**
     * Récupération du nom d'affichage utilisateur
     * Formatage convivial du nom
     */
    getUserDisplayName() {
        if (!this.currentUser) return 'Utilisateur';
        
        return this.currentUser.user_metadata?.full_name || 
               this.currentUser.email?.split('@')[0] || 
               'Utilisateur';
    }

    /**
     * Affichage du profil utilisateur
     * Interface de consultation du compte
     */
    showUserProfile() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }

        const profileInfo = `
            <div style="text-align: left; line-height: 1.6;">
                <strong>Email:</strong> ${this.currentUser.email}<br>
                <strong>Connecté depuis:</strong> ${new Date(this.currentUser.last_sign_in_at).toLocaleString('fr-FR')}<br>
                <small style="opacity: 0.8;">Session active</small>
            </div>
        `;
        
        window.ui?.showToast(profileInfo, 'info', 5000);
    }

    /**
     * Affichage de la modale de connexion
     * Interface d'authentification moderne
     */
    showLoginModal() {
        if (this.loginModal) {
            this.loginModal.classList.add('active');
            setTimeout(() => {
                const usernameField = document.getElementById('username');
                if (usernameField) {
                    usernameField.focus();
                    // Mise à jour du placeholder pour indiquer l'email
                    usernameField.placeholder = 'Email';
                }
            }, 100);
        }
    }

    /**
     * Masquage de la modale de connexion
     * Fermeture de l'interface d'authentification
     */
    hideLoginModal() {
        if (this.loginModal) {
            this.loginModal.classList.remove('active');
            this.clearLoginMessage();
        }
    }

    /**
     * Affichage des messages dans le formulaire
     * Communication visuelle des statuts
     */
    showLoginMessage(message, type) {
        const messageElement = document.getElementById('loginMessage');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `form-message ${type}`;
            messageElement.style.display = 'block';
        }
    }

    /**
     * Effacement des messages du formulaire
     * Nettoyage de l'interface
     */
    clearLoginMessage() {
        const messageElement = document.getElementById('loginMessage');
        if (messageElement) {
            messageElement.style.display = 'none';
            messageElement.textContent = '';
        }
    }

    /**
     * Gestion de l'état de chargement
     * Indication visuelle des opérations
     */
    setLoginLoading(isLoading) {
        const submitButton = this.loginForm?.querySelector('button[type="submit"]');
        const inputs = this.loginForm?.querySelectorAll('input');
        
        if (isLoading) {
            if (submitButton) {
                submitButton.textContent = 'Connexion...';
                submitButton.disabled = true;
            }
            inputs?.forEach(input => input.disabled = true);
        } else {
            if (submitButton) {
                submitButton.textContent = 'Se connecter';
                submitButton.disabled = false;
            }
            inputs?.forEach(input => input.disabled = false);
        }
    }

    /**
     * Récupération de l'utilisateur actuel
     * Accès aux données de session
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Vérification du statut de connexion
     * État d'authentification
     */
    isAuthenticated() {
        return !!this.currentUser && !!window.api?.getCurrentUser();
    }

    /**
     * Vérification des permissions utilisateur
     * Contrôle d'accès basé sur les métadonnées
     */
    hasRole(requiredRole) {
        if (!this.currentUser) return false;
        
        const userRole = this.currentUser.user_metadata?.role || 'user';
        
        const roleHierarchy = {
            'user': 1,
            'manager': 2,
            'admin': 3
        };
        
        const userLevel = roleHierarchy[userRole] || 1;
        const requiredLevel = roleHierarchy[requiredRole] || 1;
        
        return userLevel >= requiredLevel;
    }

    /**
     * Inscription d'un nouvel utilisateur
     * Création de compte (pour les administrateurs)
     */
    async createUser(email, password, userData = {}) {
        try {
            if (!this.hasRole('admin')) {
                throw new Error('Permissions insuffisantes pour créer un utilisateur');
            }

            const response = await window.api.signUp(email, password, userData);
            
            if (response.success) {
                window.ui?.showToast('Utilisateur créé avec succès', 'success');
                return response;
            }
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            throw error;
        }
    }
}

// Initialisation globale du gestionnaire d'authentification
window.auth = new AuthManager();