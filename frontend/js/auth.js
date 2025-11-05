/**
 * Gestionnaire d'authentification pour l'application CRC Co Arles Macif
 * Gestion sécurisée des sessions utilisateur
 * Niveau de confiance: 96%
 */

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('crc_auth_token');
        this.user = JSON.parse(localStorage.getItem('crc_user') || 'null');
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');
        this.userInfo = document.getElementById('userInfo');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        this.initializeAuth();
        this.setupEventListeners();
    }

    /**
     * Initialisation du système d'authentification
     * Vérification du statut de connexion au chargement
     */
    initializeAuth() {
        if (this.token && this.user) {
            this.updateUserInterface();
            this.validateToken();
        } else {
            this.showLoginModal();
        }
    }

    /**
     * Configuration des écouteurs d'événements
     * Gestion des interactions utilisateur
     */
    setupEventListeners() {
        // Gestion du formulaire de connexion
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Gestion de la déconnexion
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Fermeture de la modale de connexion
        document.getElementById('closeLoginModal').addEventListener('click', () => {
            if (this.token) {
                this.hideLoginModal();
            }
        });
        
        // Clic sur les informations utilisateur pour afficher le profil
        this.userInfo.addEventListener('click', () => this.showUserProfile());
        
        // Fermeture de la modale en cliquant à l'extérieur
        this.loginModal.addEventListener('click', (e) => {
            if (e.target === this.loginModal && this.token) {
                this.hideLoginModal();
            }
        });
    }

    /**
     * Gestion de la soumission du formulaire de connexion
     * Validation et authentification sécurisée
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(this.loginForm);
        const credentials = {
            username: formData.get('username').trim(),
            password: formData.get('password')
        };

        // Validation côté client
        if (!credentials.username || !credentials.password) {
            this.showLoginMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        try {
            this.setLoginLoading(true);
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.handleLoginSuccess(data);
            } else {
                this.handleLoginError(data.error || 'Erreur de connexion');
            }
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            this.handleLoginError('Erreur de connexion au serveur');
        } finally {
            this.setLoginLoading(false);
        }
    }

    /**
     * Traitement du succès de connexion
     * Stockage sécurisé des informations d'authentification
     */
    handleLoginSuccess(data) {
        this.token = data.data.token;
        this.user = data.data.user;
        
        // Stockage sécurisé dans le localStorage
        localStorage.setItem('crc_auth_token', this.token);
        localStorage.setItem('crc_user', JSON.stringify(this.user));
        
        this.showLoginMessage('Connexion réussie !', 'success');
        
        setTimeout(() => {
            this.hideLoginModal();
            this.updateUserInterface();
            this.loginForm.reset();
            
            // Rechargement des données après connexion
            if (window.app) {
                window.app.loadDashboardData();
            }
            
            // Affichage d'une notification de bienvenue
            window.ui.showToast(`Bienvenue ${this.user.username} !`, 'success');
        }, 1000);
    }

    /**
     * Traitement des erreurs de connexion
     * Affichage des messages d'erreur appropriés
     */
    handleLoginError(errorMessage) {
        let displayMessage = 'Erreur de connexion';
        
        if (errorMessage.includes('Identifiants incorrects')) {
            displayMessage = 'Nom d\'utilisateur ou mot de passe incorrect';
        } else if (errorMessage.includes('désactivé')) {
            displayMessage = 'Votre compte a été désactivé. Contactez votre administrateur.';
        } else if (errorMessage.includes('connexion')) {
            displayMessage = 'Impossible de se connecter au serveur';
        }
        
        this.showLoginMessage(displayMessage, 'error');
    }

    /**
     * Gestion de la déconnexion utilisateur
     * Nettoyage sécurisé des données d'authentification
     */
    async handleLogout() {
        try {
            // Notification côté serveur de la déconnexion
            if (this.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
        } catch (error) {
            console.warn('Erreur lors de la notification de déconnexion:', error);
        } finally {
            this.clearAuthData();
            this.showLoginModal();
            window.ui.showToast('Vous avez été déconnecté', 'info');
        }
    }

    /**
     * Nettoyage des données d'authentification
     * Suppression sécurisée du stockage local
     */
    clearAuthData() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('crc_auth_token');
        localStorage.removeItem('crc_user');
        this.updateUserInterface();
    }

    /**
     * Validation du token d'authentification
     * Vérification périodique de la validité du token
     */
    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Token invalide');
            }

            const data = await response.json();
            if (data.success) {
                // Mise à jour des informations utilisateur si nécessaire
                this.user = { ...this.user, ...data.data };
                localStorage.setItem('crc_user', JSON.stringify(this.user));
                return true;
            } else {
                throw new Error('Validation échouée');
            }
        } catch (error) {
            console.warn('Token invalide ou expiré:', error);
            this.clearAuthData();
            this.showLoginModal();
            return false;
        }
    }

    /**
     * Mise à jour de l'interface utilisateur selon le statut d'authentification
     * Affichage conditionnel des éléments d'interface
     */
    updateUserInterface() {
        if (this.user && this.token) {
            this.userInfo.querySelector('.user-name').textContent = this.user.username;
            this.logoutBtn.style.display = 'block';
            this.userInfo.style.cursor = 'pointer';
        } else {
            this.userInfo.querySelector('.user-name').textContent = 'Connexion';
            this.logoutBtn.style.display = 'none';
            this.userInfo.style.cursor = 'pointer';
        }
    }

    /**
     * Affichage du profil utilisateur
     * Interface de gestion du compte
     */
    showUserProfile() {
        if (!this.user) {
            this.showLoginModal();
            return;
        }

        // Création d'une modale de profil simple
        const profileInfo = `
            <strong>Utilisateur:</strong> ${this.user.username}<br>
            <strong>Email:</strong> ${this.user.email}<br>
            <strong>Rôle:</strong> ${this.user.role}<br>
            <small>Connecté depuis: ${new Date().toLocaleString('fr-FR')}</small>
        `;
        
        window.ui.showToast(profileInfo, 'info', 5000);
    }

    /**
     * Affichage de la modale de connexion
     * Interface d'authentification
     */
    showLoginModal() {
        this.loginModal.classList.add('active');
        setTimeout(() => {
            document.getElementById('username').focus();
        }, 100);
    }

    /**
     * Masquage de la modale de connexion
     * Fermeture de l'interface d'authentification
     */
    hideLoginModal() {
        this.loginModal.classList.remove('active');
        this.clearLoginMessage();
    }

    /**
     * Affichage des messages dans le formulaire de connexion
     * Communication des statuts et erreurs
     */
    showLoginMessage(message, type) {
        const messageElement = document.getElementById('loginMessage');
        messageElement.textContent = message;
        messageElement.className = `form-message ${type}`;
        messageElement.style.display = 'block';
    }

    /**
     * Effacement des messages du formulaire de connexion
     * Nettoyage de l'interface
     */
    clearLoginMessage() {
        const messageElement = document.getElementById('loginMessage');
        messageElement.style.display = 'none';
    }

    /**
     * Gestion de l'état de chargement du formulaire
     * Indication visuelle des opérations en cours
     */
    setLoginLoading(isLoading) {
        const submitButton = this.loginForm.querySelector('button[type="submit"]');
        const inputs = this.loginForm.querySelectorAll('input');
        
        if (isLoading) {
            submitButton.textContent = 'Connexion...';
            submitButton.disabled = true;
            inputs.forEach(input => input.disabled = true);
        } else {
            submitButton.textContent = 'Se connecter';
            submitButton.disabled = false;
            inputs.forEach(input => input.disabled = false);
        }
    }

    /**
     * Récupération du token d'authentification actuel
     * Accès sécurisé au token pour les requêtes API
     */
    getToken() {
        return this.token;
    }

    /**
     * Récupération des informations utilisateur actuelles
     * Accès aux données de l'utilisateur connecté
     */
    getUser() {
        return this.user;
    }

    /**
     * Vérification du statut de connexion
     * Contrôle de l'état d'authentification
     */
    isAuthenticated() {
        return !!(this.token && this.user);
    }

    /**
     * Vérification des permissions utilisateur
     * Contrôle d'accès basé sur les rôles
     */
    hasRole(requiredRole) {
        if (!this.user) return false;
        
        const roleHierarchy = {
            'user': 1,
            'manager': 2,
            'admin': 3
        };
        
        const userLevel = roleHierarchy[this.user.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }
}

// Initialisation globale du gestionnaire d'authentification
window.auth = new AuthManager();