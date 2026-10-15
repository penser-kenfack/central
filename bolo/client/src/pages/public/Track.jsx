import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useLang, PubTop, Footer } from './i18n.jsx';

export default function Track() {
  const { token } = useParams();
  const [lang, setLang, t] = useLang();
  const [a, setA] = useState(null);
  useEffect(() => { fetch(`/api/public/track/${token}`).then((r) => r.json()).then((d) => { setA(d); if (!new URLSearchParams(window.location.search).get('lang')) setLang(d.language); }); }, [token]);
  if (!a) return <div className="pub" />;
  const order = ['received', 'in_review', 'decision'];
  const at = a.step === 'received' ? 0 : a.step === 'in_review' ? 1 : 2;
  const steps = [[t.received, new Date(a.appliedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' })], [t.inReview, ''], [t.decision, a.step === 'hired' ? t.hired : a.step === 'closed' ? t.closed : '']];
  return (
    <div className="pub">
      <PubTop company={{ name: a.company, city: '' }} lang={lang} setLang={setLang} />
      <div className="pub-body">
        <p className="muted" style={{ margin: 0 }}>{t.hello} {a.name},</p>
        <h1>{t.track}</h1>
        <p style={{ marginTop: 0 }}>{t.for} <b>{a.job}</b></p>
        <div className="card card-b track-steps">
          {steps.map(([label, sub], i) => (
            <div key={order[i]} className={`track-step ${i < at || (i === at && i === 2) ? 'done' : i === at ? 'now' : ''}`}>
              <i>{(i < at || (i === 2 && at === 2)) && <Check />}</i><div><b>{label}</b><span>{sub}</span></div>
            </div>
          ))}
        </div>
      </div>
      <Footer t={t} />
    </div>
  );
}
