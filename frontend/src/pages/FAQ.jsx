import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const FAQS = [
  {
    section: 'About the Project',
    items: [
      {
        q: 'What is liblingua?',
        a: 'liblingua is a crowdsourced platform for building machine-readable translation datasets for eight Liberian languages — Kpelle, Bassa, Grebo, Vai, Mende, Loma, Krahn, and Dan (Gio). The goal is to create high-quality bilingual corpora that enable NLP researchers to build translation models, language tools, and AI systems for West African languages that are currently under-resourced.',
      },
      {
        q: 'Why does this matter?',
        a: 'Over 95% of the world\'s languages have little to no digital representation. Liberia\'s indigenous languages are spoken by millions of people but are almost entirely absent from AI systems, search engines, and translation tools. This project helps close that gap by creating the training data these systems need.',
      },
      {
        q: 'Who is behind this project?',
        a: 'The project is led by a team of Liberian linguists, NLP researchers, and software engineers. It is open-source and community-driven. The data is released under an open license for research and educational use.',
      },
      {
        q: 'Is the dataset publicly available?',
        a: 'Yes. Validated translations are published in HuggingFace-compatible JSONL format and can be downloaded freely. You can also access exports in CSV and JSON formats from the platform.',
      },
    ],
  },
  {
    section: 'Contributing Translations',
    items: [
      {
        q: 'Who can contribute translations?',
        a: 'Anyone who speaks one of the eight target languages can contribute. We especially value contributions from native speakers (L1 speakers), but fluent second-language speakers are also welcome. You must create a free account to start contributing.',
      },
      {
        q: 'How do I get started?',
        a: 'Create an account, select your native language, and visit the Translate page. You\'ll be shown English sentences one at a time and asked to write the translation in your chosen language. You can also record your spoken translation as audio.',
      },
      {
        q: 'Can I translate into multiple languages?',
        a: 'Yes. You can switch the target language at any time on the Translate page. Each language is tracked independently.',
      },
      {
        q: 'What are dialects, and should I specify one?',
        a: 'Many Liberian languages have regional dialects — for example, Central Kpelle vs. Western Kpelle. If your translation reflects a specific dialect, please enter it in the dialect field. This metadata is valuable for researchers studying linguistic variation.',
      },
      {
        q: 'What happens if I make a mistake in my translation?',
        a: 'Each sentence receives up to three independent translations from different contributors. Administrators and expert reviewers compare translations and assign quality scores. Lower-quality translations are flagged but kept in the dataset for research purposes, clearly marked with their quality score.',
      },
    ],
  },
  {
    section: 'Quality & Validation',
    items: [
      {
        q: 'How are translations validated?',
        a: 'Translations are reviewed by admin-level adjudicators who assign a quality score between 0 and 1. A score above 0.4 is considered acceptable; below that, a small reputation penalty is applied. Gold standard samples (reference translations from expert linguists) are also used to silently benchmark new contributions.',
      },
      {
        q: 'What is the reputation system?',
        a: 'Each contributor starts with a reputation score of 1.0. Every validated translation adds 0.1 to your score (up to a cap of 5.0). Rejected translations (quality score below 0.4) subtract 0.05. Higher reputation scores help identify trusted contributors.',
      },
      {
        q: 'Why does a sample stop appearing after 3 translations?',
        a: 'Each English sample is locked once it has received 3 translations in a given language. This ensures diversity — three independent translations allow researchers to measure inter-annotator agreement and select the best version. The same sample can still receive 3 translations in each of the other 7 languages independently.',
      },
    ],
  },
  {
    section: 'Technical & Data',
    items: [
      {
        q: 'What file formats can I export?',
        a: 'Authenticated users can export the dataset as CSV, JSON, or HuggingFace JSONL. The JSONL format includes all metadata fields (language, dialect, domain, difficulty, contributor demographics, quality scores, audio paths) and is directly compatible with the HuggingFace datasets library.',
      },
      {
        q: 'Can I access the data programmatically?',
        a: 'Yes. From your Dashboard you can generate API keys for programmatic access. API keys can be included in requests using the Authorization: Bearer <key> header.',
      },
      {
        q: 'Is audio data available?',
        a: 'Contributors can optionally record spoken translations using the built-in audio recorder on the Translate page. When audio is submitted, it is stored and included in the export under audio_target_path. English reference audio can also be uploaded by administrators.',
      },
    ],
  },
  {
    section: 'Privacy & Accounts',
    items: [
      {
        q: 'What personal data do you collect?',
        a: 'We collect your name, email, native language, region of origin, age group, and L1 speaker status. This demographic metadata is attached to your translations to help researchers understand the contributor pool. Your email is never published publicly.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Contact us via the support form and we will delete your account and anonymise your translation records. Anonymised translations remain in the dataset but are no longer linked to your profile.',
      },
      {
        q: 'Is my password secure?',
        a: 'Passwords are hashed using bcrypt with 12 salt rounds before storage. We never store plaintext passwords. You can also sign in with Google or GitHub to avoid password management entirely.',
      },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-4 flex items-start justify-between gap-4 group"
      >
        <span className="font-semibold text-gray-800 group-hover:text-liberia-blue transition-colors text-sm md:text-base">
          {q}
        </span>
        <span className={`text-liberia-red text-lg font-bold flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {open && (
        <p className="pb-4 text-gray-600 text-sm leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-liberia-blue text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-black mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-300 text-lg">
            Everything you need to know about contributing, quality, and the dataset.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto space-y-10">
          {FAQS.map((section) => (
            <div key={section.section}>
              <h2 className="text-lg font-black text-liberia-red uppercase tracking-widest mb-4">
                {section.section}
              </h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6">
                {section.items.map((item) => (
                  <AccordionItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white border-t border-gray-200 py-12 px-4 text-center">
        <p className="text-gray-600 mb-4">Still have questions?</p>
        <Link
          to="/contact"
          className="inline-block bg-liberia-red hover:bg-red-800 text-white font-bold px-8 py-3 rounded-lg transition-colors"
        >
          Contact Us
        </Link>
      </section>

      <footer className="bg-liberia-blue text-gray-500 py-6 px-4 text-sm text-center">
        <p>liblingua · <Link to="/faq" className="hover:text-white">FAQ</Link> · <Link to="/contact" className="hover:text-white">Contact</Link> · <Link to="/funding" className="hover:text-white">Support Us</Link></p>
      </footer>
    </div>
  );
}
