import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/client';

// ── Language display metadata ─────────────────────────────────────────────────

const LANG_META = {
  kpelle: { flag: '🇱🇷', iso: 'kpe', region: 'North-Central Liberia', speakers: '~487k' },
  bassa:  { flag: '🇱🇷', iso: 'bsq', region: 'Central Liberia',       speakers: '~347k' },
  grebo:  { flag: '🇱🇷', iso: 'grj', region: 'Southeast Liberia',     speakers: '~100k' },
  vai:    { flag: '🇱🇷', iso: 'vai', region: 'Northwest Liberia',     speakers: '~104k' },
  mende:  { flag: '🇸🇱', iso: 'men', region: 'Sierra Leone / Liberia', speakers: '~2.5M' },
  loma:   { flag: '🇱🇷', iso: 'lom', region: 'Northwest Liberia',     speakers: '~55k' },
  krahn:  { flag: '🇱🇷', iso: 'kqo', region: 'West-Central Liberia',  speakers: '~80k' },
  dan:    { flag: '🇨🇮', iso: 'dnj', region: 'Côte d\'Ivoire / Liberia', speakers: '~400k' },
};

const DOMAIN_COLORS = {
  health: 'bg-green-100 text-green-700', legal: 'bg-purple-100 text-purple-700',
  education: 'bg-blue-100 text-blue-700', news: 'bg-yellow-100 text-yellow-800',
  conversational: 'bg-pink-100 text-pink-700', general: 'bg-gray-100 text-gray-600',
};

// ── Download button ───────────────────────────────────────────────────────────

function DownloadBtn({ lang, format, label, validated, raw }) {
  const endpoints = {
    csv:   '/api/export/csv',
    json:  '/api/export/json',
    jsonl: '/api/export/huggingface',
  };
  const params = new URLSearchParams({ language: lang });
  if (validated) params.set('validated_only', 'true');
  if (raw)       params.set('raw', 'true');

  return (
    <a href={`${endpoints[format]}?${params}`} target="_blank" rel="noreferrer"
      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-liberia-red hover:text-liberia-red transition-colors">
      ↓ {label}
    </a>
  );
}

// ── Dataset card ──────────────────────────────────────────────────────────────

function CopyBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-green-300 rounded-lg p-3 text-xs overflow-x-auto font-mono whitespace-pre-wrap">{code}</pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 text-xs bg-gray-700 text-gray-300 hover:text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

function DatasetCard({ pub, filter }) {
  const meta = LANG_META[pub.language] || {};
  const domainDist = pub.domain_dist || {};
  const audioPct = pub.record_count > 0
    ? Math.round((pub.audio_count / pub.record_count) * 100)
    : 0;

  const [tab, setTab]   = useState('download'); // 'download' | 'code'
  const [raw, setRaw]   = useState(false);

  if (filter === 'audio' && audioPct === 0) return null;
  if (filter === 'text'  && audioPct === 100) return null;

  const lang = pub.language;

  const codeSnippets = {
    load: `from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

# Preprocessed — train/val/test splits, ISO codes, normalised text
data = client.load("${lang}", validated_only=True)

# Raw — exact DB values, no preprocessing
data = client.load("${lang}", raw=True)

print(f"{len(data)} records loaded")
print(data[0]["source_text"], "→", data[0]["target_text"])`,

    stream: `from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

# Stream without loading everything into memory
for record in client.stream("${lang}", validated_only=True):
    split  = record.get("split")   # "train" | "validation" | "test"
    source = record["source_text"]
    target = record["target_text"]
    # ... your processing here`,

    download: `from liblingua import Liblingua

client = Liblingua(api_key="ldlib_xxxx")

# Download preprocessed JSONL to disk
path = client.download("${lang}", format="jsonl", output_dir="./data")

# Download raw CSV
path = client.download("${lang}", format="csv", raw=True, output_dir="./data/raw")

print(f"Saved to {path}")`,

    pandas: `from liblingua import Liblingua
# pip install "liblingua[pandas]"

client = Liblingua(api_key="ldlib_xxxx")
df = client.load_dataframe("${lang}", validated_only=True)

print(df[["source_text", "target_text", "split", "quality_score"]].head())
train_df = df[df["split"] == "train"]`,

    huggingface: `from liblingua import Liblingua
# pip install "liblingua[huggingface]"

client = Liblingua(api_key="ldlib_xxxx")
ds = client.to_hf_dataset("${lang}")

train = ds.filter(lambda x: x["split"] == "train")
val   = ds.filter(lambda x: x["split"] == "validation")
test  = ds.filter(lambda x: x["split"] == "test")`,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Language header */}
      <div className="bg-liberia-blue text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.flag || '🌍'}</span>
          <div>
            <h3 className="font-black text-lg capitalize">{lang}</h3>
            <p className="text-blue-200 text-xs">{meta.region} · ISO 639-3: <code>{meta.iso}</code></p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-black">{pub.record_count.toLocaleString()}</p>
            <p className="text-blue-200 text-xs">validated records</p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-100">
        {[['download','⬇ Download'], ['code','💻 Use in Code']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors ${tab === t ? 'text-liberia-red border-b-2 border-liberia-red' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">

        {/* ── Stats (always shown) ── */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-black text-gray-800">{audioPct}%</p>
            <p className="text-xs text-gray-500">Audio coverage</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-black text-gray-800">
              {pub.avg_quality != null ? `${(pub.avg_quality * 100).toFixed(0)}%` : '—'}
            </p>
            <p className="text-xs text-gray-500">Avg quality</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-black text-gray-800">v{pub.version}</p>
            <p className="text-xs text-gray-500">Version</p>
          </div>
        </div>

        {/* Audio bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>🎙 {pub.audio_count.toLocaleString()} with audio</span>
            <span>📝 {pub.text_only_count.toLocaleString()} text only</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-liberia-red rounded-l-full" style={{ width: `${audioPct}%` }} />
            <div className="h-full bg-gray-300 flex-1" />
          </div>
        </div>

        {/* Domain distribution */}
        {Object.keys(domainDist).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(domainDist).sort((a,b) => b[1]-a[1]).map(([d, n]) => (
              <span key={d} className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOMAIN_COLORS[d] || 'bg-gray-100 text-gray-600'}`}>
                {d}: {n}
              </span>
            ))}
          </div>
        )}

        {/* ── DOWNLOAD TAB ── */}
        {tab === 'download' && (
          <>
            {/* Raw / Preprocessed toggle */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <span className="text-xs font-bold text-gray-600 flex-1">Data mode:</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button onClick={() => setRaw(false)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${!raw ? 'bg-liberia-red text-white' : 'bg-white text-gray-500 hover:text-gray-700'}`}>
                  Preprocessed
                </button>
                <button onClick={() => setRaw(true)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${raw ? 'bg-liberia-red text-white' : 'bg-white text-gray-500 hover:text-gray-700'}`}>
                  Raw
                </button>
              </div>
            </div>

            {!raw ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-bold">✅ Preprocessed</p>
                <p className="mt-0.5">Train/val/test splits · ISO 639-3 & BCP-47 codes · whitespace normalised · absolute audio URLs</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-bold">📦 Raw</p>
                <p className="mt-0.5">Exact DB values — no splits, no ISO codes, original text, stored audio paths. Apply your own preprocessing.</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Validated only</p>
              <div className="flex flex-wrap gap-2">
                <DownloadBtn lang={lang} format="csv"   label="CSV"   validated raw={raw} />
                <DownloadBtn lang={lang} format="json"  label="JSON"  validated raw={raw} />
                <DownloadBtn lang={lang} format="jsonl" label="JSONL" validated raw={raw} />
              </div>
              <p className="text-xs font-semibold text-gray-500 mb-2 mt-3">All translations</p>
              <div className="flex flex-wrap gap-2">
                <DownloadBtn lang={lang} format="csv"   label="CSV"   raw={raw} />
                <DownloadBtn lang={lang} format="json"  label="JSON"  raw={raw} />
                <DownloadBtn lang={lang} format="jsonl" label="JSONL" raw={raw} />
              </div>
            </div>
          </>
        )}

        {/* ── CODE TAB ── */}
        {tab === 'code' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700">
              <p className="font-bold mb-1">Install the SDK first</p>
              <CopyBlock code="pip install liblingua" />
            </div>

            {[
              ['Load into memory', codeSnippets.load],
              ['Stream (memory-efficient)', codeSnippets.stream],
              ['Download to disk', codeSnippets.download],
              ['pandas DataFrame', codeSnippets.pandas],
              ['HuggingFace Dataset', codeSnippets.huggingface],
            ].map(([title, code]) => (
              <div key={title}>
                <p className="text-xs font-bold text-gray-600 mb-1.5">{title}</p>
                <CopyBlock code={code} />
              </div>
            ))}

            <p className="text-xs text-gray-400">
              Replace <code className="bg-gray-100 px-1 rounded">ldlib_xxxx</code> with your API key from the{' '}
              <a href="/dashboard" className="text-liberia-blue hover:underline">Dashboard</a>.
              Full docs at <a href="/api-docs" className="text-liberia-blue hover:underline">/api-docs</a>.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Published {new Date(pub.published_at).toLocaleDateString()} ·{' '}
          {meta.speakers && `~${meta.speakers} speakers`}
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all'); // all | audio | text

  useEffect(() => {
    api.get('/dataset/published')
      .then((r) => setDatasets(r.data))
      .finally(() => setLoading(false));
  }, []);

  const totalRecords = datasets.reduce((s, d) => s + d.record_count, 0);
  const totalAudio   = datasets.reduce((s, d) => s + d.audio_count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-liberia-blue text-white py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-black mb-2">Published Datasets</h1>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl">
            Open, freely downloadable translation datasets for 8 Liberian languages.
            All records are human-validated and preprocessed for immediate use in NLP training pipelines.
          </p>
          <div className="flex flex-wrap gap-10">
            <div>
              <p className="text-3xl font-black">{datasets.length}</p>
              <p className="text-gray-400 text-sm">Languages published</p>
            </div>
            <div>
              <p className="text-3xl font-black">{totalRecords.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Validated translation pairs</p>
            </div>
            <div>
              <p className="text-3xl font-black">{totalAudio.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Spoken audio recordings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Access + preprocessing info banner */}
      <div className="bg-white border-b border-gray-100 px-4 py-5">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Access model */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-liberia-blue/5 border border-liberia-blue/20 rounded-xl">
              <span className="text-2xl mt-0.5">🌐</span>
              <div>
                <p className="font-black text-gray-800 text-sm">Browser Download</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Log in and click any download button below. Your session handles authentication automatically.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-liberia-red/5 border border-liberia-red/20 rounded-xl">
              <span className="text-2xl mt-0.5">🔑</span>
              <div>
                <p className="font-black text-gray-800 text-sm">Programmatic / API Access</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Generate an API key from your <a href="/dashboard" className="text-liberia-blue hover:underline font-semibold">Dashboard</a>, then use it in your code:
                </p>
                <code className="block bg-gray-900 text-green-300 text-xs rounded mt-1.5 px-2 py-1.5 font-mono">
                  Authorization: ApiKey {'<'}your-key{'>'}
                </code>
              </div>
            </div>
          </div>

          {/* Preprocessing features */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              ['🔀', 'Train/Val/Test Splits', '80/10/10 deterministic'],
              ['🌐', 'ISO 639-3 + BCP-47', 'Standard language codes'],
              ['✏️', 'Text Normalised', 'Whitespace cleaned'],
              ['🎙️', 'Absolute Audio URLs', 'No path handling needed'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="flex flex-col items-center gap-1 py-2">
                <span className="text-xl">{icon}</span>
                <p className="font-black text-gray-800 text-xs">{title}</p>
                <p className="text-gray-400 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Filter */}
        <div className="flex gap-2 mb-8 flex-wrap items-center">
          {[['all', 'All Datasets'], ['audio', 'Has Audio'], ['text', 'Text Only']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                filter === v
                  ? 'bg-liberia-red text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-liberia-red hover:text-liberia-red'
              }`}>
              {l}
            </button>
          ))}

          <Link to="/api-docs" className="ml-auto text-xs text-liberia-blue hover:underline flex items-center gap-1">
            API Documentation →
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />)}
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-semibold text-gray-600">No datasets have been published yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Contribute translations and an admin will publish them.{' '}
              <Link to="/translate" className="text-liberia-blue hover:underline">Start translating →</Link>
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {datasets.map((d) => <DatasetCard key={d.id} pub={d} filter={filter} />)}
          </div>
        )}

        {/* Citation */}
        {datasets.length > 0 && (
          <div className="mt-12 bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-black text-gray-800 mb-3">How to Cite</h2>
            <pre className="bg-gray-900 text-green-300 rounded-lg p-4 text-xs overflow-x-auto">{
`@dataset{liberian_language_dataset_2026,
  title   = {Liberian Low-Resource Language Translation Dataset},
  year    = {2026},
  url     = {${window.location.origin}/datasets},
  note    = {Crowdsourced, human-validated translations across 8 Liberian languages.
             Includes train/validation/test splits and spoken audio recordings.}
}`
            }</pre>
            <p className="text-xs text-gray-400 mt-3">
              Also available on <a href="https://huggingface.co/datasets" target="_blank" rel="noreferrer" className="text-liberia-blue hover:underline">HuggingFace Hub</a> — load directly with <code className="bg-gray-100 px-1 rounded">datasets.load_dataset("json", data_files="*.jsonl")</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
