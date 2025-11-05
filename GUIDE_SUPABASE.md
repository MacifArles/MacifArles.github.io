# Guide Complet de Configuration Supabase pour CRC Co Arles Macif

## Étape 1 : Création du Projet Supabase

### 1.1 Création du compte
- Rendez-vous sur [supabase.com](https://supabase.com)
- Cliquez sur "Start your project" puis "Sign up"
- Utilisez votre email professionnel pour créer le compte
- Confirmez votre email via le lien reçu

### 1.2 Création du projet
- Cliquez sur "New project"
- Choisissez votre organisation (ou créez-en une nouvelle)
- Configurez votre projet :
  - **Nom** : `fadarles-crc-intranet`
  - **Database Password** : Générez un mot de passe fort (NOTEZ-LE PRÉCIEUSEMENT)
  - **Region** : Europe West (Ireland) - `eu-west-1`
- Cliquez sur "Create new project"
- Attendez 2-3 minutes que le projet soit initialisé

## Étape 2 : Configuration de la Base de Données

### 2.1 Accès à l'éditeur de tables
- Dans votre projet Supabase, cliquez sur "Table Editor" dans la sidebar
- Vous allez créer 4 tables principales

### 2.2 Création de la table "employees"
1. Cliquez sur "Create a new table"
2. **Nom de la table** : `employees`
3. **Activer RLS** : Désactivé pour commencer
4. Ajoutez les colonnes suivantes :

| Nom | Type | Contraintes |
|-----|------|-------------|
| id | uuid | Primary Key, Default: uuid_generate_v4() |
| nom | text | Required |
| prenom | text | Required |
| poste | text | Required |
| equipe | text | Required |
| email | text | Unique |
| telephone | text | |
| date_embauche | date | |
| date_anniversaire | date | |
| photo_url | text | |
| responsable_equipe | boolean | Default: false |
| manager_id | uuid | Foreign Key to employees.id |
| is_active | boolean | Default: true |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

### 2.3 Création de la table "events"
1. Créez une nouvelle table nommée `events`
2. Ajoutez les colonnes :

| Nom | Type | Contraintes |
|-----|------|-------------|
| id | uuid | Primary Key, Default: uuid_generate_v4() |
| titre | text | Required |
| description | text | |
| type_evenement | text | Required |
| date_debut | timestamptz | Required |
| date_fin | timestamptz | |
| lieu | text | |
| organisateur_id | uuid | Foreign Key to auth.users |
| est_public | boolean | Default: true |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

### 2.4 Création de la table "event_participants"
1. Créez une nouvelle table nommée `event_participants`
2. Ajoutez les colonnes :

| Nom | Type | Contraintes |
|-----|------|-------------|
| id | uuid | Primary Key, Default: uuid_generate_v4() |
| event_id | uuid | Foreign Key to events.id |
| employee_id | uuid | Foreign Key to employees.id |
| statut_participation | text | Default: 'invite' |
| date_reponse | timestamptz | |

3. Ajoutez une contrainte unique sur (event_id, employee_id)

## Étape 3 : Configuration de l'Authentification

### 3.1 Paramètres d'authentification
- Allez dans "Authentication" > "Settings"
- **Enable email confirmations** : Désactivez (pour simplifier les tests)
- **Enable phone confirmations** : Désactivez
- **Site URL** : `http://localhost:3000` (pour le développement)

### 3.2 Création d'un utilisateur administrateur
- Allez dans "Authentication" > "Users"
- Cliquez sur "Add user"
- **Email** : `admin@crc-arles.fr` (ou votre email)
- **Password** : Choisissez un mot de passe fort
- **Auto Confirm User** : Activé
- Cliquez sur "Create user"

## Étape 4 : Récupération des Clés API

### 4.1 Accès aux paramètres
- Allez dans "Settings" > "API"
- Copiez les informations suivantes :

### 4.2 Informations à copier
- **Project URL** : `https://votreprojet.supabase.co`
- **anon/public key** : `eyJhbGc...` (clé longue commençant par eyJ)

⚠️ **IMPORTANT** : Ces clés sont sensibles, ne les partagez jamais publiquement !

## Étape 5 : Configuration de votre Application Locale

### 5.1 Mise à jour du fichier de configuration
Ouvrez le fichier `frontend/js/api-supabase.js` et remplacez :

```javascript
// Remplacez ces valeurs par les vôtres
const SUPABASE_URL = 'https://votre-projet.supabase.co';
const SUPABASE_ANON_KEY = 'votre-cle-publique-anon';
```

Par vos vraies valeurs récupérées à l'étape 4.

### 5.2 Structure de fichiers recommandée
```
frontend/
├── index-supabase.html         (fichier principal)
├── css/
│   └── ios-modern.css          (styles modernes)
└── js/
    ├── api-supabase.js         (API Supabase)
    ├── auth-supabase.js        (authentification)
    ├── ui-supabase.js          (interface utilisateur)
    ├── employees-supabase.js   (gestion employés)
    ├── events-supabase.js      (gestion événements)
    └── main-supabase.js        (orchestration)
```

## Étape 6 : Test de l'Application

### 6.1 Ouverture de l'application
1. Ouvrez `index-supabase.html` dans votre navigateur
2. L'application devrait se charger avec l'écran de connexion

### 6.2 Première connexion
- Utilisez l'email et mot de passe de l'utilisateur créé à l'étape 3.2
- La connexion devrait réussir et vous rediriger vers le tableau de bord

### 6.3 Test des fonctionnalités
1. **Tableau de bord** : Vérifiez que les cartes s'affichent
2. **Trombinoscope** : Testez l'ajout d'un employé (si vous avez les permissions)
3. **Agenda** : Créez un événement de test
4. **Déconnexion** : Testez la déconnexion/reconnexion

## Étape 7 : Ajout de Données de Test

### 7.1 Ajout d'employés via l'interface Supabase
- Retournez dans "Table Editor" > "employees"
- Cliquez sur "Insert" > "Insert row"
- Ajoutez quelques employés de test avec les champs requis

### 7.2 Exemple de données d'employé
```
nom: Dupont
prenom: Jean
poste: Conseiller Clientèle
equipe: Équipe Commerciale
email: jean.dupont@crc-arles.fr
responsable_equipe: false
is_active: true
```

## Étape 8 : Sécurisation (Optionnel pour le début)

### 8.1 Activation du Row Level Security (RLS)
Une fois votre application testée, vous pouvez activer la sécurité :
- Retournez dans "Table Editor"
- Pour chaque table, cliquez sur les trois points > "Edit table"
- Activez "Enable Row Level Security"

### 8.2 Politiques de sécurité de base
Ajoutez des politiques simples :
```sql
-- Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow read for authenticated users" ON employees
FOR SELECT USING (auth.role() = 'authenticated');

-- Écriture pour les administrateurs seulement
CREATE POLICY "Allow write for admins" ON employees
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

## Étape 9 : Sauvegarde et Maintenance

### 9.1 Sauvegarde automatique
Supabase effectue des sauvegardes automatiques de votre base de données.

### 9.2 Surveillance
- Consultez l'onglet "Database" > "Logs" pour surveiller l'activité
- L'onglet "API" > "Logs" affiche les requêtes API

## Dépannage Courant

### Problème : "Invalid API key"
- Vérifiez que vous avez copié la bonne clé `anon/public`
- Assurez-vous qu'il n'y a pas d'espaces en début/fin

### Problème : "Network Error"
- Vérifiez votre connexion internet
- Assurez-vous que l'URL du projet est correcte

### Problème : "Authentication Error"
- Vérifiez les paramètres d'authentification dans Supabase
- Assurez-vous que l'utilisateur est confirmé

### Problème : "CORS Error"
- Vérifiez les paramètres "Site URL" dans Authentication > Settings
- Pour le développement local, utilisez `http://localhost:3000`

## Support et Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Guide d'authentification](https://supabase.com/docs/guides/auth)
- [Guide des bases de données](https://supabase.com/docs/guides/database)

---

**Note importante** : Cette configuration est adaptée pour un environnement de développement et de test. Pour un déploiement en production, consultez les guides de sécurité avancée de Supabase.