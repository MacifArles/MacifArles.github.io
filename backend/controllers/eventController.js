/**
 * Contrôleur de gestion des événements et agenda pour l'API CRC Co Arles Macif
 * Logique métier pour la planification et les notifications
 * Niveau de confiance: 96%
 */

const EventModel = require('../models/Event');
const { validationResult } = require('express-validator');
const { logEvent } = require('../middleware/logging');

class EventController {
    
    /**
     * Récupération de tous les événements avec filtrage avancé
     * Endpoint: GET /api/events
     */
    static async getAllEvents(req, res) {
        try {
            const { type, dateDebut, dateFin, public: isPublic } = req.query;
            
            const filters = {};
            if (type) filters.type = type;
            if (dateDebut) filters.dateDebut = dateDebut;
            if (dateFin) filters.dateFin = dateFin;
            if (isPublic !== undefined) filters.public = isPublic === 'true';
            
            const eventModel = new EventModel();
            const events = await eventModel.getAllEvents(filters);
            
            await logEvent('EVENTS_RETRIEVED', req.user, {
                count: events.length,
                filters
            });
            
            res.status(200).json({
                success: true,
                data: events,
                count: events.length,
                filters,
                message: 'Événements récupérés avec succès'
            });
            
        } catch (error) {
            console.error('Erreur récupération événements:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des événements',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Récupération des événements à venir pour le tableau de bord
     * Endpoint: GET /api/events/upcoming
     */
    static async getUpcomingEvents(req, res) {
        try {
            const { days = 30 } = req.query;
            const daysNumber = parseInt(days);
            
            if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
                return res.status(400).json({
                    success: false,
                    error: 'La période doit être comprise entre 1 et 365 jours'
                });
            }
            
            const eventModel = new EventModel();
            const events = await eventModel.getUpcomingEvents(daysNumber);
            
            await logEvent('UPCOMING_EVENTS_RETRIEVED', req.user, {
                count: events.length,
                days: daysNumber
            });
            
            res.status(200).json({
                success: true,
                data: events,
                count: events.length,
                periode: `${daysNumber} jours`,
                message: `${events.length} événement(s) à venir dans les ${daysNumber} prochains jours`
            });
            
        } catch (error) {
            console.error('Erreur récupération événements à venir:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des événements à venir',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Récupération des anniversaires du mois pour célébrations
     * Endpoint: GET /api/events/birthdays
     */
    static async getBirthdaysThisMonth(req, res) {
        try {
            const eventModel = new EventModel();
            const birthdays = await eventModel.getBirthdaysThisMonth();
            
            // Tri par date d'anniversaire pour affichage chronologique
            birthdays.sort((a, b) => a.jourAnniversaire - b.jourAnniversaire);
            
            await logEvent('BIRTHDAYS_RETRIEVED', req.user, {
                count: birthdays.length,
                month: new Date().getMonth() + 1
            });
            
            res.status(200).json({
                success: true,
                data: birthdays,
                count: birthdays.length,
                mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                message: `${birthdays.length} anniversaire(s) ce mois-ci`
            });
            
        } catch (error) {
            console.error('Erreur récupération anniversaires:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des anniversaires',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Création d'un nouvel événement
     * Endpoint: POST /api/events
     */
    static async createEvent(req, res) {
        try {
            // Validation des données d'entrée
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }
            
            const eventModel = new EventModel();
            const result = await eventModel.createEvent(req.body, req.user);
            
            res.status(201).json({
                success: true,
                data: { id: result.id },
                message: result.message
            });
            
        } catch (error) {
            console.error('Erreur création événement:', error);
            
            if (error.message.includes('date de fin ne peut être antérieure')) {
                return res.status(400).json({
                    success: false,
                    error: 'La date de fin ne peut être antérieure à la date de début'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de l\'événement',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Mise à jour d'un événement existant
     * Endpoint: PUT /api/events/:id
     */
    static async updateEvent(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'ID événement invalide'
                });
            }
            
            const eventModel = new EventModel();
            const result = await eventModel.updateEvent(parseInt(id), req.body, req.user);
            
            res.status(200).json({
                success: true,
                message: result.message
            });
            
        } catch (error) {
            console.error('Erreur mise à jour événement:', error);
            
            if (error.message.includes('non trouvé')) {
                return res.status(404).json({
                    success: false,
                    error: 'Événement non trouvé'
                });
            }
            
            if (error.message.includes('Permissions insuffisantes')) {
                return res.status(403).json({
                    success: false,
                    error: 'Permissions insuffisantes pour modifier cet événement'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la mise à jour de l\'événement',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Suppression d'un événement
     * Endpoint: DELETE /api/events/:id
     */
    static async deleteEvent(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'ID événement invalide'
                });
            }
            
            // Note: Cette fonctionnalité nécessiterait une méthode deleteEvent dans le modèle
            // Pour l'instant, nous retournons une réponse appropriée
            
            res.status(501).json({
                success: false,
                error: 'Fonctionnalité de suppression non implémentée',
                message: 'Utilisez la mise à jour pour désactiver l\'événement'
            });
            
        } catch (error) {
            console.error('Erreur suppression événement:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la suppression de l\'événement'
            });
        }
    }
    
    /**
     * Gestion des participants d'un événement
     * Endpoint: POST /api/events/:id/participants
     */
    static async addParticipant(req, res) {
        try {
            const { id } = req.params;
            const { employeeId, statut = 'invite' } = req.body;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'ID événement invalide'
                });
            }
            
            if (!employeeId || isNaN(parseInt(employeeId))) {
                return res.status(400).json({
                    success: false,
                    error: 'ID employé invalide'
                });
            }
            
            const validStatuts = ['invite', 'accepte', 'refuse', 'en_attente'];
            if (!validStatuts.includes(statut)) {
                return res.status(400).json({
                    success: false,
                    error: 'Statut de participation invalide',
                    validStatuts
                });
            }
            
            const eventModel = new EventModel();
            const result = await eventModel.addEventParticipant(parseInt(id), parseInt(employeeId), statut);
            
            await logEvent('EVENT_PARTICIPANT_ADDED', req.user, {
                eventId: id,
                employeeId,
                statut
            });
            
            res.status(200).json({
                success: true,
                message: result.message
            });
            
        } catch (error) {
            console.error('Erreur ajout participant:', error);
            
            if (error.message.includes('non trouvé')) {
                return res.status(404).json({
                    success: false,
                    error: 'Événement ou employé non trouvé'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'ajout du participant',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Récupération des participants d'un événement
     * Endpoint: GET /api/events/:id/participants
     */
    static async getEventParticipants(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'ID événement invalide'
                });
            }
            
            const eventModel = new EventModel();
            const participants = await eventModel.getEventParticipants(parseInt(id));
            
            // Groupement par statut pour faciliter l'affichage
            const participantsByStatus = {
                accepte: participants.filter(p => p.statutParticipation === 'accepte'),
                invite: participants.filter(p => p.statutParticipation === 'invite'),
                refuse: participants.filter(p => p.statutParticipation === 'refuse'),
                en_attente: participants.filter(p => p.statutParticipation === 'en_attente')
            };
            
            res.status(200).json({
                success: true,
                data: participants,
                summary: {
                    total: participants.length,
                    accepte: participantsByStatus.accepte.length,
                    invite: participantsByStatus.invite.length,
                    refuse: participantsByStatus.refuse.length,
                    en_attente: participantsByStatus.en_attente.length
                },
                participantsByStatus,
                message: 'Participants récupérés avec succès'
            });
            
        } catch (error) {
            console.error('Erreur récupération participants:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des participants',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Génération automatique des événements d'anniversaire
     * Endpoint: POST /api/events/generate-birthdays
     */
    static async generateBirthdayEvents(req, res) {
        try {
            // Vérification des permissions administrateur
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Seuls les administrateurs peuvent générer les événements d\'anniversaire'
                });
            }
            
            const { year = new Date().getFullYear() } = req.body;
            const yearNumber = parseInt(year);
            
            if (isNaN(yearNumber) || yearNumber < 2020 || yearNumber > 2030) {
                return res.status(400).json({
                    success: false,
                    error: 'Année invalide (doit être entre 2020 et 2030)'
                });
            }
            
            const eventModel = new EventModel();
            const result = await eventModel.generateBirthdayEvents(yearNumber);
            
            await logEvent('BIRTHDAY_EVENTS_GENERATED', req.user, {
                year: yearNumber,
                createdEvents: result.createdEvents
            });
            
            res.status(200).json({
                success: true,
                data: { createdEvents: result.createdEvents },
                message: result.message
            });
            
        } catch (error) {
            console.error('Erreur génération anniversaires:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la génération des événements d\'anniversaire',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Statistiques des événements pour le tableau de bord
     * Endpoint: GET /api/events/stats
     */
    static async getEventStats(req, res) {
        try {
            const eventModel = new EventModel();
            const allEvents = await eventModel.getAllEvents();
            const upcomingEvents = await eventModel.getUpcomingEvents(30);
            const birthdays = await eventModel.getBirthdaysThisMonth();
            
            const stats = {
                totalEvenements: allEvents.length,
                evenementsAVenir: upcomingEvents.length,
                anniversairesCeMois: birthdays.length,
                repartitionParType: this.getEventsByType(allEvents),
                evenementsRecents: allEvents.filter(event => 
                    new Date(event.dateCreation) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length
            };
            
            await logEvent('EVENT_STATS_RETRIEVED', req.user, {
                totalEvents: stats.totalEvenements
            });
            
            res.status(200).json({
                success: true,
                data: stats,
                message: 'Statistiques des événements récupérées avec succès'
            });
            
        } catch (error) {
            console.error('Erreur statistiques événements:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des statistiques',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Méthode utilitaire pour grouper les événements par type
     * Analyse de la répartition des activités
     */
    static getEventsByType(events) {
        const typeCount = {};
        events.forEach(event => {
            typeCount[event.typeEvenement] = (typeCount[event.typeEvenement] || 0) + 1;
        });
        return typeCount;
    }
}

module.exports = EventController;