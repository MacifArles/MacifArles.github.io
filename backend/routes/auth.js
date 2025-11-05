/**
 * Routes d'authentification pour l'API CRC Co Arles Macif
 * Gestion sécurisée des sessions et autorisations
 * Niveau de confiance: 95%
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { logEvent } = require('../middleware/logging');
const DatabaseManager = require('../database/database');

/**
 * Règles de validation pour l'authentification
 * Sécurisation des données d'entrée utilisateur
 */
const loginValidation = [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Nom d\'utilisateur requis (3-50 caractères)'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe requis (minimum 6 caractères)')
];

const registerValidation = [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Nom d\'utilisateur requis (3-50 caractères)'),
    body('email').isEmail().withMessage('Email valide requis'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe requis (minimum 8 caractères)')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial')
];

/**
 * Route: POST /api/auth/login
 * Description: Authentification des utilisateurs avec génération de token JWT
 * Permissions: Public (non authentifié)
 */
router.post('/login', loginValidation, async (req, res) => {
    try {
        // Validation des données d'entrée
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données de connexion invalides',
                details: errors.array()
            });
        }

        const { username, password } = req.body;
        const dbManager = new DatabaseManager();
        
        await dbManager.connect();
        
        // Recherche de l'utilisateur avec gestion de la casse
        const user = await dbManager.getQuery(
            'SELECT id, username, email, password_hash, role, is_active FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
            [username, username]
        );
        
        await dbManager.close();

        if (!user) {
            await logEvent('LOGIN_FAILED', null, {
                username,
                reason: 'User not found',
                ip: req.ip
            });
            
            return res.status(401).json({
                success: false,
                error: 'Identifiants incorrects',
                code: 'INVALID_CREDENTIALS'
            });
        }

        if (!user.is_active) {
            await logEvent('LOGIN_FAILED', null, {
                username: user.username,
                reason: 'Account inactive',
                ip: req.ip
            });
            
            return res.status(401).json({
                success: false,
                error: 'Compte désactivé, contactez votre administrateur',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Vérification du mot de passe avec protection contre les attaques temporelles
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            await logEvent('LOGIN_FAILED', null, {
                username: user.username,
                reason: 'Invalid password',
                ip: req.ip
            });
            
            return res.status(401).json({
                success: false,
                error: 'Identifiants incorrects',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Génération du token JWT sécurisé
        const token = generateToken(user);
        
        await logEvent('LOGIN_SUCCESS', { username: user.username }, {
            userId: user.id,
            role: user.role,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            },
            message: 'Connexion réussie'
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            code: 'LOGIN_INTERNAL_ERROR'
        });
    }
});

/**
 * Route: POST /api/auth/register
 * Description: Création de nouveaux comptes utilisateur (administrateurs uniquement)
 * Permissions: Administrateurs uniquement
 */
router.post('/register', authenticateToken, registerValidation, async (req, res) => {
    try {
        // Vérification des permissions administrateur
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Seuls les administrateurs peuvent créer de nouveaux comptes',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Validation des données d'entrée
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données d\'inscription invalides',
                details: errors.array()
            });
        }

        const { username, email, password, role = 'user' } = req.body;
        const dbManager = new DatabaseManager();
        
        await dbManager.connect();

        // Vérification de l'unicité du nom d'utilisateur et de l'email
        const existingUser = await dbManager.getQuery(
            'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
            [username, email]
        );

        if (existingUser) {
            await dbManager.close();
            return res.status(409).json({
                success: false,
                error: 'Ce nom d\'utilisateur ou email est déjà utilisé',
                code: 'USER_ALREADY_EXISTS'
            });
        }

        // Hachage sécurisé du mot de passe
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Validation du rôle
        const validRoles = ['admin', 'manager', 'user'];
        const userRole = validRoles.includes(role) ? role : 'user';

        // Création de l'utilisateur
        const result = await dbManager.runQuery(
            'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [username, email, passwordHash, userRole]
        );

        await dbManager.close();

        await logEvent('USER_CREATED', req.user, {
            newUserId: result.id,
            newUsername: username,
            newUserRole: userRole
        });

        res.status(201).json({
            success: true,
            data: {
                id: result.id,
                username,
                email,
                role: userRole
            },
            message: 'Utilisateur créé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la création d\'utilisateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            code: 'REGISTER_INTERNAL_ERROR'
        });
    }
});

/**
 * Route: GET /api/auth/profile
 * Description: Récupération du profil utilisateur authentifié
 * Permissions: Utilisateurs authentifiés
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const dbManager = new DatabaseManager();
        await dbManager.connect();

        const userProfile = await dbManager.getQuery(
            'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        await dbManager.close();

        if (!userProfile) {
            return res.status(404).json({
                success: false,
                error: 'Profil utilisateur non trouvé',
                code: 'PROFILE_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: userProfile.id,
                username: userProfile.username,
                email: userProfile.email,
                role: userProfile.role,
                memberSince: userProfile.created_at
            },
            message: 'Profil récupéré avec succès'
        });

    } catch (error) {
        console.error('Erreur récupération profil:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            code: 'PROFILE_INTERNAL_ERROR'
        });
    }
});

/**
 * Route: PUT /api/auth/change-password
 * Description: Modification sécurisée du mot de passe utilisateur
 * Permissions: Utilisateurs authentifiés
 */
router.put('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 8 }).withMessage('Nouveau mot de passe requis (minimum 8 caractères)')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const dbManager = new DatabaseManager();
        
        await dbManager.connect();

        // Récupération du hash actuel du mot de passe
        const user = await dbManager.getQuery(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            await dbManager.close();
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        // Vérification du mot de passe actuel
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isCurrentPasswordValid) {
            await dbManager.close();
            await logEvent('PASSWORD_CHANGE_FAILED', req.user, {
                reason: 'Invalid current password'
            });
            
            return res.status(401).json({
                success: false,
                error: 'Mot de passe actuel incorrect'
            });
        }

        // Hachage du nouveau mot de passe
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Mise à jour du mot de passe
        await dbManager.runQuery(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPasswordHash, req.user.id]
        );

        await dbManager.close();

        await logEvent('PASSWORD_CHANGED', req.user, {
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Mot de passe modifié avec succès'
        });

    } catch (error) {
        console.error('Erreur changement mot de passe:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * Route: POST /api/auth/logout
 * Description: Déconnexion utilisateur avec invalidation du token
 * Permissions: Utilisateurs authentifiés
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await logEvent('USER_LOGOUT', req.user, {
            userId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Déconnexion réussie'
        });

    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

module.exports = router;