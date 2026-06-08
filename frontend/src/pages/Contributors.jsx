import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { listContributors } from '../api/contributors';
import { getStats } from '../api/stats';

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: '',        label: 'All Languages' },
  { value: 'kpelle',  label: 'Kpelle' },
  { value: 'bassa',   label: 'Bassa' },
  { value: 'grebo',   label: 'Grebo' },
  { value: 'vai',     label: 'Vai' },
  { value: 'mende',   label: 'Mende' },
  { value: 'loma',    label: 'Loma' },
  { value: 'krahn',   label: 'Krahn' },
  { value: 'dan',     label: 'Dan (Gio)' },
];

const SORT_OPTIONS = [
  { value: 'reputation',    label: 'Highest Reputation' },
  { value: 'contributions', label: 'Most Active' },
  { value: 'newest',        label: 'Newest Members' },
];

// Consistent avatar colour based on first letter of name
const AVATAR_PALETTE = [
  'bg-red-500',    'bg-blue-600',  'bg-emerald-500',
  'bg-violet-500', 'bg-orange-500','bg-teal-500',
  'bg-pink-500',   'bg-indigo-600','bg-amber-500',
];
function avatarColor(name = '') {
  return AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length];
}

const LANG_BADGE = {
  kpelle:  'bg-red-100    text-red-700',
  bassa:   'bg-blue-100   text-blue-700',
  grebo:   'bg-green-100  text-green-700',
  vai:     'bg-purple-100 text-purple-700',
  mende:   'bg-orange-100 text-orange-700',
  loma:    'bg-yellow-100 text-yellow-800',
  krahn:   'bg-pink-100   text-pink-700',
  dan:     'bg-indigo-100 text-indigo-700',
};

// ── Reputation bar ────────────────────────────────────────────────────────────

function RepBar({ score }) {
  const pct = Math.min(100, Math.round((score / 5) * 100));
  const color = score >= 4 ? 'bg-green-500' : score >= 2.5 ? 'bg-liberia-red' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600">{score?.toFixed(1)}</span>
    </div>
  );
}

// ── Top-3 podium ──────────────────────────────────────────────────────────────

function Podium({ contributors }) {
  if (contributors.length < 1) return null;
  const [first, second, third] = contributors;

  const PodiumCard = ({ c, rank, size }) => {
    const [imgErr, setImgErr] = useState(false);
    const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const medals   = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const ringCls  = rank === 1
      ? 'ring-4 ring-yellow-400 ring-offset-2'
      : rank === 2
      ? 'ring-4 ring-gray-300 ring-offset-2'
      : 'ring-4 ring-amber-600 ring-offset-2';
    const avatarSize = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-lg';

    return (
      <div className={`flex flex-col items-center gap-2 ${rank === 1 ? '-mt-4' : 'mt-4'}`}>
        <span className="text-3xl">{medals[rank]}</span>
        <div className={`${avatarSize} rounded-full ${avatarColor(c.name)} flex items-center justify-center text-white font-black flex-shrink-0 ${ringCls} overflow-hidden`}>
          {c.photo_url && !imgErr
            ? <img src={c.photo_url.startsWith('uploads/') ? `/${c.photo_url}` : c.photo_url}
                alt={c.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
            : <span>{initials}</span>}
        </div>
        <div className="text-center">
          <p className="font-black text-gray-900 text-sm">{c.name}</p>
          <p className="text-xs text-gray-500">{c._count.translations} translations</p>
          {c.native_language && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize mt-1 inline-block ${LANG_BADGE[c.native_language] || 'bg-gray-100 text-gray-600'}`}>
              {c.native_language}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 mb-8">
      <h2 className="text-sm font-black uppercase tracking-widest text-liberia-red text-center mb-6">Top Contributors</h2>
      <div className="flex justify-center items-end gap-8">
        {second && <PodiumCard c={second} rank={2} size="md" />}
        {first  && <PodiumCard c={first}  rank={1} size="lg" />}
        {third  && <PodiumCard c={third}  rank={3} size="md" />}
      </div>
    </div>
  );
}

// ── Contributor card ──────────────────────────────────────────────────────────

function ContributorCard({ contributor: c, rank }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4 flex gap-4">
      {/* Avatar */}
      <div className={`w-14 h-14 rounded-full ${avatarColor(c.name)} flex items-center justify-center text-white font-black text-lg flex-shrink-0 overflow-hidden`}>
        {c.photo_url && !imgErr
          ? <img src={c.photo_url.startsWith('uploads/') ? `/${c.photo_url}` : c.photo_url}
              alt={c.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          : initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-black text-gray-900 truncate">{c.name}</h3>
          {c.is_l1_speaker && (
            <span className="text-xs font-bold bg-liberia-red/10 text-liberia-red px-1.5 py-0.5 rounded">L1</span>
          )}
          {rank && rank <= 3 && (
            <span className="text-sm">{['🥇','🥈','🥉'][rank - 1]}</span>
          )}
        </div>

        {c.region_of_origin && (
          <p className="text-xs text-gray-400 truncate">📍 {c.region_of_origin}</p>
        )}
        {c.profession && (
          <p className="text-xs text-gray-400 truncate">{c.profession}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {c.native_language && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${LANG_BADGE[c.native_language] || 'bg-gray-100 text-gray-600'}`}>
              {c.native_language}
              {c.native_dialect && ` · ${c.native_dialect}`}
            </span>
          )}
          <span className="text-xs text-gray-500 font-medium">
            {c._count.translations.toLocaleString()} translation{c._count.translations !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-2">
          <RepBar score={c.reputation_score || 1} />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Contributors() {
  const [contributors, setContributors] = useState([]);
  const [meta, setMeta]                 = useState(null);
  const [page, setPage]                 = useState(1);
  const [language, setLanguage]         = useState('');
  const [sort, setSort]                 = useState('reputation');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [platformStats, setPlatformStats] = useState(null);

  // Fetch platform stats for hero
  useEffect(() => {
    getStats().then((r) => setPlatformStats(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listContributors(page, 24, language, sort)
      .then((r) => { setContributors(r.data.contributors); setMeta(r.data.pagination); })
      .catch((e) => setError(e.response?.data?.error || 'Failed to load contributors.'))
      .finally(() => setLoading(false));
  }, [page, language, sort]);

  useEffect(() => { load(); }, [load]);

  const handleLang = (l) => { setLanguage(l); setPage(1); };
  const handleSort = (s) => { setSort(s); setPage(1); };

  const showPodium = page === 1 && !language && sort === 'reputation' && contributors.length >= 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-liberia-blue text-white py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-black mb-2">Our Contributors</h1>
          <p className="text-gray-300 text-lg mb-8">
            Meet the community members helping preserve and revitalize Liberian languages.
          </p>
          {platformStats && (
            <div className="flex flex-wrap justify-center gap-10">
              {[
                ['Contributors', platformStats.total_contributors],
                ['Translations', platformStats.total_translations?.toLocaleString()],
                ['Languages',    8],
                ['Validated',    platformStats.total_validated?.toLocaleString()],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-3xl font-black text-white">{val ?? '—'}</p>
                  <p className="text-gray-400 text-sm">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Language pills */}
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button key={l.value} onClick={() => handleLang(l.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  language === l.value
                    ? 'bg-liberia-red text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-liberia-red hover:text-liberia-red'
                }`}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="ml-auto flex-shrink-0">
            <select value={sort} onChange={(e) => handleSort(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-liberia-red">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* ── Podium (default view, page 1 only) ──────────────────────────── */}
        {showPodium && !loading && (
          <Podium contributors={contributors.slice(0, 3)} />
        )}

        {/* ── Results header ───────────────────────────────────────────────── */}
        {meta && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {meta.total.toLocaleString()} contributor{meta.total !== 1 ? 's' : ''}
              {language && ` speaking ${language}`}
            </p>
            <p className="text-xs text-gray-400">Page {page} of {meta.totalPages}</p>
          </div>
        )}

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : contributors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">🌍</p>
            <p className="text-gray-500 font-semibold">No contributors found.</p>
            {language && (
              <button onClick={() => handleLang('')}
                className="mt-3 text-sm text-liberia-red hover:underline">
                Clear language filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {contributors.map((c, i) => (
              <ContributorCard
                key={c.id}
                contributor={c}
                rank={showPodium ? undefined : (page === 1 ? i + 1 : undefined)}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
              «
            </button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
              ← Prev
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(7, meta.totalPages) }, (_, i) => {
              let n;
              if (meta.totalPages <= 7)          n = i + 1;
              else if (page <= 4)                n = i + 1;
              else if (page >= meta.totalPages - 3) n = meta.totalPages - 6 + i;
              else                               n = page - 3 + i;
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                    page === n
                      ? 'bg-liberia-red text-white shadow'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {n}
                </button>
              );
            })}

            <button onClick={() => setPage((p) => p + 1)} disabled={page === meta.totalPages}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
              Next →
            </button>
            <button onClick={() => setPage(meta.totalPages)} disabled={page === meta.totalPages}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
              »
            </button>
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div className="mt-12 text-center bg-liberia-red rounded-2xl py-10 px-6 text-white">
          <h2 className="text-2xl font-black mb-2">Join Our Community</h2>
          <p className="text-red-100 mb-6">Every translation you contribute helps preserve a language for the next generation.</p>
          <Link to="/auth?tab=register"
            className="inline-block bg-white text-liberia-red hover:bg-gray-100 font-black px-8 py-3 rounded-lg transition-colors">
            Become a Contributor
          </Link>
        </div>
      </div>
    </div>
  );
}
