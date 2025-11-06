/**
 * Script principal de l'application Fad'Arles
 * Gestion de la navigation, initialisation et données du dashboard
 * Version avec support de la nouvelle page d'accueil
 */

class App {
    constructor() {
        this.currentSection = 'home';
        this.initializeNavigation();
        this.initializeApp();
    }

    /**
     * Initialisation de l'application
     */
    async initializeApp() {
        // Attendre que tous les managers soient prêts
        await this.waitForManagers();
        
        // Charger les données si authentifié
        if (window.auth?.isAuthenticated()) {
            this.loadHomeData();
        }
    }

    /**
     * Attendre que les managers soient initialisés
     */
    async waitForManagers() {
        let attempts = 0;
        while ((!window.api || !window.auth || !window.ui) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    /**
     * Initialisation de la navigation
     */
    initializeNavigation() {
        // Navigation principale
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Menu hamburger mobile
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });
        }

        // Fermer le menu en cliquant sur un lien (mobile)
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navMenu) navMenu.classList.remove('active');
                if (navToggle) navToggle.classList.remove('active');
            });
        });
    }

    /**
     * Affichage d'une section
     */
    showSection(sectionName) {
        // Masquer toutes les sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => section.classList.remove('active'));

        // Afficher la section demandée
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Mettre à jour la navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Charger les données de la section
        this.loadSectionData(sectionName);

        this.currentSection = sectionName;
    }

    /**
     * Chargement des données d'une section
     */
    async loadSectionData(section) {
        if (!window.auth?.isAuthenticated()) return;

        switch (section) {
            case 'home':
                await this.loadHomeData();
                break;
            case 'trombinoscope':
                if (window.employeesManager) {
                    window.employeesManager.loadEmployeeData();
                }
                break;
            case 'agenda':
                if (window.eventsManager) {
                    window.eventsManager.loadEvents();
                }
                break;
            case 'anniversaires':
                await this.loadBirthdays();
                break;
        }
    }

    /**
     * Chargement des données de la page d'accueil
     * Affiche les prochains événements et anniversaires du mois
     */
    async loadHomeData() {
        try {
            // Charger les prochains événements
            const upcomingEventsContainer = document.getElementById('homeUpcomingEvents');
            if (upcomingEventsContainer) {
                try {
                    const eventsResponse = await window.api.getUpcomingEvents(3);
                    if (eventsResponse.data && eventsResponse.data.length > 0) {
                        upcomingEventsContainer.innerHTML = eventsResponse.data.map(event => `
                            <div class="event-card-home">
                                <div class="event-icon">📅</div>
                                <h3>${this.escapeHtml(event.titre)}</h3>
                                <p>${this.escapeHtml(event.description || 'Aucune description')}</p>
                                <span class="event-date">${this.formatDate(event.date_debut)}</span>
                            </div>
                        `).join('');
                    } else {
                        upcomingEventsContainer.innerHTML = '<p class="no-data-text">Aucun événement à venir</p>';
                    }
                } catch (error) {
                    console.error('Erreur chargement événements:', error);
                    upcomingEventsContainer.innerHTML = '<p class="no-data-text">Aucun événement à venir</p>';
                }
            }

            // Charger les anniversaires du mois
            const birthdaysContainer = document.getElementById('homeBirthdays');
            if (birthdaysContainer) {
                try {
                    const birthdaysResponse = await window.api.getCurrentMonthBirthdays();
                    if (birthdaysResponse.data && birthdaysResponse.data.length > 0) {
                        birthdaysContainer.innerHTML = birthdaysResponse.data.map(person => `
                            <div class="birthday-card-home">
                                <div class="birthday-avatar">
                                    ${this.getInitials(person.prenom, person.nom)}
                                </div>
                                <h4>${this.escapeHtml(person.prenom)} ${this.escapeHtml(person.nom)}</h4>
                                <p>${this.escapeHtml(person.poste)}</p>
                                <span class="birthday-date">${this.formatBirthdayDate(person.date_anniversaire)}</span>
                            </div>
                        `).join('');
                    } else {
                        birthdaysContainer.innerHTML = '<p class="no-data-text">Aucun anniversaire ce mois-ci</p>';
                    }
                } catch (error) {
                    console.error('Erreur chargement anniversaires:', error);
                    birthdaysContainer.innerHTML = '<p class="no-data-text">Aucun anniversaire ce mois-ci</p>';
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la page d\'accueil:', error);
        }
    }

    /**
     * Chargement des données du tableau de bord (ancienne version, conservée pour compatibilité)
     */
    async loadDashboardData() {
        try {
            const data = await window.api.getDashboardData();
            
            // Mettre à jour les statistiques
            this.updateDashboardStats(data);
            
            // Afficher les événements récents
            this.displayRecentEvents(data.upcoming || []);
            
            // Afficher les anniversaires
            this.displayRecentBirthdays(data.birthdays || []);
            
        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
        }
    }

    /**
     * Mise à jour des statistiques du dashboard
     */
    updateDashboardStats(data) {
        // Total employés
        const totalEmployees = document.getElementById('totalEmployees');
        if (totalEmployees && data.employees) {
            totalEmployees.textContent = data.employees.totalEmployes || '0';
        }

        // Événements à venir
        const upcomingEvents = document.getElementById('upcomingEvents');
        if (upcomingEvents && data.upcoming) {
            upcomingEvents.textContent = data.upcoming.length || '0';
        }

        // Anniversaires du mois
        const monthlyBirthdays = document.getElementById('monthlyBirthdays');
        if (monthlyBirthdays && data.birthdays) {
            monthlyBirthdays.textContent = data.birthdays.length || '0';
        }

        // Nombre d'équipes
        const totalTeams = document.getElementById('totalTeams');
        if (totalTeams && data.employees) {
            totalTeams.textContent = data.employees.nombreEquipes || '0';
        }
    }

    /**
     * Affichage des événements récents
     */
    displayRecentEvents(events) {
        const container = document.getElementById('recentEvents');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = '<p class="empty-message">Aucun événement à venir</p>';
            return;
        }

        container.innerHTML = events.slice(0, 3).map(event => `
            <div class="activity-item">
                <i class="fas fa-calendar-check"></i>
                <div>
                    <strong>${this.escapeHtml(event.titre)}</strong>
                    <span>${this.formatDate(event.date_debut)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Affichage des anniversaires récents
     */
    displayRecentBirthdays(birthdays) {
        const container = document.getElementById('recentBirthdays');
        if (!container) return;

        if (birthdays.length === 0) {
            container.innerHTML = '<p class="empty-message">Aucun anniversaire ce mois-ci</p>';
            return;
        }

        container.innerHTML = birthdays.slice(0, 3).map(person => `
            <div class="activity-item">
                <i class="fas fa-cake-candles"></i>
                <div>
                    <strong>${this.escapeHtml(person.prenom)} ${this.escapeHtml(person.nom)}</strong>
                    <span>${this.formatBirthdayDate(person.date_anniversaire)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Chargement des anniversaires
     */
    async loadBirthdays() {
        try {
            const response = await window.api.getBirthdays();
            
            const container = document.getElementById('birthdaysContainer');
            if (!container) return;

            if (!response.data || response.data.length === 0) {
                container.innerHTML = '<p class="empty-state">Aucun anniversaire ce mois-ci</p>';
                return;
            }

            container.innerHTML = response.data.map(person => `
                <div class="birthday-card">
                    <div class="birthday-icon">
                        <i class="fas fa-cake-candles"></i>
                    </div>
                    <div class="birthday-info">
                        <h3>${this.escapeHtml(person.prenom)} ${this.escapeHtml(person.nom)}</h3>
                        <p>${this.escapeHtml(person.poste)} - ${this.escapeHtml(person.equipe)}</p>
                        <span class="birthday-date">
                            ${this.formatBirthdayDate(person.date_anniversaire)}
                        </span>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Erreur chargement anniversaires:', error);
        }
    }

    /**
     * Formatage d'une date
     */
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Formatage d'une date d'anniversaire (sans année)
     */
    formatBirthdayDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Génération des initiales
     */
    getInitials(prenom, nom) {
        const firstInitial = prenom ? prenom.charAt(0).toUpperCase() : '';
        const lastInitial = nom ? nom.charAt(0).toUpperCase() : '';
        return firstInitial + lastInitial;
    }

    /**
     * Sécurisation des chaînes HTML
     * Protection contre les injections de code
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
        
        return text.replace(/[&<>"']/g, match => map[match]);
    }
}

// Initialisation de l'application
window.app = new App();

console.log('Application Fad\'Arles initialisée avec succès ! 🚀');
