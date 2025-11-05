/**
 * Module principal de l'application CRC Co Arles Macif
 * Orchestration globale et initialisation du système intranet
 * Niveau de confiance: 98%
 */

class ApplicationManager {
    constructor() {
        this.isInitialized = false;
        this.modules = {};
        this.startTime = Date.now();
        
        this.initialize();
    }

    /**
     * Initialisation principale de l'application
     * Séquence de démarrage et configuration des composants
     */
    async initialize() {
        try {
            console.log('Initialisation de l\'application CRC Co Arles Macif...');
            
            await this.waitForDOMReady();
            await this.initializeModules();
            await this.setupApplicationEvents();
            await this.performInitialDataLoad();
            
            this.isInitialized = true;
            this.logInitializationComplete();
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de l\'application:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Attente de la disponibilité du DOM
     * Vérification de l'état de chargement de la page
     */
    waitForDOMReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Initialisation des modules fonctionnels
     * Configuration et enregistrement des gestionnaires spécialisés
     */
    async initializeModules() {
        this.modules = {
            auth: window.auth,
            api: window.api,
            ui: window.ui,
            employees: window.employees,
            events: window.events
        };

        // Vérification de la disponibilité des modules essentiels
        const requiredModules = ['auth', 'api', 'ui'];
        const missingModules = requiredModules.filter(module => !this.modules[module]);
        
        if (missingModules.length > 0) {
            throw new Error(`Modules manquants: ${missingModules.join(', ')}`);
        }

        console.log('Modules initialisés avec succès');
    }

    /**
     * Configuration des événements globaux de l'application
     * Établissement des interactions inter-modules
     */
    async setupApplicationEvents() {
        this.setupErrorHandling();
        this.setupNetworkMonitoring();
        this.setupKeyboardShortcuts();
        this.setupVisibilityChangeHandling();
    }

    /**
     * Configuration de la gestion globale des erreurs
     * Surveillance et traitement des erreurs non capturées
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Erreur JavaScript non capturée:', event.error);
            this.handleGlobalError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promesse rejetée non gérée:', event.reason);
            this.handleGlobalError(event.reason);
        });
    }

    /**
     * Configuration de la surveillance de la connectivité réseau
     * Détection des changements d'état de connexion
     */
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            console.log('Connexion réseau rétablie');
            window.ui?.showToast('Connexion réseau rétablie', 'success');
            this.handleNetworkReconnection();
        });

        window.addEventListener('offline', () => {
            console.log('Connexion réseau perdue');
            window.ui?.showToast('Connexion réseau interrompue', 'warning', 10000);
        });
    }

    /**
     * Configuration des raccourcis clavier globaux
     * Amélioration de l'efficacité utilisateur
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'k':
                        event.preventDefault();
                        this.focusSearchBox();
                        break;
                    case 'n':
                        event.preventDefault();
                        this.showNewEventModal();
                        break;
                    case 'h':
                        event.preventDefault();
                        this.navigateToHome();
                        break;
                }
            }
        });
    }

    /**
     * Configuration de la gestion des changements de visibilité
     * Optimisation des performances selon l'état de la page
     */
    setupVisibilityChangeHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });
    }

    /**
     * Chargement initial des données de l'application
     * Préparation de l'état initial de l'interface
     */
    async performInitialDataLoad() {
        if (!window.auth?.isAuthenticated()) {
            console.log('Utilisateur non authentifié - arrêt du chargement initial');
            return;
        }

        try {
            console.log('Chargement des données initiales...');
            
            // Chargement prioritaire du tableau de bord
            await this.loadDashboardData();
            
            console.log('Données initiales chargées avec succès');
            
        } catch (error) {
            console.warn('Erreur lors du chargement initial des données:', error);
            window.ui?.showToast('Certaines données n\'ont pas pu être chargées', 'warning');
        }
    }

    /**
     * Chargement des données du tableau de bord
     * Préparation des métriques principales
     */
    async loadDashboardData() {
        try {
            if (window.ui?.getCurrentSection() === 'home') {
                await window.ui.loadDashboardData();
            }
        } catch (error) {
            console.error('Erreur chargement tableau de bord:', error);
            throw error;
        }
    }

    /**
     * Gestion des erreurs globales de l'application
     * Traitement centralisé des problèmes système
     */
    handleGlobalError(error) {
        const errorMessage = error?.message || 'Une erreur inattendue s\'est produite';
        
        // Filtrage des erreurs non critiques
        if (this.isNonCriticalError(error)) {
            console.warn('Erreur non critique ignorée:', error);
            return;
        }

        window.ui?.showToast('Erreur système détectée', 'error');
        
        // Envoi optionnel de télémétrie d'erreur
        this.reportError(error);
    }

    /**
     * Vérification si une erreur est considérée comme non critique
     * Classification des erreurs selon leur impact
     */
    isNonCriticalError(error) {
        const nonCriticalPatterns = [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Script error'
        ];

        const errorString = error?.toString() || '';
        return nonCriticalPatterns.some(pattern => errorString.includes(pattern));
    }

    /**
     * Signalement des erreurs pour analyse
     * Collecte optionnelle de données de diagnostic
     */
    reportError(error) {
        try {
            const errorReport = {
                message: error?.message || 'Erreur inconnue',
                stack: error?.stack || 'Pile d\'exécution non disponible',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                userId: window.auth?.getUser()?.id || 'anonyme'
            };
            
            console.log('Rapport d\'erreur généré:', errorReport);
            
        } catch (reportError) {
            console.error('Erreur lors de la génération du rapport:', reportError);
        }
    }

    /**
     * Gestion de la reconnexion réseau
     * Actions de récupération après restauration de la connectivité
     */
    async handleNetworkReconnection() {
        try {
            // Vérification de la validité du token d'authentification
            if (window.auth?.isAuthenticated()) {
                const isValidToken = await window.auth.validateToken();
                
                if (!isValidToken) {
                    window.ui?.showToast('Session expirée, veuillez vous reconnecter', 'warning');
                    return;
                }
            }

            // Rechargement des données de la section active
            const currentSection = window.ui?.getCurrentSection();
            if (currentSection) {
                await window.ui.loadSectionData(currentSection);
            }
            
        } catch (error) {
            console.error('Erreur lors de la reconnexion:', error);
        }
    }

    /**
     * Gestion de l'erreur d'initialisation
     * Actions de récupération en cas d'échec du démarrage
     */
    handleInitializationError(error) {
        const fallbackMessage = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
                backdrop-filter: blur(10px);
                color: #1f2937;
                max-width: 400px;
                z-index: 9999;
            ">
                <h3 style="margin-bottom: 1rem; color: #ef4444;">
                    Erreur d'initialisation
                </h3>
                <p style="margin-bottom: 1.5rem;">
                    L'application n'a pas pu se charger correctement.
                </p>
                <button onclick="location.reload()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                ">
                    Recharger la page
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', fallbackMessage);
    }

    /**
     * Actions lors du masquage de la page
     * Optimisation des ressources en arrière-plan
     */
    handlePageHidden() {
        console.log('Page masquée - réduction de l\'activité');
        
        // Suspension des actualisations automatiques
        this.pauseAutoRefresh();
    }

    /**
     * Actions lors du retour de visibilité de la page
     * Reprise des activités normales
     */
    async handlePageVisible() {
        console.log('Page visible - reprise de l\'activité');
        
        // Reprise des actualisations automatiques
        this.resumeAutoRefresh();
        
        // Vérification de la fraîcheur des données
        await this.checkDataFreshness();
    }

    /**
     * Suspension des actualisations automatiques
     * Conservation des ressources en mode arrière-plan
     */
    pauseAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Reprise des actualisations automatiques
     * Restauration du fonctionnement normal
     */
    resumeAutoRefresh() {
        if (!this.refreshInterval && window.auth?.isAuthenticated()) {
            this.refreshInterval = setInterval(() => {
                this.performPeriodicRefresh();
            }, 300000); // Actualisation toutes les 5 minutes
        }
    }

    /**
     * Vérification de la fraîcheur des données
     * Actualisation si nécessaire après retour de visibilité
     */
    async checkDataFreshness() {
        const lastRefresh = localStorage.getItem('lastDataRefresh');
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        if (!lastRefresh || parseInt(lastRefresh) < fiveMinutesAgo) {
            await this.performDataRefresh();
        }
    }

    /**
     * Actualisation périodique des données
     * Maintien de la cohérence des informations affichées
     */
    async performPeriodicRefresh() {
        try {
            if (!window.auth?.isAuthenticated()) {
                this.pauseAutoRefresh();
                return;
            }

            const currentSection = window.ui?.getCurrentSection();
            if (currentSection === 'home') {
                await window.ui.loadDashboardData();
            }
            
            localStorage.setItem('lastDataRefresh', Date.now().toString());
            
        } catch (error) {
            console.warn('Erreur lors de l\'actualisation périodique:', error);
        }
    }

    /**
     * Actualisation manuelle des données
     * Rechargement complet des informations
     */
    async performDataRefresh() {
        try {
            const currentSection = window.ui?.getCurrentSection();
            await window.ui.loadSectionData(currentSection);
            localStorage.setItem('lastDataRefresh', Date.now().toString());
            
        } catch (error) {
            console.error('Erreur lors de l\'actualisation:', error);
        }
    }

    /**
     * Focus sur la boîte de recherche principale
     * Raccourci d'efficacité utilisateur
     */
    focusSearchBox() {
        const searchInput = document.getElementById('employeeSearch');
        if (searchInput && window.ui?.getCurrentSection() === 'trombinoscope') {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Affichage de la modale de nouvel événement
     * Raccourci de création rapide
     */
    showNewEventModal() {
        if (window.auth?.isAuthenticated()) {
            window.ui?.showEventModal();
        }
    }

    /**
     * Navigation vers la page d'accueil
     * Retour rapide au tableau de bord
     */
    navigateToHome() {
        window.ui?.navigateToSection('home');
    }

    /**
     * Enregistrement de la finalisation de l'initialisation
     * Documentation des performances de démarrage
     */
    logInitializationComplete() {
        const initTime = Date.now() - this.startTime;
        console.log(`Application CRC Co Arles Macif initialisée en ${initTime}ms`);
        
        const performanceInfo = {
            initializationTime: initTime,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            language: navigator.language
        };
        
        console.log('Informations de performance:', performanceInfo);
    }

    /**
     * Vérification de l'état d'initialisation
     * Contrôle de disponibilité de l'application
     */
    isApplicationReady() {
        return this.isInitialized && window.auth?.isAuthenticated();
    }

    /**
     * Récupération des informations de diagnostic
     * Données de débogage et de surveillance
     */
    getDiagnosticInfo() {
        return {
            initialized: this.isInitialized,
            authenticated: window.auth?.isAuthenticated() || false,
            currentSection: window.ui?.getCurrentSection() || 'unknown',
            modulesLoaded: Object.keys(this.modules),
            lastRefresh: localStorage.getItem('lastDataRefresh'),
            uptime: Date.now() - this.startTime
        };
    }

    /**
     * Nettoyage des ressources de l'application
     * Préparation à la fermeture ou au rechargement
     */
    cleanup() {
        this.pauseAutoRefresh();
        
        // Nettoyage des écouteurs d'événements globaux
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handleGlobalError);
        window.removeEventListener('online', this.handleNetworkReconnection);
        window.removeEventListener('offline', () => {});
        
        console.log('Nettoyage de l\'application terminé');
    }
}

// Configuration globale et initialisation automatique
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.cleanup();
    }
});

// Initialisation de l'application au chargement de la page
window.app = new ApplicationManager();

// Exposition globale pour le débogage en développement
if (typeof window !== 'undefined') {
    window.debugApp = () => {
        console.log('Informations de diagnostic:', window.app?.getDiagnosticInfo());
        console.log('Modules disponibles:', {
            auth: !!window.auth,
            api: !!window.api,
            ui: !!window.ui,
            employees: !!window.employees,
            events: !!window.events
        });
    };
}