# Guide de lancement de Bolo (Windows)

Ce guide explique comment lancer Bolo sur un ordinateur Windows après avoir récupéré le fichier `bolo-source.zip`. Compter environ 30 minutes la première fois, dont l’essentiel pour les téléchargements.

## 1. Ce que contient le zip

| Dossier / fichier | Rôle |
|---|---|
| `client/` | Interface web (React + Vite) |
| `server/` | API (Node.js + Express), base de données, tests |
| `docker-compose.yml`, `Dockerfile` | Déploiement sur un serveur (production) |
| `README.md`, `INSTALLATION.md` | Documentation |

Les bibliothèques (`node_modules`, environ 300 Mo) ne sont pas dans le zip : elles sont téléchargées à l’étape 4 avec `npm install`.

## 2. Logiciels à installer (une seule fois)

1. **Node.js 20 LTS ou plus récent** : https://nodejs.org → bouton « LTS » → installer avec les options par défaut.
2. **PostgreSQL 16** : https://www.postgresql.org/download/windows/ → installeur EDB. Pendant l’installation :
   - garder le port **5432** ;
   - choisir un mot de passe pour l’utilisateur `postgres` et **le noter**.
3. Vérifier dans un terminal (PowerShell) :
   ```powershell
   node -v      # doit afficher v20.x ou plus
   npm -v
   ```

Une connexion Internet est nécessaire pour l’étape 4.

## 3. Décompresser le projet

Décompresser `bolo-source.zip`, par exemple dans `C:\projets\`. On obtient `C:\projets\bolo\` avec `client\` et `server\` dedans.

## 4. Créer la base de données (une seule fois)

Ouvrir **SQL Shell (psql)** (menu Démarrer → PostgreSQL 16), appuyer sur Entrée pour les valeurs par défaut, puis taper le mot de passe de `postgres`. Copier ensuite ces lignes :

```sql
CREATE USER bolo WITH PASSWORD 'bolo';
CREATE DATABASE bolo OWNER bolo;
\c bolo
CREATE EXTENSION IF NOT EXISTS pgcrypto;
\q
```

L’application se connecte par défaut à `postgresql://bolo:bolo@localhost:5432/bolo` : il n’y a aucun fichier de configuration à écrire pour un lancement en local.

## 5. Lancer le serveur (API)

Ouvrir un **premier terminal** PowerShell :

```powershell
cd C:\projets\bolo\server
npm install       # 1re fois seulement : télécharge les bibliothèques
npm run db:seed   # 1re fois seulement : crée les tables et les données
npm run dev       # démarre l’API
```

Résultat attendu :

- `npm run db:seed` affiche `Seeded: ... applications, ... candidates, ... encrypted CVs` ;
- `npm run dev` affiche `Bolo API listening on :5000`.

**Laisser ce terminal ouvert.**

> Attention : `npm run db:seed` **efface toute la base** puis la remplit avec les données fictives. Ne le relancer que pour repartir de zéro.

## 6. Lancer l’interface

Ouvrir un **deuxième terminal** PowerShell :

```powershell
cd C:\projets\bolo\client
npm install       # 1re fois seulement
npm run dev
```

Vite affiche `Local: http://localhost:5173/`. **Laisser ce terminal ouvert** lui aussi.

## 7. Utiliser l’application

| Page | Adresse |
|---|---|
| Espace RH (back-office) | http://localhost:5173 |
| Page carrière publique de l’entreprise de démonstration | http://localhost:5173/carrieres/wouri-distribution |

Compte de démonstration (données fictives) :

- e-mail : `rh@wouri-distribution.cm`
- mot de passe : `Bolo#2026`

## 8. Arrêter et relancer

- **Arrêter** : `Ctrl + C` dans chacun des deux terminaux.
- **Relancer les fois suivantes** : seulement `npm run dev` dans `server\`, puis `npm run dev` dans `client\`. Pas besoin de refaire `npm install` ni `npm run db:seed`.
- PostgreSQL démarre tout seul avec Windows.

## 9. Problèmes fréquents

| Message ou symptôme | Cause | Solution |
|---|---|---|
| `'node' n'est pas reconnu…` | Node.js absent ou terminal ouvert avant l’installation | Installer Node.js, fermer et rouvrir le terminal |
| `password authentication failed for user "bolo"` | Utilisateur `bolo` non créé ou autre mot de passe | Refaire l’étape 4 |
| `database "bolo" does not exist` | Base non créée | Refaire l’étape 4 |
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL arrêté | `Win + R` → `services.msc` → démarrer `postgresql-x64-16` |
| `permission denied to create extension "pgcrypto"` | Extension non créée par `postgres` | Dans psql (connecté en `postgres`) : `\c bolo` puis `CREATE EXTENSION pgcrypto;` |
| `EADDRINUSE :5000` | Un autre programme utilise le port 5000 | Fermer ce programme (ou l’autre terminal où l’API tourne déjà) |
| L’interface s’ouvre mais la connexion échoue (« erreur réseau ») | L’API n’est pas lancée | Vérifier le premier terminal (étape 5) |
| `npm install` très long ou en erreur | Connexion Internet | Relancer `npm install` |

## 10. Pour aller plus loin (facultatif)

**Tests automatisés (43 tests).** Ils utilisent une base séparée et une syntaxe de terminal Unix : les lancer depuis **Git Bash** (installé avec Git pour Windows).

```sql
-- dans psql, connecté en postgres
CREATE DATABASE bolo_test OWNER bolo;
\c bolo_test
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

```bash
cd /c/projets/bolo/server
npm test       # résultat attendu : tests 43, pass 43, fail 0
```

**Mise en ligne sur un serveur.** Le fichier `docker-compose.yml` installe toute l’application (base, antivirus ClamAV, API, interface) avec Docker. Il faut d’abord copier `server/.env.example` en `server/.env` et remplir les secrets (`JWT_SECRET`, `CV_ENCRYPTION_KEY`, mot de passe de la base). Cette option est prévue pour un serveur avec HTTPS, pas pour un essai en local.
