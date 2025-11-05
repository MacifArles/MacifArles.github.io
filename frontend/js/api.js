/**
 * Gestionnaire API pour l'application CRC Co Arles Macif
 * Interface de communication sécurisée avec le backend
 * Niveau de confiance: 97%
 */

class APIManager {
    constructor() {
        this.baseURL = '/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Construction des en-têtes avec authentification
     * Ajout automatique du token JWT
     */
    getAuthHeaders() {
        const headers = { ...this.defaultHeaders };
        const token = window.auth?.getToken();
        
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        return headers;
    }

    /**
     * Gestionnaire d'erreurs centralisé pour les requêtes API
     * Traitement uniforme des codes d'erreur
     */
    async handleResponse(response) {
        if (response.status === 401) {
            // Token expiré ou invalide
            window.auth?.clearAuthData();
            window.auth?.showLoginModal();
            throw new Error('Session expirée, veuillez vous reconnecter');
        }

        if (response.status === 403) {
            throw new Error('Permissions insuffisantes pour cette action');
        }

        if (response.status === 404) {
            throw new Error('Ressource non trouvée');
        }

        if (response.status >= 500) {
            throw new Error('Erreur serveur, veuillez réessayer plus tard');
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Erreur HTTP ${response.status}`);
        }

        return data;
    }

    /**
     * Méthode générique pour les requêtes GET
     * Récupération sécurisée des données
     */
    async get(endpoint, params = {}) {
        try {
            const url = new URL(`${this.baseURL}${endpoint}`, window.location.origin);
            
            // Ajout des paramètres de requête
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`Erreur GET ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Méthode générique pour les requêtes POST
     * Création sécurisée de nouvelles ressources
     */
    async post(endpoint, data = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`Erreur POST ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Méthode générique pour les requêtes PUT
     * Mise à jour sécurisée des ressources existantes
     */
    async put(endpoint, data = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`Erreur PUT ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Méthode générique pour les requêtes DELETE
     * Suppression sécurisée des ressources
     */
    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`Erreur DELETE ${endpoint}:`, error);
            throw error;
        }
    }

    // ===== MÉTHODES SPÉCIFIQUES AUX EMPLOYÉS =====

    /**
     * Récupération de tous les employés avec filtrage optionnel
     * Support des paramètres de recherche et d'équipe
     */
    async getEmployees(filters = {}) {
        return await this.get('/employees', filters);
    }

    /**
     * Récupération d'un employé spécifique par ID
     * Informations détaillées d'un collaborateur
     */
    async getEmployee(id) {
        return await this.get(`/employees/${id}`);
    }

    /**
     * Création d'un nouvel employé
     * Ajout sécurisé au trombinoscope
     */
    async createEmployee(employeeData) {
        return await this.post('/employees', employeeData);
    }

    /**
     * Mise à jour d'un employé existant
     * Modification des informations collaborateur
     */
    async updateEmployee(id, employeeData) {
        return await this.put(`/employees/${id}`, employeeData);
    }

    /**
     * Désactivation d'un employé
     * Suppression logique du trombinoscope
     */
    async deactivateEmployee(id) {
        return await this.delete(`/employees/${id}`);
    }

    /**
     * Récupération de la structure des équipes
     * Organisation hiérarchique du CRC
     */
    async getTeamStructure() {
        return await this.get('/employees/teams');
    }

    /**
     * Recherche d'employés par critères
     * Fonctionnalité de recherche avancée
     */
    async searchEmployees(query, filters = {}) {
        return await this.get('/employees/search', { q: query, ...filters });
    }

    /**
     * Statistiques des employés
     * Données pour le tableau de bord
     */
    async getEmployeeStats() {
        return await this.get('/employees/stats');
    }

    // ===== MÉTHODES SPÉCIFIQUES AUX ÉVÉNEMENTS =====

    /**
     * Récupération de tous les événements avec filtrage
     * Support des filtres par type et date
     */
    async getEvents(filters = {}) {
        return await this.get('/events', filters);
    }

    /**
     * Récupération des événements à venir
     * Planification et notifications proactives
     */
    async getUpcomingEvents(days = 30) {
        return await this.get('/events/upcoming', { days });
    }

    /**
     * Récupération des anniversaires du mois
     * Célébrations et événements spéciaux
     */
    async getBirthdays() {
        return await this.get('/events/birthdays');
    }

    /**
     * Création d'un nouvel événement
     * Ajout sécurisé à l'agenda
     */
    async createEvent(eventData) {
        return await this.post('/events', eventData);
    }

    /**
     * Mise à jour d'un événement existant
     * Modification des détails d'événement
     */
    async updateEvent(id, eventData) {
        return await this.put(`/events/${id}`, eventData);
    }

    /**
     * Suppression d'un événement
     * Retrait de l'agenda
     */
    async deleteEvent(id) {
        return await this.delete(`/events/${id}`);
    }

    /**
     * Récupération des participants d'un événement
     * Liste des invités et statuts de participation
     */
    async getEventParticipants(eventId) {
        return await this.get(`/events/${eventId}/participants`);
    }

    /**
     * Ajout d'un participant à un événement
     * Gestion des invitations
     */
    async addEventParticipant(eventId, employeeId, status = 'invite') {
        return await this.post(`/events/${eventId}/participants`, {
            employeeId,
            statut: status
        });
    }

    /**
     * Génération automatique des anniversaires
     * Création programmée des événements annuels
     */
    async generateBirthdayEvents(year = new Date().getFullYear()) {
        return await this.post('/events/generate-birthdays', { year });
    }

    /**
     * Statistiques des événements
     * Données pour le tableau de bord
     */
    async getEventStats() {
        return await this.get('/events/stats');
    }

    // ===== MÉTHODES UTILITAIRES =====

    /**
     * Test de connectivité avec le serveur
     * Vérification de la santé de l'API
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/auth/profile`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            return response.ok;
        } catch (error) {
            console.warn('Test de connectivité échoué:', error);
            return false;
        }
    }

    /**
     * Récupération des données complètes du tableau de bord
     * Chargement optimisé de toutes les statistiques
     */
    async getDashboardData() {
        try {
            const [employeeStats, eventStats, upcomingEvents, birthdays] = await Promise.all([
                this.getEmployeeStats(),
                this.getEventStats(),
                this.getUpcomingEvents(7),
                this.getBirthdays()
            ]);

            return {
                employees: employeeStats.data,
                events: eventStats.data,
                upcoming: upcomingEvents.data,
                birthdays: birthdays.data
            };
        } catch (error) {
            console.error('Erreur récupération données tableau de bord:', error);
            throw new Error('Impossible de charger les données du tableau de bord');
        }
    }

    /**
     * Formatage des dates pour l'affichage
     * Conversion en format français lisible
     */
    formatDate(dateString, options = {}) {
        if (!dateString) return '-';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };
        
        return new Date(dateString).toLocaleDateString('fr-FR', defaultOptions);
    }

    /**
     * Formatage des dates et heures
     * Affichage complet avec heure
     */
    formatDateTime(dateString, options = {}) {
        if (!dateString) return '-';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };
        
        return new Date(dateString).toLocaleDateString('fr-FR', defaultOptions);
    }

    /**
     * Calcul de l'âge depuis une date de naissance
     * Utilité pour les anniversaires
     */
    calculateAge(birthDate) {
        if (!birthDate) return null;
        
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Validation des données d'employé côté client
     * Contrôle de cohérence avant envoi
     */
    validateEmployeeData(data) {
        const errors = [];

        if (!data.nom || data.nom.trim().length < 2) {
            errors.push('Le nom doit contenir au moins 2 caractères');
        }

        if (!data.prenom || data.prenom.trim().length < 2) {
            errors.push('Le prénom doit contenir au moins 2 caractères');
        }

        if (!data.poste || data.poste.trim().length < 3) {
            errors.push('Le poste doit contenir au moins 3 caractères');
        }

        if (!data.equipe || data.equipe.trim().length < 2) {
            errors.push('L\'équipe doit être spécifiée');
        }

        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('Format d\'email invalide');
        }

        return errors;
    }

    /**
     * Validation des données d'événement côté client
     * Contrôle de cohérence avant envoi
     */
    validateEventData(data) {
        const errors = [];

        if (!data.titre || data.titre.trim().length < 3) {
            errors.push('Le titre doit contenir au moins 3 caractères');
        }

        if (!data.date_debut) {
            errors.push('La date de début est requise');
        }

        if (!data.type_evenement) {
            errors.push('Le type d\'événement est requis');
        }

        if (data.date_fin && new Date(data.date_fin) < new Date(data.date_debut)) {
            errors.push('La date de fin ne peut être antérieure à la date de début');
        }

        return errors;
    }

    /**
     * Validation d'adresse email
     * Contrôle du format selon les standards
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialisation globale du gestionnaire API
window.api = new APIManager();