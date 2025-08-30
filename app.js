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
let isInitializing = true;

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
async function initializeApp() {
    console.log('=== INITIALISATION APP MACIF ARLES ===');
    
    initializeElements();
    setupEventListeners();
    updateDebugInfo();
    
    // Vérifier la session existante et gérer l'affichage en conséquence
    await checkExistingSession();
    
    console.log('Application initialisée avec succès');
    isInitializing = false;
}

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

    // Masquer le modal au démarrage
    const modal = document.getElementById('user-registration-modal');
    if (modal) {
        modal.classList.add('modal-overlay--hidden');
    }
}

function setupEventListeners() {
    if (elements.googleLoginBtn) {
        elements.googleLoginBtn.addEventListener('click', signInWithGoogle);
    }
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', signOut);
    }
    
    setupNavigationListeners();
    setupFormListeners();
    setupAdminListeners();
    setupUserRegistrationListeners();
    
    // Gestion des sessions Supabase
    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
}

// ===== GESTION DE L'AUTHENTIFICATION =====

async function signInWithGoogle() {
    console.log('=== TENTATIVE CONNEXION GOOGLE ===');
    
    try {
        const redirectURL = getRedirectURL();
        console.log('URL de redirection:', redirectURL);
        
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

async function signOut() {
    console.log('=== DÉCONNEXION ===');
    
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Erreur déconnexion:', error);
            showMessage('error', 'Erreur lors de la déconnexion');
            return;
        }
        
        // Réinitialiser les variables globales
        currentUser = null;
        isAdmin = false;
        currentPage = 'dashboard';
        
        // Afficher la page de connexion
        showLoginPage();
        showMessage('info', 'Déconnexion réussie');
        
    } catch (err) {
        console.error('Exception déconnexion:', err);
        showMessage('error', 'Erreur technique lors de la déconnexion');
    }
}

async function checkExistingSession() {
    console.log('=== VÉRIFICATION SESSION EXISTANTE ===');
    
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Erreur vérification session:', error);
            showLoginPage();
            return;
        }
        
        if (session && session.user) {
            console.log('Session existante détectée pour:', session.user.email);
            await handleUserSession(session);
        } else {
            console.log('Aucune session active');
            showLoginPage();
        }
    } catch (err) {
        console.error('Exception vérification session:', err);
        showLoginPage();
    }
}

async function handleAuthStateChange(event, session) {
    console.log('=== CHANGEMENT AUTH ===', event, session ? `Session pour ${session.user.email}` : 'Pas de session');
    
    // Ne pas traiter les événements pendant l'initialisation
    if (isInitializing) {
        console.log('Initialisation en cours, événement ignoré');
        return;
    }
    
    if (session && session.user) {
        await handleUserSession(session);
    } else {
        handleUserLogout();
    }
    
    updateDebugInfo();
}

// ===== GESTION DES UTILISATEURS =====

async function handleUserSession(session) {
    console.log('=== TRAITEMENT SESSION UTILISATEUR ===');
    currentUser = session.user;
    console.log('Utilisateur connecté:', currentUser.email);
    
    try {
        // Vérifier si l'utilisateur existe dans notre table users
        const userExists = await checkUserExists(currentUser.email);
        console.log('Utilisateur existe dans la DB:', userExists);
        
        if (!userExists) {
            console.log('Nouvel utilisateur détecté, affichage du modal d\'enregistrement');
            showUserRegistrationModal();
            return;
        }
        
        // Continuer le processus normal de connexion
        await continueLoginProcess();
        
    } catch (error) {
        console.error('Erreur lors du traitement de la session utilisateur:', error);
        showMessage('error', 'Erreur lors de la connexion');
        showLoginPage();
    }
}

async function checkUserExists(userEmail) {
    console.log('=== VÉRIFICATION UTILISATEUR EXISTANT ===');
    console.log('Email à vérifier:', userEmail);
    
    try {
        const normalizedEmail = userEmail.toLowerCase().trim();
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('id, email')
            .eq('email', normalizedEmail)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // Code d'erreur pour "pas de résultat trouvé"
                console.log('Utilisateur non trouvé dans la base');
                return false;
            } else {
                console.error('Erreur lors de la vérification utilisateur:', error);
                return false;
            }
        }
        
        const exists = data !== null;
        console.log('Résultat vérification:', exists ? 'Utilisateur trouvé' : 'Utilisateur non trouvé');
        return exists;
        
    } catch (err) {
        console.error('Exception vérification utilisateur:', err);
        return false;
    }
}

async function continueLoginProcess() {
    console.log('=== CONTINUATION DU PROCESSUS DE CONNEXION ===');
    
    try {
        // Vérification du statut administrateur
        isAdmin = await checkAdminStatus(currentUser.email);
        console.log('Statut admin final:', isAdmin);
        
        // Mettre à jour l'interface utilisateur
        await updateUserInterface();
        
        // Afficher l'application principale
        showMainApp();
        
        // Afficher les messages de bienvenue
        const displayName = currentUser.user_metadata?.full_name || currentUser.email;
        showMessage('success', `Connexion réussie ! Bienvenue ${displayName}`);
        
        if (isAdmin) {
            showMessage('success', 'Mode administrateur activé');
            setTimeout(initializeAdminPanel, 500);
        }
        
    } catch (error) {
        console.error('Erreur lors du processus de connexion:', error);
        showMessage('error', 'Erreur lors de la finalisation de la connexion');
        showLoginPage();
    }
}

function handleUserLogout() {
    console.log('=== TRAITEMENT DÉCONNEXION ===');
    currentUser = null;
    isAdmin = false;
    showLoginPage();
}

async function checkAdminStatus(userEmail) {
    try {
        console.log('=== VÉRIFICATION STATUT ADMIN ===');
        console.log('Email à vérifier:', userEmail);
        
        const normalizedEmail = userEmail.toLowerCase().trim();
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('id, email, is_admin')
            .eq('email', normalizedEmail)
            .eq('is_admin', true)
            .single();
        
        if (error) {
            if (error.code !== 'PGRST116') {
                console.error('Erreur vérification admin:', error);
                updateSupabaseStatus('error', `Erreur admin: ${error.message}`);
            } else {
                updateSupabaseStatus('info', 'Utilisateur standard');
            }
            return false;
        }
        
        const isAdminUser = data && data.is_admin === true;
        
        if (isAdminUser) {
            updateSupabaseStatus('success', 'Mode admin détecté');
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

// ===== GESTION DU MODAL D'ENREGISTREMENT =====

function showUserRegistrationModal() {
    console.log('=== AFFICHAGE MODAL ENREGISTREMENT ===');
    const modal = document.getElementById('user-registration-modal');
    if (modal) {
        modal.classList.remove('modal-overlay--hidden');
        
        const firstInput = modal.querySelector('input[type="date"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function hideUserRegistrationModal() {
    const modal = document.getElementById('user-registration-modal');
    if (modal) {
        modal.classList.add('modal-overlay--hidden');
    }
}

async function createNewUser(userData) {
    console.log('=== CRÉATION NOUVEL UTILISATEUR ===');
    console.log('Données utilisateur:', userData);
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .insert({
                id: currentUser.id,
                email: currentUser.email.toLowerCase().trim(),
                name: userData.name,
                lastname: userData.lastname,
                birthday: userData.birthday,
                teams: userData.team,
                photo_url: currentUser.user_metadata?.avatar_url,
                is_admin: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Erreur création utilisateur:', error);
            showMessage('error', `Erreur lors de la création du profil: ${error.message}`);
            return false;
        }
        
        console.log('Utilisateur créé avec succès');
        return true;
        
    } catch (err) {
        console.error('Exception création utilisateur:', err);
        showMessage('error', 'Erreur technique lors de la création du profil');
        return false;
    }
}

function setupUserRegistrationListeners() {
    const registrationForm = document.getElementById('user-registration-form');
    
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('=== SOUMISSION FORMULAIRE ENREGISTREMENT ===');
            
            if (!currentUser) {
                showMessage('error', 'Erreur: aucun utilisateur connecté');
                return;
            }
            
            const formData = new FormData(e.target);
            const birthday = formData.get('birthday');
            const team = formData.get('team');
            
            if (!birthday || !team) {
                showMessage('error', 'Veuillez remplir tous les champs obligatoires');
                return;
            }
            
            const fullName = currentUser.user_metadata?.full_name || '';
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            const userData = {
                name: firstName,
                lastname: lastName,
                birthday: birthday,
                team: team
            };
            
            const success = await createNewUser(userData);
            
            if (success) {
                hideUserRegistrationModal();
                showMessage('success', 'Profil créé avec succès ! Bienvenue dans l\'intranet MACIF Arles');
                await continueLoginProcess();
            }
        });
    }
    
    const modal = document.getElementById('user-registration-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                showMessage('info', 'Veuillez compléter votre profil pour accéder à l\'intranet');
            }
        });
    }
}

// ===== GESTION DE L'INTERFACE UTILISATEUR =====

function showLoginPage() {
    console.log('=== AFFICHAGE PAGE LOGIN ===');
    if (elements.loginPage && elements.mainApp) {
        elements.loginPage.classList.remove('login-page--hidden');
        elements.mainApp.classList.remove('main-app--visible');
    }
    updateDebugInfo();
}

function showMainApp() {
    console.log('=== AFFICHAGE APPLICATION PRINCIPALE ===');
    if (elements.loginPage && elements.mainApp) {
        elements.loginPage.classList.add('login-page--hidden');
        elements.mainApp.classList.add('main-app--visible');
    }
    updateDebugInfo();
}

async function updateUserInterface() {
    console.log('=== MISE À JOUR INTERFACE UTILISATEUR ===');
    
    if (!currentUser) return;
    
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
        if (isAdmin) {
            elements.adminBadge.classList.add('admin-badge--visible');
        } else {
            elements.adminBadge.classList.remove('admin-badge--visible');
        }
    }
    
    if (elements.adminNavItem) {
        if (isAdmin) {
            elements.adminNavItem.classList.add('nav-item--visible');
        } else {
            elements.adminNavItem.classList.remove('nav-item--visible');
        }
    }
}

// ===== NAVIGATION =====

function setupNavigationListeners() {
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
}

function navigateToPage(pageId) {
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
}

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

function setupFormListeners() {
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

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

async function handleOfferSubmission(e) {
    e.preventDefault();
    
    const offerData = {
        title: document.getElementById('offer-title').value,
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

function setupAdminListeners() {
    const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            switchAdminTab(tab);
        });
    });
}

async function initializeAdminPanel() {
    if (!isAdmin) return;
    console.log('Initialisation du panneau admin');
    await loadAdminStats();
}

async function loadAdminPanel() {
    if (!isAdmin) {
        showMessage('error', 'Accès non autorisé');
        return;
    }
    
    await loadAdminStats();
    await switchAdminTab('users');
}

async function loadAdminStats() {
    try {
        const { count: usersCount } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        const { count: eventsCount } = await supabaseClient
            .from('events')
            .select('*', { count: 'exact', head: true });
        
        const { count: photosCount } = await supabaseClient
            .from('gallery_photos')
            .select('*', { count: 'exact', head: true });
        
        const { count: offersCount } = await supabaseClient
            .from('offers')
            .select('*', { count: 'exact', head: true });
        
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

async function switchAdminTab(tabName) {
    const tabPanes = document.querySelectorAll('.admin-tab-pane');
    tabPanes.forEach(pane => pane.classList.remove('admin-tab-pane--active'));
    
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => button.classList.remove('tab-btn--active'));
    
    const targetPane = document.getElementById(`admin-tab-${tabName}`);
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetPane) targetPane.classList.add('admin-tab-pane--active');
    if (targetButton) targetButton.classList.add('tab-btn--active');
    
    await loadAdminTabContent(tabName);
}

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

async function loadEventsManagement(container) {
    container.innerHTML = '<p>Gestion des événements - En développement</p>';
}

async function loadGalleryManagement(container) {
    container.innerHTML = '<p>Gestion de la galerie - En développement</p>';
}

async function loadOffersManagement(container) {
    container.innerHTML = '<p>Gestion des offres - En développement</p>';
}

// ===== UTILITAIRES =====

function showMessage(type, message) {
    if (!elements.messageContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message--${type}`;
    messageDiv.textContent = message;
    
    elements.messageContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function updateDebugInfo() {
    if (!elements.debugInfo) return;
    
    const debugContent = `
        <div style="font-family: monospace; font-size: 0.8rem;">
            <strong>URL:</strong> ${window.location.href}<br>
            <strong>Utilisateur:</strong> ${currentUser ? currentUser.email + ' (' + (isAdmin ? 'admin' : 'user') + ')' : 'Non connecté'}<br>
            <strong>Mode admin:</strong> ${isAdmin ? '<span style="color: var(--success);">Activé</span>' : '<span style="color: var(--error);">Désactivé</span>'}<br>
            <strong>Page courante:</strong> ${currentPage}<br>
            <strong>État initialisation:</strong> ${isInitializing ? 'En cours' : 'Terminée'}<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString('fr-FR')}
        </div>
    `;
    
    elements.debugInfo.innerHTML = debugContent;
}

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

function getRedirectURL() {
    const hostname = window.location.hostname;
    
    if (hostname === 'macif-arles-github-io.vercel.app') {
        return 'https://macif-arles-github-io.vercel.app/';
    } else if (hostname === 'macifarles.github.io') {
        return 'https://macifarles.github.io/';
    } else {
        return window.location.origin + '/';
    }
}

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
