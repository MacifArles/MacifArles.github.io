/**
 * Routes de gestion des événements et agenda pour l'API CRC Co Arles Macif
 * Interface sécurisée pour la planification et les notifications
 * Niveau de confiance: 97%
 */

const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');
const EventModel = require('../models/Event');
const { requireRole } = require('../middleware/auth');

// Application des règles de validation pour les opérations de création et modification
const validationRules = EventModel.getValidationRules();

/**
 * Route: GET /api/events
 * Description: Récupération de tous les événements avec filtrage avancé
 * Permissions: Tous les utilisateurs authentifiés
 */
router.get('/', EventController.getAllEvents);

/**
 * Route: GET /api/events/upcoming
 * Description: Récupération des événements à venir pour le tableau de bord
 * Permissions: Tous les utilisateurs authentifiés
 */
router.get('/upcoming', EventController.getUpcomingEvents);

/**
 * Route: GET /api/events/birthdays
 * Description: Récupération des anniversaires du mois pour célébrations
 * Permissions: Tous les utilisateurs authentifiés
 */
router.get('/birthdays', EventController.getBirthdaysThisMonth);

/**
 * Route: GET /api/events/stats
 * Description: Statistiques des événements pour le tableau de bord
 * Permissions: Managers et administrateurs uniquement
 */
router.get('/stats', requireRole(['admin', 'manager']), EventController.getEventStats);

/**
 * Route: POST /api/events/generate-birthdays
 * Description: Génération automatique des événements d'anniversaire
 * Permissions: Administrateurs uniquement
 */
router.post('/generate-birthdays', 
    requireRole(['admin']), 
    EventController.generateBirthdayEvents
);

/**
 * Route: GET /api/events/:id/participants
 * Description: Récupération des participants d'un événement spécifique
 * Permissions: Tous les utilisateurs authentifiés
 */
router.get('/:id/participants', EventController.getEventParticipants);

/**
 * Route: POST /api/events/:id/participants
 * Description: Ajout d'un participant à un événement
 * Permissions: Organisateurs, managers et administrateurs
 */
router.post('/:id/participants', 
    requireRole(['admin', 'manager', 'user']), 
    EventController.addParticipant
);

/**
 * Route: POST /api/events
 * Description: Création d'un nouvel événement
 * Permissions: Tous les utilisateurs authentifiés
 * Validation: Application des règles de validation complètes
 */
router.post('/', 
    validationRules, 
    EventController.createEvent
);

/**
 * Route: PUT /api/events/:id
 * Description: Mise à jour d'un événement existant
 * Permissions: Organisateur de l'événement, managers et administrateurs
 * Validation: Application des règles de validation pour les modifications
 */
router.put('/:id', 
    validationRules, 
    EventController.updateEvent
);

/**
 * Route: DELETE /api/events/:id
 * Description: Suppression d'un événement
 * Permissions: Organisateur de l'événement et administrateurs
 */
router.delete('/:id', 
    requireRole(['admin', 'manager']), 
    EventController.deleteEvent
);

module.exports = router;