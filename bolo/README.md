# Bolo — recrutement et suivi des candidatures pour les PME

*« Bolo » veut dire « travail » en camfranglais.*

Bolo rassemble les CV reçus par la page carrière, WhatsApp, e-mail ou au bureau, suit chaque candidature dans un processus de recrutement **propre à chaque offre**, et protège les CV (chiffrement AES-256-GCM, liens signés de 5 minutes, journal d’accès, droit à l’effacement).

Projet réalisé dans le cadre d’un stage de Bachelor of Engineering (SEAS – IUC), 2026.

## Stack
- **client/** : React 18, Vite, React Router, pdf.js (affichage des CV dans l’application)
- **server/** : Node.js 20, Express 4, PostgreSQL 16 (`pg`), Zod, JWT (cookie httpOnly), bcrypt, Multer, ClamAV

## Démarrage en développement
```bash
# PostgreSQL 16 local avec une base « bolo » (utilisateur bolo / bolo)
cd server && npm install && npm run db:seed && npm run dev     # API sur :5000
cd client && npm install && npm run dev                         # interface sur :5173
```
Compte de démonstration : `rh@wouri-distribution.cm` / `Bolo#2026` (données fictives).

## Tests
```bash
cd server && npm test          # 43 tests d’intégration sur une base PostgreSQL de test
node scripts/bench.js          # mesures de performance (NODE_ENV=test)
```

## Production
```bash
cp server/.env.example server/.env   # renseigner les secrets
DB_PASSWORD=... docker compose up -d --build
```
