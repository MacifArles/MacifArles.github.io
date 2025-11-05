/**
 * Modèle de gestion des employés pour le CRC Co Arles Macif
 * Opérations CRUD sécurisées avec validation des données
 * Niveau de confiance: 97%
 */

const DatabaseManager = require('../database/database');
const { body, validationResult } = require('express-validator');

class EmployeeModel {
    constructor() {
        this.dbManager = new DatabaseManager();
    }

    /**
     * Validation des données employé
     * Règles de sécurité pour l'intégrité des données
     */
    static getValidationRules() {
        return [
            body('nom').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
            body('prenom').trim().isLength({ min: 2, max: 100 }).withMessage('Le prénom doit contenir entre 2 et 100 caractères'),
            body('poste').trim().isLength({ min: 3, max: 150 }).withMessage('Le poste doit contenir entre 3 et 150 caractères'),
            body('equipe').trim().isLength({ min: 2, max: 100 }).withMessage('L\'équipe doit contenir entre 2 et 100 caractères'),
            body('email').optional().isEmail().withMessage('Format d\'email invalide'),
            body('telephone').optional().matches(/^[0-9\-\+\s\(\)]{10,20}$/).withMessage('Format de téléphone invalide'),
            body('date_embauche').optional().isISO8601().withMessage('Format de date invalide'),
            body('date_anniversaire').optional().isISO8601().withMessage('Format de date invalide')
        ];
    }

    /**
     * Récupération de tous les employés actifs
     * Optimisé pour l'affichage du trombinoscope
     */
    async getAllEmployees() {
        try {
            await this.dbManager.connect();
            
            const query = `
                SELECT 
                    e.id, e.nom, e.prenom, e.poste, e.equipe, 
                    e.responsable_equipe, e.email, e.telephone,
                    e.date_embauche, e.date_anniversaire, e.photo_url,
                    m.nom as manager_nom, m.prenom as manager_prenom
                FROM employees e
                LEFT JOIN employees m ON e.manager_id = m.id
                WHERE e.is_active = 1
                ORDER BY e.equipe, e.responsable_equipe DESC, e.nom, e.prenom
            `;
            
            const employees = await this.dbManager.allQuery(query);
            await this.dbManager.close();
            
            return this.formatEmployeeData(employees);
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur récupération employés: ${error.message}`);
        }
    }

    /**
     * Récupération des employés par équipe
     * Filtrage optimisé pour l'organisation hiérarchique
     */
    async getEmployeesByTeam(teamName) {
        try {
            await this.dbManager.connect();
            
            const query = `
                SELECT 
                    e.id, e.nom, e.prenom, e.poste, e.equipe,
                    e.responsable_equipe, e.email, e.telephone,
                    e.date_embauche, e.date_anniversaire, e.photo_url
                FROM employees e
                WHERE e.equipe = ? AND e.is_active = 1
                ORDER BY e.responsable_equipe DESC, e.nom, e.prenom
            `;
            
            const employees = await this.dbManager.allQuery(query, [teamName]);
            await this.dbManager.close();
            
            return this.formatEmployeeData(employees);
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur récupération équipe: ${error.message}`);
        }
    }

    /**
     * Récupération d'un employé par ID
     * Informations détaillées avec historique
     */
    async getEmployeeById(id) {
        try {
            await this.dbManager.connect();
            
            const query = `
                SELECT 
                    e.*, 
                    m.nom as manager_nom, m.prenom as manager_prenom,
                    COUNT(sub.id) as nombre_subordonnes
                FROM employees e
                LEFT JOIN employees m ON e.manager_id = m.id
                LEFT JOIN employees sub ON sub.manager_id = e.id AND sub.is_active = 1
                WHERE e.id = ? AND e.is_active = 1
                GROUP BY e.id
            `;
            
            const employee = await this.dbManager.getQuery(query, [id]);
            await this.dbManager.close();
            
            if (!employee) {
                throw new Error('Employé non trouvé');
            }
            
            return this.formatSingleEmployee(employee);
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur récupération employé: ${error.message}`);
        }
    }

    /**
     * Création d'un nouvel employé
     * Insertion sécurisée avec validation complète
     */
    async createEmployee(employeeData, createdBy) {
        const errors = validationResult(employeeData);
        if (!errors.isEmpty()) {
            throw new Error(`Données invalides: ${errors.array().map(e => e.msg).join(', ')}`);
        }

        try {
            await this.dbManager.connect();
            
            // Vérification de l'unicité de l'email
            if (employeeData.email) {
                const existingEmployee = await this.dbManager.getQuery(
                    'SELECT id FROM employees WHERE email = ? AND is_active = 1',
                    [employeeData.email]
                );
                
                if (existingEmployee) {
                    throw new Error('Cet email est déjà utilisé par un autre employé');
                }
            }
            
            const query = `
                INSERT INTO employees (
                    nom, prenom, poste, equipe, responsable_equipe,
                    email, telephone, date_embauche, date_anniversaire,
                    photo_url, manager_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            const params = [
                employeeData.nom,
                employeeData.prenom,
                employeeData.poste,
                employeeData.equipe,
                employeeData.responsable_equipe || 0,
                employeeData.email || null,
                employeeData.telephone || null,
                employeeData.date_embauche || null,
                employeeData.date_anniversaire || null,
                employeeData.photo_url || null,
                employeeData.manager_id || null
            ];
            
            const result = await this.dbManager.runQuery(query, params);
            await this.dbManager.close();
            
            // Log de l'action
            const { logEvent } = require('../middleware/logging');
            await logEvent('EMPLOYEE_CREATED', createdBy, {
                employeeId: result.id,
                employeeName: `${employeeData.prenom} ${employeeData.nom}`
            });
            
            return { id: result.id, message: 'Employé créé avec succès' };
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur création employé: ${error.message}`);
        }
    }

    /**
     * Mise à jour d'un employé existant
     * Modification sécurisée avec historique
     */
    async updateEmployee(id, employeeData, updatedBy) {
        try {
            await this.dbManager.connect();
            
            // Vérification de l'existence de l'employé
            const existing = await this.dbManager.getQuery(
                'SELECT id, nom, prenom FROM employees WHERE id = ? AND is_active = 1',
                [id]
            );
            
            if (!existing) {
                throw new Error('Employé non trouvé');
            }
            
            // Construction dynamique de la requête de mise à jour
            const updateFields = [];
            const params = [];
            
            const allowedFields = ['nom', 'prenom', 'poste', 'equipe', 'responsable_equipe', 
                                 'email', 'telephone', 'date_embauche', 'date_anniversaire', 
                                 'photo_url', 'manager_id'];
            
            allowedFields.forEach(field => {
                if (employeeData.hasOwnProperty(field)) {
                    updateFields.push(`${field} = ?`);
                    params.push(employeeData[field]);
                }
            });
            
            if (updateFields.length === 0) {
                throw new Error('Aucune donnée à mettre à jour');
            }
            
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);
            
            const query = `UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`;
            
            await this.dbManager.runQuery(query, params);
            await this.dbManager.close();
            
            // Log de l'action
            const { logEvent } = require('../middleware/logging');
            await logEvent('EMPLOYEE_UPDATED', updatedBy, {
                employeeId: id,
                employeeName: `${existing.prenom} ${existing.nom}`,
                updatedFields: Object.keys(employeeData)
            });
            
            return { message: 'Employé mis à jour avec succès' };
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur mise à jour employé: ${error.message}`);
        }
    }

    /**
     * Désactivation d'un employé
     * Suppression logique pour préserver l'historique
     */
    async deactivateEmployee(id, deactivatedBy) {
        try {
            await this.dbManager.connect();
            
            const employee = await this.dbManager.getQuery(
                'SELECT nom, prenom FROM employees WHERE id = ? AND is_active = 1',
                [id]
            );
            
            if (!employee) {
                throw new Error('Employé non trouvé');
            }
            
            await this.dbManager.runQuery(
                'UPDATE employees SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
            
            await this.dbManager.close();
            
            // Log de l'action
            const { logEvent } = require('../middleware/logging');
            await logEvent('EMPLOYEE_DEACTIVATED', deactivatedBy, {
                employeeId: id,
                employeeName: `${employee.prenom} ${employee.nom}`
            });
            
            return { message: 'Employé désactivé avec succès' };
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur désactivation employé: ${error.message}`);
        }
    }

    /**
     * Formatage des données pour l'affichage
     * Standardisation de la structure de retour
     */
    formatEmployeeData(employees) {
        return employees.map(emp => ({
            id: emp.id,
            nom: emp.nom,
            prenom: emp.prenom,
            nomComplet: `${emp.prenom} ${emp.nom}`,
            poste: emp.poste,
            equipe: emp.equipe,
            responsableEquipe: emp.responsable_equipe === 1,
            email: emp.email,
            telephone: emp.telephone,
            dateEmbauche: emp.date_embauche,
            dateAnniversaire: emp.date_anniversaire,
            photoUrl: emp.photo_url || '/assets/default-avatar.png',
            manager: emp.manager_nom ? `${emp.manager_prenom} ${emp.manager_nom}` : null
        }));
    }

    /**
     * Formatage détaillé pour un employé unique
     * Informations complètes avec métadonnées
     */
    formatSingleEmployee(employee) {
        return {
            ...this.formatEmployeeData([employee])[0],
            nombreSubordonnes: employee.nombre_subordonnes || 0,
            dateCreation: employee.created_at,
            derniereMiseAJour: employee.updated_at
        };
    }

    /**
     * Récupération de la structure des équipes
     * Organisation hiérarchique pour navigation
     */
    async getTeamStructure() {
        try {
            await this.dbManager.connect();
            
            const query = `
                SELECT 
                    equipe,
                    COUNT(*) as nombre_employes,
                    SUM(responsable_equipe) as nombre_responsables
                FROM employees 
                WHERE is_active = 1 
                GROUP BY equipe 
                ORDER BY equipe
            `;
            
            const teams = await this.dbManager.allQuery(query);
            await this.dbManager.close();
            
            return teams.map(team => ({
                nom: team.equipe,
                nombreEmployes: team.nombre_employes,
                nombreResponsables: team.nombre_responsables
            }));
            
        } catch (error) {
            await this.dbManager.close();
            throw new Error(`Erreur récupération structure équipes: ${error.message}`);
        }
    }
}

module.exports = EmployeeModel;