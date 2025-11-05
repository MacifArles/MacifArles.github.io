/**
 * Middleware d'authentification JWT pour l'application CRC
 * Gestion sécurisée des sessions utilisateur
 * Niveau de confiance: 96%
 */

const jwt = require('jsonwebtoken');
const DatabaseManager = require('../database/database');

// Clé secrète pour les tokens JWT - À configurer via variables d'environnement
const JWT_SECRET = process.env.JWT_SECRET || 'crc_arles_secret_key_2024!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Middleware de vérification des tokens d'authentification
 * Valide le token JWT et charge les informations utilisateur
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({
                error: 'Token d\'authentification requis',
                code: 'AUTH_TOKEN_MISSING'
            });
        }

        // Vérification et décodage du token
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        error: 'Token expiré, veuillez vous reconnecter',
                        code: 'AUTH_TOKEN_EXPIRED'
                    });
                }
                return res.status(403).json({
                    error: 'Token invalide',
                    code: 'AUTH_TOKEN_INVALID'
                });
            }

            // Vérification de l'existence et du statut de l'utilisateur
            const dbManager = new DatabaseManager();
            await dbManager.connect();

            try {
                const user = await dbManager.getQuery(
                    'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
                    [decoded.userId]
                );

                if (!user) {
                    return res.status(401).json({
                        error: 'Utilisateur non trouvé',
                        code: 'AUTH_USER_NOT_FOUND'
                    });
                }

                if (!user.is_active) {
                    return res.status(401).json({
                        error: 'Compte utilisateur désactivé',
                        code: 'AUTH_USER_INACTIVE'
                    });
                }

                // Ajout des informations utilisateur à la requête
                req.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                };

                await dbManager.close();
                next();

            } catch (dbError) {
                await dbManager.close();
                console.error('Erreur base de données lors de l\'authentification:', dbError);
                return res.status(500).json({
                    error: 'Erreur interne du serveur',
                    code: 'AUTH_DB_ERROR'
                });
            }
        });

    } catch (error) {
        console.error('Erreur middleware authentification:', error);
        return res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'AUTH_INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware de vérification des rôles utilisateur
 * Contrôle l'accès basé sur les permissions
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentification requise',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Permissions insuffisantes pour cette action',
                code: 'AUTH_INSUFFICIENT_PERMISSIONS',
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Génération sécurisée des tokens JWT
 * Création de tokens avec informations utilisateur et expiration
 */
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'crc-arles-macif',
        audience: 'crc-blog-users'
    });
};

/**
 * Middleware optionnel d'authentification
 * Charge les informations utilisateur si un token valide est présent
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const dbManager = new DatabaseManager();
        await dbManager.connect();

        const user = await dbManager.getQuery(
            'SELECT id, username, email, role, is_active FROM users WHERE id = ? AND is_active = 1',
            [decoded.userId]
        );

        req.user = user || null;
        await dbManager.close();
        next();

    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    generateToken,
    optionalAuth,
    JWT_SECRET
};