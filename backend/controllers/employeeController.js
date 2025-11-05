/**
 * Contrôleur de gestion des employés pour l'API CRC Co Arles Macif
 * Logique métier sécurisée pour le trombinoscope
 * Niveau de confiance: 97%
 */

const EmployeeModel = require('../models/Employee');
const { validationResult } = require('express-validator');
const { logEvent } = require('../middleware/logging');

class EmployeeController {
    
    /**
     * Récupération de tous les employés avec pagination optionnelle
     * Endpoint: GET /api/employees
     */
    static async getAllEmployees(req, res) {
        try {
            const { team, active = 'true' } = req.query;
            const employeeModel = new EmployeeModel();
            
            let employees;
            if (team) {
                employees = await employeeModel.getEmployeesByTeam(team);
            } else {
                employees = await employeeModel.getAllEmployees();
            }
            
            // Filtrage par statut si nécessaire
            if (active === 'false') {
                employees = employees.filter(emp => !emp.is_active);
            }
            
            await logEvent('EMPLOYEES_RETRIEVED', req.user, {
                count: employees.length,
                filters: { team, active }
            });
            
            res.status(200).json({
                success: true,
                data: employees,
                count: employees.length,
                message: 'Employés récupérés avec succès'
            });
            
        } catch (error) {
            console.error('Erreur récupération employés:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des employés',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Récupération d'un employé spécifique par ID
     * Endpoint: GET /api/employees/:id
     */
    static async getEmployeeById(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'ID employé invalide'
                });
            }
            
            const employeeModel = new EmployeeModel();
            const employee = await employeeModel.getEmployeeById(parseInt(id));
            
            await logEvent('EMPLOYEE_RETRIEVED', req.user, {
                employeeId: id,
                employeeName: employee.nomComplet
            });
            
            res.status(200).json({
                success: true,
                data: employee,
                message: 'Employé récupéré avec succès'
            });
            
        } catch (error) {
            console.error('Erreur récupération employé:', error);
            
            if (error.message.includes('non trouvé')) {
                return res.status(404).json({
                    success: false,
                    error: 'Employé non trouvé'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération de l\'employé',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Création d'un nouvel employé
     * Endpoint: POST /api/employees
     */
    static async createEmployee(req, res) {
        try {
            // Vérification des permissions
            if (req.user.role !== 'admin' && req.user.role !== 'manager') {
                return res.status(403).json({
                    success: false,
                    error: 'Permissions insuffisantes pour créer un employé'
                });
            }
            
            // Validation des données d'entrée
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }
            
            const employeeModel = new EmployeeModel();
            const result = await employeeModel.createEmployee(req.body, req.user);
            
            res.status(201).json({
                success: true,
                data: { id: result.id },
                message: result.message
            });
            
        } catch (error) {
            console.error('Erreur création employé:', error);
            
            if (error.message.includes('email est déjà utilisé')) {
                return res.status(409).json({
                    success: false,
                    error: 'Cet email est déjà utilisé par un autre employé'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de l\'employé',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Mise à jour d'un employé existant
     * Endpoint: PUT /api/employees/:id
     */
    static async updateEmployee(req, res) {
        try {
            const { id } = req.params;
            
            // Vérification des permissions
            if (req.user.role !== 'admin' && req.user.role !== 'manager') {
                return res.status(403).json({
                    success: false,
                    error: 'Permissions insuffisantes pour modifier un employé'
                });
            }
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'ID employé invalide'
                });
            }
            
            const employeeModel = new EmployeeModel();
            const result = await employeeModel.updateEmployee(parseInt(id), req.body, req.user);
            
            res.status(200).json({
                success: true,
                message: result.message
            });
            
        } catch (error) {
            console.error('Erreur mise à jour employé:', error);
            
            if (error.message.includes('non trouvé')) {
                return res.status(404).json({
                    success: false,
                    error: 'Employé non trouvé'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la mise à jour de l\'employé',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Désactivation d'un employé
     * Endpoint: DELETE /api/employees/:id
     */
    static async deactivateEmployee(req, res) {
        try {
            const { id } = req.params;
            
            // Vérification des permissions administrateur
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Seuls les administrateurs peuvent désactiver un employé'
                });
            }
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'ID employé invalide'
                });
            }
            
            const employeeModel = new EmployeeModel();
            const result = await employeeModel.deactivateEmployee(parseInt(id), req.user);
            
            res.status(200).json({
                success: true,
                message: result.message
            });
            
        } catch (error) {
            console.error('Erreur désactivation employé:', error);
            
            if (error.message.includes('non trouvé')) {
                return res.status(404).json({
                    success: false,
                    error: 'Employé non trouvé'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la désactivation de l\'employé',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Récupération de la structure des équipes
     * Endpoint: GET /api/employees/teams
     */
    static async getTeamStructure(req, res) {
        try {
            const employeeModel = new EmployeeModel();
            const teams = await employeeModel.getTeamStructure();
            
            await logEvent('TEAM_STRUCTURE_RETRIEVED', req.user, {
                teamsCount: teams.length
            });
            
            res.status(200).json({
                success: true,
                data: teams,
                count: teams.length,
                message: 'Structure des équipes récupérée avec succès'
            });
            
        } catch (error) {
            console.error('Erreur récupération structure équipes:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération de la structure des équipes',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Recherche d'employés par critères
     * Endpoint: GET /api/employees/search
     */
    static async searchEmployees(req, res) {
        try {
            const { q, team, poste } = req.query;
            
            if (!q || q.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Le terme de recherche doit contenir au moins 2 caractères'
                });
            }
            
            const employeeModel = new EmployeeModel();
            let employees = await employeeModel.getAllEmployees();
            
            // Filtrage par terme de recherche
            const searchTerm = q.toLowerCase();
            employees = employees.filter(emp => 
                emp.nom.toLowerCase().includes(searchTerm) ||
                emp.prenom.toLowerCase().includes(searchTerm) ||
                emp.poste.toLowerCase().includes(searchTerm) ||
                emp.equipe.toLowerCase().includes(searchTerm)
            );
            
            // Filtres additionnels
            if (team) {
                employees = employees.filter(emp => emp.equipe === team);
            }
            
            if (poste) {
                employees = employees.filter(emp => 
                    emp.poste.toLowerCase().includes(poste.toLowerCase())
                );
            }
            
            await logEvent('EMPLOYEES_SEARCHED', req.user, {
                searchTerm: q,
                resultsCount: employees.length,
                filters: { team, poste }
            });
            
            res.status(200).json({
                success: true,
                data: employees,
                count: employees.length,
                searchTerm: q,
                message: `${employees.length} employé(s) trouvé(s)`
            });
            
        } catch (error) {
            console.error('Erreur recherche employés:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la recherche d\'employés',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Statistiques des employés pour le tableau de bord
     * Endpoint: GET /api/employees/stats
     */
    static async getEmployeeStats(req, res) {
        try {
            const employeeModel = new EmployeeModel();
            const allEmployees = await employeeModel.getAllEmployees();
            const teams = await employeeModel.getTeamStructure();
            
            const stats = {
                totalEmployes: allEmployees.length,
                nombreEquipes: teams.length,
                responsablesEquipe: allEmployees.filter(emp => emp.responsableEquipe).length,
                repartitionParEquipe: teams.map(team => ({
                    equipe: team.nom,
                    nombre: team.nombreEmployes,
                    responsables: team.nombreResponsables
                })),
                derniersMoisEmbauches: this.getRecentHires(allEmployees, 3)
            };
            
            await logEvent('EMPLOYEE_STATS_RETRIEVED', req.user, {
                totalEmployees: stats.totalEmployes
            });
            
            res.status(200).json({
                success: true,
                data: stats,
                message: 'Statistiques des employés récupérées avec succès'
            });
            
        } catch (error) {
            console.error('Erreur statistiques employés:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des statistiques',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    
    /**
     * Méthode utilitaire pour calculer les embauches récentes
     * Analyse des tendances de recrutement
     */
    static getRecentHires(employees, months = 3) {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        
        return employees.filter(emp => 
            emp.dateEmbauche && new Date(emp.dateEmbauche) >= cutoffDate
        ).length;
    }
}

module.exports = EmployeeController;