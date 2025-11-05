# 🏢 CRC Co Arles Macif - Intranet Moderne

Application web intranet moderne pour le CRC Co Arles Macif, avec design iOS élégant et architecture full-stack sécurisée.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## ✨ Fonctionnalités

### 🎯 Fonctionnalités principales
- **Trombinoscope interactif** - Visualisation moderne de l'équipe
- **Gestion des événements** - Agenda partagé et planification
- **Anniversaires** - Suivi automatique des dates importantes
- **Authentification sécurisée** - Système de connexion avec Supabase
- **Design iOS moderne** - Interface utilisateur élégante avec glassmorphism
- **Responsive** - Adapté mobile, tablette et desktop

### 🔐 Sécurité
- Authentification JWT
- Protection CORS
- Rate limiting
- Helmet.js pour les headers HTTP
- Validation des données
- Middleware de logging

## 🏗️ Architecture

```
Projet Base de donnée/
├── backend/                    # Serveur Node.js + Express
│   ├── controllers/           # Logique métier
│   ├── middleware/            # Authentification et logging
│   ├── models/                # Modèles de données
│   ├── routes/                # Routes API REST
│   └── server.js              # Point d'entrée du serveur
├── database/                   # Configuration base de données
│   ├── database.js            # Connexion SQLite
│   └── init.js                # Initialisation des tables
├── frontend/                   # Interface utilisateur
│   ├── css/                   # Styles (iOS moderne)
│   ├── js/                    # JavaScript (API, Auth, UI)
│   ├── assets/                # Images et ressources
│   └── index.html             # Page principale
└── GUIDE_SUPABASE.md          # Documentation Supabase
```

## 🚀 Installation

### Prérequis
- Node.js >= 16.0.0
- npm ou yarn
- Compte Supabase (gratuit)

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/fadarles-intranet.git
cd fadarles-intranet
```

2. **Installer les dépendances backend**
```bash
cd backend
npm install
```

3. **Configurer les variables d'environnement**
```bash
# Copier le fichier .env.example
cp .env.example .env

# Éditer .env avec vos valeurs
# - Ajoutez vos clés Supabase (voir GUIDE_SUPABASE.md)
# - Configurez le port et autres paramètres
```

4. **Initialiser la base de données (si SQLite)**
```bash
npm run init-db
```

5. **Démarrer le serveur**
```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

6. **Ouvrir le frontend**
```bash
# Dans un nouveau terminal, servir le frontend
cd frontend
# Ouvrir index.html dans votre navigateur
# Ou utiliser un serveur local comme Live Server
```

## ⚙️ Configuration Supabase

### 1. Créer un projet Supabase

1. Rendez-vous sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre **URL** et **anon key**

### 2. Créer les tables

Suivez le guide complet dans [GUIDE_SUPABASE.md](./GUIDE_SUPABASE.md) pour :
- Créer les tables `employees`, `events`, `event_participants`
- Configurer l'authentification
- Paramétrer les politiques RLS (Row Level Security)

### 3. Configurer le frontend

Éditez `frontend/js/api-supabase.js` :
```javascript
const SUPABASE_URL = 'https://votre-projet.supabase.co';
const SUPABASE_ANON_KEY = 'votre-cle-anon';
```

## 📖 Utilisation

### Connexion
1. Ouvrez l'application dans votre navigateur
2. Utilisez vos identifiants Supabase pour vous connecter
3. Profitez de l'interface moderne !

### Navigation
- **Accueil** : Vue d'ensemble et statistiques
- **Équipe** : Trombinoscope interactif avec recherche
- **Agenda** : Événements et planning
- **Anniversaires** : Dates importantes du mois

### API Endpoints

#### Authentification
```
POST   /api/auth/login          # Connexion
POST   /api/auth/register       # Inscription (admin)
POST   /api/auth/logout         # Déconnexion
```

#### Employés
```
GET    /api/employees           # Liste des employés
GET    /api/employees/:id       # Détails d'un employé
POST   /api/employees           # Créer un employé
PUT    /api/employees/:id       # Modifier un employé
DELETE /api/employees/:id       # Supprimer un employé
GET    /api/employees/search    # Rechercher
```

#### Événements
```
GET    /api/events              # Liste des événements
GET    /api/events/:id          # Détails d'un événement
POST   /api/events              # Créer un événement
PUT    /api/events/:id          # Modifier un événement
DELETE /api/events/:id          # Supprimer un événement
```

## 🎨 Design

L'application utilise un design moderne inspiré d'iOS avec :
- **Glassmorphism** - Effets de verre et transparence
- **Animations fluides** - Transitions douces
- **Palette iOS** - Couleurs système Apple
- **Typographie Inter** - Police moderne et lisible
- **Icons Font Awesome** - Icônes professionnelles

## 🛠️ Technologies

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite3** - Base de données locale
- **JWT** - Authentification
- **Bcrypt** - Hashing des mots de passe
- **Helmet** - Sécurité HTTP

### Frontend
- **HTML5 / CSS3** - Structure et style
- **JavaScript Vanilla** - Pas de framework
- **Supabase Client** - Backend as a Service
- **Font Awesome** - Icônes
- **Inter Font** - Typographie

## 📝 Scripts disponibles

```bash
npm start          # Démarre le serveur en production
npm run dev        # Mode développement avec nodemon
npm run init-db    # Initialise la base de données
npm test           # Lance les tests (à configurer)
```

## 🔒 Sécurité

### Bonnes pratiques implémentées
- ✅ Variables d'environnement pour les secrets
- ✅ Rate limiting contre les attaques DDoS
- ✅ Helmet.js pour les headers sécurisés
- ✅ CORS configuré
- ✅ Validation des entrées
- ✅ Hash des mots de passe avec bcrypt
- ✅ JWT pour l'authentification
- ✅ Logs des requêtes

### ⚠️ Avant la production
- [ ] Activer HTTPS
- [ ] Configurer RLS sur Supabase
- [ ] Audit de sécurité complet
- [ ] Backup automatique de la base
- [ ] Monitoring et alertes
- [ ] Rate limiting ajusté

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 License

Ce projet est sous licence ISC. Voir le fichier `LICENSE` pour plus de détails.

## 👥 Auteurs

**CRC Co Arles Macif** - Équipe de développement interne

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@crc-arles.fr
- 📝 Issues : [GitHub Issues](https://github.com/votre-username/fadarles-intranet/issues)

## 🗺️ Roadmap

### Version 1.1 (À venir)
- [ ] Mode sombre
- [ ] Notifications push
- [ ] Export PDF des données
- [ ] Statistiques avancées
- [ ] Application mobile (PWA)

### Version 2.0 (Futur)
- [ ] Chat en temps réel
- [ ] Gestion documentaire
- [ ] Intégration calendrier externe
- [ ] Module de formation

## 📚 Documentation additionnelle

- [Guide Supabase](./GUIDE_SUPABASE.md) - Configuration complète de Supabase
- [API Documentation](./docs/API.md) - Documentation détaillée de l'API (à créer)
- [Architecture](./docs/ARCHITECTURE.md) - Diagrammes et explications (à créer)

---

⭐ Si ce projet vous a aidé, n'hésitez pas à mettre une étoile !

Fait avec ❤️ par l'équipe CRC Co Arles Macif
