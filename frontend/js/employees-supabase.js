/**
 * Module de gestion des employés pour l'application CRC Co Arles Macif avec Supabase
 * Orchestration du trombinoscope avec interface iOS moderne
 * Niveau de confiance: 98%
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
        document.addEventListener('click', (e) => {
            if (e.target.closest('.employee-card')) {
                const employeeCard = e.target.closest('.employee-card');
                const employeeId = employeeCard.dataset.employeeId;
                if (employeeId) {
                    this.showEmployeeDetails(employeeId);
                }
            }
        });
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
     * Affichage des employés organisés par équipe avec design iOS
     * Présentation hiérarchique et moderne du personnel
     */
    async displayEmployeesByTeam() {
        const container = document.getElementById('teamStructure');
        if (!container) return;

        if (this.filteredEmployees.length === 0) {
            container.innerHTML = this.generateNoDataMessage();
            return;
        }

        const employeesByTeam = this.groupEmployeesByTeam(this.filteredEmployees);
        const sectionsHTML = Object.entries(employeesByTeam)
            .map(([teamName, teamEmployees]) => this.generateTeamSection(teamName, teamEmployees))
            .join('');

        container.innerHTML = sectionsHTML;
        
        // Animation des cartes en séquence
        this.animateEmployeeCards();
    }

    /**
     * Animation des cartes d'employés avec style iOS
     * Transitions fluides et élégantes
     */
    animateEmployeeCards() {
        const cards = document.querySelectorAll('.employee-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
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
     * Génération d'une section d'équipe avec design iOS moderne
     * Structure hiérarchique claire et élégante
     */
    generateTeamSection(teamName, employees) {
        const managers = employees.filter(emp => emp.responsable_equipe);
        const members = employees.filter(emp => !emp.responsable_equipe);
        
        const teamStats = this.teams.find(team => team.nom === teamName);
        const statsText = teamStats ? 
            `${teamStats.nombreEmployes} membre${teamStats.nombreEmployes > 1 ? 's' : ''} · ${teamStats.nombreResponsables} responsable${teamStats.nombreResponsables > 1 ? 's' : ''}` :
            `${employees.length} membre${employees.length > 1 ? 's' : ''}`;

        return `
            <div class="team-section">
                <div class="team-header">
                    <h3>${this.escapeHtml(teamName)}</h3>
                    <p class="team-stats">${statsText}</p>
                </div>
                <div class="employee-grid">
                    ${managers.map(emp => this.generateEmployeeCard(emp, true)).join('')}
                    ${members.map(emp => this.generateEmployeeCard(emp, false)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Génération d'une carte d'employé avec design iOS
     * Interface moderne et informative
     */
    generateEmployeeCard(employee, isManager = false) {
        const avatarContent = employee.photo_url && employee.photo_url !== '/assets/default-avatar.png' 
            ? `<img src="${employee.photo_url}" alt="${this.escapeHtml(employee.prenom)} ${this.escapeHtml(employee.nom)}">`
            : '<i class="fas fa-user"></i>';

        const managerBadge = isManager ? '<span class="manager-badge">Responsable</span>' : '';
        const contactInfo = this.generateContactInfo(employee);

        return `
            <div class="employee-card" data-employee-id="${employee.id}">
                <div class="employee-avatar">
                    ${avatarContent}
                </div>
                <h4 class="employee-name">${this.escapeHtml(employee.prenom)} ${this.escapeHtml(employee.nom)}</h4>
                <p class="employee-position">${this.escapeHtml(employee.poste)}</p>
                ${contactInfo}
                ${managerBadge}
            </div>
        `;
    }

    /**
     * Génération des informations de contact avec style moderne
     * Affichage structuré des coordonnées disponibles
     */
    generateContactInfo(employee) {
        const contacts = [];
        
        if (employee.email) {
            contacts.push(`<span><i class="fas fa-envelope"></i> ${this.escapeHtml(employee.email)}</span>`);
        }
        
        if (employee.telephone) {
            contacts.push(`<span><i class="fas fa-phone"></i> ${this.escapeHtml(employee.telephone)}</span>`);
        }

        return contacts.length > 0 ? 
            `<div class="employee-contact">${contacts.join('')}</div>` : '';
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
     * Affichage des détails d'employé avec modale iOS moderne
     * Interface de consultation approfondie et élégante
     */
    async showEmployeeDetails(employeeId) {
        try {
            const response = await window.api.getEmployee(employeeId);
            const employee = response.data;
            
            this.displayEmployeeModal(employee);
            
        } catch (error) {
            console.error('Erreur lors de la récupération des détails:', error);
            window.ui?.showToast('Impossible de charger les détails de l\'employé', 'error');
        }
    }

    /**
     * Affichage de la modale de détails avec design iOS
     * Présentation complète et moderne des informations
     */
    displayEmployeeModal(employee) {
        const modalContent = this.generateEmployeeModalContent(employee);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = modalContent;
        
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('.modal-close');
        const handleClose = () => {
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';
            setTimeout(() => modal.remove(), 300);
        };
        
        closeBtn.addEventListener('click', handleClose);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) handleClose();
        });
        
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                handleClose();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    /**
     * Génération du contenu de la modale avec style iOS moderne
     * Structure complète et design élégant
     */
    generateEmployeeModalContent(employee) {
        const avatarContent = employee.photo_url && employee.photo_url !== '/assets/default-avatar.png' 
            ? `<img src="${employee.photo_url}" alt="${this.escapeHtml(employee.prenom)} ${this.escapeHtml(employee.nom)}">`
            : '<i class="fas fa-user"></i>';

        const managerInfo = employee.manager_nom ? 
            `<p><strong>Manager :</strong> ${this.escapeHtml(employee.manager_prenom)} ${this.escapeHtml(employee.manager_nom)}</p>` : '';

        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Profil Collaborateur</h3>
                    <button class="modal-close">
                        <i class="fas fa-xmark"></i>
                    </button>
                </div>
                <div class="employee-details" style="padding: var(--spacing-xl); text-align: center;">
                    <div class="employee-avatar-large" style="width: 120px; height: 120px; margin: 0 auto var(--spacing-lg); border-radius: var(--radius-large); background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-size: 3rem; color: var(--text-light); border: 3px solid rgba(255, 255, 255, 0.3);">
                        ${avatarContent}
                    </div>
                    <div class="employee-info">
                        <h2 style="color: var(--text-light); font-size: 1.8rem; margin-bottom: var(--spacing-sm);">${this.escapeHtml(employee.prenom)} ${this.escapeHtml(employee.nom)}</h2>
                        <p style="color: rgba(255, 255, 255, 0.85); font-size: 1.2rem; margin-bottom: var(--spacing-md);">${this.escapeHtml(employee.poste)}</p>
                        <p style="color: rgba(255, 255, 255, 0.75); margin-bottom: var(--spacing-lg);">${this.escapeHtml(employee.equipe)}</p>
                        
                        <div style="text-align: left; background: rgba(255, 255, 255, 0.08); padding: var(--spacing-lg); border-radius: var(--radius-medium); margin-bottom: var(--spacing-lg);">
                            ${employee.email ? `<p style="color: var(--text-light); margin-bottom: var(--spacing-sm);"><strong>Email :</strong> <a href="mailto:${employee.email}" style="color: var(--ios-blue); text-decoration: none;">${this.escapeHtml(employee.email)}</a></p>` : ''}
                            ${employee.telephone ? `<p style="color: var(--text-light); margin-bottom: var(--spacing-sm);"><strong>Téléphone :</strong> <a href="tel:${employee.telephone}" style="color: var(--ios-blue); text-decoration: none;">${this.escapeHtml(employee.telephone)}</a></p>` : ''}
                            ${employee.date_embauche ? `<p style="color: var(--text-light); margin-bottom: var(--spacing-sm);"><strong>Date d'embauche :</strong> ${window.api.formatDate(employee.date_embauche)}</p>` : ''}
                            ${employee.date_anniversaire ? `<p style="color: var(--text-light); margin-bottom: var(--spacing-sm);"><strong>Anniversaire :</strong> ${window.api.formatDate(employee.date_anniversaire, { year: undefined })}</p>` : ''}
                            ${managerInfo}
                            ${employee.responsable_equipe ? '<p style="margin-top: var(--spacing-md);"><span class="manager-badge">Responsable d\'équipe</span></p>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
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
                    <button class="btn btn-primary" onclick="window.employees.loadEmployeeData()">
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
                    <button class="btn btn-secondary" onclick="window.employees.clearFilters()">
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
window.employees = new EmployeeManager();