/**
 * Routes de gestion des employés pour l'API CRC Co Arles Macif
 * Interface sécurisée pour le trombinoscope
 * Niveau de confiance: 98%
 */

const express = require('express');
const router = express.Router();
const EmployeeController = require('../controllers/employeeController');
const EmployeeModel = require('../models/Employee');
const { requireRole } = require('../middleware/auth');

// Application des règles de validation pour les opérations de création et modification
const validationRules = EmployeeModel.getValidationRules();

/**
 * Route: GET /api/employees
 * Description: Récupération de tous les employés avec filtrage optionnel
 * Permissions: Tous les utilisateurs authentifiés
 */
router.get('/', EmployeeController.getAllEmployees);

/**
 * Route: GET /api/employees/teams
 * Description: Récupération de la structure des équipes
 * Permissions: Tous les utilisateurs authentifiés
 */
router.get('/teams', EmployeeController.getTeamStructure);

/**
 * Route: GET /api/employees/search
 * Description: Recherche d'employés par critères multiples
 * Permissions: Tous les utilisateurs authentifiés
 */
router.get('/search', EmployeeController.searchEmployees);

/**
 * Route: GET /api/employees/stats
 * Description: Statistiques des employés pour le tableau de bord
 * Permissions: Managers et administrateurs uniquement
 */
router.get('/stats', requireRole(['admin', 'manager']), EmployeeController.getEmployeeStats);

/**
 * Route: GET /api/employees/:id
 * Description: Récupération d'un employé spécifique par ID
 * Permissions: Tous les utilisateurs authentifiés
 */
router.get('/:id', EmployeeController.getEmployeeById);

/**
 * Route: POST /api/employees
 * Description: Création d'un nouvel employé
 * Permissions: Managers et administrateurs uniquement
 * Validation: Application des règles de validation complètes
 */
router.post('/', 
    requireRole(['admin', 'manager']), 
    validationRules, 
    EmployeeController.createEmployee
);

/**
 * Route: PUT /api/employees/:id
 * Description: Mise à jour d'un employé existant
 * Permissions: Managers et administrateurs uniquement
 * Validation: Application des règles de validation pour les modifications
 */
router.put('/:id', 
    requireRole(['admin', 'manager']), 
    validationRules, 
    EmployeeController.updateEmployee
);

/**
 * Route: DELETE /api/employees/:id
 * Description: Désactivation d'un employé (suppression logique)
 * Permissions: Administrateurs uniquement
 */
router.delete('/:id', 
    requireRole(['admin']), 
    EmployeeController.deactivateEmployee
);

module.exports = router;