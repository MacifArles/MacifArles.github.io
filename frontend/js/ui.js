/**
 * Gestionnaire d'interface utilisateur pour l'application CRC Co Arles Macif
 * Orchestration des interactions et gestion de l'affichage
 * Niveau de confiance: 96%
 */

class UIManager {
    constructor() {
        this.currentSection = 'home';
        this.toastTimeout = null;
        this.initializeEventListeners();
        this.initializeModals();
    }

    /**
     * Configuration des écouteurs d'événements principaux
     * Établissement de la communication entre les éléments d'interface
     */
    initializeEventListeners() {
        this.setupNavigationHandlers();
        this.setupModalHandlers();
        this.setupFormHandlers();
        this.setupSearchHandlers();
    }

    /**
     * Configuration de la navigation principale
     * Gestion des transitions entre les sections de l'application
     */
    setupNavigationHandlers() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.content-section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('data-section');
                this.navigateToSection(targetSection);
            });
        });

        // Gestion du menu mobile
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
    }

    /**
     * Configuration des gestionnaires de modales
     * Contrôle de l'ouverture et fermeture des interfaces de dialogue
     */
    setupModalHandlers() {
        // Gestion de la modale d'événement
        const addEventBtn = document.getElementById('addEventBtn');
        const eventModal = document.getElementById('eventModal');
        const closeEventModal = document.getElementById('closeEventModal');
        const cancelEvent = document.getElementById('cancelEvent');

        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => this.showEventModal());
        }

        if (closeEventModal) {
            closeEventModal.addEventListener('click', () => this.hideEventModal());
        }

        if (cancelEvent) {
            cancelEvent.addEventListener('click', () => this.hideEventModal());
        }

        // Fermeture des modales en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });

        // Fermeture des modales avec la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    /**
     * Configuration des gestionnaires de formulaires
     * Traitement des soumissions et validations
     */
    setupFormHandlers() {
        const eventForm = document.getElementById('eventForm');
        
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => this.handleEventSubmission(e));
        }
    }

    /**
     * Configuration des fonctionnalités de recherche
     * Gestion des filtres et recherches en temps réel
     */
    setupSearchHandlers() {
        const employeeSearch = document.getElementById('employeeSearch');
        const teamFilter = document.getElementById('teamFilter');
        const eventTypeFilter = document.getElementById('eventTypeFilter');

        if (employeeSearch) {
            let searchTimeout;
            employeeSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleEmployeeSearch(e.target.value);
                }, 300);
            });
        }

        if (teamFilter) {
            teamFilter.addEventListener('change', (e) => {
                this.handleTeamFilter(e.target.value);
            });
        }

        if (eventTypeFilter) {
            eventTypeFilter.addEventListener('change', (e) => {
                this.handleEventTypeFilter(e.target.value);
            });
        }
    }

    /**
     * Initialisation des modales avec configuration par défaut
     * Préparation des interfaces de dialogue
     */
    initializeModals() {
        this.resetEventForm();
    }

    /**
     * Navigation entre les sections de l'application
     * Transition fluide et mise à jour de l'état
     */
    navigateToSection(sectionName) {
        // Masquage de toutes les sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Mise à jour des liens de navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Affichage de la section cible
        const targetSection = document.getElementById(sectionName);
        const targetNavLink = document.querySelector(`[data-section="${sectionName}"]`);

        if (targetSection) {
            targetSection.classList.add('active');
        }

        if (targetNavLink) {
            targetNavLink.classList.add('active');
        }

        this.currentSection = sectionName;

        // Chargement des données spécifiques à la section
        this.loadSectionData(sectionName);
    }

    /**
     * Chargement des données spécifiques à chaque section
     * Optimisation du chargement selon le contexte
     */
    async loadSectionData(sectionName) {
        try {
            switch (sectionName) {
                case 'home':
                    await this.loadDashboardData();
                    break;
                case 'trombinoscope':
                    await window.employees.loadEmployeeData();
                    break;
                case 'agenda':
                    await window.events.loadEventData();
                    break;
                case 'anniversaires':
                    await this.loadBirthdayData();
                    break;
            }
        } catch (error) {
            console.error(`Erreur de chargement pour la section ${sectionName}:`, error);
            this.showToast('Erreur lors du chargement des données', 'error');
        }
    }

    /**
     * Chargement des données du tableau de bord
     * Affichage des statistiques et indicateurs principaux
     */
    async loadDashboardData() {
        try {
            this.showLoadingState('dashboard');
            
            const dashboardData = await window.api.getDashboardData();
            
            this.updateDashboardCards(dashboardData);
            this.updateRecentActivity(dashboardData);
            
            this.hideLoadingState('dashboard');
        } catch (error) {
            console.error('Erreur chargement tableau de bord:', error);
            this.hideLoadingState('dashboard');
            this.showToast('Impossible de charger les données du tableau de bord', 'error');
        }
    }

    /**
     * Mise à jour des cartes du tableau de bord
     * Affichage des métriques principales
     */
    updateDashboardCards(data) {
        const updates = {
            'totalEmployees': data.employees?.totalEmployes || 0,
            'upcomingEvents': data.upcoming?.length || 0,
            'monthlyBirthdays': data.birthdays?.length || 0,
            'totalTeams': data.employees?.nombreEquipes || 0
        };

        Object.entries(updates).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                this.animateNumber(element, value);
            }
        });
    }

    /**
     * Mise à jour de l'activité récente
     * Affichage des événements et anniversaires à venir
     */
    updateRecentActivity(data) {
        this.updateRecentEvents(data.upcoming || []);
        this.updateRecentBirthdays(data.birthdays || []);
    }

    /**
     * Affichage des événements récents
     * Liste des prochains événements importants
     */
    updateRecentEvents(events) {
        const container = document.getElementById('recentEvents');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = '<p class="no-data">Aucun événement à venir</p>';
            return;
        }

        const eventsHTML = events.slice(0, 5).map(event => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-calendar"></i>
                </div>
                <div class="activity-content">
                    <h4>${this.escapeHtml(event.titre)}</h4>
                    <p>${window.api.formatDateTime(event.dateDebut)}</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = eventsHTML;
    }

    /**
     * Affichage des anniversaires récents
     * Liste des prochains anniversaires à célébrer
     */
    updateRecentBirthdays(birthdays) {
        const container = document.getElementById('recentBirthdays');
        if (!container) return;

        if (birthdays.length === 0) {
            container.innerHTML = '<p class="no-data">Aucun anniversaire ce mois-ci</p>';
            return;
        }

        const birthdaysHTML = birthdays.slice(0, 5).map(birthday => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-birthday-cake"></i>
                </div>
                <div class="activity-content">
                    <h4>${this.escapeHtml(birthday.nomComplet)}</h4>
                    <p>${birthday.jourAnniversaire} ${new Date().toLocaleDateString('fr-FR', { month: 'long' })}</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = birthdaysHTML;
    }

    /**
     * Chargement des données d'anniversaires
     * Affichage détaillé de la section anniversaires
     */
    async loadBirthdayData() {
        try {
            this.showLoadingState('birthdays');
            
            const response = await window.api.getBirthdays();
            const birthdays = response.data || [];
            
            this.displayBirthdays(birthdays);
            this.hideLoadingState('birthdays');
        } catch (error) {
            console.error('Erreur chargement anniversaires:', error);
            this.hideLoadingState('birthdays');
            this.showToast('Impossible de charger les anniversaires', 'error');
        }
    }

    /**
     * Affichage de la liste des anniversaires
     * Présentation détaillée avec photos et informations
     */
    displayBirthdays(birthdays) {
        const container = document.getElementById('birthdaysContainer');
        if (!container) return;

        if (birthdays.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-birthday-cake"></i>
                    <h3>Aucun anniversaire ce mois-ci</h3>
                    <p>Revenez le mois prochain pour célébrer vos collègues !</p>
                </div>
            `;
            return;
        }

        const birthdaysHTML = birthdays.map(birthday => `
            <div class="birthday-card">
                <div class="birthday-avatar">
                    ${birthday.photoUrl && birthday.photoUrl !== '/assets/default-avatar.png' 
                        ? `<img src="${birthday.photoUrl}" alt="${this.escapeHtml(birthday.nomComplet)}">`
                        : `<i class="fas fa-user"></i>`
                    }
                </div>
                <h3 class="birthday-name">${this.escapeHtml(birthday.nomComplet)}</h3>
                <p class="birthday-position">${this.escapeHtml(birthday.poste)}</p>
                <p class="birthday-team">${this.escapeHtml(birthday.equipe)}</p>
                <div class="birthday-date">
                    ${birthday.jourAnniversaire} ${new Date().toLocaleDateString('fr-FR', { month: 'long' })}
                </div>
            </div>
        `).join('');

        container.innerHTML = birthdaysHTML;
    }

    /**
     * Gestion de la recherche d'employés
     * Filtrage en temps réel du trombinoscope
     */
    async handleEmployeeSearch(query) {
        if (query.length < 2 && query.length > 0) {
            return; // Attendre au moins 2 caractères
        }

        try {
            if (window.employees && typeof window.employees.searchEmployees === 'function') {
                await window.employees.searchEmployees(query);
            }
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            this.showToast('Erreur lors de la recherche', 'error');
        }
    }

    /**
     * Gestion du filtrage par équipe
     * Application du filtre sur le trombinoscope
     */
    async handleTeamFilter(teamName) {
        try {
            if (window.employees && typeof window.employees.filterByTeam === 'function') {
                await window.employees.filterByTeam(teamName);
            }
        } catch (error) {
            console.error('Erreur lors du filtrage:', error);
            this.showToast('Erreur lors du filtrage', 'error');
        }
    }

    /**
     * Gestion du filtrage par type d'événement
     * Application du filtre sur l'agenda
     */
    async handleEventTypeFilter(eventType) {
        try {
            if (window.events && typeof window.events.filterByType === 'function') {
                await window.events.filterByType(eventType);
            }
        } catch (error) {
            console.error('Erreur lors du filtrage des événements:', error);
            this.showToast('Erreur lors du filtrage', 'error');
        }
    }

    /**
     * Affichage de la modale d'événement
     * Interface de création d'événement
     */
    showEventModal(eventData = null) {
        const modal = document.getElementById('eventModal');
        const title = document.getElementById('eventModalTitle');
        
        if (eventData) {
            title.textContent = 'Modifier l\'événement';
            this.populateEventForm(eventData);
        } else {
            title.textContent = 'Nouvel événement';
            this.resetEventForm();
        }
        
        modal.classList.add('active');
        
        // Focus sur le premier champ
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    /**
     * Masquage de la modale d'événement
     * Fermeture de l'interface de création
     */
    hideEventModal() {
        const modal = document.getElementById('eventModal');
        modal.classList.remove('active');
        this.resetEventForm();
    }

    /**
     * Fermeture de toutes les modales
     * Nettoyage général de l'interface
     */
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.resetEventForm();
    }

    /**
     * Remise à zéro du formulaire d'événement
     * Préparation pour une nouvelle saisie
     */
    resetEventForm() {
        const form = document.getElementById('eventForm');
        if (form) {
            form.reset();
            this.clearFormMessage('eventMessage');
        }
    }

    /**
     * Remplissage du formulaire d'événement avec des données existantes
     * Préparation pour la modification
     */
    populateEventForm(eventData) {
        const form = document.getElementById('eventForm');
        if (!form || !eventData) return;

        const fields = {
            'eventTitle': eventData.titre,
            'eventDescription': eventData.description,
            'eventType': eventData.typeEvenement,
            'eventDate': eventData.dateDebut ? new Date(eventData.dateDebut).toISOString().slice(0, 16) : '',
            'eventLocation': eventData.lieu
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value !== undefined) {
                field.value = value;
            }
        });
    }

    /**
     * Traitement de la soumission du formulaire d'événement
     * Validation et envoi des données
     */
    async handleEventSubmission(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const eventData = {
            titre: formData.get('titre')?.trim(),
            description: formData.get('description')?.trim(),
            type_evenement: formData.get('type_evenement'),
            date_debut: formData.get('date_debut'),
            lieu: formData.get('lieu')?.trim()
        };

        // Validation côté client
        const validationErrors = window.api.validateEventData(eventData);
        if (validationErrors.length > 0) {
            this.showFormMessage('eventMessage', validationErrors.join(', '), 'error');
            return;
        }

        try {
            this.setFormLoading('eventForm', true);
            
            const response = await window.api.createEvent(eventData);
            
            this.showFormMessage('eventMessage', 'Événement créé avec succès !', 'success');
            
            setTimeout(() => {
                this.hideEventModal();
                this.showToast('Événement créé avec succès', 'success');
                
                // Rechargement des données d'événements
                if (window.events && typeof window.events.loadEventData === 'function') {
                    window.events.loadEventData();
                }
            }, 1500);
            
        } catch (error) {
            console.error('Erreur création événement:', error);
            this.showFormMessage('eventMessage', error.message, 'error');
        } finally {
            this.setFormLoading('eventForm', false);
        }
    }

    /**
     * Affichage des notifications toast
     * Système de notification non-intrusif
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageElement = toast.querySelector('.toast-message');
        
        // Configuration de l'icône selon le type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        icon.className = `toast-icon ${icons[type] || icons.info}`;
        messageElement.innerHTML = this.escapeHtml(message);
        toast.className = `toast ${type}`;
        
        // Affichage du toast
        toast.classList.add('show');
        
        // Masquage automatique
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
        
        // Fermeture manuelle au clic
        toast.onclick = () => {
            toast.classList.remove('show');
            if (this.toastTimeout) {
                clearTimeout(this.toastTimeout);
            }
        };
    }

    /**
     * Affichage des messages dans les formulaires
     * Communication des statuts et erreurs
     */
    showFormMessage(elementId, message, type) {
        const messageElement = document.getElementById(elementId);
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `form-message ${type}`;
            messageElement.style.display = 'block';
        }
    }

    /**
     * Effacement des messages de formulaire
     * Nettoyage de l'interface
     */
    clearFormMessage(elementId) {
        const messageElement = document.getElementById(elementId);
        if (messageElement) {
            messageElement.style.display = 'none';
            messageElement.textContent = '';
        }
    }

    /**
     * Gestion de l'état de chargement des formulaires
     * Indication visuelle des opérations en cours
     */
    setFormLoading(formId, isLoading) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const submitButton = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, textarea, select, button');
        
        if (isLoading) {
            if (submitButton) {
                submitButton.textContent = 'Création...';
                submitButton.disabled = true;
            }
            inputs.forEach(input => input.disabled = true);
        } else {
            if (submitButton) {
                submitButton.textContent = 'Créer l\'événement';
                submitButton.disabled = false;
            }
            inputs.forEach(input => input.disabled = false);
        }
    }

    /**
     * Affichage des états de chargement
     * Indication visuelle des opérations de récupération de données
     */
    showLoadingState(section) {
        const selectors = {
            dashboard: '#recentEvents, #recentBirthdays',
            birthdays: '#birthdaysContainer',
            employees: '#teamStructure',
            events: '#eventsList'
        };
        
        const selector = selectors[section];
        if (selector) {
            document.querySelectorAll(selector).forEach(element => {
                element.innerHTML = '<div class="loading-spinner">Chargement...</div>';
            });
        }
    }

    /**
     * Masquage des états de chargement
     * Finalisation des opérations de chargement
     */
    hideLoadingState(section) {
        // L'état de chargement sera remplacé par les données réelles
        // Cette méthode sert principalement pour la cohérence de l'API
    }

    /**
     * Animation des nombres dans les cartes du tableau de bord
     * Effet visuel de mise à jour progressive
     */
    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - currentValue) / 20);
        const duration = 1000; // 1 seconde
        const stepTime = duration / 20;
        
        let current = currentValue;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
                current = targetValue;
                clearInterval(timer);
            }
            element.textContent = current;
        }, stepTime);
    }

    /**
     * Échappement HTML pour la sécurité
     * Prévention des attaques XSS
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, (match) => map[match]);
    }

    /**
     * Récupération de la section active actuelle
     * Information sur l'état de navigation
     */
    getCurrentSection() {
        return this.currentSection;
    }

    /**
     * Vérification de la visibilité d'un élément
     * Utilitaire pour les optimisations d'affichage
     */
    isElementVisible(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && 
               rect.bottom <= window.innerHeight && 
               rect.right <= window.innerWidth;
    }
}

// Initialisation globale du gestionnaire d'interface utilisateur
window.ui = new UIManager();