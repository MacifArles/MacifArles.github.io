# 🚀 Guide de Publication sur GitHub

Ce guide vous accompagne pas à pas pour publier votre projet sur GitHub.

## 📋 Prérequis

1. ✅ Compte GitHub créé ([github.com](https://github.com))
2. ✅ Git installé sur votre ordinateur
   - Vérifiez avec : `git --version`
   - Si pas installé : [télécharger Git](https://git-scm.com/downloads)

## 🔧 Étape 1 : Configuration Git (première fois uniquement)

Ouvrez un terminal et configurez votre identité :

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

## 📦 Étape 2 : Créer le repository sur GitHub

1. Connectez-vous à [GitHub](https://github.com)
2. Cliquez sur le bouton **"New"** (ou le + en haut à droite → New repository)
3. Remplissez les informations :
   - **Repository name** : `fadarles-crc-intranet` (ou le nom de votre choix)
   - **Description** : "Intranet moderne pour CRC Co Arles Macif avec design iOS"
   - **Visibilité** : 
     - ✅ **Private** (recommandé pour un intranet d'entreprise)
     - ou **Public** (si vous voulez partager le code)
   - ⚠️ **NE PAS** cocher "Initialize with README" (on en a déjà un)
4. Cliquez sur **"Create repository"**

## 💻 Étape 3 : Initialiser Git localement

Ouvrez un terminal dans le dossier de votre projet :

```bash
# Naviguez vers le dossier du projet
cd "C:\Users\Antun\Desktop\Projets\FADARLES\Projet Base de donnée"

# Initialisez Git
git init
```

## 📝 Étape 4 : Préparer les fichiers

### 4.1 Vérifier les fichiers sensibles

⚠️ **IMPORTANT** : Avant de continuer, vérifiez qu'il n'y a pas de clés sensibles :

```bash
# Recherchez les fichiers .env (ils ne doivent PAS être poussés)
dir .env /s
```

Si vous trouvez des fichiers `.env`, assurez-vous qu'ils sont listés dans `.gitignore` !

### 4.2 Ajouter tous les fichiers

```bash
# Ajouter tous les fichiers au staging
git add .

# Vérifier ce qui va être commité
git status
```

Vous devriez voir :
- ✅ Fichiers en vert = seront inclus
- ❌ Fichiers `.env` et `node_modules/` ne doivent PAS apparaître

## 💾 Étape 5 : Créer le premier commit

```bash
git commit -m "Initial commit: CRC Arles Macif Intranet - Version 1.0"
```

## 🔗 Étape 6 : Connecter au repository GitHub

Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub :

```bash
# Ajouter le remote
git remote add origin https://github.com/VOTRE_USERNAME/fadarles-crc-intranet.git

# Vérifier que le remote est bien ajouté
git remote -v
```

## ⬆️ Étape 7 : Pousser le code sur GitHub

```bash
# Créer la branche main et pousser
git branch -M main
git push -u origin main
```

**Si demandé**, entrez vos identifiants GitHub :
- Username : votre nom d'utilisateur GitHub
- Password : votre **Personal Access Token** (PAS votre mot de passe)

### 🔑 Créer un Personal Access Token (si nécessaire)

Si Git vous demande un mot de passe et qu'il ne fonctionne pas :

1. Allez sur GitHub → **Settings** → **Developer settings**
2. Cliquez sur **Personal access tokens** → **Tokens (classic)**
3. Cliquez sur **Generate new token** → **Generate new token (classic)**
4. Donnez un nom : "Git Push from PC"
5. Sélectionnez la durée : 90 jours (ou plus)
6. Cochez **repo** (toutes les permissions)
7. Cliquez sur **Generate token**
8. ⚠️ **COPIEZ LE TOKEN** immédiatement (vous ne pourrez plus le voir !)
9. Utilisez ce token comme mot de passe dans Git

## ✅ Étape 8 : Vérifier sur GitHub

1. Allez sur votre repository : `https://github.com/VOTRE_USERNAME/fadarles-crc-intranet`
2. Vous devriez voir tous vos fichiers !
3. Le README.md s'affiche automatiquement en bas de page

## 📝 Étape 9 : Ajouter une description et des topics

Sur la page de votre repository GitHub :

1. Cliquez sur l'icône ⚙️ à côté de "About"
2. Ajoutez une description : "Intranet moderne pour CRC Co Arles Macif"
3. Ajoutez des topics : `intranet`, `nodejs`, `supabase`, `express`, `ios-design`
4. Cochez "Include in the homepage" si vous voulez
5. Sauvegardez

## 🔄 Commandes Git utiles pour la suite

### Faire des modifications et les pousser

```bash
# Voir les fichiers modifiés
git status

# Ajouter tous les fichiers modifiés
git add .

# Ou ajouter un fichier spécifique
git add nom_du_fichier.js

# Créer un commit avec un message
git commit -m "Description de vos modifications"

# Pousser vers GitHub
git push
```

### Récupérer les dernières modifications

```bash
# Si vous travaillez depuis plusieurs ordinateurs
git pull
```

### Voir l'historique des commits

```bash
git log --oneline
```

## 🌿 Travailler avec des branches (optionnel mais recommandé)

```bash
# Créer une nouvelle branche pour une fonctionnalité
git checkout -b feature/nouvelle-fonctionnalite

# Faire vos modifications...
git add .
git commit -m "Ajout de la nouvelle fonctionnalité"

# Pousser la branche
git push -u origin feature/nouvelle-fonctionnalite

# Retourner sur main
git checkout main

# Fusionner la branche (après validation)
git merge feature/nouvelle-fonctionnalite
```

## 🚨 En cas de problème

### Problème : "fatal: remote origin already exists"

```bash
# Supprimer l'ancien remote
git remote remove origin

# Rajouter le bon
git remote add origin https://github.com/VOTRE_USERNAME/fadarles-crc-intranet.git
```

### Problème : "Updates were rejected"

```bash
# Forcer le push (⚠️ à utiliser avec précaution)
git push -f origin main
```

### Problème : Fichiers sensibles déjà commités

```bash
# Supprimer un fichier du repository (mais le garder localement)
git rm --cached .env

# Ajouter au .gitignore
echo ".env" >> .gitignore

# Commiter le changement
git add .gitignore
git commit -m "Remove sensitive files and update .gitignore"
git push
```

## 📚 Ressources utiles

- [Documentation Git](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

## ✅ Checklist finale

Avant de pousser, vérifiez :

- [ ] Pas de fichiers `.env` dans le commit
- [ ] Pas de clés API/secrets en dur dans le code
- [ ] Pas de dossier `node_modules/`
- [ ] `.gitignore` correctement configuré
- [ ] README.md à jour
- [ ] LICENSE présent
- [ ] Code testé et fonctionnel

## 🎉 Félicitations !

Votre projet est maintenant sur GitHub ! 🚀

Pour le partager :
- URL du repository : `https://github.com/VOTRE_USERNAME/fadarles-crc-intranet`
- Invitez des collaborateurs depuis : Settings → Collaborators
- Créez une documentation dans le Wiki si besoin

---

**Besoin d'aide ?** Consultez la [documentation GitHub](https://docs.github.com/) ou ouvrez une issue !
