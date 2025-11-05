/**
 * Script d'initialisation de la base de données CRC Co Arles Macif
 * Configuration automatique pour le déploiement
 * Niveau de confiance: 97%
 */

const DatabaseManager = require('./database');

async function initializeDatabase() {
    const dbManager = new DatabaseManager();
    
    try {
        console.log('Début de l\'initialisation de la base de données...');
        
        // Connexion à la base de données
        await dbManager.connect();
        console.log('✓ Connexion établie');
        
        // Création des tables
        await dbManager.initializeTables();
        console.log('✓ Tables créées/vérifiées');
        
        // Insertion des données de test
        await dbManager.insertTestData();
        console.log('✓ Données de test configurées');
        
        console.log('\n🎉 Base de données initialisée avec succès!');
        console.log('📋 Informations de connexion par défaut:');
        console.log('   - Utilisateur: admin');
        console.log('   - Mot de passe: admin123!');
        console.log('   - URL: http://localhost:3000');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error.message);
        process.exit(1);
    } finally {
        await dbManager.close();
        console.log('\n🔐 Connexion fermée proprement');
        process.exit(0);
    }
}

// Exécution du script si appelé directement
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };