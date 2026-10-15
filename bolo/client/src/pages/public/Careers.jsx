import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, FileText, CalendarClock } from 'lucide-react';
import { useLang, PubTop, Footer } from './i18n.jsx';

export default function Careers() {
  const { company } = useParams();
  const [lang, setLang, t] = useLang();
  const [data, setData] = useState(null);
  useEffect(() => { fetch(`/api/public/${company}/jobs`).then((r) => r.json()).then(setData); }, [company]);
  return (
    <div className="pub">
      <PubTop company={data?.company} lang={lang} setLang={setLang} />
      <div className="pub-body">
        <h1>{t.jobs}</h1>
        <p className="muted" style={{ marginTop: 0 }}>{data ? t.open(data.jobs.length) : ' '}</p>
        {data?.jobs.map((j) => (
          <Link key={j.slug} to={`/carrieres/${company}/${j.slug}?lang=${lang}`} className="job-li">
            <b>{j.title}</b>
            <div className="meta"><span><MapPin />{j.location}</span><span><FileText />{j.contract_type}</span>
              {j.deadline && <span><CalendarClock />{t.until} {new Date(j.deadline).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' })}</span>}</div>
          </Link>
        ))}
      </div>
      <Footer t={t} />
    </div>
  );
}
