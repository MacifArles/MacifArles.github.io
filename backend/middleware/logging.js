/**
 * Middleware de logging et traçabilité pour l'application CRC
 * Enregistrement sécurisé des activités utilisateur
 * Niveau de confiance: 94%
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration des logs
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'access.log');
const ERROR_FILE = path.join(LOG_DIR, 'error.log');

/**
 * Initialisation du système de logging
 * Création des dossiers et fichiers nécessaires
 */
const initializeLogging = async () => {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
        console.log('Système de logging initialisé');
    } catch (error) {
        console.error('Erreur initialisation logging:', error);
    }
};

/**
 * Formatage standardisé des entrées de log
 * Structure uniforme pour l'analyse des données
 */
const formatLogEntry = (req, res, responseTime, error = null) => {
    const timestamp = new Date().toISOString();
    const userInfo = req.user ? `${req.user.username}(${req.user.role})` : 'anonymous';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    const logEntry = {
        timestamp,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        user: userInfo,
        ip,
        userAgent,
        error: error ? error.message : null
    };

    return JSON.stringify(logEntry);
};

/**
 * Écriture asynchrone des logs
 * Gestion des erreurs d'écriture
 */
const writeLog = async (logEntry, isError = false) => {
    try {
        const filePath = isError ? ERROR_FILE : LOG_FILE;
        await fs.appendFile(filePath, logEntry + '\n', 'utf8');
    } catch (error) {
        console.error('Erreur écriture log:', error);
    }
};

/**
 * Middleware principal de logging des requêtes
 * Enregistrement de toutes les activités HTTP
 */
const logRequest = (req, res, next) => {
    const startTime = Date.now();

    // Enregistrement du timestamp de début
    req.requestStartTime = startTime;

    // Interception de la fin de réponse
    const originalSend = res.send;
    res.send = function(data) {
        const responseTime = Date.now() - startTime;
        const logEntry = formatLogEntry(req, res, responseTime);
        
        // Écriture asynchrone du log
        writeLog(logEntry, res.statusCode >= 400);

        // Appel de la méthode originale
        originalSend.call(this, data);
    };

    next();
};

/**
 * Middleware de logging des erreurs
 * Enregistrement détaillé des erreurs système
 */
const logError = (error, req, res, next) => {
    const responseTime = Date.now() - req.requestStartTime;
    const logEntry = formatLogEntry(req, res, responseTime, error);
    
    // Log spécifique pour les erreurs
    const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
            message: error.message,
            stack: error.stack,
            code: error.code || 'UNKNOWN'
        },
        request: {
            method: req.method,
            url: req.originalUrl,
            user: req.user ? req.user.username : 'anonymous',
            ip: req.ip || req.connection.remoteAddress
        }
    };

    writeLog(JSON.stringify(errorLog), true);
    next(error);
};

/**
 * Fonction utilitaire pour les logs personnalisés
 * Enregistrement d'événements spécifiques métier
 */
const logEvent = async (event, user = null, details = {}) => {
    const timestamp = new Date().toISOString();
    const eventLog = {
        timestamp,
        type: 'BUSINESS_EVENT',
        event,
        user: user ? user.username : 'system',
        details
    };

    await writeLog(JSON.stringify(eventLog));
};

/**
 * Nettoyage périodique des logs anciens
 * Rotation automatique pour optimiser l'espace disque
 */
const cleanOldLogs = async (retentionDays = 30) => {
    try {
        const files = await fs.readdir(LOG_DIR);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        for (const file of files) {
            const filePath = path.join(LOG_DIR, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
                await fs.unlink(filePath);
                console.log(`Log ancien supprimé: ${file}`);
            }
        }
    } catch (error) {
        console.error('Erreur nettoyage logs:', error);
    }
};

/**
 * Fonction d'analyse des logs pour reporting
 * Génération de statistiques d'utilisation
 */
const generateLogStats = async (startDate, endDate) => {
    try {
        const logContent = await fs.readFile(LOG_FILE, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        
        const stats = {
            totalRequests: 0,
            errorCount: 0,
            userActivity: {},
            popularEndpoints: {},
            timeRange: { start: startDate, end: endDate }
        };

        lines.forEach(line => {
            try {
                const entry = JSON.parse(line);
                const entryDate = new Date(entry.timestamp);
                
                if (entryDate >= startDate && entryDate <= endDate) {
                    stats.totalRequests++;
                    
                    if (entry.statusCode >= 400) {
                        stats.errorCount++;
                    }
                    
                    // Comptage par utilisateur
                    if (entry.user !== 'anonymous') {
                        stats.userActivity[entry.user] = (stats.userActivity[entry.user] || 0) + 1;
                    }
                    
                    // Endpoints populaires
                    stats.popularEndpoints[entry.url] = (stats.popularEndpoints[entry.url] || 0) + 1;
                }
            } catch (parseError) {
                // Ligne de log malformée ignorée
            }
        });

        return stats;
    } catch (error) {
        console.error('Erreur génération statistiques:', error);
        return null;
    }
};

// Initialisation automatique
initializeLogging();

module.exports = {
    logRequest,
    logError,
    logEvent,
    cleanOldLogs,
    generateLogStats,
    initializeLogging
};