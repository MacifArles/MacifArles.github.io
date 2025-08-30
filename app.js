/**
 * MACIF ARLES - Intranet Application
 * Fichier principal de l'application JavaScript
 * Niveau de confiance: 95%
 */

// ===== CONFIGURATION SUPABASE =====
const SUPABASE_CONFIG = {
    url: 'https://ifbnsnhtrbqcxzpsihzy.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYm5zbmh0cmJxY3h6cHNpaHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMjUyMzcsImV4cCI6MjA3MTYwMTIzN30.8H9R8rwyPFgODQdDMK5Wgru0XVoc5xN58dGUD2pAW70'
};

// ===== VARIABLES GLOBALES =====
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

let currentUser = null;
let isAdmin = false;
let currentPage = 'dashboard';

// ===== ÉLÉMENTS DOM =====
const elements = {
    loginPage: null,
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

// ===== INITIALISATION =====
/**
 * Initialise l'application au chargement du DOM
 * @returns {void}
 */
function initializeApp() {
    console.log('=== INITIALISATION APP MACIF ARLES ===');
    
    // Récupération des éléments DOM
    initializeElements();
    
    // Configuration des écouteurs d'événements
    setupEventListeners();
    
    // Vérification de la session existante
    checkExistingSession();
    
    // Affichage initial
    showLoginPage();
    updateDebugInfo();
    
    console.log('Application initialisée avec succès');
}

/**
 * Récupère et stocke les références aux éléments DOM
 * @returns {void}
 */
function initializeElements() {
    elements.loginPage = document.getElementById('login-page');
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
}

/**
 * Configure tous les écouteurs d'événements
 * @returns {void}
 */
function setupEventListeners() {
    // Authentification
    if (elements.googleLoginBtn) {
        elements.googleLoginBtn.addEventListener('click', signInWithGoogle);
    }
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', signOut);
    }
    
    // Navigation
    setupNavigationListeners();
    
    // Formulaires
    setupFormListeners();
    
    // Administration
    setupAdminListeners();
    
    // Gestion des sessions Supabase
    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
}

// ===== GESTION DE L'AUTHENTIFICATION =====

/**
 * Initie la connexion avec Google OAuth
 * @returns {Promise<void>}
 */
async function signInWithGoogle() {
    console.log('=== TENTATIVE CONNEXION GOOGLE ===');
    
    try {
        const redirectURL = getRedirectURL();
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectURL
            }
        });
        
        if (error) {
            console.error('Erreur Supabase:', error);
            showMessage('error', `Erreur de connexion: ${error.message}`);
            return;
        }
        
        console.log('Redirection OAuth initiée');
        
    } catch (err) {
        console.error('Exception connexion:', err);
        showMessage('error', `Erreur technique: ${err.message}`);
    }
}

/**
 * Déconnecte l'utilisateur actuel
 * @returns {Promise<void>}
 */
async function signOut() {
    console.log('=== DÉCONNEXION ===');
    
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Erreur déconnexion:', error);
            showMessage('error', 'Erreur lors de la déconnexion');
            return;
        }
        
        // Reset des variables globales
        currentUser = null;
        isAdmin = false;
        currentPage = 'dashboard';
        
        showLoginPage();
        showMessage('info', 'Déconnexion réussie');
        
    } catch (err) {
        console.error('Exception déconnexion:', err);
        showMessage('error', 'Erreur technique lors de la déconnexion');
    }
}

/**
 * Vérifie s'il existe une session active au démarrage
 * @returns {Promise<void>}
 */
async function checkExistingSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Erreur vérification session:', error);
            return;
        }
        
        if (session) {
            console.log('Session existante détectée');
            await handleUserSession(session);
        } else {
            console.log('Aucune session active');
        }
    } catch (err) {
        console.error('Exception vérification session:', err);
    }
}

/**
 * Gère les changements d'état d'authentification
 * @param {string} event - Type d'événement
 * @param {Object} session - Session utilisateur
 * @returns {Promise<void>}
 */
async function handleAuthStateChange(event, session) {
    console.log('=== CHANGEMENT AUTH ===', event);
    
    if (session && session.user) {
        await handleUserSession(session);
    } else {
        handleUserLogout();
    }
    
    updateDebugInfo();
}

/**
 * Traite une session utilisateur valide
 * @param {Object} session - Session utilisateur
 * @returns {Promise<void>}
 */
async function handleUserSession(session) {
    currentUser = session.user;
    console.log('Utilisateur connecté:', currentUser.email);
    
    // Vérification du statut administrateur avec délai
    setTimeout(async () => {
        isAdmin = await checkAdminStatus(currentUser.email);
        console.log('Statut admin final:', isAdmin);
        
        await updateUserInterface();
        
        if (isAdmin) {
            showMessage('success', '🔥 Mode administrateur activé !');
            setTimeout(initializeAdminPanel, 500);
        }
    }, 500);
    
    await updateUserInterface();
    showMainApp();
    
    const displayName = currentUser.user_metadata?.full_name || currentUser.email;
    showMessage('success', `Connexion réussie ! Bienvenue ${displayName}`);
}

/**
 * Traite une déconnexion utilisateur
 * @returns {void}
 */
function handleUserLogout() {
    currentUser = null;
    isAdmin = false;
    showLoginPage();
}

// ===== GESTION DES PERMISSIONS =====

/**
 * Vérifie si l'utilisateur est administrateur
 * @param {string} userEmail - Email de l'utilisateur
 * @returns {Promise<boolean>}
 */
async function checkAdminStatus(userEmail) {
    try {
        console.log('=== VÉRIFICATION ADMIN ===');
        console.log('Email à vérifier:', userEmail);
        
        const normalizedEmail = userEmail.toLowerCase().trim();
        console.log('Email normalisé:', normalizedEmail);
        
        // Requête pour récupérer tous les admins
        const { data, error } = await supabaseClient
            .from('users')
            .select('id, email, is_admin')
            .eq('email', normalizedEmail)
            .eq('is_admin', true)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Erreur vérification admin:', error);
            updateSupabaseStatus('error', `Erreur admin: ${error.message}`);
            return false;
        }
        
        const isAdminUser = data && data.is_admin === true;
        
        console.log('Statut admin trouvé:', isAdminUser);
        
        if (isAdminUser) {
            updateSupabaseStatus('success', 'Mode admin détecté ✅');
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

// ===== GESTION DE L'INTERFACE UTILISATEUR =====

/**
 * Affiche la page de connexion
 * @returns {void}
 */
function showLoginPage() {
    if (elements.loginPage && elements.mainApp) {
        elements.loginPage.classList.remove('login-page--hidden');
        elements.mainApp.classList.remove('main-app--visible');
    }
}

/**
 * Affiche l'application principale
 * @returns {void}
 */
function showMainApp() {
    if (elements.loginPage && elements.mainApp) {
        elements.loginPage.classList.add('login-page--hidden');
        elements.mainApp.classList.add('main-app--visible');
    }
}

/**
 * Met à jour l'interface après connexion
 * @returns {Promise<void>}
 */
async function updateUserInterface() {
    if (!currentUser) return;
    
    // Nom d'utilisateur
    if (elements.userName) {
        const displayName = currentUser.user_metadata?.full_name || 
                           currentUser.user_metadata?.name || 
                           currentUser.email.split('@')[0];
        elements.userName.textContent = displayName;
    }
    
    // Avatar utilisateur
    if (elements.userAvatar && currentUser.user_metadata?.avatar_url) {
        elements.userAvatar.src = currentUser.user_metadata.avatar_url;
        elements.userAvatar.alt = `Avatar de ${elements.userName.textContent}`;
    }
    
    // Badge administrateur
    if (elements.adminBadge) {
        if (isAdmin) {
            elements.adminBadge.classList.add('admin-badge--visible');
        } else {
            elements.adminBadge.classList.remove('admin-badge--visible');
        }
    }
    
    // Menu administrateur
    if (elements.adminNavItem) {
        if (isAdmin) {
            elements.adminNavItem.classList.add('nav-item--visible');
        } else {
            elements.adminNavItem.classList.remove('nav-item--visible');
        }
    }
}

// ===== NAVIGATION =====

/**
 * Configure les écouteurs pour la navigation
 * @returns {void}
 */
function setupNavigationListeners() {
    // Navigation par les liens du menu
    const navLinks = document.querySelectorAll('[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateToPage(page);
        });
    });
    
    // Navigation par les cartes features
    const featureCards = document.querySelectorAll('.feature-card[data-page]');
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const page = card.getAttribute('data-page');
            navigateToPage(page);
        });
    });
}

/**
 * Navigue vers une page spécifique
 * @param {string} pageId - Identifiant de la page
 * @returns {void}
 */
function navigateToPage(pageId) {
    // Masquer toutes les pages
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.remove('page-content--active'));
    
    // Retirer le style actif de tous les liens
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('nav-link--active'));
    
    // Afficher la page cible
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('page-content--active');
        currentPage = pageId;
    }
    
    // Activer le lien correspondant
    const activeLink = document.querySelector(`[data-page="${pageId}"]`);
    if (activeLink && activeLink.classList.contains('nav-link')) {
        activeLink.classList.add('nav-link--active');
    }
    
    // Charger le contenu de la page si nécessaire
    loadPageContent(pageId);
    
    console.log(`Navigation vers: ${pageId}`);
}

/**
 * Charge le contenu dynamique d'une page
 * @param {string} pageId - Identifiant de la page
 * @returns {Promise<void>}
 */
async function loadPageContent(pageId) {
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
}

// ===== GESTION DES FORMULAIRES =====

/**
 * Configure les écouteurs pour les formulaires
 * @returns {void}
 */
function setupFormListeners() {
    // Formulaire d'offres
    const createOfferBtn = document.getElementById('create-offer-btn');
    const cancelOfferBtn = document.getElementById('cancel-offer-btn');
    const offerForm = document.getElementById('offer-form');
    
    if (createOfferBtn) {
        createOfferBtn.addEventListener('click', () => {
            toggleFormVisibility('create-offer-form', true);
        });
    }
    
    if (cancelOfferBtn) {
        cancelOfferBtn.addEventListener('click', () => {
            toggleFormVisibility('create-offer-form', false);
            resetForm('offer-form');
        });
    }
    
    if (offerForm) {
        offerForm.addEventListener('submit', handleOfferSubmission);
    }
    
    // Formulaire d'activités
    const createActivityBtn = document.getElementById('create-activity-btn');
    const cancelActivityBtn = document.getElementById('cancel-activity-btn');
    const activityForm = document.getElementById('activity-form');
    
    if (createActivityBtn) {
        createActivityBtn.addEventListener('click', () => {
            toggleFormVisibility('create-activity-form', true);
        });
    }
    
    if (cancelActivityBtn) {
        cancelActivityBtn.addEventListener('click', () => {
            toggleFormVisibility('create-activity-form', false);
            resetForm('activity-form');
        });
    }
    
    if (activityForm) {
        activityForm.addEventListener('submit', handleActivitySubmission);
    }
}

/**
 * Affiche ou masque un formulaire
 * @param {string} formId - Identifiant du formulaire
 * @param {boolean} show - Afficher ou masquer
 * @returns {void}
 */
function toggleFormVisibility(formId, show) {
    const form = document.getElementById(formId);
    if (form) {
        if (show) {
            form.classList.remove('form-container--hidden');
        } else {
            form.classList.add('form-container--hidden');
        }
    }
}

/**
 * Remet à zéro un formulaire
 * @param {string} formId - Identifiant du formulaire
 * @returns {void}
 */
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

// ===== GESTION DES DONNÉES =====

/**
 * Traite la soumission du formulaire d'offre
 * @param {Event} e - Événement de soumission
 * @returns {Promise<void>}
 */
async function handleOfferSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const offerData = {
        title: formData.get('title') || document.getElementById('offer-title').value,
        price: parseFloat(document.getElementById('offer-price').value) || null,
        type: document.getElementById('offer-type').value,
        image_url: document.getElementById('offer-image-url').value || null,
        description: document.getElementById('offer-description').value,
        seller_id: currentUser.id,
        seller_name: currentUser.user_metadata?.full_name || currentUser.email,
        seller_email: currentUser.email
    };
    
    if (!offerData.title || !offerData.description) {
        showMessage('error', 'Titre et description sont obligatoires');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('offers')
            .insert(offerData);
        
        if (error) throw error;
        
        showMessage('success', 'Annonce publiée avec succès');
        toggleFormVisibility('create-offer-form', false);
        resetForm('offer-form');
        await loadBonnesAffaires();
        
    } catch (error) {
        console.error('Erreur création offre:', error);
        showMessage('error', `Erreur: ${error.message}`);
    }
}

/**
 * Traite la soumission du formulaire d'activité
 * @param {Event} e - Événement de soumission
 * @returns {Promise<void>}
 */
async function handleActivitySubmission(e) {
    e.preventDefault();
    
    const activityData = {
        title: document.getElementById('activity-title').value,
        date_start: document.getElementById('activity-date').value,
        time: document.getElementById('activity-time').value || null,
        location: document.getElementById('activity-location').value || null,
        max_participants: parseInt(document.getElementById('activity-max-participants').value) || null,
        description: document.getElementById('activity-description').value,
        status: 'upcoming',
        organizer_name: currentUser.user_metadata?.full_name || currentUser.email,
        created_by: currentUser.id
    };
    
    if (!activityData.title || !activityData.date_start || !activityData.description) {
        showMessage('error', 'Nom, date et description sont obligatoires');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('events')
            .insert(activityData);
        
        if (error) throw error;
        
        showMessage('success', 'Activité créée avec succès');
        toggleFormVisibility('create-activity-form', false);
        resetForm('activity-form');
        await loadActivites();
        
    } catch (error) {
        console.error('Erreur création activité:', error);
        showMessage('error', `Erreur: ${error.message}`);
    }
}

// ===== CHARGEMENT DU CONTENU =====

/**
 * Charge le contenu du trombinoscope
 * @returns {Promise<void>}
 */
async function loadTrombinoscope() {
    const container = document.getElementById('trombinoscope-content');
    if (!container) return;
    
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

/**
 * Charge les anniversaires
 * @returns {Promise<void>}
 */
async function loadAnniversaires() {
    const container = document.getElementById('anniversaires-content');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement des anniversaires...</div>';
    
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .not('birthday', 'is', null)
            .order('birthday', { ascending: true });
        
        if (error) throw error;
        
        if (users && users.length > 0) {
            const birthdayList = users.map(user => {
                const birthday = new Date(user.birthday);
                const day = birthday.getDate();
                const month = birthday.getMonth() + 1;
                
                return `
                    <div class="birthday-item">
                        <img src="${user.photo_url || '/api/placeholder/60/60'}" alt="Photo de ${user.name}">
                        <div>
                            <h4>${user.name} ${user.lastname}</h4>
                            <p>${day}/${month.toString().padStart(2, '0')}</p>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = `<div class="birthdays-list">${birthdayList}</div>`;
        } else {
            container.innerHTML = '<p>Aucun anniversaire renseigné.</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement anniversaires:', error);
        container.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
}

/**
 * Charge les événements FAD'ARLES
 * @returns {Promise<void>}
 */
async function loadFadArles() {
    const container = document.getElementById('fadarles-content');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement des événements FAD\'ARLES...</div>';
    
    try {
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('status', 'fad')
            .order('date_start', { ascending: false });
        
        if (error) throw error;
        
        if (events && events.length > 0) {
            const eventsList = events.map(event => `
                <div class="event-card">
                    <h4>${event.title}</h4>
                    <p><strong>Date:</strong> ${new Date(event.date_start).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Lieu:</strong> ${event.location || 'Non précisé'}</p>
                    <p>${event.description}</p>
                </div>
            `).join('');
            
            container.innerHTML = `<div class="events-list">${eventsList}</div>`;
        } else {
            container.innerHTML = '<p>Aucun événement FAD\'ARLES pour le moment.</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement FAD\'ARLES:', error);
        container.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
}

/**
 * Charge la galerie photos
 * @returns {Promise<void>}
 */
async function loadGalerie() {
    const container = document.getElementById('galerie-content');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement de la galerie...</div>';
    
    try {
        const { data: photos, error } = await supabaseClient
            .from('gallery_photos')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (photos && photos.length > 0) {
            const photoGrid = photos.map(photo => `
                <div class="photo-item">
                    <img src="${photo.image_url}" alt="${photo.title || 'Photo'}">
                    <div class="photo-info">
                        <h4>${photo.title || 'Sans titre'}</h4>
                        <p>${photo.description || ''}</p>
                        <small>Par ${photo.uploader_name || 'Anonyme'}</small>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = `<div class="photos-grid">${photoGrid}</div>`;
        } else {
            container.innerHTML = '<p>Aucune photo dans la galerie.</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement galerie:', error);
        container.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
}

/**
 * Charge les bonnes affaires
 * @returns {Promise<void>}
 */
async function loadBonnesAffaires() {
    const container = document.getElementById('offers-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement des annonces...</div>';
    
    try {
        const { data: offers, error } = await supabaseClient
            .from('offers')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (offers && offers.length > 0) {
            const offersList = offers.map(offer => `
                <div class="offer-card">
                    ${offer.image_url ? `<img src="${offer.image_url}" alt="${offer.title}">` : ''}
                    <div class="offer-info">
                        <h4>${offer.title}</h4>
                        <p class="offer-price">${offer.price ? offer.price + '€' : 'Prix non précisé'}</p>
                        <p class="offer-type">${offer.type || 'vente'}</p>
                        <p>${offer.description}</p>
                        <small>Par ${offer.seller_name} - ${offer.seller_email}</small>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = `<div class="offers-grid">${offersList}</div>`;
        } else {
            container.innerHTML = '<p>Aucune annonce active.</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement offres:', error);
        container.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
}

/**
 * Charge les activités
 * @returns {Promise<void>}
 */
async function loadActivites() {
    const container = document.getElementById('activities-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement des activités...</div>';
    
    try {
        const { data: activities, error } = await supabaseClient
            .from('events')
            .select('*')
            .in('status', ['upcoming', 'ongoing'])
            .order('date_start', { ascending: true });
        
        if (error) throw error;
        
        if (activities && activities.length > 0) {
            const activitiesList = activities.map(activity => `
                <div class="activity-card">
                    <h4>${activity.title}</h4>
                    <p><strong>Date:</strong> ${new Date(activity.date_start).toLocaleDateString('fr-FR')} ${activity.time ? 'à ' + activity.time : ''}</p>
                    <p><strong>Lieu:</strong> ${activity.location || 'Non précisé'}</p>
                    <p><strong>Organisateur:</strong> ${activity.organizer_name}</p>
                    ${activity.max_participants ? `<p><strong>Places:</strong> ${activity.max_participants}</p>` : ''}
                    <p>${activity.description}</p>
                    <button class="btn btn--primary btn--small">S'inscrire</button>
                </div>
            `).join('');
            
            container.innerHTML = `<div class="activities-list">${activitiesList}</div>`;
        } else {
            container.innerHTML = '<p>Aucune activité programmée.</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement activités:', error);
        container.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
}

// ===== ADMINISTRATION =====

/**
 * Configure les écouteurs pour l'administration
 * @returns {void}
 */
function setupAdminListeners() {
    // Onglets d'administration
    const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            switchAdminTab(tab);
        });
    });
}

/**
 * Initialise le panneau d'administration
 * @returns {Promise<void>}
 */
async function initializeAdminPanel() {
    if (!isAdmin) return;
    
    console.log('Initialisation du panneau admin');
    await loadAdminStats();
}

/**
 * Charge le panneau d'administration
 * @returns {Promise<void>}
 */
async function loadAdminPanel() {
    if (!isAdmin) {
        showMessage('error', 'Accès non autorisé');
        return;
    }
    
    await loadAdminStats();
    await switchAdminTab('users');
}

/**
 * Charge les statistiques administrateur
 * @returns {Promise<void>}
 */
async function loadAdminStats() {
    try {
        // Compter les utilisateurs
        const { count: usersCount } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        // Compter les événements
        const { count: eventsCount } = await supabaseClient
            .from('events')
            .select('*', { count: 'exact', head: true });
        
        // Compter les photos
        const { count: photosCount } = await supabaseClient
            .from('gallery_photos')
            .select('*', { count: 'exact', head: true });
        
        // Compter les offres
        const { count: offersCount } = await supabaseClient
            .from('offers')
            .select('*', { count: 'exact', head: true });
        
        // Mettre à jour l'interface
        const statsUsers = document.getElementById('stats-users');
        const statsEvents = document.getElementById('stats-events');
        const statsPhotos = document.getElementById('stats-photos');
        const statsOffers = document.getElementById('stats-offers');
        
        if (statsUsers) statsUsers.textContent = usersCount || '0';
        if (statsEvents) statsEvents.textContent = eventsCount || '0';
        if (statsPhotos) statsPhotos.textContent = photosCount || '0';
        if (statsOffers) statsOffers.textContent = offersCount || '0';
        
    } catch (error) {
        console.error('Erreur chargement stats admin:', error);
    }
}

/**
 * Change d'onglet dans le panneau admin
 * @param {string} tabName - Nom de l'onglet
 * @returns {Promise<void>}
 */
async function switchAdminTab(tabName) {
    // Masquer tous les onglets
    const tabPanes = document.querySelectorAll('.admin-tab-pane');
    tabPanes.forEach(pane => pane.classList.remove('admin-tab-pane--active'));
    
    // Désactiver tous les boutons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => button.classList.remove('tab-btn--active'));
    
    // Activer l'onglet ciblé
    const targetPane = document.getElementById(`admin-tab-${tabName}`);
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetPane) targetPane.classList.add('admin-tab-pane--active');
    if (targetButton) targetButton.classList.add('tab-btn--active');
    
    // Charger le contenu de l'onglet
    await loadAdminTabContent(tabName);
}

/**
 * Charge le contenu d'un onglet admin
 * @param {string} tabName - Nom de l'onglet
 * @returns {Promise<void>}
 */
async function loadAdminTabContent(tabName) {
    const container = document.getElementById(`${tabName}-management`);
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement...</div>';
    
    switch (tabName) {
        case 'users':
            await loadUsersManagement(container);
            break;
        case 'events':
            await loadEventsManagement(container);
            break;
        case 'gallery':
            await loadGalleryManagement(container);
            break;
        case 'offers':
            await loadOffersManagement(container);
            break;
    }
}

/**
 * Charge la gestion des utilisateurs
 * @param {HTMLElement} container - Conteneur
 * @returns {Promise<void>}
 */
async function loadUsersManagement(container) {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        
        if (users && users.length > 0) {
            const usersList = users.map(user => `
                <div class="admin-user-item">
                    <img src="${user.photo_url || '/api/placeholder/40/40'}" alt="${user.name}">
                    <div class="user-details">
                        <h5>${user.name} ${user.lastname}</h5>
                        <p>${user.email}</p>
                        <p>Équipe: ${user.teams || 'Non définie'}</p>
                        <span class="user-role ${user.is_admin ? 'admin' : ''}">${user.is_admin ? 'ADMIN' : 'USER'}</span>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = `
                <div class="admin-form">
                    <h4>Promouvoir un utilisateur administrateur</h4>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <input type="email" id="admin-email" placeholder="Email de l'utilisateur" class="form-input">
                        <button onclick="promoteToAdmin()" class="btn btn--primary">Promouvoir</button>
                    </div>
                </div>
                <div class="users-management-list">${usersList}</div>
            `;
        } else {
            container.innerHTML = '<p>Aucun utilisateur trouvé.</p>';
        }
        
    } catch (error) {
        console.error('Erreur chargement gestion utilisateurs:', error);
        container.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
}

/**
 * Charge la gestion des événements
 * @param {HTMLElement} container - Conteneur
 * @returns {Promise<void>}
 */
async function loadEventsManagement(container) {
    container.innerHTML = '<p>Gestion des événements - En développement</p>';
}

/**
 * Charge la gestion de la galerie
 * @param {HTMLElement} container - Conteneur
 * @returns {Promise<void>}
 */
async function loadGalleryManagement(container) {
    container.innerHTML = '<p>Gestion de la galerie - En développement</p>';
}

/**
 * Charge la gestion des offres
 * @param {HTMLElement} container - Conteneur
 * @returns {Promise<void>}
 */
async function loadOffersManagement(container) {
    container.innerHTML = '<p>Gestion des offres - En développement</p>';
}

// ===== UTILITAIRES =====

/**
 * Affiche un message à l'utilisateur
 * @param {string} type - Type de message (success, error, info, warning)
 * @param {string} message - Contenu du message
 * @returns {void}
 */
function showMessage(type, message) {
    if (!elements.messageContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message--${type}`;
    messageDiv.textContent = message;
    
    elements.messageContainer.appendChild(messageDiv);
    
    // Suppression automatique après 5 secondes
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

/**
 * Met à jour les informations de debug
 * @returns {void}
 */
function updateDebugInfo() {
    if (!elements.debugInfo) return;
    
    const debugContent = `
        <div style="font-family: monospace; font-size: 0.8rem;">
            <strong>URL:</strong> ${window.location.href}<br>
            <strong>Utilisateur:</strong> ${currentUser ? currentUser.email + ' (' + (isAdmin ? 'admin' : 'user') + ')' : 'Non connecté'}<br>
            <strong>Mode admin:</strong> ${isAdmin ? '<span style="color: var(--success);">Activé ✅</span>' : '<span style="color: var(--error);">Désactivé ❌</span>'}<br>
            <strong>Page courante:</strong> ${currentPage}<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString('fr-FR')}
        </div>
    `;
    
    elements.debugInfo.innerHTML = debugContent;
}

/**
 * Met à jour le statut Supabase
 * @param {string} type - Type de statut
 * @param {string} message - Message de statut
 * @returns {void}
 */
function updateSupabaseStatus(type, message) {
    if (!elements.supabaseStatus) return;
    
    const colors = {
        success: 'var(--success)',
        error: 'var(--error)',
        info: 'var(--primary-blue)',
        warning: 'var(--warning)'
    };
    
    elements.supabaseStatus.innerHTML = 
        `<span style="color: ${colors[type] || colors.info};">${message}</span>`;
}

/**
 * Détermine l'URL de redirection OAuth
 * @returns {string}
 */
function getRedirectURL() {
    const hostname = window.location.hostname;
    
    if (hostname === 'macif-arles-github-io.vercel.app') {
        return 'https://macif-arles-github-io.vercel.app/';
    } else if (hostname === 'macifarles.github.io') {
        return 'https://macifarles.github.io/';
    } else {
        return window.location.origin;
    }
}

/**
 * Promeut un utilisateur au rang d'administrateur
 * @returns {Promise<void>}
 */
async function promoteToAdmin() {
    const email = document.getElementById('admin-email')?.value.trim().toLowerCase();
    
    if (!email || !email.includes('@')) {
        showMessage('error', 'Veuillez saisir un email valide');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ is_admin: true })
            .eq('email', email);
        
        if (error) throw error;
        
        showMessage('success', `${email} promu administrateur`);
        document.getElementById('admin-email').value = '';
        await loadAdminTabContent('users');
        
    } catch (error) {
        console.error('Erreur promotion admin:', error);
        showMessage('error', `Erreur: ${error.message}`);
    }
}

// ===== INITIALISATION DE L'APPLICATION =====
document.addEventListener('DOMContentLoaded', initializeApp);
