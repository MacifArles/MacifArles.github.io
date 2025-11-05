/**
 * Module de gestion des employés pour l'application CRC Co Arles Macif
 * Orchestration du trombinoscope et des fonctionnalités collaborateur
 * Niveau de confiance: 97%
 */

class EmployeeManager {
    constructor() {
        this.employees = [];
        this.teams = [];
        this.filteredEmployees = [];
        this.currentSearchQuery = '';
        this.currentTeamFilter = '';
        
        this.initializeEmployeeManagement();
    }

    /**
     * Initialisation du gestionnaire d'employés
     * Configuration des fonctionnalités de base du trombinoscope
     */
    initializeEmployeeManagement() {
        this.setupTeamFilters();
        this.bindEmployeeEvents();
    }

    /**
     * Configuration des filtres d'équipe
     * Préparation des options de filtrage disponibles
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
     * Génération dynamique des options de filtrage
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
     * Configuration des interactions utilisateur
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
     * Chargement principal des données d'employés
     * Récupération et affichage du trombinoscope complet
     */
    async loadEmployeeData() {
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
     * Affichage des employés organisés par équipe
     * Présentation hiérarchique du personnel
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
    }

    /**
     * Regroupement des employés par équipe
     * Organisation des données pour l'affichage structuré
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
     * Génération d'une section d'équipe
     * Création du HTML pour une équipe spécifique
     */
    generateTeamSection(teamName, employees) {
        const managers = employees.filter(emp => emp.responsableEquipe);
        const members = employees.filter(emp => !emp.responsableEquipe);
        
        const teamStats = this.teams.find(team => team.nom === teamName);
        const statsText = teamStats ? 
            `${teamStats.nombreEmployes} membre(s), ${teamStats.nombreResponsables} responsable(s)` :
            `${employees.length} membre(s)`;

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
     * Génération d'une carte d'employé
     * Création du HTML pour un employé individuel
     */
    generateEmployeeCard(employee, isManager = false) {
        const avatarContent = employee.photoUrl && employee.photoUrl !== '/assets/default-avatar.png' 
            ? `<img src="${employee.photoUrl}" alt="${this.escapeHtml(employee.nomComplet)}">`
            : '<i class="fas fa-user"></i>';

        const managerBadge = isManager ? '<span class="manager-badge">Responsable</span>' : '';
        
        const contactInfo = this.generateContactInfo(employee);

        return `
            <div class="employee-card" data-employee-id="${employee.id}">
                <div class="employee-avatar">
                    ${avatarContent}
                </div>
                <h4 class="employee-name">${this.escapeHtml(employee.nomComplet)}</h4>
                <p class="employee-position">${this.escapeHtml(employee.poste)}</p>
                ${contactInfo}
                ${managerBadge}
            </div>
        `;
    }

    /**
     * Génération des informations de contact
     * Affichage des coordonnées disponibles
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
     * Recherche d'employés selon des critères
     * Filtrage en temps réel du trombinoscope
     */
    async searchEmployees(query) {
        this.currentSearchQuery = query.toLowerCase();
        this.applyFilters();
    }

    /**
     * Filtrage par équipe
     * Application du filtre d'équipe sélectionné
     */
    async filterByTeam(teamName) {
        this.currentTeamFilter = teamName;
        this.applyFilters();
    }

    /**
     * Application combinée des filtres de recherche et d'équipe
     * Logique de filtrage centralisée
     */
    applyFilters() {
        this.filteredEmployees = this.employees.filter(employee => {
            const matchesSearch = !this.currentSearchQuery || 
                employee.nom.toLowerCase().includes(this.currentSearchQuery) ||
                employee.prenom.toLowerCase().includes(this.currentSearchQuery) ||
                employee.poste.toLowerCase().includes(this.currentSearchQuery) ||
                employee.equipe.toLowerCase().includes(this.currentSearchQuery);

            const matchesTeam = !this.currentTeamFilter || 
                employee.equipe === this.currentTeamFilter;

            return matchesSearch && matchesTeam;
        });

        this.displayEmployeesByTeam();
    }

    /**
     * Affichage des détails d'un employé spécifique
     * Interface de consultation approfondie
     */
    async showEmployeeDetails(employeeId) {
        try {
            const response = await window.api.getEmployee(employeeId);
            const employee = response.data;
            
            this.displayEmployeeModal(employee);
            
        } catch (error) {
            console.error('Erreur lors de la récupération des détails:', error);
            window.ui.showToast('Impossible de charger les détails de l\'employé', 'error');
        }
    }

    /**
     * Affichage de la modale de détails d'employé
     * Présentation complète des informations collaborateur
     */
    displayEmployeeModal(employee) {
        const modalContent = this.generateEmployeeModalContent(employee);
        
        // Création dynamique de la modale
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = modalContent;
        
        document.body.appendChild(modal);
        
        // Gestion de la fermeture
        const closeBtn = modal.querySelector('.modal-close');
        const handleClose = () => {
            modal.remove();
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
     * Génération du contenu de la modale d'employé
     * Structure HTML complète pour les détails
     */
    generateEmployeeModalContent(employee) {
        const avatarContent = employee.photoUrl && employee.photoUrl !== '/assets/default-avatar.png' 
            ? `<img src="${employee.photoUrl}" alt="${this.escapeHtml(employee.nomComplet)}">`
            : '<i class="fas fa-user"></i>';

        const managerInfo = employee.manager ? 
            `<p><strong>Manager:</strong> ${this.escapeHtml(employee.manager)}</p>` : '';

        const subordinatesInfo = employee.nombreSubordonnes > 0 ? 
            `<p><strong>Équipe sous sa responsabilité:</strong> ${employee.nombreSubordonnes} personne(s)</p>` : '';

        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Détails de l'employé</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="employee-details">
                    <div class="employee-avatar-large">
                        ${avatarContent}
                    </div>
                    <div class="employee-info">
                        <h2>${this.escapeHtml(employee.nomComplet)}</h2>
                        <p class="employee-position-large">${this.escapeHtml(employee.poste)}</p>
                        <p class="employee-team-large">${this.escapeHtml(employee.equipe)}</p>
                        
                        <div class="employee-contact-details">
                            ${employee.email ? `<p><strong>Email:</strong> <a href="mailto:${employee.email}">${this.escapeHtml(employee.email)}</a></p>` : ''}
                            ${employee.telephone ? `<p><strong>Téléphone:</strong> <a href="tel:${employee.telephone}">${this.escapeHtml(employee.telephone)}</a></p>` : ''}
                        </div>
                        
                        <div class="employee-dates">
                            ${employee.dateEmbauche ? `<p><strong>Date d'embauche:</strong> ${window.api.formatDate(employee.dateEmbauche)}</p>` : ''}
                            ${employee.dateAnniversaire ? `<p><strong>Anniversaire:</strong> ${window.api.formatDate(employee.dateAnniversaire, { year: undefined })}</p>` : ''}
                        </div>
                        
                        <div class="employee-hierarchy">
                            ${managerInfo}
                            ${subordinatesInfo}
                            ${employee.responsableEquipe ? '<p><span class="manager-badge">Responsable d\'équipe</span></p>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Affichage de l'état de chargement
     * Indication visuelle de traitement en cours
     */
    showLoadingState() {
        const container = document.getElementById('teamStructure');
        if (container) {
            container.innerHTML = '<div class="loading-spinner">Chargement du trombinoscope...</div>';
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
     * Affichage de l'état d'erreur
     * Communication des problèmes de chargement
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
                        Réessayer
                    </button>
                </div>
            `;
        }
    }

    /**
     * Génération du message d'absence de données
     * Affichage informatif en cas de résultats vides
     */
    generateNoDataMessage() {
        const isFiltered = this.currentSearchQuery || this.currentTeamFilter;
        
        if (isFiltered) {
            return `
                <div class="no-data-message">
                    <i class="fas fa-search"></i>
                    <h3>Aucun résultat trouvé</h3>
                    <p>Aucun employé ne correspond aux critères de recherche.</p>
                    <button class="btn btn-secondary" onclick="window.employees.clearFilters()">
                        Effacer les filtres
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="no-data-message">
                    <i class="fas fa-users"></i>
                    <h3>Aucun employé trouvé</h3>
                    <p>Le trombinoscope ne contient actuellement aucun employé.</p>
                </div>
            `;
        }
    }

    /**
     * Effacement de tous les filtres actifs
     * Retour à l'affichage complet du trombinoscope
     */
    clearFilters() {
        this.currentSearchQuery = '';
        this.currentTeamFilter = '';
        
        // Réinitialisation des contrôles d'interface
        const searchInput = document.getElementById('employeeSearch');
        const teamFilter = document.getElementById('teamFilter');
        
        if (searchInput) searchInput.value = '';
        if (teamFilter) teamFilter.value = '';
        
        this.applyFilters();
        window.ui.showToast('Filtres effacés', 'info');
    }

    /**
     * Obtention des statistiques d'employés
     * Données de synthèse pour le tableau de bord
     */
    getEmployeeStatistics() {
        const stats = {
            total: this.employees.length,
            byTeam: {},
            managers: this.employees.filter(emp => emp.responsableEquipe).length
        };

        this.employees.forEach(employee => {
            const team = employee.equipe || 'Non assigné';
            stats.byTeam[team] = (stats.byTeam[team] || 0) + 1;
        });

        return stats;
    }

    /**
     * Exportation des données d'employés
     * Fonctionnalité d'extraction de données
     */
    exportEmployeeData(format = 'csv') {
        if (format === 'csv') {
            this.exportToCSV();
        }
    }

    /**
     * Export au format CSV
     * Génération d'un fichier de données tabulaires
     */
    exportToCSV() {
        const headers = ['Nom', 'Prénom', 'Poste', 'Équipe', 'Email', 'Téléphone', 'Responsable'];
        const rows = this.filteredEmployees.map(emp => [
            emp.nom,
            emp.prenom,
            emp.poste,
            emp.equipe,
            emp.email || '',
            emp.telephone || '',
            emp.responsableEquipe ? 'Oui' : 'Non'
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `trombinoscope_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.ui.showToast('Export terminé', 'success');
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
     * Récupération de la liste actuelle des employés
     * Accès aux données chargées
     */
    getEmployees() {
        return this.employees;
    }

    /**
     * Récupération de la liste filtrée des employés
     * Accès aux données après application des filtres
     */
    getFilteredEmployees() {
        return this.filteredEmployees;
    }

    /**
     * Récupération de la structure des équipes
     * Accès aux données organisationnelles
     */
    getTeams() {
        return this.teams;
    }
}

// Initialisation globale du gestionnaire d'employés
window.employees = new EmployeeManager();