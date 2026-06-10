# TaskForge

TaskForge est une application web de gestion collaborative de projets et de tâches, pensée comme un mini Trello / ClickUp simplifié.

## Objectif pédagogique

Ce projet personnel sert à apprendre sérieusement une architecture full-stack moderne avec Angular, Spring Boot, PostgreSQL, Docker, Git et de bonnes pratiques de développement.

## Stack

- Frontend : Angular, TypeScript, Angular Router, SCSS, Angular Material
- Backend : Java 21, Spring Boot, Maven
- Backend dependencies : Spring Web, Spring Data JPA, PostgreSQL Driver, Flyway, Validation, Spring Security
- Base de données : PostgreSQL 17 local via Docker Compose
- Migrations : Flyway

## Structure

```text
TaskForge/
  frontend/          Application Angular
  backend/           API Spring Boot taskforge-api
  docker-compose.yml PostgreSQL local
  .env.example       Variables locales documentées
  .gitignore         Règles Git du monorepo
  README.md
```

## Prérequis

- Node.js et npm
- Java 21
- Maven ou le wrapper Maven fourni dans `backend`
- Docker Desktop avec Docker Compose

## PostgreSQL local

```bash
docker compose up -d
docker ps
docker compose down
```

La base de développement utilise :

- host : `localhost`
- port : `5432`
- database : `taskforge`
- user : `taskforge`

Les valeurs sont documentées dans `.env.example`. Ne jamais commit de vrais secrets ni de fichier `.env`.

## Backend

```bash
cd backend
./mvnw spring-boot:run
```

Sur Windows PowerShell :

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Tests backend :

```powershell
cd backend
.\mvnw.cmd test
```

Endpoint de santé :

```text
GET http://localhost:8080/api/health
```

Réponse attendue :

```json
{"status":"UP","service":"taskforge-api"}
```

## Frontend

```bash
cd frontend
npm install
npm start
```

L'application Angular démarre par défaut sur `http://localhost:4200`.

## Sécurité

L'authentification JWT n'est pas encore implémentée. Spring Security est installé pour préparer la suite, avec `/api/health` accessible publiquement.
