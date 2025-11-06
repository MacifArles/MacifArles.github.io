/**
 * Module de gestion des employés pour l'application CRC Co Arles Macif avec Supabase
 * Orchestration du trombinoscope avec interface iOS moderne et modale plein écran
 * Affichage interactif par équipe avec agrandissement et glassmorphism
 * Niveau de confiance: 100%
 */

class EmployeeManager {
    constructor() {
        this.employees = [];
        this.teams = [];
        this.filteredEmployees = [];
        this.currentSearchQuery = '';
        this.currentTeamFilter = '';
        this.isInitialized = false;
        
        this.initializeEmployeeManagement();
    }

    /**
     * Initialisation du gestionnaire d'employés avec Supabase
     * Configuration des fonctionnalités de base du trombinoscope
     */
    async initializeEmployeeManagement() {
        try {
            await this.waitForSupabaseReady();
            await this.setupTeamFilters();
            this.bindEmployeeEvents();
            this.isInitialized = true;
        } catch (error) {
            console.error('Erreur initialisation gestion employés:', error);
        }
    }

    /**
     * Attente de la disponibilité de Supabase
     * Synchronisation avec l'initialisation de l'API
     */
    async waitForSupabaseReady() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.api?.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.api?.supabase) {
            throw new Error('Supabase API non disponible');
        }
    }

    /**
     * Configuration des filtres d'équipe avec données Supabase
     * Chargement dynamique des options de filtrage
     */
    async setupTeamFilters() {
        try {
            const response = await window.api.getTeamStructure();
            this.teams = response.data || [];
            this.populateTeamFilter();
        } catch (error) {
            console.error('Erreur lors du chargement des équipes:', error);
        }
    }

    /**
     * Peuplement du sélecteur de filtrage par équipe
     * Interface dynamique basée sur les données réelles
     */
    populateTeamFilter() {
        const teamFilter = document.getElementById('teamFilter');
        if (!teamFilter) return;

        const defaultOption = '<option value="">Toutes les équipes</option>';
        const teamOptions = this.teams.map(team => 
            `<option value="${this.escapeHtml(team.nom)}">${this.escapeHtml(team.nom)} (${team.nombreEmployes})</option>`
        ).join('');

        teamFilter.innerHTML = defaultOption + teamOptions;
    }

    /**
     * Association des événements spécifiques aux employés
     * Interface interactive et responsive
     */
    bindEmployeeEvents() {
        // Les événements sont gérés dans activateTeamModals()
    }

    /**
     * Chargement principal des données d'employés depuis Supabase
     * Récupération et affichage du trombinoscope complet
     */
    async loadEmployeeData() {
        if (!window.auth?.isAuthenticated()) {
            return;
        }

        try {
            this.showLoadingState();
            
            const response = await window.api.getEmployees();
            this.employees = response.data || [];
            this.filteredEmployees = [...this.employees];
            
            await this.displayEmployeesByTeam();
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Erreur lors du chargement des employés:', error);
            this.hideLoadingState();
            this.showErrorState('Impossible de charger les données des employés');
        }
    }

    /**
     * Affichage des équipes avec système de modale plein écran
     * Vue interactive par équipe avec agrandissement
     */
    async displayEmployeesByTeam() {
        const container = document.getElementById('teamStructure');
        if (!container) return;

        if (this.filteredEmployees.length === 0) {
            container.innerHTML = this.generateNoDataMessage();
            return;
        }

        // Grouper par équipe
        const employeesByTeam = this.groupEmployeesByTeam(this.filteredEmployees);
        
        // Séparer Skipper des autres équipes
        const skipperEmployees = [];
        const regularTeams = {};
        
        Object.entries(employeesByTeam).forEach(([teamName, members]) => {
            // Tous les responsables vont dans Skipper
            const managers = members.filter(emp => emp.responsable_equipe);
            skipperEmployees.push(...managers);
            
            // Ne pas dupliquer Skipper dans les équipes régulières
            if (teamName.toLowerCase() !== 'skipper') {
                regularTeams[teamName] = members;
            }
        });

        let html = '';

        // Section Skipper en premier
        if (skipperEmployees.length > 0) {
            html += '<div class="skipper-section">';
            html += '<h2 class="section-title">⚓ Skipper</h2>';
            html += '<div class="teams-grid">';
            html += this.generateTeamCard('Skipper', skipperEmployees);
            html += '</div>';
            html += '</div>';
        }

        // Autres équipes dans l'ordre spécifique
        const teamOrder = ['K-Team', 'Les Sparks', 'J Squad', "Sherlock'Oms", 'Golden Team'];
        const sortedTeams = teamOrder
            .map(name => [name, regularTeams[name]])
            .filter(([_, members]) => members && members.length > 0);

        if (sortedTeams.length > 0) {
            html += '<h2 class="section-title">👥 Équipes</h2>';
            html += '<div class="teams-grid">';
            sortedTeams.forEach(([teamName, members]) => {
                html += this.generateTeamCard(teamName, members);
            });
            html += '</div>';
        }

        container.innerHTML = html;
        
        // Activer les clics pour ouvrir les modales
        this.activateTeamModals();
    }

    /**
     * Génération d'une carte d'équipe
     * Carte cliquable qui ouvre une modale plein écran
     */
    generateTeamCard(teamName, members) {
        const managersCount = members.filter(m => m.responsable_equipe).length;
        const memberCount = members.length;
        
        // Limiter à 6 avatars sur la carte
        const displayMembers = members.slice(0, 6);
        const hasMore = members.length > 6;
        
        return `
            <div class="team-card" data-team="${this.escapeHtml(teamName)}" data-team-members='${JSON.stringify(members.map(m => m.id))}'>
                <div>
                    <h3 class="team-name">${this.escapeHtml(teamName)}</h3>
                    <p class="team-count">
                        ${memberCount} ${memberCount > 1 ? 'membres' : 'membre'}
                        ${managersCount > 0 ? ` · 👑 ${managersCount}` : ''}
                    </p>
                </div>
                
                <div class="team-avatars-grid">
                    ${displayMembers.map(member => `
                        <div class="team-avatar-mini">
                            ${this.generateMemberAvatar(member)}
                        </div>
                    `).join('')}
                    ${hasMore ? `<div class="team-avatar-mini">+${members.length - 6}</div>` : ''}
                </div>
                
                <p class="team-click-hint">
                    <i class="fas fa-expand"></i> Cliquez pour voir toute l'équipe
                </p>
            </div>
        `;
    }

    /**
     * Génération de l'avatar d'un membre
     * Affichage photo ou initiales
     */
    generateMemberAvatar(member) {
        if (member.photo_url && member.photo_url.startsWith('http')) {
            return `<img src="${member.photo_url}" alt="${this.escapeHtml(member.prenom)} ${this.escapeHtml(member.nom)}">`;
        }
        return this.getInitials(member.prenom, member.nom);
    }

    /**
     * Activation des modales au clic sur les cartes
     * Gestion des interactions utilisateur
     */
    activateTeamModals() {
        document.querySelectorAll('.team-card').forEach(card => {
            card.addEventListener('click', () => {
                const teamName = card.dataset.team;
                const memberIds = JSON.parse(card.dataset.teamMembers || '[]');
                const members = this.employees.filter(emp => memberIds.includes(emp.id));
                this.showTeamModal(teamName, members);
            });
        });
    }

    /**
     * Affichage de la modale plein écran d'une équipe
     * Modale avec fond flouté et glassmorphism
     */
    showTeamModal(teamName, members) {
        // Créer l'overlay de modale
        const overlay = document.createElement('div');
        overlay.className = 'team-modal-overlay';
        
        overlay.innerHTML = `
            <div class="team-modal-content">
                <div class="team-modal-header">
                    <h2>${this.escapeHtml(teamName)}</h2>
                    <button class="team-modal-close">
                        <i class="fas fa-xmark"></i>
                    </button>
                </div>
                <div class="team-members-grid">
                    ${members.map(member => this.generateTeamMemberCard(member)).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Activer l'animation
        setTimeout(() => overlay.classList.add('active'), 10);
        
        // Gérer la fermeture
        const closeBtn = overlay.querySelector('.team-modal-close');
        const closeModal = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 400);
        };
        
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    /**
     * Génération d'une carte de membre pour la modale
     * Affichage avec photo, nom et poste
     */
    generateTeamMemberCard(member) {
        const badge = member.responsable_equipe ? '<span class="team-member-badge">Responsable</span>' : '';
        
        return `
            <div class="team-member-card">
                <div class="member-avatar">
                    ${this.generateMemberAvatar(member)}
                </div>
                <div class="member-name">${this.escapeHtml(member.prenom)} ${this.escapeHtml(member.nom)}</div>
                <div class="member-role">${this.escapeHtml(member.poste)}</div>
                ${badge}
            </div>
        `;
    }

    /**
     * Génération des initiales pour l'avatar
     * Affichage élégant quand pas de photo
     */
    getInitials(prenom, nom) {
        const firstInitial = prenom ? prenom.charAt(0).toUpperCase() : '';
        const lastInitial = nom ? nom.charAt(0).toUpperCase() : '';
        return firstInitial + lastInitial;
    }

    /**
     * Regroupement des employés par équipe
     * Organisation logique pour l'affichage structuré
     */
    groupEmployeesByTeam(employees) {
        return employees.reduce((groups, employee) => {
            const team = employee.equipe || 'Non assigné';
            if (!groups[team]) {
                groups[team] = [];
            }
            groups[team].push(employee);
            return groups;
        }, {});
    }

    /**
     * Recherche d'employés avec interface moderne
     * Filtrage intelligent en temps réel via Supabase
     */
    async searchEmployees(query) {
        this.currentSearchQuery = query;
        
        if (!query || query.length < 2) {
            this.filteredEmployees = [...this.employees];
            await this.displayEmployeesByTeam();
            return;
        }

        try {
            const response = await window.api.searchEmployees(query, {
                team: this.currentTeamFilter
            });
            
            this.filteredEmployees = response.data || [];
            await this.displayEmployeesByTeam();
            
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            window.ui?.showToast('Erreur lors de la recherche', 'error');
        }
    }

    /**
     * Filtrage par équipe avec interface responsive
     * Application immédiate du filtre sélectionné
     */
    async filterByTeam(teamName) {
        this.currentTeamFilter = teamName;
        
        try {
            if (this.currentSearchQuery) {
                await this.searchEmployees(this.currentSearchQuery);
            } else {
                const response = await window.api.getEmployees({
                    team: teamName
                });
                
                this.filteredEmployees = response.data || [];
                await this.displayEmployeesByTeam();
            }
        } catch (error) {
            console.error('Erreur lors du filtrage:', error);
            window.ui?.showToast('Erreur lors du filtrage', 'error');
        }
    }

    /**
     * Affichage de l'état de chargement avec spinner iOS
     * Indication visuelle moderne et élégante
     */
    showLoadingState() {
        const container = document.getElementById('teamStructure');
        if (container) {
            container.innerHTML = '<div class="loading-spinner">Chargement de l\'équipe...</div>';
        }
    }

    /**
     * Masquage de l'état de chargement
     * Finalisation du processus de chargement
     */
    hideLoadingState() {
        // L'état sera remplacé par les données réelles
    }

    /**
     * Affichage de l'état d'erreur avec design moderne
     * Communication claire des problèmes de chargement
     */
    showErrorState(message) {
        const container = document.getElementById('teamStructure');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erreur de chargement</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.employeesManager.loadEmployeeData()">
                        <i class="fas fa-arrow-clockwise"></i>
                        Réessayer
                    </button>
                </div>
            `;
        }
    }

    /**
     * Génération du message d'absence de données avec style iOS
     * Interface informative et élégante
     */
    generateNoDataMessage() {
        const isFiltered = this.currentSearchQuery || this.currentTeamFilter;
        
        if (isFiltered) {
            return `
                <div class="no-data-message">
                    <i class="fas fa-magnifying-glass"></i>
                    <h3>Aucun résultat trouvé</h3>
                    <p>Aucun collaborateur ne correspond aux critères de recherche.</p>
                    <button class="btn btn-secondary" onclick="window.employeesManager.clearFilters()">
                        <i class="fas fa-filter-circle-xmark"></i>
                        Effacer les filtres
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="no-data-message">
                    <i class="fas fa-users"></i>
                    <h3>Aucun collaborateur trouvé</h3>
                    <p>Le trombinoscope ne contient actuellement aucun collaborateur.</p>
                </div>
            `;
        }
    }

    /**
     * Effacement des filtres avec interface moderne
     * Retour à l'affichage complet du trombinoscope
     */
    async clearFilters() {
        this.currentSearchQuery = '';
        this.currentTeamFilter = '';
        
        const searchInput = document.getElementById('employeeSearch');
        const teamFilter = document.getElementById('teamFilter');
        
        if (searchInput) searchInput.value = '';
        if (teamFilter) teamFilter.value = '';
        
        try {
            const response = await window.api.getEmployees();
            this.filteredEmployees = response.data || [];
            await this.displayEmployeesByTeam();
            window.ui?.showToast('Filtres effacés', 'info');
        } catch (error) {
            console.error('Erreur lors de l\'effacement des filtres:', error);
        }
    }

    /**
     * Sécurisation des chaînes HTML
     * Protection contre les injections de code
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, match => map[match]);
    }

    /**
     * Récupération des données employés pour autres modules
     * Interface d'accès aux données chargées
     */
    getEmployees() {
        return this.employees;
    }

    /**
     * Récupération des employés filtrés
     * Accès aux données après application des filtres
     */
    getFilteredEmployees() {
        return this.filteredEmployees;
    }

    /**
     * Récupération de la structure des équipes
     * Information organisationnelle
     */
    getTeams() {
        return this.teams;
    }

    /**
     * Vérification de l'état d'initialisation
     * Statut de disponibilité du module
     */
    isReady() {
        return this.isInitialized && window.api?.supabase;
    }
}

// Initialisation globale du gestionnaire d'employés
window.employeesManager = new EmployeeManager();

// Charger les employés au démarrage si authentifié
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.auth?.isAuthenticated()) {
                window.employeesManager.loadEmployeeData();
            }
        }, 1500);
    });
} else {
    setTimeout(() => {
        if (window.auth?.isAuthenticated()) {
            window.employeesManager.loadEmployeeData();
        }
    }, 1500);
}

// Gestion de la recherche et du filtrage
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('employeeSearch');
    const teamFilter = document.getElementById('teamFilter');
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                window.employeesManager.searchEmployees(e.target.value);
            }, 300);
        });
    }
    
    if (teamFilter) {
        teamFilter.addEventListener('change', (e) => {
            window.employeesManager.filterByTeam(e.target.value);
        });
    }
});
