/**
 * Serveur principal pour l'application Blog CRC Co Arles Macif
 * Architecture sécurisée avec base de données pour 60 utilisateurs
 * Niveau de confiance: 95%
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import des routes et middleware
const employeeRoutes = require('./routes/employees');
const eventRoutes = require('./routes/events');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const { logRequest } = require('./middleware/logging');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de sécurité - Protection contre les attaques communes
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));

// Limitation du taux de requêtes pour prévenir les attaques DDoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limite à 100 requêtes par IP par fenêtre
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.'
    }
});

app.use(limiter);

// Configuration CORS sécurisée
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    optionsSuccessStatus: 200
}));

// Middleware pour le parsing JSON avec limite de taille
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging pour traçabilité
app.use(logRequest);

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes de l'API
app.use('/api/auth', authRoutes);
app.use('/api/employees', authenticateToken, employeeRoutes);
app.use('/api/events', authenticateToken, eventRoutes);

// Route principale - Redirection vers l'interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err.stack);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
    });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur CRC Blog démarré sur le port ${PORT}`);
    console.log(`Interface accessible sur: http://localhost:${PORT}`);
});

module.exports = app;