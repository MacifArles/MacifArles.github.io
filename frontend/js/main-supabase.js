/**
 * Script principal de l'application
 * Gestion de la navigation et initialisation
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
            this.loadDashboardData();
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
                this.loadDashboardData();
                break;
            case 'trombinoscope':
                if (window.employeesManager) {
                    window.employeesManager.loadEmployees();
                }
                break;
            case 'agenda':
                if (window.eventsManager) {
                    window.eventsManager.loadEvents();
                }
                break;
            case 'anniversaires':
                this.loadBirthdays();
                break;
        }
    }

    /**
     * Chargement des données du tableau de bord
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
                    <strong>${event.titre}</strong>
                    <span>${new Date(event.date_debut).toLocaleDateString('fr-FR')}</span>
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
                    <strong>${person.prenom} ${person.nom}</strong>
                    <span>${new Date(person.date_anniversaire).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
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
                        <h3>${person.prenom} ${person.nom}</h3>
                        <p>${person.poste} - ${person.equipe}</p>
                        <span class="birthday-date">
                            ${new Date(person.date_anniversaire).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </span>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Erreur chargement anniversaires:', error);
        }
    }
}

// Initialisation de l'application
window.app = new App();

console.log('Application FADARLES initialisée avec succès ! 🚀');
