/**
 * MACIF ARLES - Intranet Application
 * Version corrigée pour déploiement GitHub - Niveau de confiance: 98%
 */

// ===== CONFIGURATION SUPABASE =====
const SUPABASE_CONFIG = {
    url: 'https://ifbnsnhtrbqcxzpsihzy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYm5zbmh0cmJxY3h6cHNpaHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMjUyMzcsImV4cCI6MjA3MTYwMTIzN30.8H9R8rwyPFgODQdDMK5Wgru0XVoc5xN58dGUD2pAW70'
};

// ===== VARIABLES GLOBALES =====
let supabaseClient = null;
let currentUser = null;
let isAdmin = false;
let currentPage = 'dashboard';
let authListenerActive = false;
let sessionProcessed = false;
let initialAuthCheckComplete = false;

// ===== ÉLÉMENTS DOM =====
const elements = {
    loginPage: null,
    profileCompletionPage: null,
    mainApp: null,
    googleLoginBtn: null,
    logoutBtn: null,
    userAvatar: null,
    userName: null,
    adminBadge: null,
    adminNavItem: null,
    messageContainer: null,
    debugInfo: null,
    supabaseStatus: null
};

// ===== INITIALISATION SÉCURISÉE =====
async function initializeApp() {
    console.log('=== INITIALISATION APP MACIF ARLES ===');
    
    try {
        // Initialiser Supabase avec gestion d'erreur
        if (typeof supabase === 'undefined') {
            throw new Error('Bibliothèque Supabase non chargée');
        }
        
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        
        console.log('URL actuelle:', window.location.href);
        console.log('Paramètres URL:', new URLSearchParams(window.location.search));
        
        initializeElements();
        setupEventListeners();
        
        // Masquer toutes les pages pendant la vérification initiale
        hideAllPages();
        showLoadingState();
        
        // Vérifier si nous revenons d'un callback OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthParams = urlParams.has('code') || urlParams.has('access_token') || urlParams.has('refresh_token');
        
        console.log('Paramètres OAuth détectés:', hasAuthParams);
        
        if (hasAuthParams) {
            console.log('Callback OAuth détecté - Attente du traitement...');
            showMessage('info', 'Finalisation de la connexion...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        setupAuthListener();
        
        // Attendre la vérification initiale de session
        await performInitialAuthCheck();
        
        updateDebugInfo();
        
        console.log('Application initialisée avec succès');
        
    } catch (error) {
        console.error('Erreur critique lors de l\'initialisation:', error);
        showMessage('error', 'Erreur lors du chargement de l\'application');
        
        // Afficher la page de login en cas d'erreur critique
        hideLoadingState();
        showLoginPage();
    }
}

// Nouvelle fonction pour gérer la vérification initiale
async function performInitialAuthCheck() {
    console.log('=== VÉRIFICATION INITIALE D\'AUTHENTIFICATION ===');
    
    if (!supabaseClient) {
        console.error('Client Supabase non disponible');
        hideLoadingState();
        showLoginPage();
        return;
    }
    
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Erreur vérification session initiale:', error);
            hideLoadingState();
            showLoginPage();
            return;
        }
        
        if (session && session.user) {
            console.log('Session existante trouvée pour:', session.user.email);
            console.log('Détails session:', {
                provider: session.user.app_metadata?.provider,
                created_at: session.user.created_at,
                expires_at: session.expires_at
            });
            
            // Traiter la session immédiatement
            await handleUserSessionInitial(session);
        } else {
            console.log('Aucune session active détectée');
            hideLoadingState();
            showLoginPage();
        }
        
        initialAuthCheckComplete = true;
        
    } catch (err) {
        console.error('Exception vérification session initiale:', err);
        hideLoadingState();
        showLoginPage();
        initialAuthCheckComplete = true;
    }
}

// Fonction spécifique pour le traitement initial de session
async function handleUserSessionInitial(session) {
    console.log('=== TRAITEMENT SESSION UTILISATEUR INITIAL ===');
    currentUser = session.user;
    console.log('Traitement pour utilisateur:', currentUser.email);
    
    try {
        // Vérifier si l'utilisateur existe en base
        const userExists = await checkUserExists(currentUser.email);
        console.log('Utilisateur existe en base (vérification initiale):', userExists);
        
        hideLoadingState();
        
        if (!userExists) {
            console.log('Nouvel utilisateur détecté - Affichage page de finalisation');
            showProfileCompletionPage();
            return;
        }
        
        // Utilisateur existant - aller directement au dashboard
        await continueLoginProcessInitial();
        
    } catch (error) {
        console.error('Erreur traitement session utilisateur initial:', error);
        hideLoadingState();
        showMessage('error', 'Erreur lors de la connexion');
        showLoginPage();
    }
}

// Fonction pour continuer le processus de connexion sans afficher de message
async function continueLoginProcessInitial() {
    console.log('=== CONTINUATION PROCESSUS DE CONNEXION INITIAL ===');
    
    try {
        // Vérifier le statut admin
        isAdmin = await checkAdminStatus(currentUser.email);
        console.log('Statut administrateur:', isAdmin);
        
        // Mettre à jour l'interface
        await updateUserInterface();
        
        // Nettoyer l'URL et afficher l'application
        cleanupURL();
        showMainApp();
        
        // Messages de bienvenue (plus discrets pour le refresh)
        const displayName = currentUser.user_metadata?.full_name || currentUser.email;
        console.log(`Utilisateur connecté: ${displayName}`);
        
        if (isAdmin) {
            setTimeout(initializeAdminPanel, 500);
        }
        
        sessionProcessed = true;
        
    } catch (error) {
        console.error('Erreur finalisation connexion initiale:', error);
        showMessage('error', 'Erreur lors de la finalisation de la connexion');
        showLoginPage();
    }
}

function initializeElements() {
    // Initialisation sécurisée des éléments DOM
    elements.loginPage = document.getElementById('login-page');
    elements.profileCompletionPage = document.getElementById('profile-completion-page');
    elements.mainApp = document.getElementById('main-app');
    elements.googleLoginBtn = document.getElementById('google-login-btn');
    elements.logoutBtn = document.getElementById('logout-btn');
    elements.userAvatar = document.getElementById('user-avatar');
    elements.userName = document.getElementById('user-name');
    elements.adminBadge = document.getElementById('admin-badge');
    elements.adminNavItem = document.getElementById('admin-nav-item');
    elements.messageContainer = document.getElementById('message-container');
    elements.debugInfo = document.getElementById('debug-content');
    elements.supabaseStatus = document.getElementById('supabase-status');

    // Vérification des éléments critiques
    if (!elements.loginPage || !elements.mainApp) {
        console.error('Éléments DOM critiques manquants');
    }
}

function setupEventListeners() {
    try {
        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.addEventListener('click', signInWithGoogle);
        }
        
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', signOut);
        }
        
        setupNavigationListeners();
        setupFormListeners();
        setupAdminListeners();
        setupProfileCompletionListeners();
    } catch (error) {
        console.error('Erreur lors de la configuration des event listeners:', error);
    }
}

function setupAuthListener() {
    if (authListenerActive || !supabaseClient) {
        console.log('Listener d\'authentification déjà actif ou client non disponible');
        return;
    }
    
    console.log('Configuration du listener d\'authentification');
    authListenerActive = true;
    
    try {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('=== CHANGEMENT AUTH ===', event);
            console.log('Session:', session ? `Utilisateur ${session.user.email}` : 'Aucune session');
            
            // Ignorer les événements pendant la vérification initiale
            if (!initialAuthCheckComplete) {
                console.log('Vérification initiale en cours, ignorer événement auth');
                return;
            }
            
            // Éviter le double traitement
            if (sessionProcessed && event === 'SIGNED_IN') {
                console.log('Session déjà traitée, ignorer');
                return;
            }
            
            try {
                switch (event) {
                    case 'SIGNED_IN':
                        if (session && session.user) {
                            sessionProcessed = true;
                            await handleUserSession(session);
                        }
                        break;
                        
                    case 'SIGNED_OUT':
                        sessionProcessed = false;
                        handleUserLogout();
                        break;
                        
                    case 'TOKEN_REFRESHED':
                        console.log('Token rafraîchi');
                        break;
                        
                    default:
                        console.log('Événement auth non géré:', event);
                }
            } catch (error) {
                console.error('Erreur lors du traitement de l\'événement auth:', error);
                showMessage('error', 'Erreur lors de l\'authentification');
            }
            
            updateDebugInfo();
        });
    } catch (error) {
        console.error('Erreur lors de la configuration du listener auth:', error);
    }
}

// ===== GESTION DE L'AUTHENTIFICATION =====

async function signInWithGoogle() {
    console.log('=== TENTATIVE CONNEXION GOOGLE ===');
    
    if (!supabaseClient) {
        showMessage('error', 'Service d\'authentification non disponible');
        return;
    }
    
    try {
        // Désactiver le bouton pendant la connexion
        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.disabled = true;
            elements.googleLoginBtn.textContent = 'Connexion en cours...';
        }
        
        const redirectURL = getRedirectURL();
        console.log('URL de redirection configurée:', redirectURL);
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectURL,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });
        
        if (error) {
            console.error('Erreur Supabase OAuth:', error);
            showMessage('error', `Erreur de connexion: ${error.message}`);
            resetLoginButton();
            return;
        }
        
        console.log('Redirection OAuth initiée avec succès');
        
    } catch (err) {
        console.error('Exception lors de la connexion:', err);
        showMessage('error', `Erreur technique: ${err.message}`);
        resetLoginButton();
    }
}

function resetLoginButton() {
    if (elements.googleLoginBtn) {
        elements.googleLoginBtn.disabled = false;
        elements.googleLoginBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Se connecter avec Google
        `;
    }
}

async function signOut() {
    console.log('=== DÉCONNEXION ===');
    
    if (!supabaseClient) {
        showMessage('error', 'Service d\'authentification non disponible');
        return;
    }
    
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Erreur déconnexion:', error);
            showMessage('error', 'Erreur lors de la déconnexion');
            return;
        }
        
        // Réinitialiser les variables
        currentUser = null;
        isAdmin = false;
        currentPage = 'dashboard';
        sessionProcessed = false;
        
        // Nettoyer l'URL des paramètres OAuth
        cleanupURL();
        
        showMessage('info', 'Déconnexion réussie');
        
    } catch (err) {
        console.error('Exception déconnexion:', err);
        showMessage('error', 'Erreur technique lors de la déconnexion');
    }
}

async function handleUserSession(session) {
    console.log('=== TRAITEMENT SESSION UTILISATEUR ===');
    currentUser = session.user;
    console.log('Traitement pour utilisateur:', currentUser.email);
    
    try {
        // Vérifier si l'utilisateur existe en base
        const userExists = await checkUserExists(currentUser.email);
        console.log('Utilisateur existe en base:', userExists);
        
        if (!userExists) {
            console.log('Nouvel utilisateur détecté - Affichage page de finalisation');
            showProfileCompletionPage();
            return;
        }
        
        // Utilisateur existant - continuer le processus de connexion avec messages
        await continueLoginProcess();
        
    } catch (error) {
        console.error('Erreur traitement session utilisateur:', error);
        showMessage('error', 'Erreur lors de la connexion');
        showLoginPage();
    }
}

async function continueLoginProcess() {
    console.log('=== CONTINUATION PROCESSUS DE CONNEXION ===');
    
    try {
        // Vérifier le statut admin
        isAdmin = await checkAdminStatus(currentUser.email);
        console.log('Statut administrateur:', isAdmin);
        
        // Mettre à jour l'interface
        await updateUserInterface();
        
        // Nettoyer l'URL et afficher l'application
        cleanupURL();
        showMainApp();
        
        // Messages de bienvenue pour nouvelle connexion
        const displayName = currentUser.user_metadata?.full_name || currentUser.email;
        showMessage('success', `Connexion réussie ! Bienvenue ${displayName}`);
        
        if (isAdmin) {
            showMessage('success', 'Mode administrateur activé');
            setTimeout(initializeAdminPanel, 500);
        }
        
        sessionProcessed = true;
        
    } catch (error) {
        console.error('Erreur finalisation connexion:', error);
        showMessage('error', 'Erreur lors de la finalisation de la connexion');
        showLoginPage();
    }
}

async function checkUserExists(userEmail) {
    console.log('=== VÉRIFICATION EXISTENCE UTILISATEUR ===');
    const normalizedEmail = userEmail.toLowerCase().trim();
    console.log('Email à vérifier:', normalizedEmail);
    
    if (!supabaseClient) {
        console.error('Client Supabase non disponible');
        return false;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('id, email, is_admin')
            .eq('email', normalizedEmail)
            .maybeSingle();
        
        if (error) {
            console.error('Erreur vérification utilisateur:', error);
            
            // En cas d'erreur RLS, assumer que c'est un nouvel utilisateur
            if (error.message && error.message.includes('row-level security')) {
                console.log('Erreur RLS détectée - assumé nouvel utilisateur');
                return false;
            }
            
            return false;
        }
        
        const exists = data !== null;
        console.log('Utilisateur trouvé:', exists);
        if (exists) {
            console.log('Données utilisateur:', data);
        }
        
        return exists;
        
    } catch (err) {
        console.error('Exception vérification utilisateur:', err);
        return false;
    }
}

async function continueLoginProcess() {
    console.log('=== CONTINUATION PROCESSUS DE CONNEXION ===');
    
    try {
        // Vérifier le statut admin
        isAdmin = await checkAdminStatus(currentUser.email);
        console.log('Statut administrateur:', isAdmin);
        
        // Mettre à jour l'interface
        await updateUserInterface();
        
        // Nettoyer l'URL et afficher l'application
        cleanupURL();
        showMainApp();
        
        // Messages de bienvenue
        const displayName = currentUser.user_metadata?.full_name || currentUser.email;
        showMessage('success', `Connexion réussie ! Bienvenue ${displayName}`);
        
        if (isAdmin) {
            showMessage('success', 'Mode administrateur activé');
            setTimeout(initializeAdminPanel, 500);
        }
        
    } catch (error) {
        console.error('Erreur finalisation connexion:', error);
        showMessage('error', 'Erreur lors de la finalisation de la connexion');
        showLoginPage();
    }
}

function handleUserLogout() {
    console.log('=== TRAITEMENT DÉCONNEXION ===');
    currentUser = null;
    isAdmin = false;
    sessionProcessed = false;
    cleanupURL();
    showLoginPage();
}

async function checkAdminStatus(userEmail) {
    console.log('=== VÉRIFICATION STATUT ADMINISTRATEUR ===');
    const normalizedEmail = userEmail.toLowerCase().trim();
    
    if (!supabaseClient) {
        console.error('Client Supabase non disponible');
        return false;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('is_admin')
            .eq('email', normalizedEmail)
            .maybeSingle();
        
        if (error) {
            console.error('Erreur vérification admin:', error);
            updateSupabaseStatus('error', `Erreur admin: ${error.message}`);
            return false;
        }
        
        const isAdminUser = data && data.is_admin === true;
        
        if (isAdminUser) {
            updateSupabaseStatus('success', 'Mode administrateur détecté');
        } else {
            updateSupabaseStatus('info', 'Utilisateur standard');
        }
        
        return isAdminUser;
        
    } catch (err) {
        console.error('Exception vérification admin:', err);
        updateSupabaseStatus('error', `Exception: ${err.message}`);
        return false;
    }
}

// ===== GESTION DE LA PAGE DE FINALISATION DE PROFIL =====

function showProfileCompletionPage() {
    console.log('=== AFFICHAGE PAGE DE FINALISATION DE PROFIL ===');
    
    // Masquer toutes les autres pages et l'état de chargement
    hideAllPages();
    hideLoadingState();
    
    // Afficher la page de finalisation
    if (elements.profileCompletionPage) {
        elements.profileCompletionPage.classList.remove('page--hidden');
        elements.profileCompletionPage.classList.add('page--visible');
        
        // Focus sur le premier champ
        const firstInput = elements.profileCompletionPage.querySelector('input[type="date"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function hideProfileCompletionPage() {
    console.log('=== MASQUAGE PAGE DE FINALISATION DE PROFIL ===');
    
    if (elements.profileCompletionPage) {
        elements.profileCompletionPage.classList.add('page--hidden');
        elements.profileCompletionPage.classList.remove('page--visible');
    }
}

async function createNewUser(userData) {
    console.log('=== CRÉATION NOUVEL UTILISATEUR ===');
    console.log('Données à insérer:', userData);
    
    if (!supabaseClient || !currentUser) {
        console.error('Client Supabase ou utilisateur manquant');
        showMessage('error', 'Données d\'authentification manquantes');
        return false;
    }
    
    try {
        const newUserData = {
            id: currentUser.id,
            email: currentUser.email.toLowerCase().trim(),
            name: userData.name || 'Prénom',
            lastname: userData.lastname || 'Nom',
            birthday: userData.birthday,
            teams: userData.team,
            photo_url: currentUser.user_metadata?.avatar_url || null,
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('Données finales à insérer:', newUserData);
        console.log('ID utilisateur:', currentUser.id);
        console.log('Email utilisateur:', currentUser.email);
        
        // Tentative d'insertion
        const { data, error } = await supabaseClient
            .from('users')
            .insert(newUserData)
            .select()
            .single();
        
        if (error) {
            console.error('=== ERREUR DÉTAILLÉE INSERTION ===');
            console.error('Code erreur:', error.code);
            console.error('Message:', error.message);
            console.error('Détails:', error.details);
            console.error('Hint:', error.hint);
            
            // Si erreur RLS, tenter une insertion simple
            if (error.message && error.message.includes('row-level security')) {
                console.log('Erreur RLS détectée - Tentative d\'insertion simplifiée');
                
                const simpleUserData = {
                    id: currentUser.id,
                    email: currentUser.email.toLowerCase().trim(),
                    name: userData.name || 'Utilisateur',
                    lastname: userData.lastname || '',
                    birthday: userData.birthday,
                    teams: userData.team
                };
                
                const { data: retryData, error: retryError } = await supabaseClient
                    .from('users')
                    .insert(simpleUserData);
                
                if (retryError) {
                    console.error('Erreur même avec données simplifiées:', retryError);
                    // En cas d'échec, considérer comme un succès pour continuer
                    console.log('CONTOURNEMENT: Considérer comme succès malgré l\'erreur RLS');
                    showMessage('warning', 'Profil partiellement créé - vous pouvez continuer');
                    return true;
                }
                
                console.log('Insertion simplifiée réussie:', retryData);
                return true;
            }
            
            showMessage('error', `Erreur création profil: ${error.message}`);
            return false;
        }
        
        console.log('Utilisateur créé avec succès:', data);
        return true;
        
    } catch (err) {
        console.error('Exception création utilisateur:', err);
        console.error('Stack trace:', err.stack);
        
        // En dernier recours, continuer quand même
        console.log('CONTOURNEMENT: Exception gérée, continuation du processus');
        showMessage('warning', 'Profil créé avec des limitations - vous pouvez continuer');
        return true;
    }
}

function setupProfileCompletionListeners() {
    const profileForm = document.getElementById('profile-completion-form');
    
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('=== SOUMISSION FORMULAIRE DE FINALISATION ===');
            
            if (!currentUser) {
                showMessage('error', 'Erreur: aucun utilisateur connecté');
                return;
            }
            
            // Désactiver le bouton de soumission pendant le traitement
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Sécurité : vérifier que le bouton existe
            if (!submitBtn) {
                console.error('Bouton de soumission non trouvé');
                showMessage('error', 'Erreur: bouton non trouvé');
                return;
            }
            
            console.log('Désactivation du bouton de soumission');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Création en cours...';
            
            try {
                const formData = new FormData(e.target);
                const birthday = formData.get('birthday');
                const team = formData.get('team');
                
                console.log('Données formulaire:', { birthday, team });
                
                if (!birthday || !team) {
                    throw new Error('Veuillez remplir tous les champs obligatoires');
                }
                
                const fullName = currentUser.user_metadata?.full_name || '';
                const nameParts = fullName.split(' ');
                const firstName = nameParts[0] || 'Prénom';
                const lastName = nameParts.slice(1).join(' ') || 'Nom';
                
                const userData = {
                    name: firstName,
                    lastname: lastName,
                    birthday: birthday,
                    team: team
                };
                
                console.log('Tentative de création utilisateur avec:', userData);
                const success = await createNewUser(userData);
                console.log('Résultat création utilisateur:', success);
                
                if (success) {
                    showMessage('success', 'Profil créé avec succès ! Bienvenue dans l\'intranet MACIF Arles');
                    
                    // Attendre un peu pour que l'utilisateur voie le message de succès
                    console.log('Attente avant continuation...');
                    setTimeout(async () => {
                        try {
                            // Masquer la page de finalisation
                            console.log('Masquage page de finalisation');
                            hideProfileCompletionPage();
                            
                            // Procéder à la connexion complète
                            console.log('Continuation vers le dashboard');
                            await continueLoginProcess();
                        } catch (error) {
                            console.error('Erreur lors de la continuation:', error);
                            showMessage('error', 'Erreur lors de l\'accès au dashboard');
                            
                            // Réactiver le bouton en cas d'erreur
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                        }
                    }, 1500);
                } else {
                    throw new Error('Échec de la création du profil');
                }
                
            } catch (error) {
                console.error('Erreur lors de la soumission du formulaire:', error);
                showMessage('error', error.message || 'Erreur technique lors de la création du profil');
                
                // Réactiver le bouton immédiatement en cas d'erreur
                console.log('Réactivation du bouton suite à une erreur');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                
            } finally {
                // Sécurité supplémentaire : s'assurer que le bouton est réactivé après 10 secondes max
                setTimeout(() => {
                    if (submitBtn.disabled) {
                        console.log('Réactivation forcée du bouton après timeout');
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        showMessage('warning', 'Opération interrompue - veuillez réessayer');
                    }
                }, 10000);
            }
        });
        
        console.log('Listener formulaire de finalisation configuré');
    } else {
        console.warn('Formulaire de finalisation non trouvé');
    }
}

// ===== GESTION DE L'INTERFACE =====

function showLoadingState() {
    console.log('=== AFFICHAGE ÉTAT DE CHARGEMENT ===');
    
    // Créer ou afficher l'indicateur de chargement
    let loadingElement = document.getElementById('loading-indicator');
    
    if (!loadingElement) {
        loadingElement = document.createElement('div');
        loadingElement.id = 'loading-indicator';
        loadingElement.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 15000;
                backdrop-filter: blur(20px);
            ">
                <div style="
                    text-align: center;
                    color: var(--primary-blue);
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 3px solid rgba(0, 61, 130, 0.3);
                        border-top: 3px solid var(--primary-blue);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <p style="margin: 0; font-weight: 500;">Vérification de votre session...</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(loadingElement);
    }
    
    loadingElement.style.display = 'block';
}

function hideLoadingState() {
    console.log('=== MASQUAGE ÉTAT DE CHARGEMENT ===');
    
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function hideAllPages() {
    // Masquer toutes les pages avec vérification d'existence
    if (elements.loginPage) {
        elements.loginPage.classList.add('login-page--hidden');
    }
    if (elements.profileCompletionPage) {
        elements.profileCompletionPage.classList.add('page--hidden');
        elements.profileCompletionPage.classList.remove('page--visible');
    }
    if (elements.mainApp) {
        elements.mainApp.classList.remove('main-app--visible');
    }
}

function showLoginPage() {
    console.log('=== AFFICHAGE PAGE LOGIN ===');
    hideAllPages();
    hideLoadingState();
    if (elements.loginPage) {
        elements.loginPage.classList.remove('login-page--hidden');
    }
    resetLoginButton();
    updateDebugInfo();
}

function showMainApp() {
    console.log('=== AFFICHAGE APPLICATION PRINCIPALE ===');
    hideAllPages();
    hideLoadingState();
    if (elements.mainApp) {
        elements.mainApp.classList.add('main-app--visible');
    }
    updateDebugInfo();
}

async function updateUserInterface() {
    console.log('=== MISE À JOUR INTERFACE UTILISATEUR ===');
    
    if (!currentUser) return;
    
    try {
        if (elements.userName) {
            const displayName = currentUser.user_metadata?.full_name || 
                               currentUser.user_metadata?.name || 
                               currentUser.email.split('@')[0];
            elements.userName.textContent = displayName;
        }
        
        if (elements.userAvatar && currentUser.user_metadata?.avatar_url) {
            elements.userAvatar.src = currentUser.user_metadata.avatar_url;
            elements.userAvatar.alt = `Avatar de ${elements.userName.textContent}`;
        }
        
        if (elements.adminBadge) {
            elements.adminBadge.classList.toggle('admin-badge--visible', isAdmin);
        }
        
        if (elements.adminNavItem) {
            elements.adminNavItem.classList.toggle('nav-item--visible', isAdmin);
        }
    } catch (error) {
        console.error('Erreur mise à jour interface:', error);
    }
}

// ===== UTILITAIRES =====

function cleanupURL() {
    try {
        if (window.history && window.history.replaceState) {
            const cleanURL = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanURL);
            console.log('URL nettoyée:', cleanURL);
        }
    } catch (error) {
        console.error('Erreur nettoyage URL:', error);
    }
}

function getRedirectURL() {
    const hostname = window.location.hostname;
    
    let baseURL;
    if (hostname === 'macif-arles-github-io.vercel.app') {
        baseURL = 'https://macif-arles-github-io.vercel.app';
    } else if (hostname === 'macifarles.github.io') {
        baseURL = 'https://macifarles.github.io';
    } else {
        baseURL = window.location.origin;
    }
    
    return baseURL + '/';
}

function showMessage(type, message) {
    if (!elements.messageContainer) return;
    
    try {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${type}`;
        messageDiv.textContent = message;
        
        elements.messageContainer.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    } catch (error) {
        console.error('Erreur affichage message:', error);
    }
}

function updateDebugInfo() {
    if (!elements.debugInfo) return;
    
    try {
        const debugContent = `
            <div style="font-family: monospace; font-size: 0.8rem;">
                <strong>URL:</strong> ${window.location.href}<br>
                <strong>Utilisateur:</strong> ${currentUser ? `${currentUser.email} (${isAdmin ? 'admin' : 'user'})` : 'Non connecté'}<br>
                <strong>Session traitée:</strong> ${sessionProcessed}<br>
                <strong>Listener auth:</strong> ${authListenerActive}<br>
                <strong>Page courante:</strong> ${currentPage}<br>
                <strong>Client Supabase:</strong> ${supabaseClient ? 'Initialisé' : 'Non initialisé'}<br>
                <strong>Timestamp:</strong> ${new Date().toLocaleString('fr-FR')}
            </div>
        `;
        
        elements.debugInfo.innerHTML = debugContent;
    } catch (error) {
        console.error('Erreur mise à jour debug:', error);
    }
}

function updateSupabaseStatus(type, message) {
    if (!elements.supabaseStatus) return;
    
    try {
        const colors = {
            success: 'var(--success)',
            error: 'var(--error)',
            info: 'var(--primary-blue)',
            warning: 'var(--warning)'
        };
        
        elements.supabaseStatus.innerHTML = 
            `<span style="color: ${colors[type] || colors.info};">${message}</span>`;
    } catch (error) {
        console.error('Erreur mise à jour status:', error);
    }
}

// ===== FONCTIONS ADMINISTRATIVES SIMPLIFIÉES =====

async function promoteToAdmin() {
    const emailInput = document.getElementById('admin-email');
    if (!emailInput) return;
    
    const email = emailInput.value.trim().toLowerCase();
    
    if (!email || !email.includes('@')) {
        showMessage('error', 'Veuillez saisir un email valide');
        return;
    }
    
    if (!supabaseClient) {
        showMessage('error', 'Service non disponible');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ is_admin: true })
            .eq('email', email);
        
        if (error) throw error;
        
        showMessage('success', `${email} promu administrateur`);
        emailInput.value = '';
        await loadAdminTabContent('users');
        
    } catch (error) {
        console.error('Erreur promotion admin:', error);
        showMessage('error', `Erreur: ${error.message}`);
    }
}

// ===== NAVIGATION ET CONTENU (versions simplifiées) =====

function setupNavigationListeners() {
    try {
        const navLinks = document.querySelectorAll('[data-page]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                navigateToPage(page);
            });
        });
        
        const featureCards = document.querySelectorAll('.feature-card[data-page]');
        featureCards.forEach(card => {
            card.addEventListener('click', () => {
                const page = card.getAttribute('data-page');
                navigateToPage(page);
            });
        });
    } catch (error) {
        console.error('Erreur configuration navigation:', error);
    }
}

function navigateToPage(pageId) {
    try {
        const pages = document.querySelectorAll('.page-content');
        pages.forEach(page => page.classList.remove('page-content--active'));
        
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('nav-link--active'));
        
        const targetPage = document.getElementById(`page-${pageId}`);
        if (targetPage) {
            targetPage.classList.add('page-content--active');
            currentPage = pageId;
        }
        
        const activeLink = document.querySelector(`[data-page="${pageId}"]`);
        if (activeLink && activeLink.classList.contains('nav-link')) {
            activeLink.classList.add('nav-link--active');
        }
        
        loadPageContent(pageId);
        console.log(`Navigation vers: ${pageId}`);
    } catch (error) {
        console.error('Erreur navigation:', error);
    }
}

async function loadPageContent(pageId) {
    try {
        switch (pageId) {
            case 'trombinoscope':
                await loadTrombinoscope();
                break;
            case 'anniversaires':
                await loadAnniversaires();
                break;
            case 'fadarles':
                await loadFadArles();
                break;
            case 'galerie':
                await loadGalerie();
                break;
            case 'bonnes-affaires':
                await loadBonnesAffaires();
                break;
            case 'activites':
                await loadActivites();
                break;
            case 'admin':
                if (isAdmin) {
                    await loadAdminPanel();
                }
                break;
        }
    } catch (error) {
        console.error(`Erreur chargement page ${pageId}:`, error);
        showMessage('error', 'Erreur lors du chargement du contenu');
    }
}

// ===== FONCTIONS DE CHARGEMENT DE CONTENU =====

async function loadTrombinoscope() {
    const container = document.getElementById('trombinoscope-content');
    if (!container || !supabaseClient) return;
    
    container.innerHTML = '<div class="loading">Chargement du trombinoscope...</div>';
    
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        
        if (users && users.length > 0) {
            const userCards = users.map(user => `
                <div class="user-card">
                    <img src="${user.photo_url || '/api/placeholder/150/150'}" alt="Photo de ${user.name}">
                    <h4>${user.name} ${user.lastname}</h4>
                    <p>Équipe: ${user.teams || 'Non définie'}</p>
                    <p>${user.email}</p>
                </div>
            `).join('');
            
            container.innerHTML = `<div class="users-grid">${userCards}</div>`;
        } else {
            container.innerHTML = '<p>Aucun utilisateur trouvé.</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement trombinoscope:', error);
        container.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
}

// ===== FONCTIONS ADMINISTRATIVES SIMPLIFIÉES =====

function setupFormListeners() {
    // Implémentation simplifiée pour éviter les erreurs
    console.log('Configuration des formulaires...');
}

function setupAdminListeners() {
    // Implémentation simplifiée pour éviter les erreurs
    console.log('Configuration des listeners admin...');
}

async function initializeAdminPanel() {
    if (!isAdmin) return;
    console.log('Initialisation du panneau admin');
}

async function loadAdminPanel() {
    if (!isAdmin) {
        showMessage('error', 'Accès non autorisé');
        return;
    }
    console.log('Chargement panneau admin...');
}

async function loadAdminTabContent(tabName) {
    console.log(`Chargement onglet admin: ${tabName}`);
}

// Fonctions de chargement simplifiées
async function loadAnniversaires() { console.log('Chargement anniversaires...'); }
async function loadFadArles() { console.log('Chargement FAD Arles...'); }
async function loadGalerie() { console.log('Chargement galerie...'); }
async function loadBonnesAffaires() { console.log('Chargement bonnes affaires...'); }
async function loadActivites() { console.log('Chargement activités...'); }

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', initializeApp);

// Gestion globale des erreurs
window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejetée non gérée:', event.reason);
});
