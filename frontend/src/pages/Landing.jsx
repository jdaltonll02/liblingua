import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StatsWidget from '../components/StatsWidget';
import { listResearchers } from '../api/researchers';
import { getLanguages } from '../api/languages';
import { useLanguages, LANGUAGES as FALLBACK_LANGUAGES } from '../components/LanguageSelector';

const LANG_META = {
  kpelle: { region: 'North-Central Liberia', speakers: '~487,000' },
  bassa:  { region: 'Central Liberia',       speakers: '~347,000' },
  grebo:  { region: 'South-Eastern Liberia', speakers: '~387,000' },
  vai:    { region: 'Western Liberia',       speakers: '~104,000' },
  mende:  { region: 'Central Liberia',       speakers: '~178,000' },
  loma:   { region: 'Northern Liberia',      speakers: '~280,000' },
  krahn:  { region: 'Eastern Liberia',       speakers: '~150,000' },
  dan:    { region: 'Nimba County',          speakers: '~350,000' },
};

const STEPS = [
  {
    n: '01',
    title: 'Create Your Account',
    desc: 'Register with your email or sign in with Google or GitHub. Tell us your native language, dialect, and region of origin so we can attribute your contribution correctly.',
  },
  {
    n: '02',
    title: 'Translate Sentences',
    desc: 'We serve you English sentences from health, legal, education, news, and everyday conversation domains. Type your translation — and optionally record audio.',
  },
  {
    n: '03',
    title: 'Build the Open Dataset',
    desc: 'Each sentence needs 3 independent translations. Once validated, it\'s added to our open corpus and exported in HuggingFace, CSV, and JSON formats.',
  },
];

const DOMAINS = [
  { name: 'Health', icon: '🏥', desc: 'Medical advice, disease prevention, maternal care' },
  { name: 'Legal',  icon: '⚖️', desc: 'Rights, court procedures, civic information' },
  { name: 'Education', icon: '📚', desc: 'Learning, literacy, school administration' },
  { name: 'News',   icon: '📰', desc: 'Current events, community reporting' },
  { name: 'Conversational', icon: '💬', desc: 'Everyday phrases and dialogue' },
  { name: 'General', icon: '🌍', desc: 'General knowledge and broad topics' },
];

function SupportedLanguagesSection() {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    getLanguages()
      .then((res) => setLanguages(res.data.filter((l) => l.is_active)))
      .catch(() => {});
  }, []);

  const list = languages.length > 0
    ? languages
    : Object.entries(LANG_META).map(([value, meta]) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1), ...meta }));

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {list.map((lang) => {
        const meta = LANG_META[lang.value] || {};
        return (
          <div key={lang.value}
            className="bg-white border border-gray-200 p-5 hover:border-liberia-red transition-colors">
            <div className="text-lg font-bold text-liberia-blue mb-1">{lang.label}</div>
            {meta.region   && <div className="text-xs text-gray-400 mb-2">{meta.region}</div>}
            {meta.speakers && <div className="text-xs font-semibold text-liberia-red">{meta.speakers} speakers</div>}
          </div>
        );
      })}
    </div>
  );
}

function ResearchersSection() {
  const [researchers, setResearchers] = useState([]);

  useEffect(() => {
    listResearchers()
      .then((res) => setResearchers(res.data.data))
      .catch(() => {});
  }, []);

  if (researchers.length === 0) return null;

  return (
    <section id="researchers" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="section-rule" />
        <h2 className="text-4xl font-black text-liberia-blue mb-2">Research Team</h2>
        <p className="text-gray-500 mb-10">
          Meet the researchers building NLP resources for Liberia's indigenous languages.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {researchers.map((r) => (
            <div key={r.id} className="flex flex-col items-center text-center p-6 border border-gray-100 rounded-2xl hover:border-liberia-red transition-colors">
              {r.photo_url ? (
                <img
                  src={r.photo_url.startsWith('uploads/') ? `/${r.photo_url}` : r.photo_url}
                  alt={r.name}
                  className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-gray-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-liberia-blue flex items-center justify-center mb-4 text-white text-3xl font-black">
                  {r.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="font-bold text-liberia-blue text-lg mb-0.5">{r.name}</h3>
              {r.affiliation && (
                <p className="text-sm text-gray-500 mb-3">{r.affiliation}</p>
              )}
              {r.researcher_bio && (
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{r.researcher_bio}</p>
              )}
              <div className="flex items-center gap-3 mt-auto">
                {r.orcid_id && (
                  <a
                    href={`https://orcid.org/${r.orcid_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-600 transition-colors font-mono"
                    title="ORCID"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.947.947 0 0 1 0-1.894zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.016-5.325 5.016h-3.919V7.416zm1.444 1.303v7.444h2.297c2.359 0 3.9-1.856 3.9-3.722 0-2.016-1.566-3.722-3.9-3.722h-2.297z"/>
                    </svg>
                    {r.orcid_id}
                  </a>
                )}
                {r.linkedin_url && (
                  <a
                    href={r.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="LinkedIn"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const apiLangs = useLanguages();
  const langCount = apiLangs.length > 0 ? apiLangs.length : FALLBACK_LANGUAGES.length;

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-liberia-blue text-white py-24 px-4 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(196,18,48,0.15) 0%, transparent 60%)',
          }}
        />
        <div className="max-w-5xl mx-auto relative">
          <span className="inline-block bg-liberia-red text-white text-xs font-bold px-4 py-1.5 rounded mb-6 uppercase tracking-widest">
            Open NLP Research · Liberia
          </span>
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 max-w-3xl">
            Preserving Liberia's<br />
            <span className="text-liberia-red">Languages</span> Through AI
          </h1>
          <p className="text-gray-300 text-lg mb-10 max-w-2xl leading-relaxed">
            Large Language Models (LLMs) like ChatGPT and Claude cannot understand low-resource languages. There are 18 languages spoken in Liberia. 16 are official Liberian languages. Fulani is not an official language but it is widely spoken. Kolokwa is a street language, and it is also known as local Liberian English. The key challenge here is, there is no publicly available dataset in low-resource Liberian Languages for NLP research.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/auth?tab=register"
              className="bg-liberia-red hover:bg-red-800 text-white font-bold px-8 py-3.5 rounded text-base transition-colors"
            >
              Become a Contributor
            </Link>
            <a
              href="#about"
              className="border border-white/30 hover:bg-white/10 text-white font-bold px-8 py-3.5 rounded text-base transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* ── Compact stats ticker ──────────────────────────────────────────── */}
      <section className="bg-liberia-red text-white py-4 px-4">
        <StatsWidget variant="ticker" />
      </section>

      {/* ── About / Mission ───────────────────────────────────────────────── */}
      <section id="about" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="section-rule" />
            <h2 className="text-4xl font-black text-liberia-blue mb-5 leading-tight">
              Why This Dataset Matters
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Liberia's indigenous languages are severely underrepresented in digital
              infrastructure. There are no publicly available dataset. Dataset can be easily built when the texts and audio of a language are available online or when the text is available in a hard copy. The purpose of this research is to build the dataset from scratch. 
            </p>
            <p className="text-gray-600 leading-relaxed">
              This platform crowdsources parallel text from native speakers — producing
              a richly annotated corpus for machine translation, language modeling,
              text classification, and question-answering research.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { v: String(langCount), l: 'Languages' },
              { v: '6',    l: 'Domains' },
              { v: '3×',   l: 'Validated per Sample' },
              { v: '100%', l: 'Open Access' },
            ].map((s) => (
              <div key={s.l} className="border border-gray-200 p-6">
                <div className="text-4xl font-black text-liberia-red mb-1">{s.v}</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Supported Languages ───────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="section-rule" />
          <h2 className="text-4xl font-black text-liberia-blue mb-2">Supported Languages</h2>
          <p className="text-gray-500 mb-10">
            Contribute translations for any of these indigenous Liberian languages.
          </p>
          <SupportedLanguagesSection />
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="section-rule" />
          <h2 className="text-4xl font-black text-liberia-blue mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="text-7xl font-black leading-none mb-3" style={{ color: 'rgba(196,18,48,0.12)' }}>
                  {s.n}
                </div>
                <h3 className="text-xl font-bold text-liberia-blue mb-3">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Domain Coverage ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="section-rule" />
          <h2 className="text-4xl font-black text-liberia-blue mb-2">Corpus Domains</h2>
          <p className="text-gray-500 mb-10">
            Sentences are drawn from six real-world domains to maximise the dataset's utility for downstream NLP tasks.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOMAINS.map((d) => (
              <div key={d.name} className="bg-white border border-gray-200 p-5 flex gap-4 items-start">
                <span className="text-2xl mt-0.5">{d.icon}</span>
                <div>
                  <div className="font-bold text-liberia-blue mb-1">{d.name}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{d.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Stats ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-liberia-blue">
        <div className="max-w-5xl mx-auto">
          <div className="section-rule" />
          <h2 className="text-4xl font-black text-white mb-2">Live Contribution Stats</h2>
          <p className="text-gray-400 mb-10">Updated in real time as contributors submit translations.</p>
          <StatsWidget variant="dark" />
        </div>
      </section>

      {/* ── Researchers ──────────────────────────────────────────────────────── */}
      <ResearchersSection />

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-liberia-red text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-black mb-4">Ready to Make History?</h2>
          <p className="text-red-100 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            It takes less than 5 minutes to contribute your first translation. Every
            sentence brings us closer to language equity for West Africa.
          </p>
          <Link
            to="/auth?tab=register"
            className="inline-block bg-white text-liberia-red hover:bg-gray-100 font-black px-10 py-4 rounded text-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-liberia-blue text-gray-400 py-10 px-4 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8 text-sm">
            <div>
              <img src="/logo_black.svg" alt="liblingua" className="h-10 w-auto mb-3" />
              <p className="leading-relaxed">Open-source crowdsourced NLP dataset for eight Liberian languages. HuggingFace compatible.</p>
            </div>
            <div>
              <div className="font-bold text-white mb-3">Resources</div>
              <ul className="space-y-1.5">
                <li><Link to="/faq"          className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/contributors" className="hover:text-white transition-colors">Contributors</Link></li>
                <li><a href="#researchers"   className="hover:text-white transition-colors">Researchers</a></li>
                <li><Link to="/funding"      className="hover:text-white transition-colors">Support the Project</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-white mb-3">Get Involved</div>
              <ul className="space-y-1.5">
                <li><Link to="/auth?tab=register" className="hover:text-white transition-colors">Become a Contributor</Link></li>
                <li><Link to="/contact"           className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="/funding"           className="hover:text-white transition-colors">Donate</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} liblingua. Creating data for open research.</p>
            <p>Built for NLP research · HuggingFace compatible</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
