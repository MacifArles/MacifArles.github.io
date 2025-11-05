/**
 * Gestionnaire d'interface utilisateur Supabase pour l'application CRC Co Arles Macif
 * Interface moderne avec style iOS et intégration Supabase
 * Niveau de confiance: 98%
 */

class UIManager {
    constructor() {
        this.currentSection = 'home';
        this.toastTimeout = null;
        this.isInitialized = false;
        this.initializeEventListeners();
        this.initializeModals();
    }

    /**
     * Configuration des écouteurs d'événements principaux
     * Interface utilisateur moderne et responsive
     */
    initializeEventListeners() {
        this.setupNavigationHandlers();
        this.setupModalHandlers();
        this.setupFormHandlers();
        this.setupSearchHandlers();
        this.setupKeyboardShortcuts();
    }

    /**
     * Configuration de la navigation iOS moderne
     * Transitions fluides et animations
     */
    setupNavigationHandlers() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('data-section');
                this.navigateToSection(targetSection);
            });
        });

        // Gestion du menu mobile responsive
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('mobile-active');
                navToggle.classList.toggle('active');
            });
        }
    }

    /**
     * Configuration des gestionnaires de modales iOS
     * Interface moderne avec animations fluides
     */
    setupModalHandlers() {
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

        // Fermeture des modales par clic extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });

        // Fermeture par touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    /**
     * Configuration des gestionnaires de formulaires
     * Validation et soumission modernes
     */
    setupFormHandlers() {
        const eventForm = document.getElementById('eventForm');
        
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => this.handleEventSubmission(e));
        }
    }

    /**
     * Configuration des fonctionnalités de recherche
     * Recherche en temps réel et filtrage intelligent
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
                }, 400);
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
     * Configuration des raccourcis clavier iOS
     * Navigation rapide et actions clavier
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        this.focusSearchBox();
                        break;
                    case 'n':
                        e.preventDefault();
                        if (window.auth?.isAuthenticated()) {
                            this.showEventModal();
                        }
                        break;
                    case 'h':
                        e.preventDefault();
                        this.navigateToSection('home');
                        break;
                    case '1':
                        e.preventDefault();
                        this.navigateToSection('home');
                        break;
                    case '2':
                        e.preventDefault();
                        this.navigateToSection('trombinoscope');
                        break;
                    case '3':
                        e.preventDefault();
                        this.navigateToSection('agenda');
                        break;
                    case '4':
                        e.preventDefault();
                        this.navigateToSection('anniversaires');
                        break;
                }
            }
        });
    }

    /**
     * Initialisation des modales avec animation
     * Préparation des interfaces de dialogue
     */
    initializeModals() {
        this.resetEventForm();
    }

    /**
     * Navigation entre sections avec animations iOS
     * Transitions fluides et gestion d'état
     */
    navigateToSection(sectionName) {
        // Animation de sortie de la section actuelle
        const currentSection = document.querySelector('.content-section.active');
        if (currentSection) {
            currentSection.style.opacity = '0';
            currentSection.style.transform = 'translateY(-20px)';
        }

        setTimeout(() => {
            // Masquage de toutes les sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
                section.style.opacity = '';
                section.style.transform = '';
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
                targetSection.style.opacity = '0';
                targetSection.style.transform = 'translateY(30px)';
                
                // Animation d'entrée
                setTimeout(() => {
                    targetSection.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    targetSection.style.opacity = '1';
                    targetSection.style.transform = 'translateY(0)';
                }, 50);
            }

            if (targetNavLink) {
                targetNavLink.classList.add('active');
            }

            this.currentSection = sectionName;
            
            // Chargement des données spécifiques
            this.loadSectionData(sectionName);

        }, 150);
    }

    /**
     * Chargement des données par section
     * Optimisation selon le contexte
     */
    async loadSectionData(sectionName) {
        try {
            switch (sectionName) {
                case 'home':
                    await this.loadDashboardData();
                    break;
                case 'trombinoscope':
                    if (window.employees) {
                        await window.employees.loadEmployeeData();
                    }
                    break;
                case 'agenda':
                    if (window.events) {
                        await window.events.loadEventData();
                    }
                    break;
                case 'anniversaires':
                    await this.loadBirthdayData();
                    break;
            }
        } catch (error) {
            console.error(`Erreur de chargement pour ${sectionName}:`, error);
            this.showToast('Erreur lors du chargement des données', 'error');
        }
    }

    /**
     * Chargement du tableau de bord avec animations
     * Métriques et indicateurs principaux
     */
    async loadDashboardData() {
        if (!window.auth?.isAuthenticated()) {
            return;
        }

        try {
            this.showLoadingState('dashboard');
            
            const dashboardData = await window.api.getDashboardData();
            
            await this.updateDashboardCards(dashboardData);
            await this.updateRecentActivity(dashboardData);
            
            this.hideLoadingState('dashboard');
        } catch (error) {
            console.error('Erreur chargement tableau de bord:', error);
            this.hideLoadingState('dashboard');
            this.showToast('Impossible de charger les données du tableau de bord', 'error');
        }
    }

    /**
     * Mise à jour des cartes avec animations iOS
     * Compteurs animés et transitions fluides
     */
    async updateDashboardCards(data) {
        const updates = {
            'totalEmployees': data.employees?.totalEmployes || 0,
            'upcomingEvents': data.upcoming?.length || 0,
            'monthlyBirthdays': data.birthdays?.length || 0,
            'totalTeams': data.employees?.nombreEquipes || 0
        };

        // Animation séquentielle des cartes
        const cards = document.querySelectorAll('.dashboard-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.transform = 'translateY(-8px) scale(1.02)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 200);
            }, index * 100);
        });

        Object.entries(updates).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                this.animateNumber(element, value);
            }
        });
    }

    /**
     * Mise à jour de l'activité récente avec style iOS
     * Animations fluides et design moderne
     */
    async updateRecentActivity(data) {
        await this.updateRecentEvents(data.upcoming || []);
        await this.updateRecentBirthdays(data.birthdays || []);
    }

    /**
     * Affichage des événements récents avec animations
     * Interface moderne et interactive
     */
    async updateRecentEvents(events) {
        const container = document.getElementById('recentEvents');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-calendar"></i>
                    <p>Aucun événement à venir dans les prochains jours</p>
                </div>
            `;
            return;
        }

        const eventsHTML = events.slice(0, 4).map((event, index) => `
            <div class="activity-item" style="animation-delay: ${index * 100}ms">
                <div class="activity-icon">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="activity-content">
                    <h4>${this.escapeHtml(event.titre)}</h4>
                    <p>${window.api.formatDateTime(event.date_debut)}</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = eventsHTML;
    }

    /**
     * Affichage des anniversaires récents avec style moderne
     * Célébrations et notifications visuelles
     */
    async updateRecentBirthdays(birthdays) {
        const container = document.getElementById('recentBirthdays');
        if (!container) return;

        if (birthdays.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-cake-candles"></i>
                    <p>Aucun anniversaire ce mois-ci</p>
                </div>
            `;
            return;
        }

        const birthdaysHTML = birthdays.slice(0, 4).map((birthday, index) => `
            <div class="activity-item" style="animation-delay: ${index * 100}ms">
                <div class="activity-icon">
                    <i class="fas fa-cake-candles"></i>
                </div>
                <div class="activity-content">
                    <h4>${this.escapeHtml(birthday.prenom)} ${this.escapeHtml(birthday.nom)}</h4>
                    <p>${new Date(birthday.date_anniversaire).getDate()} ${new Date().toLocaleDateString('fr-FR', { month: 'long' })}</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = birthdaysHTML;
    }

    /**
     * Chargement des anniversaires avec animations
     * Interface dédiée aux célébrations
     */
    async loadBirthdayData() {
        if (!window.auth?.isAuthenticated()) {
            return;
        }

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
     * Affichage des anniversaires avec design iOS moderne
     * Cartes élégantes et animations fluides
     */
    displayBirthdays(birthdays) {
        const container = document.getElementById('birthdaysContainer');
        if (!container) return;

        if (birthdays.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-cake-candles"></i>
                    <h3>Aucun anniversaire ce mois-ci</h3>
                    <p>Revenez le mois prochain pour célébrer vos collègues !</p>
                </div>
            `;
            return;
        }

        const birthdaysHTML = birthdays.map((birthday, index) => `
            <div class="birthday-card" style="animation-delay: ${index * 150}ms">
                <div class="birthday-avatar">
                    ${birthday.photo_url && birthday.photo_url !== '/assets/default-avatar.png' 
                        ? `<img src="${birthday.photo_url}" alt="${this.escapeHtml(birthday.prenom)} ${this.escapeHtml(birthday.nom)}">`
                        : `<i class="fas fa-user"></i>`
                    }
                </div>
                <h3 class="birthday-name">${this.escapeHtml(birthday.prenom)} ${this.escapeHtml(birthday.nom)}</h3>
                <p class="birthday-position">${this.escapeHtml(birthday.poste)}</p>
                <p class="birthday-team">${this.escapeHtml(birthday.equipe)}</p>
                <div class="birthday-date">
                    ${new Date(birthday.date_anniversaire).getDate()} ${new Date().toLocaleDateString('fr-FR', { month: 'long' })}
                </div>
            </div>
        `).join('');

        container.innerHTML = birthdaysHTML;
    }

    /**
     * Gestion de la recherche avec feedback immédiat
     * Interface moderne et responsive
     */
    async handleEmployeeSearch(query) {
        if (query.length < 2 && query.length > 0) {
            return;
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
     * Interface intuitive et réactive
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
     * Gestion du filtrage des événements
     * Interface moderne et fluide
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
     * Affichage de la modale d'événement avec style iOS
     * Interface moderne et accessible
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
        
        // Focus intelligent avec délai pour l'animation
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
            }
        }, 200);
    }

    /**
     * Masquage de la modale avec animation
     * Transition fluide iOS
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
     * Réinitialisation du formulaire d'événement
     * État propre pour nouvelle saisie
     */
    resetEventForm() {
        const form = document.getElementById('eventForm');
        if (form) {
            form.reset();
            this.clearFormMessage('eventMessage');
        }
    }

    /**
     * Soumission du formulaire d'événement
     * Validation et création via Supabase
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
                
                // Mise à jour du tableau de bord si on y est
                if (this.currentSection === 'home') {
                    this.loadDashboardData();
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
     * Système de notifications toast iOS moderne
     * Interface élégante et non-intrusive
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageElement = toast.querySelector('.toast-message');
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        icon.className = `toast-icon ${icons[type] || icons.info}`;
        messageElement.innerHTML = this.escapeHtml(message);
        toast.className = `toast ${type}`;
        
        // Animation d'entrée iOS
        toast.classList.add('show');
        
        // Masquage automatique avec animation
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
        
        // Fermeture au clic
        toast.onclick = () => {
            toast.classList.remove('show');
            if (this.toastTimeout) {
                clearTimeout(this.toastTimeout);
            }
        };
    }

    /**
     * Affichage des messages de formulaire
     * Feedback visuel moderne
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
     * Effacement des messages
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
     * Interface utilisateur réactive
     */
    setFormLoading(formId, isLoading) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const submitButton = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, textarea, select, button');
        
        if (isLoading) {
            if (submitButton) {
                const originalText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';
                submitButton.disabled = true;
                submitButton.dataset.originalText = originalText;
            }
            inputs.forEach(input => input.disabled = true);
        } else {
            if (submitButton && submitButton.dataset.originalText) {
                submitButton.innerHTML = submitButton.dataset.originalText;
                submitButton.disabled = false;
                delete submitButton.dataset.originalText;
            }
            inputs.forEach(input => input.disabled = false);
        }
    }

    /**
     * États de chargement avec spinners iOS
     * Feedback visuel moderne et élégant
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
                element.innerHTML = '<div class="loading-spinner">Chargement des données...</div>';
            });
        }
    }

    /**
     * Masquage des états de chargement
     * Finalisation des opérations
     */
    hideLoadingState(section) {
        // L'état sera remplacé par les données réelles
    }

    /**
     * Animation des compteurs avec style iOS
     * Transitions fluides et naturelles
     */
    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - currentValue) / 25);
        const duration = 1200;
        const stepTime = duration / 25;
        
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
     * Focus sur la recherche avec raccourci
     * Navigation rapide iOS
     */
    focusSearchBox() {
        const searchInput = document.getElementById('employeeSearch');
        if (searchInput && this.currentSection === 'trombinoscope') {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Sécurisation HTML
     * Protection contre les injections
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
     * Récupération de la section active
     * État de navigation
     */
    getCurrentSection() {
        return this.currentSection;
    }

    /**
     * Mise à jour de l'interface utilisateur
     * Synchronisation avec l'état d'authentification
     */
    updateUserInterface() {
        // Cette méthode sera appelée par le gestionnaire d'authentification
        if (window.auth?.isAuthenticated() && this.currentSection === 'home') {
            this.loadDashboardData();
        }
    }

    /**
     * Masquage de la modale de connexion
     * Interface post-authentification
     */
    hideLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.remove('active');
        }
    }
}

// Initialisation globale du gestionnaire d'interface utilisateur
window.ui = new UIManager();