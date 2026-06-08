import { useEffect, useState } from 'react';
import { getStats } from '../api/stats';
import { LANGUAGES } from './LanguageSelector';

/**
 * variant:
 *   'light'  (default) — white cards on light background
 *   'dark'             — translucent cards on dark (black) background
 *   'ticker'           — single compact row, used in the landing page red bar
 */
export default function StatsWidget({ variant = 'light' }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .catch(() => setError('Could not load stats'));
  }, []);

  if (variant === 'ticker') return <TickerBar stats={stats} error={error} />;

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!stats) return <SkeletonGrid dark={variant === 'dark'} />;

  const cardBase =
    variant === 'dark'
      ? 'bg-white/10 border border-white/10 rounded p-4'
      : 'bg-white border border-gray-100 rounded shadow-sm p-4';

  const labelCls = variant === 'dark' ? 'text-xs text-gray-400' : 'text-xs text-gray-500';
  const valueCls = variant === 'dark' ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-liberia-blue';
  const langNameCls = variant === 'dark' ? 'text-sm font-semibold text-gray-300' : 'text-sm font-semibold text-liberia-blue';
  const langCountCls = variant === 'dark' ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-gray-800';
  const langSubCls = variant === 'dark' ? 'text-xs text-gray-500' : 'text-xs text-gray-400';

  const topStats = [
    { label: 'English Samples',    value: stats.total_samples?.toLocaleString() },
    { label: 'Total Translations', value: stats.total_translations?.toLocaleString() },
    { label: 'Contributors',       value: stats.total_contributors?.toLocaleString() },
    {
      label: 'Avg Quality',
      value: stats.average_quality_score
        ? `${(stats.average_quality_score * 100).toFixed(0)}%`
        : '—',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {topStats.map((s) => (
          <div key={s.label} className={cardBase}>
            <p className={labelCls}>{s.label}</p>
            <p className={valueCls}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LANGUAGES.map((lang) => {
          const data = stats.per_language?.[lang.value] || { total: 0, validated: 0 };
          return (
            <div key={lang.value} className={`${cardBase} text-center`}>
              <p className={langNameCls}>{lang.label}</p>
              <p className={langCountCls + ' mt-1'}>{data.total}</p>
              <p className={langSubCls}>{data.validated} validated</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Compact single-row ticker for the red bar ─────────────────────────────────
function TickerBar({ stats, error }) {
  if (error || !stats) {
    const items = ['Samples', 'Translations', 'Contributors'];
    return (
      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8">
        {items.map((l) => (
          <div key={l} className="text-center">
            <div className="h-5 w-14 bg-white/20 rounded animate-pulse mx-auto mb-1" />
            <span className="text-xs text-red-200 uppercase tracking-widest">{l}</span>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Samples',       value: stats.total_samples?.toLocaleString() },
    { label: 'Translations',  value: stats.total_translations?.toLocaleString() },
    { label: 'Contributors',  value: stats.total_contributors?.toLocaleString() },
    {
      label: 'Languages',
      value: Object.values(stats.per_language || {}).filter((l) => l.total > 0).length || 0,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8 sm:gap-16">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="text-2xl font-black text-white leading-none">{item.value}</div>
          <div className="text-xs text-red-200 uppercase tracking-widest mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonGrid({ dark }) {
  const cls = dark ? 'bg-white/10' : 'bg-gray-100';
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className={`h-20 rounded ${cls}`} />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => <div key={i} className={`h-20 rounded ${cls}`} />)}
      </div>
    </div>
  );
}
