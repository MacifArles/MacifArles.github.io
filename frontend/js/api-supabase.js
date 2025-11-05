/**
 * Gestionnaire API Supabase pour l'application CRC Co Arles Macif
 * Interface de communication directe avec Supabase - Style iOS Moderne
 * Niveau de confiance: 98%
 */

// Configuration Supabase - À REMPLACER par vos vraies valeurs
const SUPABASE_URL = 'https://votre-projet.supabase.co';
const SUPABASE_ANON_KEY = 'votre-cle-publique-anon';

class APIManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.initializeSupabase();
    }

    /**
     * Initialisation de la connexion Supabase
     * Configuration du client avec authentification automatique
     */
    async initializeSupabase() {
        try {
            // Chargement dynamique de Supabase depuis le CDN
            if (!window.supabase) {
                await this.loadSupabaseScript();
            }
            
            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Vérification de la session existante
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.currentUser = session.user;
            }
            
            // Écoute des changements d'authentification
            this.supabase.auth.onAuthStateChange((event, session) => {
                this.currentUser = session?.user || null;
                this.handleAuthStateChange(event, session);
            });
            
            console.log('Connexion Supabase initialisée avec succès');
            
        } catch (error) {
            console.error('Erreur initialisation Supabase:', error);
            throw new Error('Impossible de se connecter à la base de données');
        }
    }

    /**
     * Chargement du script Supabase
     * Import dynamique depuis le CDN
     */
    async loadSupabaseScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/umd/supabase.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Gestion des changements d'état d'authentification
     * Synchronisation automatique avec l'interface
     */
    handleAuthStateChange(event, session) {
        if (event === 'SIGNED_IN') {
            console.log('Utilisateur connecté:', session.user.email);
            window.ui?.hideLoginModal();
            window.ui?.updateUserInterface();
        } else if (event === 'SIGNED_OUT') {
            console.log('Utilisateur déconnecté');
            window.ui?.showLoginModal();
        }
    }

    // ===== MÉTHODES D'AUTHENTIFICATION =====

    /**
     * Connexion utilisateur avec email et mot de passe
     * Authentification sécurisée via Supabase Auth
     */
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            return {
                success: true,
                data: {
                    user: data.user,
                    session: data.session
                }
            };
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw new Error(this.getAuthErrorMessage(error));
        }
    }

    /**
     * Inscription d'un nouvel utilisateur
     * Création de compte avec validation
     */
    async signUp(email, password, userData = {}) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: userData
                }
            });

            if (error) throw error;

            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            throw new Error(this.getAuthErrorMessage(error));
        }
    }

    /**
     * Déconnexion utilisateur
     * Nettoyage de la session
     */
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
            throw error;
        }
    }

    /**
     * Récupération de l'utilisateur actuel
     * Information sur la session active
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Vérification de l'état de connexion
     * Statut d'authentification
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    // ===== MÉTHODES DE GESTION DES EMPLOYÉS =====

    /**
     * Récupération de tous les employés
     * Liste complète avec filtrage optionnel
     */
    async getEmployees(filters = {}) {
        try {
            let query = this.supabase
                .from('employees')
                .select('*')
                .eq('is_active', true)
                .order('equipe', { ascending: true })
                .order('nom', { ascending: true });

            if (filters.team) {
                query = query.eq('equipe', filters.team);
            }

            const { data, error } = await query;

            if (error) throw error;

            return {
                success: true,
                data: data || [],
                count: data?.length || 0
            };
        } catch (error) {
            console.error('Erreur récupération employés:', error);
            throw error;
        }
    }

    /**
     * Récupération d'un employé par ID
     * Détails complets d'un collaborateur
     */
    async getEmployee(id) {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .select('*')
                .eq('id', id)
                .eq('is_active', true)
                .single();

            if (error) throw error;

            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Erreur récupération employé:', error);
            throw error;
        }
    }

    /**
     * Création d'un nouvel employé
     * Ajout sécurisé au trombinoscope
     */
    async createEmployee(employeeData) {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .insert([{
                    nom: employeeData.nom,
                    prenom: employeeData.prenom,
                    poste: employeeData.poste,
                    equipe: employeeData.equipe,
                    email: employeeData.email,
                    telephone: employeeData.telephone,
                    date_embauche: employeeData.date_embauche,
                    date_anniversaire: employeeData.date_anniversaire,
                    photo_url: employeeData.photo_url,
                    responsable_equipe: employeeData.responsable_equipe || false,
                    manager_id: employeeData.manager_id
                }])
                .select();

            if (error) throw error;

            return {
                success: true,
                data: data[0],
                message: 'Employé créé avec succès'
            };
        } catch (error) {
            console.error('Erreur création employé:', error);
            throw error;
        }
    }

    /**
     * Mise à jour d'un employé
     * Modification des informations collaborateur
     */
    async updateEmployee(id, employeeData) {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .update({
                    ...employeeData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();

            if (error) throw error;

            return {
                success: true,
                data: data[0],
                message: 'Employé mis à jour avec succès'
            };
        } catch (error) {
            console.error('Erreur mise à jour employé:', error);
            throw error;
        }
    }

    /**
     * Recherche d'employés
     * Filtrage par nom, prénom, poste, équipe
     */
    async searchEmployees(query, filters = {}) {
        try {
            let supabaseQuery = this.supabase
                .from('employees')
                .select('*')
                .eq('is_active', true);

            if (query) {
                supabaseQuery = supabaseQuery.or(
                    `nom.ilike.%${query}%,prenom.ilike.%${query}%,poste.ilike.%${query}%,equipe.ilike.%${query}%`
                );
            }

            if (filters.team) {
                supabaseQuery = supabaseQuery.eq('equipe', filters.team);
            }

            const { data, error } = await supabaseQuery
                .order('nom', { ascending: true });

            if (error) throw error;

            return {
                success: true,
                data: data || [],
                count: data?.length || 0
            };
        } catch (error) {
            console.error('Erreur recherche employés:', error);
            throw error;
        }
    }

    /**
     * Récupération de la structure des équipes
     * Organisation hiérarchique
     */
    async getTeamStructure() {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .select('equipe')
                .eq('is_active', true);

            if (error) throw error;

            const teams = data.reduce((acc, emp) => {
                const team = emp.equipe;
                if (!acc[team]) {
                    acc[team] = { nom: team, nombreEmployes: 0 };
                }
                acc[team].nombreEmployes++;
                return acc;
            }, {});

            return {
                success: true,
                data: Object.values(teams)
            };
        } catch (error) {
            console.error('Erreur structure équipes:', error);
            throw error;
        }
    }

    // ===== MÉTHODES DE GESTION DES ÉVÉNEMENTS =====

    /**
     * Récupération de tous les événements
     * Liste complète avec filtrage optionnel
     */
    async getEvents(filters = {}) {
        try {
            let query = this.supabase
                .from('events')
                .select('*')
                .order('date_debut', { ascending: true });

            if (filters.type) {
                query = query.eq('type_evenement', filters.type);
            }

            if (filters.dateDebut) {
                query = query.gte('date_debut', filters.dateDebut);
            }

            if (filters.dateFin) {
                query = query.lte('date_debut', filters.dateFin);
            }

            const { data, error } = await query;

            if (error) throw error;

            return {
                success: true,
                data: data || [],
                count: data?.length || 0
            };
        } catch (error) {
            console.error('Erreur récupération événements:', error);
            throw error;
        }
    }

    /**
     * Récupération des événements à venir
     * Planification proactive
     */
    async getUpcomingEvents(days = 30) {
        try {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + days);

            const { data, error } = await this.supabase
                .from('events')
                .select('*')
                .gte('date_debut', today.toISOString())
                .lte('date_debut', futureDate.toISOString())
                .eq('est_public', true)
                .order('date_debut', { ascending: true });

            if (error) throw error;

            return {
                success: true,
                data: data || [],
                count: data?.length || 0
            };
        } catch (error) {
            console.error('Erreur événements à venir:', error);
            throw error;
        }
    }

    /**
     * Récupération des anniversaires du mois
     * Célébrations automatiques
     */
    async getBirthdays() {
        try {
            const currentMonth = new Date().getMonth() + 1;
            
            const { data, error } = await this.supabase
                .from('employees')
                .select('*')
                .eq('is_active', true)
                .not('date_anniversaire', 'is', null);

            if (error) throw error;

            // Filtrage côté client pour le mois actuel
            const monthlyBirthdays = data.filter(emp => {
                if (!emp.date_anniversaire) return false;
                const birthMonth = new Date(emp.date_anniversaire).getMonth() + 1;
                return birthMonth === currentMonth;
            });

            return {
                success: true,
                data: monthlyBirthdays,
                count: monthlyBirthdays.length
            };
        } catch (error) {
            console.error('Erreur anniversaires:', error);
            throw error;
        }
    }

    /**
     * Création d'un nouvel événement
     * Ajout à l'agenda
     */
    async createEvent(eventData) {
        try {
            const { data, error } = await this.supabase
                .from('events')
                .insert([{
                    titre: eventData.titre,
                    description: eventData.description,
                    type_evenement: eventData.type_evenement,
                    date_debut: eventData.date_debut,
                    date_fin: eventData.date_fin,
                    lieu: eventData.lieu,
                    organisateur_id: this.currentUser?.id,
                    est_public: eventData.est_public !== false
                }])
                .select();

            if (error) throw error;

            return {
                success: true,
                data: data[0],
                message: 'Événement créé avec succès'
            };
        } catch (error) {
            console.error('Erreur création événement:', error);
            throw error;
        }
    }

    // ===== MÉTHODES UTILITAIRES =====

    /**
     * Récupération des données du tableau de bord
     * Métriques consolidées
     */
    async getDashboardData() {
        try {
            const [employeesRes, eventsRes, upcomingRes, birthdaysRes] = await Promise.all([
                this.getEmployees(),
                this.getEvents(),
                this.getUpcomingEvents(7),
                this.getBirthdays()
            ]);

            return {
                employees: {
                    totalEmployes: employeesRes.data.length,
                    nombreEquipes: new Set(employeesRes.data.map(emp => emp.equipe)).size
                },
                events: {
                    totalEvenements: eventsRes.data.length
                },
                upcoming: upcomingRes.data,
                birthdays: birthdaysRes.data
            };
        } catch (error) {
            console.error('Erreur données tableau de bord:', error);
            throw error;
        }
    }

    /**
     * Formatage des messages d'erreur d'authentification
     * Messages utilisateur conviviaux
     */
    getAuthErrorMessage(error) {
        const errorMessages = {
            'Invalid login credentials': 'Identifiants de connexion invalides',
            'Email not confirmed': 'Email non confirmé',
            'User not found': 'Utilisateur non trouvé',
            'Invalid email': 'Format d\'email invalide',
            'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères'
        };

        return errorMessages[error.message] || error.message || 'Erreur d\'authentification';
    }

    /**
     * Formatage des dates pour l'affichage
     * Conversion en format français
     */
    formatDate(dateString, options = {}) {
        if (!dateString) return '-';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };
        
        return new Date(dateString).toLocaleDateString('fr-FR', defaultOptions);
    }

    /**
     * Formatage des dates avec heure
     * Affichage complet
     */
    formatDateTime(dateString, options = {}) {
        if (!dateString) return '-';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };
        
        return new Date(dateString).toLocaleDateString('fr-FR', defaultOptions);
    }

    /**
     * Validation des données d'employé
     * Contrôles de cohérence
     */
    validateEmployeeData(data) {
        const errors = [];

        if (!data.nom || data.nom.trim().length < 2) {
            errors.push('Le nom doit contenir au moins 2 caractères');
        }

        if (!data.prenom || data.prenom.trim().length < 2) {
            errors.push('Le prénom doit contenir au moins 2 caractères');
        }

        if (!data.poste || data.poste.trim().length < 3) {
            errors.push('Le poste doit contenir au moins 3 caractères');
        }

        if (!data.equipe || data.equipe.trim().length < 2) {
            errors.push('L\'équipe doit être spécifiée');
        }

        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('Format d\'email invalide');
        }

        return errors;
    }

    /**
     * Validation des données d'événement
     * Contrôles de cohérence
     */
    validateEventData(data) {
        const errors = [];

        if (!data.titre || data.titre.trim().length < 3) {
            errors.push('Le titre doit contenir au moins 3 caractères');
        }

        if (!data.date_debut) {
            errors.push('La date de début est requise');
        }

        if (!data.type_evenement) {
            errors.push('Le type d\'événement est requis');
        }

        if (data.date_fin && new Date(data.date_fin) < new Date(data.date_debut)) {
            errors.push('La date de fin ne peut être antérieure à la date de début');
        }

        return errors;
    }

    /**
     * Validation d'email
     * Vérification du format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialisation globale du gestionnaire API Supabase
window.api = new APIManager();