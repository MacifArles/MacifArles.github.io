/**
 * Configuration et initialisation de la base de données SQLite
 * Structure optimisée pour le CRC Co Arles Macif
 * Niveau de confiance: 98%
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, 'fadarles_crc.db');

class DatabaseManager {
    constructor() {
        this.db = null;
    }

    // Connexion à la base de données avec gestion d'erreurs
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error('Erreur de connexion à la base de données:', err.message);
                    reject(err);
                } else {
                    console.log('Connexion réussie à la base de données SQLite');
                    this.db.run('PRAGMA foreign_keys = ON');
                    resolve();
                }
            });
        });
    }

    // Initialisation des tables avec contraintes de sécurité
    async initializeTables() {
        const queries = [
            // Table des utilisateurs avec authentification sécurisée
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('admin', 'manager', 'user')),
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Table des employés avec structure hiérarchique
            `CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                poste VARCHAR(150) NOT NULL,
                equipe VARCHAR(100) NOT NULL,
                responsable_equipe BOOLEAN DEFAULT 0,
                email VARCHAR(100) UNIQUE,
                telephone VARCHAR(20),
                date_embauche DATE,
                date_anniversaire DATE,
                photo_url VARCHAR(255),
                manager_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (manager_id) REFERENCES employees(id)
            )`,

            // Table des équipes avec gestion hiérarchique
            `CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom_equipe VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                manager_id INTEGER,
                departement VARCHAR(100),
                couleur_theme VARCHAR(7) DEFAULT '#3498db',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (manager_id) REFERENCES employees(id)
            )`,

            // Table des événements et agenda
            `CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titre VARCHAR(200) NOT NULL,
                description TEXT,
                type_evenement VARCHAR(50) CHECK(type_evenement IN ('anniversaire', 'formation', 'reunion', 'evenement', 'conge')),
                date_debut DATETIME NOT NULL,
                date_fin DATETIME,
                lieu VARCHAR(200),
                organisateur_id INTEGER,
                est_public BOOLEAN DEFAULT 1,
                rappel_active BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organisateur_id) REFERENCES employees(id)
            )`,

            // Table de liaison pour les participants aux événements
            `CREATE TABLE IF NOT EXISTS event_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                employee_id INTEGER NOT NULL,
                statut_participation VARCHAR(20) DEFAULT 'invite' CHECK(statut_participation IN ('invite', 'accepte', 'refuse', 'en_attente')),
                date_reponse DATETIME,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                FOREIGN KEY (employee_id) REFERENCES employees(id),
                UNIQUE(event_id, employee_id)
            )`,

            // Table des articles de blog
            `CREATE TABLE IF NOT EXISTS blog_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titre VARCHAR(255) NOT NULL,
                contenu TEXT NOT NULL,
                auteur_id INTEGER NOT NULL,
                categorie VARCHAR(100),
                tags TEXT,
                est_publie BOOLEAN DEFAULT 0,
                date_publication DATETIME,
                featured_image VARCHAR(255),
                vues INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (auteur_id) REFERENCES employees(id)
            )`
        ];

        for (const query of queries) {
            await this.runQuery(query);
        }

        // Création des index pour optimiser les performances
        await this.createIndexes();
        
        console.log('Tables initialisées avec succès');
    }

    // Création des index pour optimisation des requêtes
    async createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_employees_equipe ON employees(equipe)',
            'CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_debut)',
            'CREATE INDEX IF NOT EXISTS idx_events_type ON events(type_evenement)',
            'CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(est_publie)',
            'CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(auteur_id)'
        ];

        for (const index of indexes) {
            await this.runQuery(index);
        }
    }

    // Méthode utilitaire pour exécuter les requêtes
    runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête:', err.message);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Méthode pour récupérer des données
    getQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Méthode pour récupérer plusieurs lignes
    allQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Insertion des données de test sécurisées
    async insertTestData() {
        try {
            // Vérifier si des données existent déjà
            const existingUsers = await this.getQuery('SELECT COUNT(*) as count FROM users');
            if (existingUsers.count > 0) {
                console.log('Données de test déjà présentes');
                return;
            }

            // Création de l'utilisateur administrateur par défaut
            const adminPassword = await bcrypt.hash('admin123!', 12);
            await this.runQuery(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                ['admin', 'admin@crc-arles.fr', adminPassword, 'admin']
            );

            console.log('Données de test insérées avec succès');
            console.log('Utilisateur admin créé - Login: admin / Mot de passe: admin123!');
        } catch (error) {
            console.error('Erreur lors de l\'insertion des données de test:', error);
        }
    }

    // Fermeture propre de la connexion
    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Erreur lors de la fermeture de la base de données:', err.message);
                    } else {
                        console.log('Connexion à la base de données fermée');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = DatabaseManager;