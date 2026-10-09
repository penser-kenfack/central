# Cahier des charges — University Lost & Found System

> Plateforme centralisée de gestion des objets perdus et trouvés en milieu universitaire.

| Élément | Valeur |
|---|---|
| Projet | University Lost and Found System (nom de produit proposé : **Retrouv'UNI**) |
| Contexte | Université (étudiants, personnel, service des objets trouvés) |
| Version du document | 1.0 |
| Date | Octobre 2026 |
| Maquettes UI | `maquettes/index.html` (importable dans Figma, voir §12) |

---

## 1. Contexte et problématique

Depuis le début de notre troisième année, plusieurs d'entre nous ont perdu des affaires, ou ont vu d'autres personnes en perdre, dans les salles de cours et les espaces du campus. Une perte est souvent constatée tardivement : personne ne sait ce qui s'est passé ni si quelqu'un a trouvé l'objet.

Les étudiants et le personnel perdent des objets personnels : téléphones, sacs, clés, cartes d'étudiant, documents, livres, clés USB… Les objets trouvés, eux, ne sont pas toujours déclarés, ou sont difficiles à relier à leur propriétaire, faute de **système centralisé et organisé**. Ce problème existe très probablement dans d'autres universités et écoles.

## 2. Objectifs du projet

### 2.1 Objectif général
Fournir une plateforme centralisée permettant de déclarer des objets perdus ou trouvés, de rechercher les déclarations, d'identifier des correspondances, de vérifier la propriété et d'enregistrer la restitution des objets.

### 2.2 Objectifs spécifiques
Les utilisateurs doivent pouvoir :
1. Déclarer un objet **perdu** ;
2. Déclarer un objet **trouvé** ;
3. **Rechercher** parmi les déclarations ;
4. Recevoir des **correspondances possibles** entre objets perdus et trouvés ;
5. Fournir les informations nécessaires à la **vérification de propriété** ;
6. **Suivre le statut** de leur déclaration ;
7. Voir la **restitution finale enregistrée**.

### 2.3 Hors périmètre
- Le système **ne promet pas de retrouver des objets volés** et ne remplace pas une plainte auprès des autorités.
- Pas de paiement, pas de livraison des objets, pas de géolocalisation en temps réel.
- Pas d'application mobile native en V1 (application web responsive uniquement).

## 3. Périmètre fonctionnel — le flux principal

Le périmètre est volontairement limité à un seul flux métier :

```
Déclarer  →  Rechercher / Correspondre  →  Vérifier  →  Restituer  →  Archiver
(Report)     (Search / Match)               (Verify)     (Return)       (Record)
```

## 4. Acteurs et rôles

| Acteur | Description | Droits principaux |
|---|---|---|
| **Étudiant** | Membre de l'université authentifié | Déclarer perdu/trouvé, rechercher, voir les correspondances, revendiquer, suivre ses déclarations |
| **Personnel universitaire** | Enseignant, agent administratif, agent d'entretien, sécurité | Mêmes droits que l'étudiant ; peut déposer un objet trouvé au guichet |
| **Responsable des objets trouvés** | Agent du service Lost & Found | Valider les déclarations, gérer l'inventaire physique, vérifier la propriété, enregistrer la restitution, consulter les statistiques |
| **Administrateur système** | Équipe informatique | Gérer les comptes et rôles, les catégories, les lieux, les paramètres, consulter les journaux d'audit |
| *Visiteur (non connecté)* | Toute personne | Consulter la page d'accueil et la liste publique (informations limitées) |

## 5. Besoins fonctionnels

Priorités : **M** = Must (indispensable V1), **S** = Should (souhaitable), **C** = Could (optionnel).

### 5.1 Authentification et comptes
| ID | Exigence | Prio |
|---|---|---|
| F-01 | Connexion via e-mail universitaire (ou matricule) + mot de passe | M |
| F-02 | Inscription réservée aux adresses du domaine de l'université, avec confirmation par e-mail | M |
| F-03 | Réinitialisation du mot de passe | M |
| F-04 | Gestion du profil (nom, téléphone facultatif, faculté/département, préférences de notification) | S |
| F-05 | Authentification unique (SSO / LDAP de l'université) | C |

### 5.2 Déclaration d'un objet perdu
| ID | Exigence | Prio |
|---|---|---|
| F-10 | Formulaire : catégorie, titre, description, couleur, marque, date et plage horaire estimées, lieu (bâtiment / salle), photo facultative | M |
| F-11 | Champs **privés** de vérification (signe distinctif, contenu, n° de série, fond d'écran…) visibles seulement par le responsable | M |
| F-12 | Modification ou annulation de la déclaration tant qu'elle n'est pas clôturée | M |
| F-13 | Déclarer « objet retrouvé par moi-même » pour clôturer | S |

### 5.3 Déclaration d'un objet trouvé
| ID | Exigence | Prio |
|---|---|---|
| F-20 | Formulaire : catégorie, description **publique volontairement partielle**, lieu et date de découverte, photo (floutage des données sensibles recommandé) | M |
| F-21 | Indiquer où se trouve l'objet : « je le garde », « déposé au guichet X » | M |
| F-22 | Le responsable confirme la réception physique de l'objet et lui attribue un **code d'inventaire** (ex. `LF-2026-0142`) | M |
| F-23 | Les documents d'identité (carte étudiant, CNI) sont signalés en priorité au responsable | S |

### 5.4 Recherche et consultation
| ID | Exigence | Prio |
|---|---|---|
| F-30 | Recherche plein texte + filtres : type (perdu/trouvé), catégorie, lieu, période, statut | M |
| F-31 | Liste paginée sous forme de cartes avec photo, catégorie, lieu, date, statut | M |
| F-32 | Fiche détaillée d'une déclaration (sans les champs privés) | M |
| F-33 | Tri par date ou pertinence | S |

### 5.5 Correspondances (matching)
| ID | Exigence | Prio |
|---|---|---|
| F-40 | À chaque nouvelle déclaration, le système calcule un **score de correspondance** avec les déclarations de type opposé | M |
| F-41 | Critères : même catégorie (obligatoire), proximité de date (± 7 jours), même bâtiment/lieu, couleur, marque, mots-clés communs | M |
| F-42 | Les correspondances au-dessus d'un seuil (ex. 60 %) sont proposées au déclarant et au responsable | M |
| F-43 | L'utilisateur peut marquer une correspondance comme « Ce n'est pas mon objet » | S |

### 5.6 Revendication et vérification de propriété
| ID | Exigence | Prio |
|---|---|---|
| F-50 | Le propriétaire présumé **revendique** un objet trouvé et répond à des questions de vérification | M |
| F-51 | Le responsable compare les réponses aux informations privées et **accepte** ou **refuse** la revendication (motif obligatoire en cas de refus) | M |
| F-52 | En cas d'acceptation, un rendez-vous de retrait est proposé (lieu, créneau) | M |
| F-53 | Plusieurs revendications sur un même objet sont traitées par le responsable, une seule peut être acceptée | M |

### 5.7 Restitution et archivage
| ID | Exigence | Prio |
|---|---|---|
| F-60 | Le responsable enregistre la restitution : date, identité vérifiée (pièce présentée), agent, signature/QR code | M |
| F-61 | Les déclarations perdue et trouvée liées passent au statut **Restitué** puis sont archivées | M |
| F-62 | Historique consultable de toutes les déclarations et restitutions | M |
| F-63 | Objets non réclamés après N jours (paramétrable, ex. 90) : statut **Non réclamé** → don / destruction / remise à l'administration | S |

### 5.8 Notifications
| ID | Exigence | Prio |
|---|---|---|
| F-70 | Notifications in-app (cloche) : nouvelle correspondance, revendication reçue, décision, rendez-vous, restitution | M |
| F-71 | Notifications par e-mail | S |
| F-72 | Notifications SMS / WhatsApp | C |

### 5.9 Administration et statistiques
| ID | Exigence | Prio |
|---|---|---|
| F-80 | Tableau de bord responsable : déclarations en attente, revendications à traiter, objets en stock, restitutions du mois | M |
| F-81 | Statistiques : lieux et périodes avec le plus de pertes/découvertes, taux de restitution, délai moyen de restitution | S |
| F-82 | Gestion des utilisateurs, rôles, catégories, bâtiments/salles, guichets | M |
| F-83 | Export CSV/PDF des registres | S |
| F-84 | Journal d'audit des actions sensibles | M |

## 6. Règles de gestion

| ID | Règle |
|---|---|
| RG-01 | Seul un utilisateur authentifié peut déclarer, revendiquer ou être notifié. |
| RG-02 | Une déclaration a **un seul auteur** et appartient à **une seule catégorie**. |
| RG-03 | La date de perte/découverte ne peut pas être dans le futur. |
| RG-04 | Les informations de vérification (champs privés) ne sont **jamais** affichées publiquement. |
| RG-05 | Un objet trouvé ne peut être restitué qu'après une revendication **acceptée** par le responsable. |
| RG-06 | Un objet trouvé ne peut avoir qu'**une seule** restitution. |
| RG-07 | Un utilisateur ne peut pas revendiquer un objet qu'il a lui-même déclaré trouvé. |
| RG-08 | Après 3 revendications refusées en 30 jours, le compte est signalé pour contrôle. |
| RG-09 | Une déclaration sans activité pendant 90 jours passe en **Expiré** (perdu) ou **Non réclamé** (trouvé). |
| RG-10 | Toute restitution exige la présentation d'une pièce d'identité ou de la carte étudiant. |

### Cycle de vie des statuts

**Objet perdu :** `Ouvert` → `Correspondance trouvée` → `En vérification` → `Restitué` → `Archivé` (ou `Annulé` / `Expiré`)

**Objet trouvé :** `Signalé` → `En stock` (reçu au guichet) → `Revendiqué` → `En vérification` → `Restitué` → `Archivé` (ou `Non réclamé`)

## 7. Cas d'utilisation principaux

| UC | Acteur | Description |
|---|---|---|
| UC-01 | Étudiant / Personnel | S'authentifier |
| UC-02 | Étudiant / Personnel | Déclarer un objet perdu |
| UC-03 | Étudiant / Personnel | Déclarer un objet trouvé |
| UC-04 | Tous | Rechercher des déclarations |
| UC-05 | Système | Calculer et proposer des correspondances |
| UC-06 | Étudiant / Personnel | Revendiquer un objet trouvé |
| UC-07 | Responsable | Vérifier la propriété |
| UC-08 | Responsable | Enregistrer la restitution |
| UC-09 | Étudiant / Personnel | Suivre le statut de ses déclarations |
| UC-10 | Responsable | Consulter les statistiques |
| UC-11 | Administrateur | Gérer utilisateurs, catégories, lieux |

**Scénario nominal UC-06 / UC-07 / UC-08 :**
1. L'étudiant reçoit une notification « Correspondance possible à 87 % ».
2. Il ouvre la fiche, clique sur « C'est mon objet » et répond aux questions de vérification.
3. Le responsable compare les réponses avec les détails privés et accepte.
4. L'étudiant reçoit un rendez-vous au guichet.
5. Au guichet, le responsable vérifie la carte étudiant, remet l'objet et enregistre la restitution.
6. Les deux déclarations passent en `Restitué` ; l'historique est conservé.

## 8. Modèle de données (conceptuel)

| Entité | Attributs principaux |
|---|---|
| **Utilisateur** | id, nom, prénom, email, matricule, téléphone, rôle, département, actif, date_création |
| **Catégorie** | id, libellé (Téléphone, Sac, Clés, Carte, Document, Livre, USB, Vêtement, Autre), icône |
| **Lieu** | id, bâtiment, salle/zone, campus |
| **Guichet** | id, nom, lieu_id, horaires |
| **Déclaration** | id, type (PERDU/TROUVÉ), titre, description, couleur, marque, date_evenement, lieu_id, categorie_id, auteur_id, statut, guichet_id, code_inventaire, date_création |
| **DétailPrivé** | id, declaration_id, question/indice, valeur |
| **Photo** | id, declaration_id, url |
| **Correspondance** | id, declaration_perdue_id, declaration_trouvee_id, score, statut (PROPOSÉE/REJETÉE/CONFIRMÉE) |
| **Revendication** | id, declaration_trouvee_id, demandeur_id, réponses, statut (EN ATTENTE/ACCEPTÉE/REFUSÉE), motif, traité_par, date |
| **Restitution** | id, revendication_id, agent_id, pièce_présentée, date, signature |
| **Notification** | id, utilisateur_id, type, message, lu, date |
| **JournalAudit** | id, utilisateur_id, action, entité, entité_id, date |

Relations clés : un Utilisateur **0..n** Déclarations ; une Déclaration **0..n** Photos et DétailsPrivés ; une Déclaration trouvée **0..n** Revendications ; une Revendication acceptée **0..1** Restitution.

## 9. Besoins non fonctionnels

| ID | Catégorie | Exigence |
|---|---|---|
| NF-01 | Sécurité | Mots de passe hachés (bcrypt/argon2), HTTPS obligatoire, protection CSRF/XSS/injection SQL |
| NF-02 | Confidentialité | Conformité aux principes de protection des données personnelles ; données minimales ; champs privés chiffrés |
| NF-03 | Contrôle d'accès | Autorisations par rôle (RBAC) vérifiées côté serveur |
| NF-04 | Performance | Temps de réponse < 2 s pour 95 % des requêtes ; recherche < 1 s sur 10 000 déclarations |
| NF-05 | Disponibilité | 99 % pendant les périodes académiques ; sauvegarde quotidienne de la base |
| NF-06 | Ergonomie | Interface responsive (mobile d'abord), déclaration complétée en moins de 2 minutes |
| NF-07 | Accessibilité | Contrastes WCAG 2.1 AA, navigation clavier, libellés de formulaires |
| NF-08 | Langues | Français et anglais |
| NF-09 | Maintenabilité | Code versionné (Git), architecture en couches, tests automatisés des règles de gestion |
| NF-10 | Traçabilité | Journal d'audit des validations, refus et restitutions |

## 10. Architecture technique proposée

- **Frontend** : application web responsive (HTML/CSS/JavaScript, ou React/Vue).
- **Backend** : API REST (Node.js/Express, Laravel ou Django au choix de l'équipe).
- **Base de données** : relationnelle (MySQL ou PostgreSQL).
- **Stockage des photos** : dossier serveur ou stockage objet, images redimensionnées.
- **Notifications** : service e-mail SMTP ; notifications in-app stockées en base.
- **Déploiement** : serveur de l'université ou hébergement cloud, avec environnement de test.

```
[Navigateur]  ⇄  [Frontend web]  ⇄  [API REST]  ⇄  [Base de données]
                                         │
                                         ├── Service de correspondance (scoring)
                                         ├── Stockage photos
                                         └── Service e-mail / notifications
```

## 11. Charte graphique (Design System)

| Élément | Choix |
|---|---|
| Couleur primaire | Bleu académique `#1E40AF` |
| Couleur secondaire | Ambre `#F59E0B` (actions « trouvé », mises en avant) |
| Succès | `#16A34A` (Restitué) |
| Alerte | `#DC2626` (Perdu, refus) |
| Neutres | `#0F172A` (texte), `#64748B` (texte secondaire), `#E2E8F0` (bordures), `#F8FAFC` (fond) |
| Typographie | **Inter** — titres 600/700, texte 400, tailles 12 / 14 / 16 / 20 / 28 / 36 |
| Rayons | 8 px (champs, boutons), 12 px (cartes) |
| Espacements | Grille de 4 px (4, 8, 12, 16, 24, 32, 48) |
| Icônes | Font Awesome (déjà présent dans `assets/font`) |
| Badges de statut | Perdu (rouge), Trouvé (ambre), En vérification (violet), Restitué (vert), Archivé (gris) |

## 12. Interfaces utilisateur (maquettes)

Les maquettes haute fidélité sont dans **`maquettes/index.html`** (ouvrir dans un navigateur). Chaque écran est un cadre (frame) de 1280 px ou 390 px de large.

| # | Écran | Acteur | Contenu |
|---|---|---|---|
| E1 | Connexion | Tous | Logo, e-mail universitaire, mot de passe, lien d'inscription |
| E2 | Accueil / Tableau de bord | Étudiant | Boutons « J'ai perdu » / « J'ai trouvé », barre de recherche, correspondances, mes déclarations |
| E3 | Déclarer un objet perdu | Étudiant | Formulaire en étapes, catégories en tuiles, lieu, date, photo, détails privés |
| E4 | Recherche | Tous | Filtres latéraux, grille de cartes, badges de statut |
| E5 | Détail + correspondances | Étudiant | Fiche de l'objet, frise de statut, correspondances avec score, bouton « C'est mon objet » |
| E6 | Vérification de propriété | Responsable | Comparaison côte à côte : réponses du demandeur vs détails privés, accepter / refuser |
| E7 | Tableau de bord responsable | Responsable | KPIs, graphique par lieu, file des tâches, enregistrement de restitution |
| E8 | Version mobile | Étudiant | Accueil et déclaration sur écran 390 px |

### Importer les maquettes dans Figma
Figma ne permet pas de créer un fichier à partir d'un document texte, mais les maquettes HTML s'importent en calques modifiables :
1. Dans Figma, installer le plugin **« html.to.design »** (Menu → Plugins → Rechercher « html.to.design »).
2. Publier `maquettes/index.html` (par ex. via GitHub Pages sur ce dépôt) ou utiliser l'onglet *Import HTML* du plugin en collant le contenu du fichier.
3. Lancer l'import : chaque `section.frame` devient un frame Figma avec ses calques texte, formes et auto-layout.
4. Créer ensuite dans Figma les styles (couleurs et typographies du §11) et convertir les boutons, champs et badges en **composants**.

## 13. Planning prévisionnel

| Phase | Livrables | Durée |
|---|---|---|
| 1. Analyse | Cahier des charges, étude de faisabilité, règles de gestion | 2 semaines |
| 2. Conception | Cas d'utilisation, MCD/MLD, architecture, maquettes Figma | 3 semaines |
| 3. Développement | Authentification, déclarations, recherche, correspondances, vérification, restitution, admin | 6 semaines |
| 4. Tests | Tests unitaires, d'intégration et d'acceptation avec des utilisateurs | 2 semaines |
| 5. Déploiement | Mise en ligne, guide utilisateur, présentation finale | 1 semaine |

## 14. Critères d'acceptation

- Un étudiant déclare un objet perdu en moins de 2 minutes depuis un téléphone.
- Une déclaration trouvée correspondante déclenche une notification de correspondance au propriétaire.
- Aucun champ privé n'est visible par un autre utilisateur que le responsable.
- Une restitution n'est possible qu'après une revendication acceptée et l'enregistrement d'une pièce d'identité.
- Le responsable peut voir le nombre de pertes par lieu et par mois.

## 15. Avantages attendus

- Centralisation des informations sur les objets perdus et trouvés.
- Recherche plus simple des affaires disparues.
- Mise en relation des objets perdus avec les objets trouvés déclarés.
- Processus organisé de vérification de la propriété.
- Historique des déclarations et des restitutions.
- Indicateurs pour l'université : lieux et périodes qui concentrent le plus de pertes.

## 16. Faisabilité

Le projet est centré sur un seul flux (Déclarer → Correspondre → Vérifier → Restituer → Archiver). Il traite un problème de **gestion de l'information**, sans promettre de retrouver des objets volés. Ce périmètre suffit pour l'analyse des besoins, l'étude de faisabilité, les règles de gestion, les cas d'utilisation, la conception de la base de données, l'architecture, la conception des interfaces, les tests et la planification du déploiement, avec des technologies web maîtrisées par l'équipe.
