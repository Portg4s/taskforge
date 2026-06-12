# TaskForge

TaskForge est une application full-stack de gestion de projets, boards, colonnes et tasks, dans l'esprit d'un mini Trello / ClickUp.

Le projet est organise en monorepo avec une API Spring Boot, un frontend Angular et une base PostgreSQL lancee via Docker Compose.

## Stack technique

- Backend : Java 21, Spring Boot, Maven Wrapper, Spring Web MVC, Spring Data JPA, Spring Security, Validation.
- Base de donnees : PostgreSQL 17 via Docker Compose.
- Migrations : Flyway.
- Frontend : Angular, TypeScript, composants standalone, SCSS.
- Proxy API frontend : `frontend/proxy.conf.json` redirige `/api` vers `http://localhost:8080`.

## Prerequis

- Java 21
- Node.js et npm
- Docker Desktop
- Git

## Structure du projet

```text
TaskForge/
  backend/             API Spring Boot taskforge-api
  frontend/            Application Angular
  docker-compose.yml   PostgreSQL local de developpement
  README.md
```

## Configuration locale

La configuration actuelle est prevue pour le developpement local uniquement.

La base PostgreSQL Docker utilise les valeurs suivantes :

```text
host: localhost
port: 5432
database: taskforge
user: taskforge
password: taskforge_dev_password
```

Ces credentials sont des valeurs de developpement. Ne les utilisez pas en production et ne commitez jamais de secret reel.

## Lancer PostgreSQL

Depuis la racine du projet :

```powershell
docker compose up -d
docker ps
```

Pour arreter les conteneurs :

```powershell
docker compose down
```

## Lancer le backend

Depuis la racine du projet :

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

L'API demarre sur :

```text
http://localhost:8080
```

Endpoint utile :

```text
GET http://localhost:8080/api/health
```

## Lancer le frontend

Depuis la racine du projet :

```powershell
cd frontend
npm install
npm start
```

`npm install` est surtout necessaire au premier lancement ou apres un changement de dependances.

L'application demarre sur :

```text
http://localhost:4200
```

Le serveur Angular utilise le proxy API pour appeler le backend via `/api`.

## Tests et build

Backend :

```powershell
cd backend
.\mvnw.cmd test
```

Frontend :

```powershell
cd frontend
npm test
```

Build frontend :

```powershell
cd frontend
npm run build
```

## Commandes utiles

Depuis la racine :

```powershell
docker compose up -d
docker compose down
git status
```

## Fonctionnalites disponibles

- Inscription utilisateur.
- Connexion et deconnexion.
- Authentification JWT avec token Bearer.
- Restauration de session via token stocke localement.
- Creer et lister des projets.
- Creer et lister des boards.
- Afficher les colonnes d'un board.
- Creer et lister des tasks.
- Modifier une task existante.
- Deplacer une task entre colonnes.
- Supprimer une task avec confirmation.
- Restaurer la selection projet / board apres refresh navigateur via `localStorage`.

## Authentification

L'API expose les endpoints publics suivants :

```text
POST /api/auth/register
POST /api/auth/login
```

L'utilisateur courant peut etre recupere avec un JWT valide :

```text
GET /api/auth/me
```

Les endpoints metier `/api/**` necessitent un header :

```text
Authorization: Bearer <token>
```

## Roadmap courte

- Meilleure UI.
- Drag & drop pour les tasks.
- Assignation utilisateurs.
- Deploiement.

## Notes importantes

- Le projet est actuellement configure pour un environnement de developpement.
- L'authentification applicative JWT est active cote backend et frontend.
- Les credentials Docker sont des valeurs de developpement et ne doivent pas etre reutilises en production.
- Ne pas commiter de secrets, tokens, mots de passe reels ou fichiers d'environnement locaux.
