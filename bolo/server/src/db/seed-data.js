// Fictitious demo data (names and phone numbers are invented).
const FR_FIRST = ['Ariane', 'Hervé', 'Diane', 'Yves', 'Christelle', 'Serge', 'Joël', 'Sandrine', 'Paul', 'Laure', 'Boris', 'Carine', 'Franck', 'Mireille', 'Arnaud', 'Gisèle', 'Landry', 'Nadège', 'Patrick', 'Rosine', 'Stéphane', 'Vanessa', 'Cédric', 'Murielle', 'Junior', 'Estelle', 'Rodrigue', 'Linda', 'Thierry', 'Prisca', 'Aurélien', 'Danielle', 'Gaël', 'Josiane', 'Ulrich', 'Flore'];
const FR_LAST = ['Ngono', 'Kamga', 'Fokou', 'Mbarga', 'Abena', 'Tchoumi', 'Ewane', 'Ondoa', 'Nkotto', 'Essomba', 'Djoumessi', 'Moukoko', 'Nana', 'Tagne', 'Owona', 'Ekambi', 'Bilong', 'Kenmogne', 'Ndongo', 'Atangana', 'Simo', 'Mvogo', 'Tchinda', 'Nguimfack', 'Ebongue', 'Wamba', 'Manga', 'Belinga', 'Dikongue', 'Fotso', 'Mballa', 'Yomba'];
const EN_FIRST = ['Brenda', 'Collins', 'Precious', 'Emmanuel', 'Blessing', 'Clinton', 'Gladys', 'Divine', 'Kingsley', 'Mercy', 'Raymond', 'Glory', 'Valery', 'Comfort', 'Godlove'];
const EN_LAST = ['Che', 'Tabi', 'Nfor', 'Ngwa', 'Fon', 'Asongwe', 'Bih', 'Tanyi', 'Achu', 'Nji', 'Ayuk', 'Mbah', 'Fru', 'Nkwain', 'Ambe'];
const CITIES = ['Douala', 'Douala', 'Douala', 'Douala', 'Yaoundé', 'Buea', 'Limbe', 'Edéa', 'Bafoussam', 'Kribi'];
const QUARTERS = ['Akwa', 'Bonamoussadi', 'Makepe', 'Logpom', 'Bonabéri', 'Deïdo', 'Ndokoti', 'PK14', 'Bépanda', 'Kotto'];
const SCHOOLS = ['Université de Douala (ESSEC)', 'Université de Buea', 'IUC Douala', 'Université de Yaoundé II – Soa', 'ISTDI Douala', 'Université de Dschang', 'Catholic University of Cameroon, Bamenda'];
const EMPLOYERS = ['une PME de distribution', 'un cabinet comptable', 'une société de transit', 'une entreprise agroalimentaire', 'une microfinance', 'une société de BTP', 'une start-up de Douala', 'une chaîne de supermarchés'];

const PROFILES = {
  compta: { titles: ['Comptable', 'Comptable général', 'Aide-comptable', 'Assistant comptable', 'Comptable fournisseurs'], skills: ['Sage 100', 'SYSCOHADA', 'Excel avancé', 'Fiscalité', 'DSF', 'Rapprochements bancaires', 'Paie', 'CNPS', 'Trésorerie', 'Odoo'], diploma: 'Licence en comptabilité et finance' },
  sales: { titles: ['Commercial terrain', 'Délégué commercial', 'Agent commercial', 'Superviseur des ventes', 'Commercial B2B'], skills: ['Prospection', 'Négociation', 'Merchandising', 'Gestion de portefeuille', 'Permis B', 'CRM', 'Recouvrement', 'Grande distribution'], diploma: 'BTS Action commerciale' },
  driver: { titles: ['Chauffeur poids lourd', 'Chauffeur-livreur', 'Conducteur PL', 'Chauffeur de camion'], skills: ['Permis C', 'Permis CE', 'Mécanique de base', 'Bons de livraison', 'Axe Douala–Yaoundé', 'Sécurité routière'], diploma: 'Permis C – auto-école agréée' },
  dev: { titles: ['Développeur web', 'Développeur full-stack', 'Développeur JavaScript', 'Développeur PHP/Laravel', 'Développeur React'], skills: ['React', 'Node.js', 'PostgreSQL', 'Laravel', 'Git', 'Docker', 'TypeScript', 'REST API', 'MySQL', 'Flutter'], diploma: 'Licence en génie logiciel' },
  hr: { titles: ['Assistante RH', 'Assistant ressources humaines', 'Chargée de recrutement', 'Gestionnaire de paie'], skills: ['Recrutement', 'Paie', 'Droit du travail camerounais', 'CNPS', 'Anglais courant', 'Excel', 'Onboarding', 'Sage Paie'], diploma: 'Licence en gestion des ressources humaines' },
  stock: { titles: ['Magasinier', 'Magasinier cariste', 'Aide-magasinier', 'Gestionnaire de stock'], skills: ['CACES chariot', 'Inventaire', 'FIFO', 'Sage Gestion commerciale', 'Réception marchandises', 'Préparation de commandes'], diploma: 'CAP Logistique' },
  cdg: { titles: ['Étudiant en contrôle de gestion', 'Stagiaire finance', 'Étudiante en audit'], skills: ['Excel', 'Power BI', 'Tableaux de bord', 'Analyse financière', 'Budget'], diploma: 'Master 1 Contrôle de gestion (en cours)' },
};

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export const DATA = {
  stages: [
    ['Nouvelle', 'active', 3, null], ['Présélection', 'active', 5, null], ['Entretien', 'active', 7, 'interview'],
    ['Test pratique', 'active', 5, 'test'], ['Proposition', 'active', 4, 'offer'], ['Recruté', 'hired', null, 'hired'], ['Non retenu', 'rejected', null, 'rejected'],
  ],
  users: [
    { key: 'admin', name: 'Ekwalla Serge', email: 'admin@wouri-distribution.cm', role: 'admin' },
    { key: 'hr', name: 'Ngo Bisseck Laure', email: 'rh@wouri-distribution.cm', role: 'hr' },
    { key: 'logi', name: 'Tchoumi Hervé', email: 'h.tchoumi@wouri-distribution.cm', role: 'recruiter' },
    { key: 'fin', name: 'Abena Christelle', email: 'c.abena@wouri-distribution.cm', role: 'recruiter' },
  ],
  sources: ['career_page', 'career_page', 'career_page', 'career_page', 'career_page', 'whatsapp', 'whatsapp', 'whatsapp', 'email', 'email', 'walk_in', 'walk_in', 'referral', 'linkedin'],
  reasons: ['Expérience insuffisante', 'Compétences ne correspondant pas', 'Prétentions salariales', 'Candidat injoignable', 'Autre candidat retenu'],
  jobs: [
    {
      title: 'Comptable confirmé(e)', slug: 'comptable-confirme', department: 'Finance', location: 'Douala – Akwa', contract: 'CDI', openings: 1, status: 'open', ageDays: 41, deadlineDays: 12, count: 34, profile: 'compta', recruiters: ['fin'],
      description: 'Rattaché(e) au Responsable administratif et financier, vous tenez la comptabilité générale de la société selon le SYSCOHADA révisé.\n\n• Saisie et contrôle des pièces comptables (achats, ventes, banque)\n• Rapprochements bancaires mensuels\n• Préparation des déclarations fiscales et sociales (DSF, CNPS)\n• Participation aux clôtures mensuelles et annuelles',
      requirements: '• Licence ou BTS en comptabilité\n• 3 ans d’expérience minimum en entreprise\n• Maîtrise de Sage 100 et d’Excel\n• Rigueur et discrétion',
      skills: ['Sage 100', 'SYSCOHADA', 'Excel', 'Fiscalité'],
      featured: [
        { name: 'Che Brenda Ngum', phone: '+237677451236', email: 'brenda.che@gmail.com', city: 'Douala', headline: 'Comptable général · 5 ans en PME', exp: 5, lang: 'en', skills: ['Sage 100', 'SYSCOHADA', 'DSF', 'Rapprochements bancaires', 'Excel avancé', 'Trésorerie'], source: 'whatsapp', stage: 2, daysAgo: 9, lastMoveDaysAgo: 1.2, rating: 4, comment: 'Très bonne maîtrise de Sage et des déclarations DSF. Disponible sous un mois.', evaluator: 'fin', views: [{ by: 'hr', hoursAgo: 0.4, ip: '41.202.219.34' }, { by: 'fin', hoursAgo: 26, ip: '41.202.219.51' }] },
        { name: 'Fokou Kamdem Diane', phone: '+237699812054', email: 'diane.fokou@yahoo.fr', city: 'Douala', headline: 'Comptable · cabinet d’expertise · 6 ans', exp: 6, lang: 'fr', skills: ['Sage 100', 'SYSCOHADA', 'Fiscalité', 'Paie', 'CNPS'], source: 'career_page', stage: 3, daysAgo: 16, lastMoveDaysAgo: 2, rating: 5, comment: 'Test pratique très réussi (17/20).' },
        { name: 'Mbarga Essomba Yves', phone: '+237655230871', email: 'yves.mbarga@gmail.com', city: 'Yaoundé', headline: 'Chef comptable adjoint · 8 ans', exp: 8, lang: 'fr', skills: ['SYSCOHADA', 'Sage 100', 'Audit', 'Trésorerie'], source: 'referral', stage: 2, daysAgo: 12, lastMoveDaysAgo: 9, rating: 4 },
        { name: 'Tabi Collins Ayuk', phone: '+237670114522', email: 'collins.tabi@outlook.com', city: 'Buea', headline: 'Accountant · microfinance · 4 years', exp: 4, lang: 'en', skills: ['Sage 100', 'Excel avancé', 'Reporting COBAC'], source: 'email', stage: 1, daysAgo: 6, lastMoveDaysAgo: 5 },
        { name: 'Ngono Ateba Ariane', phone: '+237691447720', email: 'ariane.ngono@gmail.com', city: 'Douala', headline: 'Aide-comptable · 3 ans', exp: 3, lang: 'fr', skills: ['Sage 100', 'Excel', 'Saisie comptable'], source: 'career_page', stage: 0, daysAgo: 0.3 },
      ],
    },
    {
      title: 'Commercial(e) terrain – Littoral', slug: 'commercial-terrain-littoral', department: 'Ventes', location: 'Douala et Littoral', contract: 'CDI', openings: 2, status: 'open', ageDays: 33, deadlineDays: 20, count: 38, profile: 'sales', hire: 3,
      description: 'Vous développez notre réseau de points de vente (boutiques, supermarchés, grossistes) à Douala et dans le Littoral.\n\n• Prospection et fidélisation des clients\n• Prise de commandes et suivi des livraisons\n• Merchandising et suivi des promotions\n• Recouvrement des créances',
      requirements: '• BTS ou Licence en commerce\n• 2 ans d’expérience dans la vente terrain\n• Permis B, moto appréciée\n• Bonne connaissance de Douala',
      skills: ['Prospection', 'Négociation', 'Permis B'],
    },
    {
      title: 'Chauffeur-livreur poids lourd (permis C)', slug: 'chauffeur-livreur-poids-lourd', department: 'Logistique', location: 'Douala – Bassa', contract: 'CDD', openings: 2, status: 'open', ageDays: 26, deadlineDays: 6, count: 26, profile: 'driver', recruiters: ['logi'], custom: 'Essai de conduite',
      description: 'Vous assurez la livraison de nos clients à Douala et sur l’axe Douala–Yaoundé.\n\n• Chargement et contrôle des marchandises\n• Livraison et signature des bons\n• Entretien courant du véhicule',
      requirements: '• Permis C en cours de validité (CE apprécié)\n• 3 ans d’expérience\n• Casier judiciaire vierge',
      skills: ['Permis C', 'Sécurité routière'],
    },
    {
      title: 'Développeur(se) web full-stack', slug: 'developpeur-web-full-stack', department: 'Informatique', location: 'Douala – Bonanjo', contract: 'CDI', openings: 1, status: 'open', ageDays: 19, deadlineDays: 25, count: 22, profile: 'dev',
      description: 'Vous faites évoluer nos outils internes (gestion commerciale, suivi des livraisons) et notre site de commande en ligne.\n\n• Développement de nouvelles fonctionnalités (React, Node.js)\n• Maintenance de la base PostgreSQL\n• Tests et mise en production',
      requirements: '• Licence en génie logiciel ou équivalent\n• 2 ans d’expérience\n• React, Node.js, SQL, Git',
      skills: ['React', 'Node.js', 'PostgreSQL', 'Git'],
    },
    {
      title: 'Assistant(e) RH bilingue', slug: 'assistant-rh-bilingue', department: 'Ressources humaines', location: 'Douala – Akwa', contract: 'CDD', openings: 1, status: 'open', ageDays: 12, deadlineDays: 30, count: 16, profile: 'hr',
      description: 'Vous assistez la Responsable RH dans le recrutement, l’administration du personnel et la paie.\n\n• Tri des candidatures et organisation des entretiens\n• Dossiers du personnel et déclarations CNPS\n• Accueil et intégration des nouveaux employés',
      requirements: '• Licence en GRH\n• Parfaitement bilingue français/anglais\n• Discrétion',
      skills: ['Recrutement', 'Paie', 'Anglais courant'],
    },
    {
      title: 'Magasinier(ère) cariste', slug: 'magasinier-cariste', department: 'Logistique', location: 'Douala – Bassa', contract: 'CDI', openings: 1, status: 'open', ageDays: 7, deadlineDays: 21, count: 11, profile: 'stock', recruiters: ['logi'],
      description: 'Vous réceptionnez, stockez et préparez les marchandises de notre entrepôt de Bassa.', requirements: '• CACES ou expérience de conduite de chariot élévateur\n• 2 ans d’expérience en entrepôt', skills: ['CACES chariot', 'Inventaire'],
    },
    {
      title: 'Stagiaire contrôle de gestion', slug: 'stagiaire-controle-de-gestion', department: 'Finance', location: 'Douala – Akwa', contract: 'Stage', openings: 1, status: 'closed', ageDays: 58, deadlineDays: -20, count: 24, profile: 'cdg', hire: 2,
      description: 'Stage de 3 mois au sein de la direction financière : tableaux de bord, suivi budgétaire.', requirements: '• Master 1 en contrôle de gestion ou finance', skills: ['Excel', 'Power BI'],
    },
    {
      title: 'Responsable logistique', slug: 'responsable-logistique', department: 'Logistique', location: 'Douala – Bassa', contract: 'CDI', openings: 1, status: 'draft', ageDays: 1, deadlineDays: 40, count: 0, profile: 'stock',
      description: 'Offre en préparation : vous pilotez l’entrepôt, la flotte de camions et l’équipe de livraison.', requirements: null, skills: ['Logistique', 'Management'],
    },
  ],
  person(rnd, pick, job) {
    const en = rnd() < (job.profile === 'hr' ? 0.45 : 0.24);
    const first = en ? pick(EN_FIRST) : pick(FR_FIRST);
    const last = en ? pick(EN_LAST) : pick(FR_LAST);
    const name = rnd() < 0.5 ? `${last} ${pick(en ? EN_LAST : FR_LAST)} ${first}` : `${last} ${first}`;
    const p = PROFILES[job.profile];
    const exp = job.profile === 'cdg' ? 0 : Math.max(0, Math.round(rnd() * 9));
    const skills = [...new Set(Array.from({ length: 3 + Math.floor(rnd() * 3) }, () => pick(p.skills)))];
    const city = pick(CITIES);
    const title = pick(p.titles);
    const employer = pick(EMPLOYERS);
    const r = rnd();
    return {
      name, lang: en ? 'en' : 'fr', city, exp, skills,
      email: rnd() < 0.82 ? `${strip(first)}.${strip(last)}${Math.floor(rnd() * 90 + 10)}@${pick(['gmail.com', 'yahoo.fr', 'gmail.com', 'outlook.com'])}` : undefined,
      headline: exp ? `${title} · ${exp} an${exp > 1 ? 's' : ''} d’expérience` : title,
      rating: r < 0.35 ? 2 + Math.floor(rnd() * 4) : undefined,
      cvLines: [name.toUpperCase(), title, `${city}${city === 'Douala' ? ' – ' + pick(QUARTERS) : ''}`, '', 'EXPERIENCE',
        `${2026 - exp} - 2026 : ${title} chez ${employer}`, ...skills.map((s) => `- ${s}`), '', 'FORMATION', `${p.diploma}, ${pick(SCHOOLS)}`, '', 'LANGUES', en ? 'Anglais (langue maternelle), francais (intermediaire)' : 'Francais, anglais (intermediaire)'],
    };
  },
};
