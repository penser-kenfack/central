import { useState } from 'react';

export const T = {
  fr: {
    jobs: 'Offres d’emploi', open: (n) => `${n} poste${n > 1 ? 's' : ''} ouvert${n > 1 ? 's' : ''}`, until: 'Jusqu’au', apply: 'Postuler', missions: 'Le poste', profile: 'Profil recherché', skills: 'Compétences',
    form: 'Votre candidature', name: 'Nom complet', phone: 'Téléphone', email: 'E-mail (facultatif)', city: 'Ville', exp: 'Années d’expérience', lang: 'Langue de réponse',
    cv: 'Ajouter votre CV', cvHint: 'PDF, Word ou photo de votre CV papier · 5 Mo max.', note: 'Un mot pour le recruteur (facultatif)',
    consent: 'J’accepte que mes données soient utilisées pour ce recrutement et conservées 24 mois au maximum. Je peux demander leur suppression à tout moment.',
    send: 'Envoyer ma candidature', sending: 'Envoi…', thanks: 'Candidature envoyée', thanksText: 'Vous recevrez une confirmation. Gardez ce lien pour suivre votre candidature :',
    follow: 'Suivre ma candidature', share: 'Partager sur WhatsApp', light: 'Page légère : fonctionne en 3G', back: 'Toutes les offres',
    track: 'Suivi de votre candidature', received: 'Candidature reçue', inReview: 'En cours d’étude', decision: 'Décision', hired: 'Félicitations, vous êtes retenu(e) !', closed: 'Le processus est terminé. Merci pour votre candidature.',
    hello: 'Bonjour', for: 'Poste :', on: 'le', dup: 'Vous aviez déjà postulé : votre CV a été mis à jour.',
  },
  en: {
    jobs: 'Job openings', open: (n) => `${n} open position${n > 1 ? 's' : ''}`, until: 'Until', apply: 'Apply', missions: 'The role', profile: 'Who we are looking for', skills: 'Skills',
    form: 'Your application', name: 'Full name', phone: 'Phone', email: 'E-mail (optional)', city: 'City', exp: 'Years of experience', lang: 'Reply language',
    cv: 'Add your CV', cvHint: 'PDF, Word or a photo of your paper CV · 5 MB max.', note: 'A word for the recruiter (optional)',
    consent: 'I agree that my data is used for this recruitment and kept for 24 months at most. I can ask for its deletion at any time.',
    send: 'Send my application', sending: 'Sending…', thanks: 'Application sent', thanksText: 'You will receive a confirmation. Keep this link to follow your application:',
    follow: 'Follow my application', share: 'Share on WhatsApp', light: 'Light page: works on 3G', back: 'All jobs',
    track: 'Your application', received: 'Application received', inReview: 'Being reviewed', decision: 'Decision', hired: 'Congratulations, you have been selected!', closed: 'The process is over. Thank you for applying.',
    hello: 'Hello', for: 'Position:', on: 'on', dup: 'You had already applied: your CV has been updated.',
  },
};

export function useLang() {
  const initial = new URLSearchParams(window.location.search).get('lang') || (navigator.language?.startsWith('en') ? 'en' : 'fr');
  const [lang, setLang] = useState(initial === 'en' ? 'en' : 'fr');
  return [lang, setLang, T[lang]];
}

export function PubTop({ company, lang, setLang }) {
  return (
    <div className="pub-top">
      <span className="co">{company?.name?.[0] ?? '·'}</span>
      <div><b>{company?.name}</b><span>{company?.city}</span></div>
      <div className="lang-sw">{['fr', 'en'].map((l) => <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}</div>
    </div>
  );
}

export const Footer = ({ t }) => <div className="footer-note">{t.light} · propulsé par <b>bolo.</b></div>;
