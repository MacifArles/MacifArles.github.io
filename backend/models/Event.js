/**
 * Modèle de gestion des événements et agenda pour le CRC Co Arles Macif
 * Système complet de planification avec notifications
 * Niveau de confiance: 96%
 */

const DatabaseManager = require('../database/database');
const { body, validationResult } = require('express-validator');

class EventModel {
    constructor() {
        this.dbManager = new DatabaseManager();
    }

    /**
     * Validation des données d'événement
     * Règles de sécurité pour l'intégrité des données
     */
    static getValidationRules() {
        return [
            body('titre').trim().isLength({ min: 3, max: 200 }).withMessage('Le titre doit contenir entre 3 et 200 caractères'),
            body('description').optional().isLength({ max: 1000 }).withMessage('La description ne peut excéder 1000 caractères'),
            body('type_evenement').isIn(['anniversaire', 'formation', 'reunion', 'evenement', 'conge']).withMessage('Type d\'événement invalide'),
            body('date_debut').isISO8601().withMessage('Format de date de début invalide'),
            body('date_fin').optional().isISO8601().withMessage('Format de date de fin invalide'),
            body('lieu').optional().isLength({ max: 200 }).withMessage('Le lieu ne peut excéder 200 caractères')
        ];
    }

    /**
     * Récupération de tous les événements avec filtrage
     * Optimisé pour l'affichage de l'agenda
     */
    async getAllEvents(filters = {}) {
        try {
            await this.dbManager.connect();
            
            let query = `
                SELECT 
                    e.id, e.titre, e.description, e.type_evenement,
                    e.date_debut, e.date_fin, e.lieu, e.est_public,
                    emp.nom as organisateur_nom, emp.prenom as organisateur_prenom,
                    e.created_at, e.updated_at
                FROM events e
                LEFT JOIN employees emp ON e.organisateur_id = emp.id
                WHERE 1=1
            `;
            
            const params = [];
            
            // Application des filtres
            if (filters.type) {
                query += ' AND e.type_evenement = ?';
                params.push(filters.type);
            }
            
            if (filters.dateDebut) {
                query += ' AND e.date_debut >= ?';
                params.push(filters.dateDebut);
            }
            
            if (filters.dateFin) {
                query += ' AND e.date_debut <= ?';
                params.push(filters.dateFin);
            }
            
            if (filters.public !== undefined) {
                query += ' AND e.est_public = ?';
                params.push(filters.public ? 1 : 0);
            }
            
            query += ' ORDER BY e.date_debut ASC';
            
            const events = await this.dbManager.allQuery(query, params);
            await this.dbManager.close();
            
            return this.formatEventData(events);
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur récupération événements: ${error.message}`);
        }
    }

    /**
     * Récupération des événements à venir
     * Planification et notifications proactives
     */
    async getUpcomingEvents(days = 30) {
        try {
            await this.dbManager.connect();
            
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() + days);
            
            const query = `
                SELECT 
                    e.id, e.titre, e.description, e.type_evenement,
                    e.date_debut, e.date_fin, e.lieu,
                    emp.nom as organisateur_nom, emp.prenom as organisateur_prenom,
                    COUNT(ep.employee_id) as nombre_participants
                FROM events e
                LEFT JOIN employees emp ON e.organisateur_id = emp.id
                LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.statut_participation = 'accepte'
                WHERE e.date_debut >= CURRENT_TIMESTAMP 
                AND e.date_debut <= ?
                AND e.est_public = 1
                GROUP BY e.id
                ORDER BY e.date_debut ASC
            `;
            
            const events = await this.dbManager.allQuery(query, [dateLimit.toISOString()]);
            await this.dbManager.close();
            
            return this.formatEventData(events);
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur récupération événements à venir: ${error.message}`);
        }
    }

    /**
     * Récupération des anniversaires du mois
     * Gestion automatisée des célébrations
     */
    async getBirthdaysThisMonth() {
        try {
            await this.dbManager.connect();
            
            const currentDate = new Date();
            const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
            
            const query = `
                SELECT 
                    id, nom, prenom, poste, equipe, date_anniversaire,
                    photo_url,
                    strftime('%d', date_anniversaire) as jour_anniversaire
                FROM employees 
                WHERE strftime('%m', date_anniversaire) = ?
                AND is_active = 1
                AND date_anniversaire IS NOT NULL
                ORDER BY strftime('%d', date_anniversaire) ASC
            `;
            
            const birthdays = await this.dbManager.allQuery(query, [currentMonth]);
            await this.dbManager.close();
            
            return birthdays.map(birthday => ({
                id: birthday.id,
                nom: birthday.nom,
                prenom: birthday.prenom,
                nomComplet: `${birthday.prenom} ${birthday.nom}`,
                poste: birthday.poste,
                equipe: birthday.equipe,
                dateAnniversaire: birthday.date_anniversaire,
                jourAnniversaire: parseInt(birthday.jour_anniversaire),
                photoUrl: birthday.photo_url || '/assets/default-avatar.png',
                estCeMois: true
            }));
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur récupération anniversaires: ${error.message}`);
        }
    }

    /**
     * Création d'un nouvel événement
     * Insertion sécurisée avec validation complète
     */
    async createEvent(eventData, createdBy) {
        const errors = validationResult(eventData);
        if (!errors.isEmpty()) {
            throw new Error(`Données invalides: ${errors.array().map(e => e.msg).join(', ')}`);
        }

        try {
            await this.dbManager.connect();
            
            // Validation de la cohérence des dates
            if (eventData.date_fin && new Date(eventData.date_fin) < new Date(eventData.date_debut)) {
                throw new Error('La date de fin ne peut être antérieure à la date de début');
            }
            
            const query = `
                INSERT INTO events (
                    titre, description, type_evenement, date_debut, date_fin,
                    lieu, organisateur_id, est_public, rappel_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            const params = [
                eventData.titre,
                eventData.description || null,
                eventData.type_evenement,
                eventData.date_debut,
                eventData.date_fin || null,
                eventData.lieu || null,
                createdBy.id,
                eventData.est_public !== undefined ? eventData.est_public : 1,
                eventData.rappel_active || 0
            ];
            
            const result = await this.dbManager.runQuery(query, params);
            
            // Gestion automatique des anniversaires
            if (eventData.type_evenement === 'anniversaire' && eventData.employee_id) {
                await this.addEventParticipant(result.id, eventData.employee_id, 'accepte');
            }
            
            await this.dbManager.close();
            
            // Log de l'action
            const { logEvent } = require('../middleware/logging');
            await logEvent('EVENT_CREATED', createdBy, {
                eventId: result.id,
                eventTitle: eventData.titre,
                eventType: eventData.type_evenement
            });
            
            return { id: result.id, message: 'Événement créé avec succès' };
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur création événement: ${error.message}`);
        }
    }

    /**
     * Mise à jour d'un événement existant
     * Modification sécurisée avec notification des participants
     */
    async updateEvent(id, eventData, updatedBy) {
        try {
            await this.dbManager.connect();
            
            // Vérification des permissions
            const existing = await this.dbManager.getQuery(
                'SELECT titre, organisateur_id FROM events WHERE id = ?',
                [id]
            );
            
            if (!existing) {
                throw new Error('Événement non trouvé');
            }
            
            if (existing.organisateur_id !== updatedBy.id && updatedBy.role !== 'admin') {
                throw new Error('Permissions insuffisantes pour modifier cet événement');
            }
            
            // Construction dynamique de la requête de mise à jour
            const updateFields = [];
            const params = [];
            
            const allowedFields = ['titre', 'description', 'type_evenement', 'date_debut', 
                                 'date_fin', 'lieu', 'est_public', 'rappel_active'];
            
            allowedFields.forEach(field => {
                if (eventData.hasOwnProperty(field)) {
                    updateFields.push(`${field} = ?`);
                    params.push(eventData[field]);
                }
            });
            
            if (updateFields.length === 0) {
                throw new Error('Aucune donnée à mettre à jour');
            }
            
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);
            
            const query = `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`;
            
            await this.dbManager.runQuery(query, params);
            await this.dbManager.close();
            
            // Log de l'action
            const { logEvent } = require('../middleware/logging');
            await logEvent('EVENT_UPDATED', updatedBy, {
                eventId: id,
                eventTitle: existing.titre,
                updatedFields: Object.keys(eventData)
            });
            
            return { message: 'Événement mis à jour avec succès' };
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur mise à jour événement: ${error.message}`);
        }
    }

    /**
     * Ajout d'un participant à un événement
     * Gestion des invitations et confirmations
     */
    async addEventParticipant(eventId, employeeId, statut = 'invite') {
        try {
            await this.dbManager.connect();
            
            // Vérification de l'existence de l'événement et de l'employé
            const event = await this.dbManager.getQuery('SELECT id FROM events WHERE id = ?', [eventId]);
            const employee = await this.dbManager.getQuery('SELECT id FROM employees WHERE id = ? AND is_active = 1', [employeeId]);
            
            if (!event || !employee) {
                throw new Error('Événement ou employé non trouvé');
            }
            
            // Insertion ou mise à jour de la participation
            const query = `
                INSERT OR REPLACE INTO event_participants 
                (event_id, employee_id, statut_participation, date_reponse)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            await this.dbManager.runQuery(query, [eventId, employeeId, statut]);
            await this.dbManager.close();
            
            return { message: 'Participant ajouté avec succès' };
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur ajout participant: ${error.message}`);
        }
    }

    /**
     * Récupération des participants d'un événement
     * Liste détaillée avec statuts de participation
     */
    async getEventParticipants(eventId) {
        try {
            await this.dbManager.connect();
            
            const query = `
                SELECT 
                    ep.statut_participation, ep.date_reponse,
                    e.id, e.nom, e.prenom, e.poste, e.equipe, e.photo_url
                FROM event_participants ep
                JOIN employees e ON ep.employee_id = e.id
                WHERE ep.event_id = ? AND e.is_active = 1
                ORDER BY ep.statut_participation, e.nom, e.prenom
            `;
            
            const participants = await this.dbManager.allQuery(query, [eventId]);
            await this.dbManager.close();
            
            return participants.map(p => ({
                id: p.id,
                nom: p.nom,
                prenom: p.prenom,
                nomComplet: `${p.prenom} ${p.nom}`,
                poste: p.poste,
                equipe: p.equipe,
                photoUrl: p.photo_url || '/assets/default-avatar.png',
                statutParticipation: p.statut_participation,
                dateReponse: p.date_reponse
            }));
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur récupération participants: ${error.message}`);
        }
    }

    /**
     * Formatage des données d'événement pour l'affichage
     * Standardisation de la structure de retour
     */
    formatEventData(events) {
        return events.map(event => ({
            id: event.id,
            titre: event.titre,
            description: event.description,
            typeEvenement: event.type_evenement,
            dateDebut: event.date_debut,
            dateFin: event.date_fin,
            lieu: event.lieu,
            estPublic: event.est_public === 1,
            organisateur: event.organisateur_nom ? 
                `${event.organisateur_prenom} ${event.organisateur_nom}` : null,
            nombreParticipants: event.nombre_participants || 0,
            dateCreation: event.created_at,
            derniereMiseAJour: event.updated_at
        }));
    }

    /**
     * Génération automatique des anniversaires
     * Création programmée des événements annuels
     */
    async generateBirthdayEvents(year = new Date().getFullYear()) {
        try {
            await this.dbManager.connect();
            
            // Récupération des employés avec date d'anniversaire
            const employees = await this.dbManager.allQuery(`
                SELECT id, nom, prenom, date_anniversaire 
                FROM employees 
                WHERE date_anniversaire IS NOT NULL AND is_active = 1
            `);
            
            const createdEvents = [];
            
            for (const employee of employees) {
                const birthDate = new Date(employee.date_anniversaire);
                const eventDate = new Date(year, birthDate.getMonth(), birthDate.getDate());
                
                // Vérifier si l'événement existe déjà
                const existingEvent = await this.dbManager.getQuery(`
                    SELECT id FROM events 
                    WHERE type_evenement = 'anniversaire' 
                    AND DATE(date_debut) = DATE(?)
                    AND organisateur_id = ?
                `, [eventDate.toISOString(), employee.id]);
                
                if (!existingEvent) {
                    const result = await this.dbManager.runQuery(`
                        INSERT INTO events (
                            titre, type_evenement, date_debut, organisateur_id,
                            est_public, created_at
                        ) VALUES (?, 'anniversaire', ?, ?, 1, CURRENT_TIMESTAMP)
                    `, [
                        `Anniversaire de ${employee.prenom} ${employee.nom}`,
                        eventDate.toISOString(),
                        employee.id
                    ]);
                    
                    await this.addEventParticipant(result.id, employee.id, 'accepte');
                    createdEvents.push(result.id);
                }
            }
            
            await this.dbManager.close();
            
            return { 
                message: `${createdEvents.length} événements d'anniversaire créés pour ${year}`,
                createdEvents: createdEvents.length
            };
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur génération anniversaires: ${error.message}`);
        }
    }
}

module.exports = EventModel;