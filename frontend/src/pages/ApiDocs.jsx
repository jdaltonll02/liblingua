import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

// ── Helpers ───────────────────────────────────────────────────────────────────

const METHOD_COLORS = {
  GET:    'bg-blue-100 text-blue-700',
  POST:   'bg-green-100 text-green-700',
  PATCH:  'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-600',
};

function Code({ children, block = false }) {
  const [copied, setCopied] = useState(false);
  if (!block) return <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono text-xs">{children}</code>;
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed">{children}</pre>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 text-xs bg-gray-700 text-gray-300 hover:text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Note({ children, type = 'info' }) {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warn:    'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    tip:     'bg-liberia-red/5 border-liberia-red/30 text-gray-700',
  };
  const icons = { info: 'ℹ️', warn: '⚠️', success: '✅', tip: '💡' };
  return (
    <div className={`border rounded-xl p-4 text-sm ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>{children}
    </div>
  );
}

function H2({ children }) {
  return <h2 className="text-2xl font-black text-gray-900 mb-1 mt-2">{children}</h2>;
}

function H3({ children }) {
  return <h3 className="text-base font-black text-gray-800 mb-2 mt-6">{children}</h3>;
}

function P({ children }) {
  return <p className="text-sm text-gray-600 leading-relaxed">{children}</p>;
}

function Step({ number, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-liberia-red text-white flex items-center justify-center text-sm font-black">
        {number}
      </div>
      <div className="flex-1 pb-6">
        <p className="font-black text-gray-800 mb-1">{title}</p>
        <div className="text-sm text-gray-600 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false);
  const BASE = window.location.origin;
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-left transition-colors">
        <span className={`text-xs font-black px-2 py-0.5 rounded font-mono flex-shrink-0 ${METHOD_COLORS[ep.method] || 'bg-gray-100 text-gray-600'}`}>
          {ep.method}
        </span>
        <code className="font-mono text-sm text-gray-800 flex-1 truncate">{ep.path}</code>
        {ep.auth && (
          <span className="text-xs text-gray-400 flex-shrink-0">
            🔒 {ep.adminOnly ? 'Admin' : 'Auth required'}
          </span>
        )}
        <span className="text-gray-400 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4">
          <P>{ep.desc}</P>
          {ep.note && <Note type="info">{ep.note}</Note>}
          {ep.params && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Query Parameters</p>
              <Code block>{JSON.stringify(ep.params, null, 2)}</Code>
            </div>
          )}
          {ep.body && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Request Body</p>
              <Code block>{JSON.stringify(ep.body, null, 2)}</Code>
            </div>
          )}
          {ep.response && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Response</p>
              <Code block>{typeof ep.response === 'string' ? ep.response : JSON.stringify(ep.response, null, 2)}</Code>
            </div>
          )}
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">curl Example</p>
            <Code block>{
              ep.method === 'GET'
                ? `curl -H "Authorization: ApiKey YOUR_KEY" \\\n  "${BASE}${ep.path}"`
                : `curl -X ${ep.method} \\\n  -H "Authorization: ApiKey YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(ep.body || {}).slice(0, 100)}' \\\n  "${BASE}${ep.path}"`
            }</Code>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar navigation ────────────────────────────────────────────────────────

const NAV = [
  { group: '📖 Contributor Guide', items: [
    { id: 'guide-start',    label: 'Getting Started' },
    { id: 'guide-translate',label: 'How to Translate' },
    { id: 'guide-audio',    label: 'Audio Recording' },
    { id: 'guide-quality',  label: 'Quality & Badges' },
    { id: 'guide-campaigns',label: 'Campaigns' },
  ]},
  { group: '⚡ Developer Reference', items: [
    { id: 'dev-overview',   label: 'Overview' },
    { id: 'dev-sdk',        label: 'liblingua SDK' },
    { id: 'dev-auth',       label: 'Authentication' },
    { id: 'dev-samples',    label: 'Samples' },
    { id: 'dev-translations',label: 'Translations' },
    { id: 'dev-export',     label: 'Export' },
    { id: 'dev-campaigns',  label: 'Campaigns API' },
    { id: 'dev-badges',     label: 'Badges API' },
    { id: 'dev-stats',      label: 'Stats' },
  ]},
];

const LANGUAGES = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];

// ── API endpoint data ─────────────────────────────────────────────────────────

const ENDPOINTS = {
  'dev-auth': [
    { method: 'POST', path: '/api/auth/register', desc: 'Register a new contributor account.',
      auth: false,
      body: { name: 'string', email: 'string', password: 'string (min 8 chars, upper+lower+digit)', native_language: 'string', region_of_origin: 'string', age_group: 'under_18|18_35|36_55|56_plus', is_l1_speaker: 'boolean' },
      response: { contributor: '{ id, name, email, role, … }', message: 'string' } },
    { method: 'POST', path: '/api/auth/login', desc: 'Log in and receive a session cookie.',
      auth: false,
      body: { email: 'string', password: 'string' },
      response: { contributor: '{ id, name, email, role, reputation_score }' } },
    { method: 'GET', path: '/api/auth/me', desc: 'Return the authenticated contributor profile.', auth: true,
      response: { id: 'uuid', name: 'string', email: 'string', role: 'CONTRIBUTOR|ADMIN|SUPER_ADMIN', reputation_score: 'float 0–5', email_verified: 'boolean', is_profile_complete: 'boolean' } },
    { method: 'POST', path: '/api/auth/logout', desc: 'Clear the session cookie.', auth: true,
      response: { message: 'Logged out' } },
    { method: 'POST', path: '/api/auth/change-email', desc: 'Request an email address change. In dev mode (no SMTP) the change is immediate; in production a verification link is sent to the new address.', auth: true,
      body: { email: 'string — new email address' } },
    { method: 'POST', path: '/api/auth/change-password', desc: 'Change account password.', auth: true,
      body: { current_password: 'string', new_password: 'string (min 8 chars)' } },
  ],
  'dev-samples': [
    { method: 'GET', path: '/api/samples/random?language=kpelle',
      desc: 'Fetch a randomly selected English sentence for translation. Applies domain-weighted sampling — underrepresented domains surface more often. 5% of responses are gold standard samples for quality benchmarking.',
      auth: true,
      params: { language: `Required. One of: ${LANGUAGES.join(', ')}` },
      response: { id: 'uuid', text: 'string', domain: 'health|legal|education|news|conversational|general', difficulty: 'easy|medium|hard', audio_path: 'string|null' },
      note: 'is_gold_standard is stripped — contributors cannot detect gold checks.' },
    { method: 'GET', path: '/api/samples/progress?language=kpelle',
      desc: 'Return completion statistics for a language.', auth: true,
      params: { language: 'Required.' },
      response: { total: 'int', locked: 'int — sentences with 3 translations', remaining: 'int', language: 'string' } },
    { method: 'POST', path: '/api/samples',
      desc: 'Add a single English source sentence. Admin only.', auth: true, adminOnly: true,
      body: { text: 'string', domain: 'general|health|legal|education|news|conversational', difficulty: 'easy|medium|hard', audio_path: 'string (optional)', is_gold_standard: 'boolean (optional, default false)' } },
    { method: 'POST', path: '/api/samples/bulk',
      desc: 'Bulk-import sentences from a JSON array or CSV body. Validates each row and reports per-row errors without stopping. Admin only.', auth: true, adminOnly: true,
      body: { samples: '[{ text, domain, difficulty, audio_path?, is_gold_standard? }]' },
      response: { created: 'int', skipped_duplicates: 'int', submitted: 'int', invalid_rows: 'int (optional)', row_errors: '[{ row, error }] (optional)' } },
  ],
  'dev-translations': [
    { method: 'POST', path: '/api/translations',
      desc: 'Submit a translation. Accepts multipart/form-data so spoken audio can be attached. Atomically increments the per-language translation count and locks the sample when it reaches 3.',
      auth: true,
      body: { sample_id: 'UUID', target_language: 'string', translated_text: 'string (max 5000 chars)', dialect: 'string (optional)', audio: 'File — WAV/MP3/WebM spoken translation (optional)', english_audio: 'File — spoken English reading (optional)' },
      response: { translation: '{ id, sample_id, target_language, translated_text, audio_path, … }', lang_count_after: 'int', sample_locked: 'boolean' } },
    { method: 'GET', path: '/api/translations',
      desc: 'List translations with optional filters. Returns all fields including audio paths.', auth: true,
      params: { language: 'Filter by target language', has_audio: 'true|false — audio presence filter', sample_id: 'Filter by specific sample UUID', page: 'int (default 1)', limit: 'int (max 200, default 50)' },
      response: { data: '[Translation]', meta: '{ total, page, limit, pages }' } },
    { method: 'GET', path: '/api/translations/mine',
      desc: 'List the authenticated contributor\'s own submissions.', auth: true,
      response: { data: '[Translation]', meta: '{ total, page, limit, pages }' } },
    { method: 'PATCH', path: '/api/translations/:id/validate',
      desc: 'Validate or reject a translation. A quality score is required when validating. Adjusting a score triggers an atomic reputation update on the contributor (+0.1 for accepted, −0.05 for rejected). Admin only.',
      auth: true, adminOnly: true,
      body: { is_validated: 'boolean', quality_score: 'float 0–1 (required when is_validated=true)' } },
  ],
  'dev-export': [
    { method: 'GET', path: '/api/export/csv?language=kpelle',
      desc: 'Export translations as a downloadable CSV file. Preprocessed by default — includes train/val/test split tag, ISO 639-3 language codes, normalised text, and absolute audio URLs. Pass raw=true for exact DB values.',
      auth: true,
      params: { language: 'Required', validated_only: 'true — only validated translations', min_quality: 'float 0–1 — minimum quality score threshold', raw: 'true — disable all preprocessing, return original DB values' },
      note: 'Rate limited to 20 requests/hour. Returns a file attachment.' },
    { method: 'GET', path: '/api/export/json?language=kpelle',
      desc: 'Export as paginated JSON. Each page is a standalone response with a meta block describing preprocessing applied.',
      auth: true,
      params: { language: 'Required', validated_only: 'true', min_quality: 'float 0–1', raw: 'true — raw mode', page: 'int', limit: 'int (max 1000)' } },
    { method: 'GET', path: '/api/export/huggingface?language=kpelle',
      desc: 'Export as streamed JSONL (one JSON object per line). This is the recommended format for training — compatible with HuggingFace datasets, PyTorch DataLoader, and any line-delimited JSON reader.',
      auth: true,
      params: { language: 'Required', validated_only: 'true', min_quality: 'float 0–1', raw: 'true — raw mode' },
      note: 'Load directly: from datasets import load_dataset; ds = load_dataset("json", data_files="kpelle.jsonl")' },
  ],
  'dev-campaigns': [
    { method: 'GET', path: '/api/campaigns', desc: 'List all campaigns with live progress counts.', auth: false,
      params: { status: 'ACTIVE|UPCOMING|COMPLETED|CANCELLED', language: 'Filter by language' },
      response: '[{ id, title, language, domain, goal, progress, pct, derived_status, start_date, end_date, creator }]' },
    { method: 'GET', path: '/api/campaigns/:id', desc: 'Get a single campaign with full detail.', auth: false },
    { method: 'POST', path: '/api/campaigns', desc: 'Create a campaign. Admin only.', auth: true, adminOnly: true,
      body: { title: 'string', language: 'string', goal: 'int', start_date: 'ISO date', end_date: 'ISO date', description: 'string (optional)', domain: 'string (optional)', badge_slug: 'string (optional)' } },
    { method: 'PATCH', path: '/api/campaigns/:id', desc: 'Update campaign fields. Admin only.', auth: true, adminOnly: true,
      body: { title: 'string?', goal: 'int?', start_date: 'date?', end_date: 'date?', is_active: 'boolean?' } },
    { method: 'DELETE', path: '/api/campaigns/:id', desc: 'Delete a campaign. Admin only.', auth: true, adminOnly: true },
  ],
  'dev-badges': [
    { method: 'GET', path: '/api/badges/definitions', desc: 'List all badge types with icons and descriptions.', auth: false,
      response: '[{ slug, name, icon, desc }]' },
    { method: 'GET', path: '/api/badges/mine', desc: 'List badges earned by the authenticated contributor.', auth: true,
      response: '[{ id, slug, name, icon, desc, awarded_at }]' },
    { method: 'GET', path: '/api/badges/streak', desc: 'Return the current consecutive-day translation streak.', auth: true,
      response: { streak: 'int — days in a row with at least one translation' } },
    { method: 'GET', path: '/api/badges/contributor/:id', desc: 'List badges for any contributor (public).', auth: false },
  ],
  'dev-stats': [
    { method: 'GET', path: '/api/stats',
      desc: 'Platform-wide statistics. No authentication required.',
      auth: false,
      response: { total_samples: 'int', total_contributors: 'int', total_translations: 'int', total_validated: 'int', audio_recordings: 'int', text_only: 'int', validation_rate: 'int — percent', average_quality_score: 'float|null', per_language: '{ [lang]: { total, validated, locked_samples, audio_count } }', domain_breakdown: '[{ domain, sample_count }]' } },
  ],
};

// ── Content panels ────────────────────────────────────────────────────────────

function GuideStart() {
  return (
    <div className="space-y-6">
      <div>
        <H2>Getting Started as a Contributor</H2>
        <P>This guide walks you through everything you need to know to start contributing translations to the liblingua — from creating your account to submitting your first translation.</P>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-1">
        <Step number="1" title="Create an account">
          <p>Visit <Link to="/auth" className="text-liberia-blue hover:underline font-semibold">/auth</Link> and click <strong>Register</strong>. Fill in:</p>
          <ul className="list-disc ml-5 space-y-1 mt-1">
            <li><strong>Full name</strong> — used on your public contributor card</li>
            <li><strong>Email</strong> — for account verification and notifications</li>
            <li><strong>Password</strong> — at least 8 characters with upper, lower, and a digit</li>
            <li><strong>Native language</strong> — the Liberian language you speak (Kpelle, Bassa, Grebo, Vai, Mende, Loma, Krahn, or Dan)</li>
            <li><strong>Dialect</strong> — optional but highly valuable (e.g. "Central Kpelle", "Sea-side Grebo")</li>
            <li><strong>Region of origin</strong> — the county or region where you grew up speaking the language</li>
            <li><strong>Age group</strong></li>
            <li><strong>L1 speaker</strong> — check this if the language is your mother tongue; L1 contributions carry additional weight in quality analysis</li>
          </ul>
        </Step>
        <Step number="2" title="Verify your email">
          <p>Check your inbox for a verification link. Click it within 24 hours. Without verification you cannot log in. If the link expired, use <strong>Resend verification</strong> on the login page.</p>
        </Step>
        <Step number="3" title="Log in and explore">
          <p>After verifying, log in. You'll land on your <Link to="/dashboard" className="text-liberia-blue hover:underline">Dashboard</Link>, which shows your translation history, reputation score, badges, and earned streak. Use the navigation bar to access all platform features.</p>
        </Step>
        <Step number="4" title="Start translating">
          <p>Click <Link to="/translate" className="text-liberia-blue hover:underline font-semibold">Translate</Link> in the top navigation to open the Translation Workspace. You are ready to contribute.</p>
        </Step>
      </div>

      <Note type="tip">
        You can also sign in with Google or GitHub. After OAuth, you will be prompted to complete your linguistic profile (native language, region, etc.) before you can translate.
      </Note>

      {/* Developer callout */}
      <div className="bg-gray-900 rounded-2xl p-6">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
          Loading data into your code instead?
        </p>
        <pre className="text-green-300 text-sm font-mono leading-relaxed mb-4 overflow-x-auto">{
`from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")
data = client.load("kpelle")`
        }</pre>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => document.querySelector('[data-section="dev-sdk"]')?.click?.()}
            className="text-xs font-bold text-green-400 hover:text-green-200 transition-colors underline">
            Full SDK documentation →
          </button>
          <a href="/dashboard" className="text-xs font-bold text-gray-400 hover:text-white transition-colors underline">
            Generate an API key →
          </a>
        </div>
      </div>
    </div>
  );
}

function GuideTranslate() {
  return (
    <div className="space-y-6">
      <div>
        <H2>How to Translate</H2>
        <P>The Translation Workspace is where you contribute. Here is exactly how it works, step by step.</P>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-1">
        <Step number="1" title="Select your language">
          <p>Use the <strong>Language selector</strong> at the top of the workspace. It defaults to the native language you set in your profile. You can switch to any of the 8 supported languages at any time.</p>
        </Step>
        <Step number="2" title="Enter your dialect (optional but encouraged)">
          <p>If your translation reflects a specific regional dialect — for example "Central Kpelle" or "Sea-side Grebo" — enter it in the dialect field. This is some of the most valuable metadata we collect; it lets researchers build dialect-aware models.</p>
        </Step>
        <Step number="3" title="Read the English source sentence">
          <p>An English sentence is displayed on the left. Read it carefully. If English audio is attached, play it with the audio player beneath the text — this is especially useful for sentences where pronunciation context matters.</p>
          <p>Sentences are drawn from six domains: <strong>health, legal, education, news, conversational,</strong> and <strong>general</strong>. Domains with fewer translations surface more often to maintain a balanced dataset.</p>
        </Step>
        <Step number="4" title="Write your translation">
          <p>Type your translation in the large text field on the right. Guidelines:</p>
          <ul className="list-disc ml-5 space-y-1 mt-1">
            <li>Use the <strong>standard orthography</strong> for your language where one exists</li>
            <li>Preserve the <strong>meaning and register</strong> of the source sentence — do not paraphrase</li>
            <li>For medical or legal sentences, translate the meaning faithfully even if technical terms don't have direct equivalents — use the closest native expression and note it in the dialect field</li>
            <li>Do not translate proper nouns like place names or person names</li>
            <li>Maximum 5,000 characters</li>
          </ul>
        </Step>
        <Step number="5" title="Record spoken audio (optional but encouraged)">
          <p>Click <strong>Record</strong> to record your spoken translation using your device microphone. The platform uses your browser's MediaRecorder API — no app install needed. A clear, natural-pace reading of your written translation is ideal. Audio recordings significantly increase the research value of each entry.</p>
          <p>You can also record a reading of the English source sentence by clicking the English audio record button.</p>
        </Step>
        <Step number="6" title="Submit">
          <p>Click <strong>Submit Translation</strong>. The platform will:</p>
          <ul className="list-disc ml-5 space-y-1 mt-1">
            <li>Save your translation and any audio to the database</li>
            <li>Increment the translation count for that sentence in your language</li>
            <li>Check if the sentence has now reached 3 translations — if so, it is <strong>locked</strong> and will no longer be served to contributors for that language</li>
            <li>Automatically check your milestone badges</li>
            <li>Silently compare your translation to a gold standard if the sentence is a benchmark sentence (you will not know which sentences these are)</li>
          </ul>
        </Step>
        <Step number="7" title="Skip or get a new sentence">
          <p>If a sentence is outside your expertise or contains terminology you are unsure about, click <strong>Skip</strong>. A different sentence will be loaded. Skipping does not affect your reputation.</p>
        </Step>
      </div>

      <Note type="warn">
        A sentence can receive a maximum of <strong>3 translations per language</strong>. If you try to translate a sentence you have already translated in the same language, your submission will be rejected. The same English sentence can still receive 3 Kpelle <em>and</em> 3 Bassa translations independently.
      </Note>
    </div>
  );
}

function GuideAudio() {
  return (
    <div className="space-y-6">
      <H2>Audio Recording</H2>
      <P>Spoken recordings transform a text dataset into a multi-modal corpus suitable for speech recognition, text-to-speech, and spoken language identification research. Here is everything you need to know.</P>

      <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
        {[
          ['How to record', 'Click the microphone button in the Translation Workspace. Your browser will ask for microphone permission — grant it. A red indicator appears while recording. Click Stop when done. Play back the recording before submitting to verify quality.'],
          ['Technical requirements', 'The platform uses the browser MediaRecorder API (WAV/WebM/MP3). Any device with a microphone works — phone, tablet, or laptop. No app is required. For best quality, record in a quiet environment and speak clearly at a natural pace.'],
          ['What to record', 'Read your written translation aloud exactly as written. Speak at a comfortable natural pace — not too slow (which sounds unnatural) and not too fast (which can clip words). You may also record a reading of the English source sentence separately using the English audio button.'],
          ['File size and duration', 'Each recording is limited to 50 MB. A typical translation is 5–30 seconds, which is well within that limit. The file is stored as WAV or WebM depending on your browser.'],
          ['Privacy', 'Audio recordings are associated with your contributor ID, not your name or email, in the exported dataset. Contributor demographic metadata (region, age group, L1 status) is included so researchers can study speaker variation, but your personal identity is never in the exported data.'],
          ['If you made a mistake', 'Click the X on the recording preview to discard it and start over before submitting. Once submitted, contact an admin via the Support page to request removal.'],
        ].map(([title, text]) => (
          <div key={title} className="px-6 py-4">
            <p className="font-black text-gray-800 text-sm mb-1">{title}</p>
            <P>{text}</P>
          </div>
        ))}
      </div>

      <Note type="tip">
        Recordings in less-common dialects are especially valuable. If you speak a regional variant, recording audio is one of the most impactful contributions you can make.
      </Note>
    </div>
  );
}

function GuideQuality() {
  return (
    <div className="space-y-6">
      <H2>Quality, Reputation & Badges</H2>

      <div className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <H3>How translations are validated</H3>
          <P>After submission, translations enter a <strong>Pending</strong> state. Admin adjudicators review them and assign a quality score between 0 and 1:</P>
          <div className="mt-3 space-y-2 text-sm">
            {[
              ['≥ 0.8', 'Excellent — faithful, fluent, correctly formatted'],
              ['0.4 – 0.79', 'Acceptable — minor issues but usable for training'],
              ['< 0.4', 'Rejected — significant errors, wrong language, or gibberish'],
            ].map(([range, desc]) => (
              <div key={range} className="flex items-start gap-3">
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono flex-shrink-0 mt-0.5">{range}</code>
                <P>{desc}</P>
              </div>
            ))}
          </div>
          <Note type="info" >Gold standard checks happen silently on roughly 5% of sentences. Your translation is compared to an expert reference using n-gram similarity. The score is logged for quality benchmarking but is never shown to you and does not affect your reputation directly.</Note>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <H3>Reputation score</H3>
          <P>Every contributor starts with a reputation score of <strong>1.0</strong>. It changes when an admin validates or rejects your translations:</P>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-green-600">+0.1</p>
              <p className="text-green-700 text-xs mt-1">Translation validated (quality ≥ 0.4)</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-500">−0.05</p>
              <p className="text-red-600 text-xs mt-1">Translation rejected (quality &lt; 0.4)</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Score is capped at 5.0 and floored at 0. It is visible on your profile and on the Contributors leaderboard.</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <H3>Badges</H3>
          <P>Badges are awarded automatically when you hit milestones. They appear on your Dashboard and contributor card.</P>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['🌱', 'First Words', 'First translation submitted'],
              ['✏️', 'Getting Started', '10 translations submitted'],
              ['📚', 'Dedicated', '50 translations submitted'],
              ['💯', 'Century', '100 translations submitted'],
              ['🚀', 'Prolific', '500 translations submitted'],
              ['🎙️', 'Audio Pioneer', 'First audio recording submitted'],
              ['🗣️', 'Native Voice', 'Verified L1 speaker'],
              ['⭐', 'Gold Standard', 'Avg quality score above 0.85 (min 5 validated)'],
              ['✅', 'Quality Proven', '10 translations validated'],
              ['🔥', 'Week Warrior', '7-day consecutive translation streak'],
              ['🔥🔥', 'Month Champion', '30-day consecutive streak'],
              ['🏆', 'Campaign Hero', 'Contributed during an active campaign'],
            ].map(([icon, name, desc]) => (
              <div key={name} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-xl w-8 text-center">{icon}</span>
                <div>
                  <p className="text-xs font-black text-gray-800">{name}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <H3>Streaks</H3>
          <P>A streak is the number of consecutive calendar days on which you submitted at least one translation. Your current streak is shown on your Dashboard with a 🔥 icon. Streaks reset if you miss a day.</P>
        </div>
      </div>
    </div>
  );
}

function GuideCampaigns() {
  return (
    <div className="space-y-6">
      <H2>Campaigns</H2>
      <P>Annotation campaigns are time-limited collection drives that focus contributor effort on a specific language or domain. Participating in a campaign is one of the most impactful ways to contribute.</P>

      <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
        {[
          ['What is a campaign?', 'A campaign has a target language, an optional domain focus (e.g. "Health sentences only"), a numerical goal (e.g. 500 translations), and a deadline. A progress bar tracks contributions in real time.'],
          ['How do I join?', 'Campaigns are not opt-in — any translation you submit in the campaign language during the campaign dates automatically counts toward the goal. If a campaign is active for your current language, a banner appears at the top of the Translation Workspace.'],
          ['Where to see campaigns?', <>Visit <Link to="/campaigns" className="text-liberia-blue hover:underline font-semibold">/campaigns</Link> to see all active, upcoming, and completed campaigns. You can filter by status or language.</>],
          ['Campaign badges', 'When a campaign completes or when you personally contribute to one, you may be awarded a Campaign Hero badge. Some campaigns specify a custom badge defined by the admin.'],
          ['Who creates campaigns?', 'Only admins can create campaigns. If you want to propose one — for example a community health drive in Loma — submit a request via the Contact page.'],
        ].map(([title, text]) => (
          <div key={title} className="px-6 py-4">
            <p className="font-black text-gray-800 text-sm mb-1">{title}</p>
            <div className="text-sm text-gray-600">{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DevOverview() {
  const BASE = window.location.origin;
  return (
    <div className="space-y-6">
      <div>
        <H2>Developer Overview</H2>
        <P>The liblingua exposes a JSON REST API and a Python SDK (<Code>liblingua</Code>) for programmatic access to translations, statistics, and exports.</P>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="font-black text-gray-800 mb-2">🍪 Browser / Session auth</p>
          <P>Log in at the website. A secure <Code>httpOnly</Code> cookie is set automatically and sent with every request from the same browser. Use this for all browser-based access.</P>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="font-black text-gray-800 mb-2">🔑 API key auth</p>
          <P>Generate a key from your <Link to="/dashboard" className="text-liberia-blue hover:underline">Dashboard</Link>. Pass it as <Code>Authorization: ApiKey YOUR_KEY</Code> or <Code>?api_key=YOUR_KEY</Code>. Required for programmatic / script access.</P>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <H3>Base URL</H3>
        <Code block>{BASE}/api</Code>
        <p className="text-xs text-gray-400 mt-2">All endpoint paths below are relative to this base.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <H3>Rate Limits</H3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-400 text-xs"><th className="pb-2 font-semibold">Endpoint group</th><th className="pb-2 font-semibold">Limit</th><th className="pb-2 font-semibold">Window</th></tr></thead>
            <tbody className="divide-y text-gray-600 text-sm">
              <tr><td className="py-2"><Code>/api/auth/*</Code></td><td className="py-2">20 requests</td><td className="py-2">15 min</td></tr>
              <tr><td className="py-2"><Code>POST /api/translations</Code></td><td className="py-2">120 requests</td><td className="py-2">1 hour</td></tr>
              <tr><td className="py-2"><Code>/api/export/*</Code></td><td className="py-2">20 requests</td><td className="py-2">1 hour</td></tr>
              <tr><td className="py-2">All other endpoints</td><td className="py-2">500 requests</td><td className="py-2">15 min</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">Rate limit headers (<Code>X-RateLimit-Remaining</Code>, <Code>X-RateLimit-Reset</Code>) are included in every response.</p>
      </div>

      <div className="bg-liberia-red/5 border border-liberia-red/20 rounded-2xl p-6">
        <H3>Dataset Citation</H3>
        <Code block>{`@dataset{liberian_language_dataset_2026,\n  title   = {Liberian Low-Resource Language Translation Dataset},\n  year    = {2026},\n  url     = {${BASE}/datasets},\n  note    = {Crowdsourced, human-validated translations across 8 Liberian\n             languages. Includes train/validation/test splits and\n             spoken audio recordings.}\n}`}</Code>
      </div>
    </div>
  );
}

function DevSDK() {
  const BASE = window.location.origin;
  return (
    <div className="space-y-6">
      <div>
        <H2>liblingua Python SDK</H2>
        <P>The official Python package for loading, streaming, and downloading the liblingua directly into your pipeline — just like <Code>kaggle</Code> or <Code>datasets</Code>.</P>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>Installation</H3>
        <Code block>{`# Minimal install (requests only)
pip install liblingua

# With pandas support
pip install "liblingua[pandas]"

# With HuggingFace datasets support
pip install "liblingua[huggingface]"

# Everything
pip install "liblingua[all]"

# From source (latest)
pip install git+https://github.com/your-org/liberian-dataset-platform.git#subdirectory=sdk/python`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>Import & Authenticate</H3>
        <P>Get your API key from your <Link to="/dashboard" className="text-liberia-blue hover:underline">Dashboard</Link>, then:</P>
        <Code block>{`from liblingua import Liblingua

# Pass your API key directly
client = Liblingua(api_key="ldlib_xxxx")

# Or via environment variable (recommended for scripts/CI)
import os
client = Liblingua(api_key=os.environ["LIBLINGUA_API_KEY"])

# Self-hosted instance
client = Liblingua(api_key="ldlib_xxxx", base_url="${BASE}")`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>Discover Available Datasets</H3>
        <Code block>{`# List language codes with published datasets
langs = client.list_languages()
print(langs)
# → ['kpelle', 'bassa', 'grebo', ...]

# Full metadata for each published dataset
datasets = client.list_datasets()
for ds in datasets:
    print(ds["language"], ds["record_count"], ds["avg_quality"])`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>Load into Memory</H3>
        <Code block>{`from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

# Preprocessed, validated-only (recommended for training)
data = client.load("kpelle")

# Multiple languages at once
data = client.load(["kpelle", "bassa", "grebo"])

# Include unvalidated translations
data = client.load("kpelle", validated_only=False)

# Filter by minimum quality score
data = client.load("kpelle", min_quality=0.7)

# Raw mode — exact DB values, no preprocessing applied
data = client.load("kpelle", raw=True)

print(f"{len(data)} records")
print(data[0]["source_text"], "→", data[0]["target_text"])
print(data[0]["split"])  # "train" | "validation" | "test"`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>Stream Large Datasets</H3>
        <P>Use <Code>stream()</Code> to process records one at a time without loading the full dataset into memory. Essential for large corpora.</P>
        <Code block>{`from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

train_sentences = []
for record in client.stream("kpelle", validated_only=True):
    if record["split"] == "train":
        train_sentences.append({
            "input":  record["source_text"],
            "target": record["target_text"],
        })

print(f"Collected {len(train_sentences)} training pairs")`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>Download to Disk</H3>
        <Code block>{`from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

# Preprocessed JSONL (default — recommended)
path = client.download("kpelle", format="jsonl", output_dir="./data")

# CSV
path = client.download("kpelle", format="csv", output_dir="./data")

# Raw data (no preprocessing)
path = client.download("kpelle", raw=True, output_dir="./data/raw")

# Validated only, minimum quality 0.8
path = client.download("kpelle", validated_only=True, min_quality=0.8)

print(f"Saved to: {path}")`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>pandas DataFrame</H3>
        <Code block>{`# pip install "liblingua[pandas]"
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")
df = client.load_dataframe("kpelle", validated_only=True)

print(df.columns.tolist())
# ['id', 'split', 'source_lang', 'source_text', 'target_lang', ...]

train_df = df[df["split"] == "train"]
val_df   = df[df["split"] == "validation"]
test_df  = df[df["split"] == "test"]

# Multi-language DataFrame
all_df = client.load_dataframe(["kpelle", "bassa", "grebo"])`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>HuggingFace Dataset</H3>
        <Code block>{`# pip install "liblingua[huggingface]"
from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")
ds = client.to_hf_dataset("kpelle")

# The "split" field is already in the data — filter rather than split
train = ds.filter(lambda x: x["split"] == "train")
val   = ds.filter(lambda x: x["split"] == "validation")
test  = ds.filter(lambda x: x["split"] == "test")

# Rename for seq2seq training
ds = ds.rename_column("source_text", "en")
ds = ds.rename_column("target_text", "kpe")

# Or load from a downloaded JSONL directly
from datasets import load_dataset
ds = load_dataset("json", data_files="kpelle_validated_liberian_dataset.jsonl")`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>Preprocessed vs Raw</H3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-black text-blue-800 mb-2">Preprocessed (default)</p>
            <ul className="space-y-1 text-blue-700 text-xs">
              <li>✓ <Code>split</Code>: train/validation/test (80/10/10, deterministic)</li>
              <li>✓ ISO 639-3 codes (<Code>kpe</Code>, <Code>bsq</Code>, …)</li>
              <li>✓ BCP-47 tags (<Code>kpe-LR</Code>, …)</li>
              <li>✓ Whitespace normalised text</li>
              <li>✓ Absolute audio URLs</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-black text-amber-800 mb-2">Raw (<Code>raw=True</Code>)</p>
            <ul className="space-y-1 text-amber-700 text-xs">
              <li>→ No split tag</li>
              <li>→ No ISO/BCP-47 codes</li>
              <li>→ Original text as submitted</li>
              <li>→ Stored audio paths (not URLs)</li>
              <li>→ Apply your own preprocessing</li>
            </ul>
          </div>
        </div>
        <Code block>{`# Preprocessed (default)
data = client.load("kpelle")

# Raw
data = client.load("kpelle", raw=True)`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <H3>Platform Statistics</H3>
        <Code block>{`stats = client.get_stats()
print(stats["total_translations"])           # int
print(stats["total_validated"])              # int
print(stats["per_language"]["kpelle"])       # { total, validated, locked_samples, audio_count }
print(stats["domain_breakdown"])             # [{ domain, sample_count }]`}</Code>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
        <H3>Error Handling</H3>
        <Code block>{`from liblingua import Liblingua, AuthenticationError, DatasetNotPublishedError

client = Liblingua(api_key="ldlib_xxxx")

try:
    data = client.load("kpelle")
except AuthenticationError:
    print("Invalid or revoked API key.")
except DatasetNotPublishedError:
    print("This language dataset has not been published yet.")
except Exception as e:
    print(f"Unexpected error: {e}")`}</Code>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApiDocs() {
  const [active, setActive] = useState('guide-start');

  const allSectionIds = NAV.flatMap(g => g.items.map(i => i.id));

  const renderContent = () => {
    switch (active) {
      case 'guide-start':     return <GuideStart />;
      case 'guide-translate': return <GuideTranslate />;
      case 'guide-audio':     return <GuideAudio />;
      case 'guide-quality':   return <GuideQuality />;
      case 'guide-campaigns': return <GuideCampaigns />;
      case 'dev-overview':    return <DevOverview />;
      case 'dev-sdk':         return <DevSDK />;
      default:
        const epList = ENDPOINTS[active];
        const label  = NAV.flatMap(g => g.items).find(i => i.id === active)?.label || active;
        return epList ? (
          <div>
            <H2>{label}</H2>
            <div className="mt-4">
              {epList.map((ep, i) => <EndpointCard key={i} ep={ep} />)}
            </div>
          </div>
        ) : null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-liberia-blue text-white py-12 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start gap-10">
          {/* Left — title */}
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-3">Documentation</h1>
            <p className="text-gray-300 text-lg mb-4">
              Contributor guide · REST API reference · <Code>liblingua</Code> Python SDK
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Use the guide to start translating on the platform, or jump straight to the
              SDK to load data directly into your machine learning pipeline.
            </p>
          </div>

          {/* Right — canonical quick-start snippet */}
          <div className="w-full md:w-96 flex-shrink-0">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Quick start</p>
            <div className="relative group">
              <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-sm font-mono leading-relaxed overflow-x-auto">{
`from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")
data = client.load("kpelle")`
              }</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
`from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")
data = client.load("kpelle")`
                  );
                }}
                className="absolute top-2 right-2 text-xs bg-gray-700 text-gray-300 hover:text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <a href="/dashboard" className="hover:text-white underline">Generate your API key →</a>
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 flex gap-8">

        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0 hidden md:block self-start sticky top-6">
          {NAV.map((group) => (
            <div key={group.group} className="mb-5">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 px-3 mb-2">{group.group}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button key={item.id} onClick={() => setActive(item.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active === item.id
                        ? 'bg-liberia-red text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden w-full">
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium bg-white mb-6">
            {NAV.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {renderContent()}

          {/* Prev / Next navigation */}
          <div className="flex justify-between pt-6 border-t border-gray-100 mt-8">
            {(() => {
              const idx  = allSectionIds.indexOf(active);
              const prev = allSectionIds[idx - 1];
              const next = allSectionIds[idx + 1];
              const label = (id) => NAV.flatMap(g => g.items).find(i => i.id === id)?.label;
              return (
                <>
                  {prev
                    ? <button onClick={() => setActive(prev)} className="text-sm text-liberia-blue hover:underline">← {label(prev)}</button>
                    : <span />}
                  {next
                    ? <button onClick={() => setActive(next)} className="text-sm text-liberia-blue hover:underline">{label(next)} →</button>
                    : <span />}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
