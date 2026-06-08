import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatsWidget from '../components/StatsWidget';

const LANGUAGES = [
  { name: 'Kpelle',    region: 'North-Central Liberia', speakers: '~487,000' },
  { name: 'Bassa',     region: 'Central Liberia',       speakers: '~347,000' },
  { name: 'Grebo',     region: 'South-Eastern Liberia', speakers: '~387,000' },
  { name: 'Vai',       region: 'Western Liberia',       speakers: '~104,000' },
  { name: 'Mende',     region: 'Central Liberia',       speakers: '~178,000' },
  { name: 'Loma',      region: 'Northern Liberia',      speakers: '~280,000' },
  { name: 'Krahn',     region: 'Eastern Liberia',       speakers: '~150,000' },
  { name: 'Dan (Gio)', region: 'Nimba County',          speakers: '~350,000' },
];

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

export default function Landing() {
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
            Open NLP Research · West Africa
          </span>
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 max-w-3xl">
            Preserving Liberia's<br />
            <span className="text-liberia-red">Languages</span> Through AI
          </h1>
          <p className="text-gray-300 text-lg mb-10 max-w-2xl leading-relaxed">
            The world's first open machine-translation dataset for Liberian indigenous
            languages — built by native speakers, for the next generation of NLP research.
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
              infrastructure. With fewer than a handful of documented NLP resources,
              over two million Liberians who speak these languages as their primary tongue
              are invisible to modern AI systems.
            </p>
            <p className="text-gray-600 leading-relaxed">
              This platform crowdsources parallel text from native speakers — producing
              a richly annotated corpus for machine translation, language modeling,
              text classification, and question-answering research.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { v: '8',    l: 'Languages' },
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
            Contribute translations for any of these eight indigenous Liberian languages.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.name}
                className="bg-white border border-gray-200 p-5 hover:border-liberia-red transition-colors"
              >
                <div className="text-lg font-bold text-liberia-blue mb-1">{lang.name}</div>
                <div className="text-xs text-gray-400 mb-2">{lang.region}</div>
                <div className="text-xs font-semibold text-liberia-red">{lang.speakers} speakers</div>
              </div>
            ))}
          </div>
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
            Get Started — It's Free
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-liberia-blue text-gray-400 py-10 px-4 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8 text-sm">
            <div>
              <div className="font-black text-white mb-3 tracking-tight">liblingua</div>
              <p className="leading-relaxed">Open-source crowdsourced NLP dataset for eight Liberian languages. HuggingFace compatible.</p>
            </div>
            <div>
              <div className="font-bold text-white mb-3">Resources</div>
              <ul className="space-y-1.5">
                <li><Link to="/faq"          className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/contributors" className="hover:text-white transition-colors">Contributors</Link></li>
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
            <p>© {new Date().getFullYear()} liblingua. Open data for open research.</p>
            <p>Built for NLP research · HuggingFace compatible</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
