/**
 * Gestionnaire d'événements pour l'application
 * Gestion du calendrier et des événements
 */

class EventsManager {
    constructor() {
        this.currentMonth = new Date();
        this.selectedDate = null;
        this.events = [];
        
        this.initializeEventListeners();
    }

    /**
     * Initialisation des écouteurs d'événements
     */
    initializeEventListeners() {
        // Bouton d'ajout d'événement
        const addEventBtn = document.getElementById('addEventBtn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => this.showEventModal());
        }

        // Formulaire d'événement
        const eventForm = document.getElementById('eventForm');
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => this.handleEventSubmit(e));
        }

        // Boutons de navigation du calendrier
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        }
        
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        }

        // Filtre de type d'événement
        const eventTypeFilter = document.getElementById('eventTypeFilter');
        if (eventTypeFilter) {
            eventTypeFilter.addEventListener('change', () => this.filterEvents());
        }

        // Fermeture de la modale
        const closeEventModal = document.getElementById('closeEventModal');
        if (closeEventModal) {
            closeEventModal.addEventListener('click', () => this.hideEventModal());
        }

        const cancelEventBtn = document.getElementById('cancelEvent');
        if (cancelEventBtn) {
            cancelEventBtn.addEventListener('click', () => this.hideEventModal());
        }
    }

    /**
     * Chargement des événements
     */
    async loadEvents() {
        try {
            if (!window.api || !window.api.isAuthenticated()) {
                console.log('Non authentifié, pas de chargement des événements');
                return;
            }

            const response = await window.api.getEvents();
            
            if (response.success) {
                this.events = response.data || [];
                this.renderCalendar();
                this.renderEventsList();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des événements:', error);
            this.showEmptyState('eventsList', 'Impossible de charger les événements');
        }
    }

    /**
     * Affichage de la modale d'événement
     */
    showEventModal(event = null) {
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        
        if (modal && form) {
            if (event) {
                // Mode édition
                document.getElementById('eventModalTitle').textContent = 'Modifier l\'événement';
                this.fillEventForm(event);
            } else {
                // Mode création
                document.getElementById('eventModalTitle').textContent = 'Nouvel événement';
                form.reset();
            }
            
            modal.classList.add('active');
        }
    }

    /**
     * Masquage de la modale
     */
    hideEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Soumission du formulaire d'événement
     */
    async handleEventSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const eventData = {
            titre: formData.get('titre'),
            description: formData.get('description'),
            type_evenement: formData.get('type_evenement'),
            date_debut: formData.get('date_debut'),
            lieu: formData.get('lieu')
        };

        try {
            const response = await window.api.createEvent(eventData);
            
            if (response.success) {
                window.ui?.showToast('Événement créé avec succès !', 'success');
                this.hideEventModal();
                this.loadEvents();
            }
        } catch (error) {
            console.error('Erreur création événement:', error);
            window.ui?.showToast('Erreur lors de la création', 'error');
        }
    }

    /**
     * Rendu du calendrier
     */
    renderCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) return;

        // Affichage simple pour l'instant
        calendarGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Calendrier en cours de développement</p>';
    }

    /**
     * Rendu de la liste d'événements
     */
    renderEventsList() {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        if (!this.events || this.events.length === 0) {
            this.showEmptyState('eventsList', 'Aucun événement à venir');
            return;
        }

        const upcomingEvents = this.events
            .filter(event => new Date(event.date_debut) > new Date())
            .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))
            .slice(0, 5);

        eventsList.innerHTML = upcomingEvents.map(event => this.createEventCard(event)).join('');
    }

    /**
     * Création d'une carte événement
     */
    createEventCard(event) {
        const eventDate = new Date(event.date_debut);
        const typeColors = {
            reunion: 'blue',
            formation: 'green',
            evenement: 'purple',
            conge: 'orange'
        };
        
        const color = typeColors[event.type_evenement] || 'blue';

        return `
            <div class="event-item">
                <div class="event-date" style="background-color: var(--ios-${color})">
                    <span class="event-day">${eventDate.getDate()}</span>
                    <span class="event-month">${eventDate.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                </div>
                <div class="event-details">
                    <h4>${event.titre}</h4>
                    <p>${event.description || ''}</p>
                    ${event.lieu ? `<span class="event-location"><i class="fas fa-location-dot"></i> ${event.lieu}</span>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Affichage état vide
     */
    showEmptyState(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-xmark"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    /**
     * Changement de mois
     */
    changeMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.renderCalendar();
    }

    /**
     * Filtrage des événements
     */
    filterEvents() {
        this.renderEventsList();
    }
}

// Initialisation globale
window.eventsManager = new EventsManager();

// Charger les événements au démarrage si authentifié
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.api?.isAuthenticated()) {
                window.eventsManager.loadEvents();
            }
        }, 1000);
    });
} else {
    setTimeout(() => {
        if (window.api?.isAuthenticated()) {
            window.eventsManager.loadEvents();
        }
    }, 1000);
}
