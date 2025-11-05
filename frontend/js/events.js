/**
 * Module de gestion des événements pour l'application CRC Co Arles Macif
 * Orchestration de l'agenda et des fonctionnalités de planification
 * Niveau de confiance: 97%
 */

class EventManager {
    constructor() {
        this.events = [];
        this.filteredEvents = [];
        this.currentEventTypeFilter = '';
        this.currentMonth = new Date();
        this.calendarInitialized = false;
        
        this.initializeEventManagement();
    }

    /**
     * Initialisation du gestionnaire d'événements
     * Configuration des fonctionnalités de base de l'agenda
     */
    initializeEventManagement() {
        this.setupCalendarControls();
        this.bindEventHandlers();
    }

    /**
     * Configuration des contrôles du calendrier
     * Préparation des interactions de navigation temporelle
     */
    setupCalendarControls() {
        const prevButton = document.getElementById('prevMonth');
        const nextButton = document.getElementById('nextMonth');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => this.navigateMonth(-1));
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.navigateMonth(1));
        }
    }

    /**
     * Association des gestionnaires d'événements spécialisés
     * Configuration des interactions utilisateur pour l'agenda
     */
    bindEventHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.event-item')) {
                const eventItem = e.target.closest('.event-item');
                const eventId = eventItem.dataset.eventId;
                if (eventId) {
                    this.showEventDetails(eventId);
                }
            }
            
            if (e.target.closest('.calendar-day')) {
                const dayElement = e.target.closest('.calendar-day');
                const date = dayElement.dataset.date;
                if (date) {
                    this.handleDateClick(date);
                }
            }
        });
    }

    /**
     * Chargement principal des données d'événements
     * Récupération et affichage de l'agenda complet
     */
    async loadEventData() {
        try {
            this.showLoadingState();
            
            const [eventsResponse, upcomingResponse] = await Promise.all([
                window.api.getEvents(),
                window.api.getUpcomingEvents(30)
            ]);
            
            this.events = eventsResponse.data || [];
            this.filteredEvents = [...this.events];
            
            await this.displayEventCalendar();
            await this.displayUpcomingEvents(upcomingResponse.data || []);
            
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Erreur lors du chargement des événements:', error);
            this.hideLoadingState();
            this.showErrorState('Impossible de charger les données de l\'agenda');
        }
    }

    /**
     * Affichage du calendrier avec les événements
     * Génération de la grille calendaire interactive
     */
    async displayEventCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        const currentMonthElement = document.getElementById('currentMonth');
        
        if (!calendarGrid) return;
        
        const monthNames = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        if (currentMonthElement) {
            currentMonthElement.textContent = `${monthNames[month]} ${year}`;
        }
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const adjustedFirstDay = firstDayOfMonth === 0 ? 7 : firstDayOfMonth;
        
        let calendarHTML = this.generateCalendarHeader();
        
        // Cases vides pour aligner le premier jour du mois
        for (let i = 1; i < adjustedFirstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        // Jours du mois avec événements
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dateString = currentDate.toISOString().split('T')[0];
            const dayEvents = this.getEventsForDate(dateString);
            
            const isToday = this.isToday(currentDate);
            const hasEvents = dayEvents.length > 0;
            
            const dayClasses = [
                'calendar-day',
                isToday ? 'today' : '',
                hasEvents ? 'has-event' : ''
            ].filter(Boolean).join(' ');
            
            calendarHTML += `
                <div class="${dayClasses}" data-date="${dateString}">
                    <span class="day-number">${day}</span>
                    ${hasEvents ? `<span class="event-count">${dayEvents.length}</span>` : ''}
                </div>
            `;
        }
        
        calendarGrid.innerHTML = calendarHTML;
        this.calendarInitialized = true;
    }

    /**
     * Génération de l'en-tête du calendrier
     * Création des étiquettes des jours de la semaine
     */
    generateCalendarHeader() {
        const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        return dayLabels.map(label => 
            `<div class="calendar-header-day">${label}</div>`
        ).join('');
    }

    /**
     * Récupération des événements pour une date spécifique
     * Filtrage des événements selon la date fournie
     */
    getEventsForDate(dateString) {
        return this.filteredEvents.filter(event => {
            const eventDate = new Date(event.dateDebut).toISOString().split('T')[0];
            return eventDate === dateString;
        });
    }

    /**
     * Vérification si une date correspond à aujourd'hui
     * Utilitaire de comparaison temporelle
     */
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    /**
     * Navigation entre les mois du calendrier
     * Gestion des transitions temporelles
     */
    navigateMonth(direction) {
        this.currentMonth = new Date(
            this.currentMonth.getFullYear(),
            this.currentMonth.getMonth() + direction,
            1
        );
        
        this.displayEventCalendar();
    }

    /**
     * Affichage des événements à venir
     * Liste des prochains événements importants
     */
    async displayUpcomingEvents(upcomingEvents) {
        const container = document.getElementById('eventsList');
        if (!container) return;
        
        if (upcomingEvents.length === 0) {
            container.innerHTML = this.generateNoEventsMessage();
            return;
        }
        
        const eventsHTML = upcomingEvents.map(event => 
            this.generateEventItem(event)
        ).join('');
        
        container.innerHTML = eventsHTML;
    }

    /**
     * Génération d'un élément d'événement
     * Création du HTML pour un événement individuel
     */
    generateEventItem(event) {
        const eventDate = new Date(event.dateDebut);
        const formattedDate = eventDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short'
        });
        
        const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="event-item" data-event-id="${event.id}">
                <div class="event-date">
                    <div class="event-day">${formattedDate}</div>
                    <div class="event-time">${formattedTime}</div>
                </div>
                <div class="event-content">
                    <h4>${this.escapeHtml(event.titre)}</h4>
                    <p>${this.escapeHtml(event.description || '')}</p>
                    ${event.lieu ? `<p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(event.lieu)}</p>` : ''}
                </div>
                <div class="event-type ${event.typeEvenement}">
                    ${this.getEventTypeLabel(event.typeEvenement)}
                </div>
            </div>
        `;
    }

    /**
     * Récupération du libellé d'un type d'événement
     * Conversion des codes en texte lisible
     */
    getEventTypeLabel(type) {
        const typeLabels = {
            'reunion': 'Réunion',
            'formation': 'Formation',
            'evenement': 'Événement',
            'conge': 'Congé',
            'anniversaire': 'Anniversaire'
        };
        
        return typeLabels[type] || type;
    }

    /**
     * Filtrage des événements par type
     * Application du filtre sélectionné sur l'agenda
     */
    async filterByType(eventType) {
        this.currentEventTypeFilter = eventType;
        this.applyEventFilters();
    }

    /**
     * Application des filtres sur les événements
     * Logique de filtrage centralisée
     */
    applyEventFilters() {
        this.filteredEvents = this.events.filter(event => {
            return !this.currentEventTypeFilter || 
                   event.typeEvenement === this.currentEventTypeFilter;
        });
        
        if (this.calendarInitialized) {
            this.displayEventCalendar();
        }
        
        // Mise à jour de la liste des événements à venir
        const upcomingFiltered = this.filteredEvents.filter(event => 
            new Date(event.dateDebut) >= new Date()
        ).slice(0, 10);
        
        this.displayUpcomingEvents(upcomingFiltered);
    }

    /**
     * Gestion du clic sur une date du calendrier
     * Interface d'interaction avec les jours
     */
    handleDateClick(dateString) {
        const dayEvents = this.getEventsForDate(dateString);
        
        if (dayEvents.length === 0) {
            this.showCreateEventForDate(dateString);
        } else if (dayEvents.length === 1) {
            this.showEventDetails(dayEvents[0].id);
        } else {
            this.showDayEventsModal(dateString, dayEvents);
        }
    }

    /**
     * Affichage de la création d'événement pour une date
     * Pré-remplissage de la date sélectionnée
     */
    showCreateEventForDate(dateString) {
        const eventDate = new Date(dateString);
        eventDate.setHours(9, 0, 0, 0); // Heure par défaut 9h00
        
        const formattedDate = eventDate.toISOString().slice(0, 16);
        
        window.ui.showEventModal();
        
        // Pré-remplissage de la date
        setTimeout(() => {
            const dateInput = document.getElementById('eventDate');
            if (dateInput) {
                dateInput.value = formattedDate;
            }
        }, 100);
    }

    /**
     * Affichage des détails d'un événement spécifique
     * Interface de consultation détaillée
     */
    async showEventDetails(eventId) {
        try {
            const event = this.events.find(e => e.id.toString() === eventId.toString());
            
            if (!event) {
                window.ui.showToast('Événement non trouvé', 'error');
                return;
            }
            
            this.displayEventDetailsModal(event);
            
        } catch (error) {
            console.error('Erreur lors de la récupération des détails:', error);
            window.ui.showToast('Impossible de charger les détails de l\'événement', 'error');
        }
    }

    /**
     * Affichage de la modale de détails d'événement
     * Présentation complète des informations d'événement
     */
    displayEventDetailsModal(event) {
        const modalContent = this.generateEventDetailsModalContent(event);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = modalContent;
        
        document.body.appendChild(modal);
        
        const handleClose = () => modal.remove();
        
        modal.querySelector('.modal-close').addEventListener('click', handleClose);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) handleClose();
        });
        
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                handleClose();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    /**
     * Génération du contenu de la modale de détails d'événement
     * Structure HTML complète pour l'affichage détaillé
     */
    generateEventDetailsModalContent(event) {
        const startDate = new Date(event.dateDebut);
        const endDate = event.dateFin ? new Date(event.dateFin) : null;
        
        const dateFormat = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Détails de l'événement</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="event-details">
                    <div class="event-details-header">
                        <h2>${this.escapeHtml(event.titre)}</h2>
                        <span class="event-type ${event.typeEvenement}">
                            ${this.getEventTypeLabel(event.typeEvenement)}
                        </span>
                    </div>
                    
                    ${event.description ? `
                        <div class="event-description">
                            <h4>Description</h4>
                            <p>${this.escapeHtml(event.description)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="event-timing">
                        <h4>Horaires</h4>
                        <p><strong>Début:</strong> ${startDate.toLocaleDateString('fr-FR', dateFormat)}</p>
                        ${endDate ? `<p><strong>Fin:</strong> ${endDate.toLocaleDateString('fr-FR', dateFormat)}</p>` : ''}
                    </div>
                    
                    ${event.lieu ? `
                        <div class="event-location">
                            <h4>Lieu</h4>
                            <p><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(event.lieu)}</p>
                        </div>
                    ` : ''}
                    
                    ${event.organisateur ? `
                        <div class="event-organizer">
                            <h4>Organisateur</h4>
                            <p>${this.escapeHtml(event.organisateur)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="event-actions">
                        <button class="btn btn-secondary" onclick="window.events.editEvent(${event.id})">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn btn-primary" onclick="window.events.showEventParticipants(${event.id})">
                            <i class="fas fa-users"></i> Participants
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Affichage des événements d'un jour spécifique
     * Liste des événements pour une date donnée
     */
    showDayEventsModal(dateString, dayEvents) {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const eventsHTML = dayEvents.map(event => 
            this.generateEventItem(event)
        ).join('');
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Événements du ${formattedDate}</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="day-events-list">
                    ${eventsHTML}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="window.events.showCreateEventForDate('${dateString}')">
                        <i class="fas fa-plus"></i> Ajouter un événement
                    </button>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = modalContent;
        
        document.body.appendChild(modal);
        
        const handleClose = () => modal.remove();
        
        modal.querySelector('.modal-close').addEventListener('click', handleClose);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) handleClose();
        });
    }

    /**
     * Modification d'un événement existant
     * Interface de mise à jour des données d'événement
     */
    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            window.ui.showEventModal(event);
        }
    }

    /**
     * Affichage des participants d'un événement
     * Liste des invités et statuts de participation
     */
    async showEventParticipants(eventId) {
        try {
            const response = await window.api.getEventParticipants(eventId);
            const participants = response.data || [];
            
            this.displayParticipantsModal(eventId, participants, response.summary);
            
        } catch (error) {
            console.error('Erreur récupération participants:', error);
            window.ui.showToast('Impossible de charger les participants', 'error');
        }
    }

    /**
     * Affichage de la modale des participants
     * Présentation détaillée des invités
     */
    displayParticipantsModal(eventId, participants, summary) {
        const participantsHTML = participants.length > 0 ? 
            participants.map(participant => `
                <div class="participant-item">
                    <div class="participant-avatar">
                        ${participant.photoUrl && participant.photoUrl !== '/assets/default-avatar.png' 
                            ? `<img src="${participant.photoUrl}" alt="${this.escapeHtml(participant.nomComplet)}">`
                            : '<i class="fas fa-user"></i>'
                        }
                    </div>
                    <div class="participant-info">
                        <h4>${this.escapeHtml(participant.nomComplet)}</h4>
                        <p>${this.escapeHtml(participant.poste)}</p>
                        <span class="participation-status ${participant.statutParticipation}">
                            ${this.getParticipationStatusLabel(participant.statutParticipation)}
                        </span>
                    </div>
                </div>
            `).join('') : 
            '<p class="no-participants">Aucun participant pour cet événement</p>';

        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Participants à l'événement</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="participants-summary">
                    <div class="summary-stats">
                        <span class="stat"><strong>${summary?.total || 0}</strong> Total</span>
                        <span class="stat accepte"><strong>${summary?.accepte || 0}</strong> Confirmés</span>
                        <span class="stat invite"><strong>${summary?.invite || 0}</strong> Invités</span>
                        <span class="stat refuse"><strong>${summary?.refuse || 0}</strong> Refusés</span>
                    </div>
                </div>
                <div class="participants-list">
                    ${participantsHTML}
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = modalContent;
        
        document.body.appendChild(modal);
        
        const handleClose = () => modal.remove();
        
        modal.querySelector('.modal-close').addEventListener('click', handleClose);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) handleClose();
        });
    }

    /**
     * Récupération du libellé de statut de participation
     * Conversion des codes en texte lisible
     */
    getParticipationStatusLabel(status) {
        const statusLabels = {
            'accepte': 'Confirmé',
            'invite': 'Invité',
            'refuse': 'Refusé',
            'en_attente': 'En attente'
        };
        
        return statusLabels[status] || status;
    }

    /**
     * Affichage de l'état de chargement
     * Indication visuelle de traitement en cours
     */
    showLoadingState() {
        const containers = ['calendarGrid', 'eventsList'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '<div class="loading-spinner">Chargement...</div>';
            }
        });
    }

    /**
     * Masquage de l'état de chargement
     * Finalisation du processus de chargement
     */
    hideLoadingState() {
        // L'état sera remplacé par les données réelles
    }

    /**
     * Affichage de l'état d'erreur
     * Communication des problèmes de chargement
     */
    showErrorState(message) {
        const containers = ['calendarGrid', 'eventsList'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erreur de chargement</h3>
                        <p>${this.escapeHtml(message)}</p>
                        <button class="btn btn-primary" onclick="window.events.loadEventData()">
                            Réessayer
                        </button>
                    </div>
                `;
            }
        });
    }

    /**
     * Génération du message d'absence d'événements
     * Affichage informatif en cas de calendrier vide
     */
    generateNoEventsMessage() {
        return `
            <div class="no-data-message">
                <i class="fas fa-calendar"></i>
                <h3>Aucun événement à venir</h3>
                <p>Votre agenda est libre pour les prochains jours.</p>
                <button class="btn btn-primary" onclick="window.ui.showEventModal()">
                    <i class="fas fa-plus"></i> Créer un événement
                </button>
            </div>
        `;
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

    /**
     * Récupération de la liste actuelle des événements
     * Accès aux données chargées
     */
    getEvents() {
        return this.events;
    }

    /**
     * Récupération de la liste filtrée des événements
     * Accès aux données après application des filtres
     */
    getFilteredEvents() {
        return this.filteredEvents;
    }

    /**
     * Récupération du mois actuellement affiché
     * Information sur l'état du calendrier
     */
    getCurrentMonth() {
        return this.currentMonth;
    }
}

// Initialisation globale du gestionnaire d'événements
window.events = new EventManager();