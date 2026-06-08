import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { listCampaigns } from '../api/campaigns';

const STATUS_STYLES = {
  ACTIVE:    { badge: 'bg-green-100 text-green-700',  bar: 'bg-green-500',      label: 'Active Now' },
  UPCOMING:  { badge: 'bg-blue-100 text-blue-700',    bar: 'bg-blue-400',       label: 'Coming Soon' },
  COMPLETED: { badge: 'bg-gray-100 text-gray-600',    bar: 'bg-gray-400',       label: 'Completed' },
  CANCELLED: { badge: 'bg-red-50 text-red-400',       bar: 'bg-red-300',        label: 'Cancelled' },
};

const LANG_FLAGS = {
  kpelle: '🇱🇷', bassa: '🇱🇷', grebo: '🇱🇷', vai: '🇱🇷',
  mende:  '🇸🇱', loma: '🇱🇷', krahn: '🇱🇷', dan: '🇨🇮',
};

function CampaignCard({ campaign: c }) {
  const s = STATUS_STYLES[c.derived_status] || STATUS_STYLES.UPCOMING;
  const daysLeft = c.derived_status === 'ACTIVE'
    ? Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / 86400000))
    : null;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
      c.derived_status === 'ACTIVE' ? 'border-liberia-red/30' : 'border-gray-100'
    }`}>
      {/* Top colour strip */}
      <div className={`h-1 ${s.bar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
              <span className="text-xs text-gray-400 capitalize font-medium">
                {LANG_FLAGS[c.language] || '🌍'} {c.language}
                {c.domain && ` · ${c.domain}`}
              </span>
            </div>
            <h3 className="font-black text-gray-900 text-lg leading-snug">{c.title}</h3>
          </div>
          {daysLeft !== null && (
            <div className="text-center flex-shrink-0 bg-liberia-red/5 border border-liberia-red/20 rounded-xl px-3 py-2">
              <p className="text-2xl font-black text-liberia-red">{daysLeft}</p>
              <p className="text-xs text-gray-400">days left</p>
            </div>
          )}
        </div>

        {c.description && (
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">{c.description}</p>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-medium">{c.progress.toLocaleString()} translations collected</span>
            <span className="font-black text-liberia-red">{c.pct}% of goal</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${s.bar} rounded-full transition-all`} style={{ width: `${c.pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Goal: {c.goal.toLocaleString()} translations</p>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
          <span>{new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}</span>
          {c.badge_slug && (
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              🏆 Badge on completion
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterStatus, setFilter]   = useState('');

  useEffect(() => {
    listCampaigns()
      .then((r) => setCampaigns(r.data))
      .finally(() => setLoading(false));
  }, []);

  const STATUSES = ['', 'ACTIVE', 'UPCOMING', 'COMPLETED'];
  const STATUS_LABELS = { '': 'All', ACTIVE: 'Active', UPCOMING: 'Upcoming', COMPLETED: 'Completed' };

  const shown = filterStatus
    ? campaigns.filter((c) => c.derived_status === filterStatus)
    : campaigns;

  const active    = campaigns.filter((c) => c.derived_status === 'ACTIVE');
  const upcoming  = campaigns.filter((c) => c.derived_status === 'UPCOMING');
  const completed = campaigns.filter((c) => c.derived_status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-liberia-blue text-white py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-2">Annotation Campaigns</h1>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl">
            Focused collection drives that direct contributor effort toward languages and topics that need it most. Join an active campaign to make a targeted impact.
          </p>
          <div className="flex flex-wrap gap-6">
            {[
              ['Active',    active.length],
              ['Upcoming',  upcoming.length],
              ['Completed', completed.length],
            ].map(([label, count]) => (
              <div key={label}>
                <p className="text-3xl font-black">{count}</p>
                <p className="text-gray-400 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Filter tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                filterStatus === s
                  ? 'bg-liberia-red text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-liberia-red hover:text-liberia-red'
              }`}>
              {STATUS_LABELS[s]}
              {s && <span className="ml-1.5 text-xs opacity-70">
                ({campaigns.filter((c) => c.derived_status === s).length})
              </span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-52 animate-pulse" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">🎯</p>
            <p className="font-semibold text-gray-600">No {filterStatus.toLowerCase() || ''} campaigns at the moment.</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon or <Link to="/translate" className="text-liberia-blue hover:underline">start translating</Link> to contribute.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {shown.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center bg-liberia-red rounded-2xl py-10 px-6 text-white">
          <h2 className="text-2xl font-black mb-2">Ready to Contribute?</h2>
          <p className="text-red-100 mb-6 text-sm">Pick a campaign language and start translating — every sentence counts.</p>
          <Link to="/translate"
            className="inline-block bg-white text-liberia-red hover:bg-gray-100 font-black px-8 py-3 rounded-lg transition-colors">
            Go to Translation Workspace →
          </Link>
        </div>
      </div>
    </div>
  );
}
