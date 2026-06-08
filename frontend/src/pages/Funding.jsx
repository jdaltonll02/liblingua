import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const USES = [
  { icon: '🖥️', title: 'Infrastructure',      desc: 'Servers, storage, and database costs to keep the platform running 24/7.' },
  { icon: '🎙️', title: 'Audio Recording',      desc: 'Equipment and stipends for professional native-speaker audio recording sessions.' },
  { icon: '🎓', title: 'Expert Annotation',    desc: 'Compensation for linguist reviewers who validate and gold-standard translation quality.' },
  { icon: '📢', title: 'Community Outreach',   desc: 'Reaching Liberian diaspora communities and universities to recruit contributors.' },
  { icon: '🔬', title: 'Research Publication', desc: 'Open-access publishing fees so our dataset papers reach the global NLP community.' },
  { icon: '⚙️', title: 'Platform Development', desc: 'Engineering time to improve tooling, accessibility, and export capabilities.' },
];


const PARTNERS = [
  { type: 'Universities & Research Labs', desc: 'We partner with academic institutions to co-author papers, share raw data, and host annotation sprints.' },
  { type: 'NGOs & Foundations',           desc: 'Grant funding goes directly to linguist stipends, community outreach, and infrastructure.' },
  { type: 'Tech Companies',               desc: 'Corporate sponsors receive dataset licensing for commercial use, acknowledgement, and co-branding opportunities.' },
];

export default function Funding() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-liberia-blue text-white py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-black mb-4">Support This Project</h1>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">
            Preserving Liberia's languages is a public good. Your support keeps the platform running,
            pays expert linguists, and ensures this data stays open and free for researchers worldwide.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/donate"
              className="bg-liberia-red hover:bg-red-700 text-white font-black px-10 py-3.5 rounded-lg transition-colors text-lg"
            >
              💳 Donate Now
            </Link>
            <Link
              to="/contact?category=FUNDING"
              className="border-2 border-white hover:bg-white/10 text-white font-black px-8 py-3 rounded-lg transition-colors"
            >
              Institutional Enquiry
            </Link>
          </div>
        </div>
      </section>

      {/* How funds are used */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-2">How Your Support Is Used</h2>
            <p className="text-gray-500">Every dollar goes directly toward building the dataset and growing the community.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {USES.map(u => (
              <div key={u.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="text-3xl mb-3">{u.icon}</div>
                <h3 className="font-black text-gray-800 mb-1">{u.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Institutional partners */}
      <section className="py-16 px-4 bg-liberia-blue text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-2">Institutional Partnerships</h2>
            <p className="text-gray-300">Looking to fund, collaborate, or integrate our data into your research?</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {PARTNERS.map(p => (
              <div key={p.type} className="bg-white/10 rounded-xl p-5">
                <h3 className="font-black text-white mb-2">{p.type}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              to="/contact"
              className="inline-block bg-white text-liberia-blue hover:bg-gray-100 font-black px-10 py-3 rounded-lg transition-colors"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-liberia-blue border-t border-white/10 text-gray-500 py-6 px-4 text-sm text-center">
        <p>liblingua · <Link to="/faq" className="hover:text-white">FAQ</Link> · <Link to="/contact" className="hover:text-white">Contact</Link> · <Link to="/funding" className="hover:text-white">Support Us</Link></p>
      </footer>
    </div>
  );
}
