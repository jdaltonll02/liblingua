import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getTranslations, validateTranslation } from '../api/translations';
import { getStats } from '../api/stats';
import { useLanguages, LANGUAGES as FALLBACK_LANGUAGES } from '../components/LanguageSelector';
import { listPublished, publishLanguage, unpublishLanguage, deletePublication, syncHuggingFace } from '../api/dataset';
import { getLanguages, createLanguage, updateLanguage, deleteLanguage } from '../api/languages';
import { listContributorsAdmin, deleteContributor } from '../api/contributors';
import { listTickets, getTicket, updateTicket, getTicketStats } from '../api/tickets';
import { listDonations } from '../api/donations';
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign } from '../api/campaigns';
import ManualTranslateTab from '../components/ManualTranslateTab';
import api from '../api/client';

const DOMAINS = ['general', 'health', 'legal', 'education', 'news', 'conversational'];

// ── Inline confirm dialog ─────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm mb-3">
      <p className="font-semibold text-red-800 mb-2">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-liberia-blue hover:bg-blue-800'}`}
        >
          {confirmLabel}
        </button>
        <button onClick={onCancel} className="btn-secondary text-xs">Cancel</button>
      </div>
    </div>
  );
}

// ── Inline error banner ───────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-3 text-red-400 hover:text-red-600 font-bold text-base leading-none">×</button>
      )}
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState('translations');

  const TABS = [
    { id: 'manual',       label: 'My Translate' },
    { id: 'translations', label: 'Translations' },
    { id: 'import',       label: 'Import' },
    { id: 'languages',    label: 'Languages' },
    { id: 'dataset',      label: 'Dataset' },
    { id: 'contributors', label: 'Contributors' },
    { id: 'stats',        label: 'Stats' },
    { id: 'campaigns',    label: 'Campaigns' },
    { id: 'support',      label: 'Support' },
    { id: 'donations',    label: 'Donations' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="w-44 flex-shrink-0 bg-white border-r border-gray-100 py-6 hidden md:block">
        <div className="px-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1">Admin Panel</p>
        </div>
        <nav className="px-3 space-y-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === t.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex z-10 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-semibold transition-colors
              ${activeTab === t.id ? 'text-liberia-blue border-t-2 border-liberia-blue -mt-px' : 'text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="flex-1 px-6 py-8 pb-20 md:pb-8">
        <ErrorBoundary key={activeTab}>
          {activeTab === 'manual'       && <ManualTranslateTab />}
          {activeTab === 'translations' && <TranslationsTab />}
          {activeTab === 'import'       && <ImportTab />}
          {activeTab === 'languages'    && <LanguagesTab />}
          {activeTab === 'dataset'      && <DatasetTab />}
          {activeTab === 'contributors' && <ContributorsTab />}
          {activeTab === 'stats'        && <StatsTab />}
          {activeTab === 'campaigns'    && <CampaignsTab />}
          {activeTab === 'support'      && <SupportTab />}
          {activeTab === 'donations'    && <DonationsTab />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

// ── Translations ──────────────────────────────────────────────────────────────

function TranslationsTab() {
  const apiLangs = useLanguages();
  const langs = apiLangs.length > 0 ? apiLangs : FALLBACK_LANGUAGES;
  const [translations, setTranslations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(null);
  const [scores, setScores] = useState({});
  const [audioFilter, setAudioFilter] = useState(''); // '' | 'true' | 'false'

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: 50 };
    if (language)    params.language  = language;
    if (audioFilter) params.has_audio = audioFilter;
    getTranslations(params)
      .then((res) => { setTranslations(res.data.data); setMeta(res.data.meta); })
      .catch(() => setError('Failed to load translations.'))
      .finally(() => setLoading(false));
  }, [language, page, audioFilter]);

  useEffect(() => { load(); }, [load]);

  const handleValidate = async (id, is_validated) => {
    setValidating(id);
    const score = scores[id] !== undefined ? parseFloat(scores[id]) : undefined;
    // Optimistic update
    setTranslations((prev) =>
      prev.map((t) => t.id === id ? { ...t, is_validated, quality_score: score ?? t.quality_score } : t)
    );
    try {
      await validateTranslation(id, { is_validated, quality_score: score });
    } catch (err) {
      setError(err.response?.data?.error || 'Validation failed.');
      // Revert optimistic update on error
      load();
    } finally {
      setValidating(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Translations</h1>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select className="input-field w-48" value={language}
          onChange={(e) => { setLanguage(e.target.value); setPage(1); }}>
          <option value="">All languages</option>
          {langs.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select className="input-field w-44" value={audioFilter}
          onChange={(e) => { setAudioFilter(e.target.value); setPage(1); }}>
          <option value="">Text + Audio</option>
          <option value="false">Text only</option>
          <option value="true">Audio recordings</option>
        </select>
        <button onClick={load} className="btn-secondary">Refresh</button>
        {meta && (
          <span className="text-sm text-gray-500 ml-auto">
            {meta.total} total · page {meta.page} of {meta.pages}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          {translations.length === 0 && <p className="text-gray-400">No translations found.</p>}
          {translations.map((t) => (
            <div key={t.id} className="card">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Source (EN)</p>
                  <p className="text-sm text-gray-700">{t.sample?.text}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1 capitalize">{t.target_language} translation</p>
                  <p className="text-sm font-medium text-gray-900">{t.translated_text}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span>By: <strong>{t.contributor?.name}</strong></span>
                <span>Region: {t.contributor?.region_of_origin}</span>
                {t.dialect && <span>Dialect: {t.dialect}</span>}
                <span className={`badge ${t.is_validated ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {t.is_validated ? '✓ Validated' : 'Pending'}
                </span>
                {t.quality_score != null && <span>Q: {(t.quality_score * 100).toFixed(0)}%</span>}
                {t.gold_sim_score != null && <span className="text-purple-500">Gold sim: {(t.gold_sim_score * 100).toFixed(0)}%</span>}
                {t.sample?.iaa_score != null && (
                  <span className={`font-semibold ${t.sample.iaa_score >= 0.6 ? 'text-green-600' : t.sample.iaa_score >= 0.3 ? 'text-amber-600' : 'text-red-500'}`}
                    title="Inter-annotator agreement — how similar the 3 translations are to each other">
                    IAA: {(t.sample.iaa_score * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Audio players */}
              {(t.english_audio_path || t.audio_path) && (
                <div className="mt-3 flex flex-wrap gap-4">
                  {t.english_audio_path && (
                    <div className="text-xs">
                      <p className="text-gray-400 mb-1">English audio</p>
                      <audio controls src={`/${t.english_audio_path}`} className="h-8 max-w-xs" />
                    </div>
                  )}
                  {t.audio_path && (
                    <div className="text-xs">
                      <p className="text-gray-400 mb-1">{t.target_language} audio</p>
                      <audio controls src={`/${t.audio_path}`} className="h-8 max-w-xs" />
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <input type="number" min="0" max="1" step="0.01" placeholder="Quality 0–1"
                  className="input-field w-32 text-sm"
                  value={scores[t.id] ?? t.quality_score ?? ''}
                  onChange={(e) => setScores((s) => ({ ...s, [t.id]: e.target.value }))} />
                {(() => {
                  const raw = scores[t.id] ?? t.quality_score;
                  const val = parseFloat(raw);
                  const validScore = raw !== '' && raw != null && !isNaN(val) && val >= 0 && val <= 1;
                  return (
                    <>
                      <button
                        onClick={() => handleValidate(t.id, true)}
                        disabled={validating === t.id || !validScore}
                        title={!validScore ? 'Enter a quality score (0–1) before validating' : ''}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                        Validate
                      </button>
                      {!validScore && (
                        <span className="text-xs text-amber-600 font-medium">Score required to validate</span>
                      )}
                    </>
                  );
                })()}
                <button onClick={() => handleValidate(t.id, false)} disabled={validating === t.id}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-gray-500 self-center">Page {page} of {meta.pages}</span>
          <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
            className="btn-secondary text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Import ────────────────────────────────────────────────────────────────────

function ImportTab() {
  const [mode, setMode] = useState('json');
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [hfCount, setHfCount] = useState(50);
  const [hfSplit, setHfSplit] = useState('dev');
  const [hfDomain, setHfDomain] = useState('');

  const handleImport = async () => {
    setError(''); setResult(null); setLoading(true); setProgress('');
    try {
      let res;
      if (mode === 'huggingface') {
        setProgress(`Fetching ${hfCount} rows from FLORES-200…`);
        res = await syncHuggingFace({ count: hfCount, split: hfSplit, domain_override: hfDomain || undefined });
        setResult({ hf: res.data });
      } else if (mode === 'csv') {
        setProgress('Importing CSV…');
        res = await api.post('/samples/bulk', text, { headers: { 'Content-Type': 'text/csv' } });
        setResult(res.data); setText('');
      } else {
        let samples;
        try { samples = JSON.parse(text); } catch { throw new Error('Invalid JSON.'); }
        if (!Array.isArray(samples)) throw new Error('JSON must be an array.');
        setProgress(`Importing ${samples.length} samples…`);
        res = await api.post('/samples/bulk', { samples });
        setResult(res.data); setText('');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Import failed.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const examples = {
    json: JSON.stringify([
      { text: 'Wash your hands with soap and water.', domain: 'health', difficulty: 'easy' },
    ], null, 2),
    csv: `text,domain,difficulty\nWash your hands.,health,easy`,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Bulk Import</h1>
      <div className="card">
        <div className="flex gap-2 mb-4 flex-wrap">
          {[['json','JSON'],['csv','CSV'],['huggingface','HuggingFace FLORES']].map(([m, lbl]) => (
            <button key={m} onClick={() => { setMode(m); setText(''); setResult(null); setError(''); }}
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase transition-colors
                ${mode === m ? 'bg-liberia-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {mode === 'huggingface' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Pull from <strong>facebook/flores200</strong> on HuggingFace. Duplicates skipped.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rows (max 1000)</label>
                <input type="number" min="1" max="1000" className="input-field" value={hfCount}
                  onChange={(e) => setHfCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 50)))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Split</label>
                <select className="input-field" value={hfSplit} onChange={(e) => setHfSplit(e.target.value)}>
                  <option value="dev">dev (997 sentences)</option>
                  <option value="devtest">devtest (1012 sentences)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Domain override (optional)</label>
              <select className="input-field w-48" value={hfDomain} onChange={(e) => setHfDomain(e.target.value)}>
                <option value="">Auto-map</option>
                {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-2">
              {mode === 'json'
                ? 'Paste a JSON array with text, domain, difficulty.'
                : 'Paste CSV with header: text,domain,difficulty'}
            </p>
            <button onClick={() => setText(examples[mode])} className="text-xs text-liberia-blue underline mb-2">Load example</button>
            <textarea className="input-field font-mono text-xs min-h-[160px] mb-3"
              placeholder="Paste here…" value={text} onChange={(e) => setText(e.target.value)} />
          </>
        )}

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {loading && progress && (
          <p className="text-sm text-liberia-blue mt-2 flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-liberia-blue border-t-transparent rounded-full animate-spin" />
            {progress}
          </p>
        )}

        {result && !result.hf && <p className="text-sm text-green-700 mt-3">✓ Imported {result.created} samples.</p>}
        {result?.hf && (
          <p className="text-sm text-green-700 mt-3">
            ✓ {result.hf.imported} new samples from FLORES-200.
            {result.hf.skipped > 0 && ` (${result.hf.skipped} skipped)`}
          </p>
        )}

        <div className="mt-4">
          <button onClick={handleImport} disabled={loading || (mode !== 'huggingface' && !text.trim())}
            className="btn-primary">
            {loading ? 'Working…' : mode === 'huggingface' ? `Sync ${hfCount} rows` : `Import ${mode.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Languages ─────────────────────────────────────────────────────────────────

function LanguagesTab() {
  const [langs, setLangs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [newLang, setNewLang] = useState({ value: '', label: '', sort_order: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getLanguages({ all: 'true' })
      .then((res) => setLangs(res.data))
      .catch(() => setError('Failed to load languages.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await createLanguage({
        value:      newLang.value,
        label:      newLang.label,
        sort_order: newLang.sort_order ? parseInt(newLang.sort_order, 10) : langs.length + 1,
      });
      setNewLang({ value: '', label: '', sort_order: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create language.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id) => {
    setError('');
    try {
      await updateLanguage(id, {
        label:      editing.label,
        is_active:  editing.is_active,
        sort_order: parseInt(editing.sort_order, 10) || 0,
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed.');
    }
  };

  const handleDelete = async (lang) => {
    setError('');
    try {
      await deleteLanguage(lang.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed.');
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (lang) => {
    try {
      await updateLanguage(lang.id, { is_active: !lang.is_active });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Language Management</h1>
      <p className="text-sm text-gray-500 mb-6">Add, edit, or remove languages available for translation.</p>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.label}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="card mb-6">
        <h3 className="font-semibold text-sm mb-3">Add New Language</h3>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Value (slug)</label>
            <input className="input-field w-36" placeholder="e.g. gola" required
              value={newLang.value}
              onChange={(e) => setNewLang((n) => ({ ...n, value: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Display Name</label>
            <input className="input-field w-36" placeholder="e.g. Gola" required
              value={newLang.label}
              onChange={(e) => setNewLang((n) => ({ ...n, label: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sort Order</label>
            <input type="number" className="input-field w-24" placeholder="9"
              value={newLang.sort_order}
              onChange={(e) => setNewLang((n) => ({ ...n, sort_order: e.target.value }))} />
          </div>
          <button type="submit" disabled={creating} className="btn-primary self-end">
            {creating ? 'Adding…' : '+ Add'}
          </button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Value</th>
                <th className="pb-2 font-medium">Label</th>
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {langs.map((lang) => (
                <tr key={lang.id} className={`hover:bg-gray-50 ${!lang.is_active ? 'opacity-50' : ''}`}>
                  <td className="py-2.5 font-mono text-xs">{lang.value}</td>
                  <td className="py-2.5">
                    {editing?.id === lang.id ? (
                      <input className="input-field text-sm py-1 w-32"
                        value={editing.label}
                        onChange={(e) => setEditing((ed) => ({ ...ed, label: e.target.value }))} />
                    ) : lang.label}
                  </td>
                  <td className="py-2.5">
                    {editing?.id === lang.id ? (
                      <input type="number" className="input-field text-sm py-1 w-16"
                        value={editing.sort_order}
                        onChange={(e) => setEditing((ed) => ({ ...ed, sort_order: e.target.value }))} />
                    ) : lang.sort_order}
                  </td>
                  <td className="py-2.5">
                    <button onClick={() => handleToggleActive(lang)}
                      className={`badge cursor-pointer ${lang.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {lang.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      {editing?.id === lang.id ? (
                        <>
                          <button onClick={() => handleUpdate(lang.id)}
                            className="text-xs text-green-600 font-semibold hover:underline">Save</button>
                          <button onClick={() => setEditing(null)}
                            className="text-xs text-gray-400 hover:underline">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditing({ id: lang.id, label: lang.label, sort_order: lang.sort_order, is_active: lang.is_active })}
                            className="text-xs text-liberia-blue font-semibold hover:underline">Edit</button>
                          <button onClick={() => setDeleteTarget(lang)}
                            className="text-xs text-red-500 font-semibold hover:underline">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Dataset ───────────────────────────────────────────────────────────────────

function LangViewer({ lang, label, onClose }) {
  const [rows, setRows]       = useState([]);
  const [meta, setMeta]       = useState(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback((p = 1) => {
    setLoading(true);
    getTranslations({ language: lang, page: p, limit: 25 })
      .then((r) => { setRows(r.data.data); setMeta(r.data.meta); })
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { load(page); }, [load, page]);

  const DOMAIN_BADGE = {
    health: 'bg-green-100 text-green-700', legal: 'bg-purple-100 text-purple-700',
    education: 'bg-blue-100 text-blue-700', news: 'bg-yellow-100 text-yellow-700',
    conversational: 'bg-pink-100 text-pink-700', general: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <h3 className="font-black text-gray-800 text-lg capitalize">{label} Dataset</h3>
          <p className="text-xs text-gray-500 mt-0.5">{meta?.total ?? '—'} translation records</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export buttons — browser opens with cookie auth */}
          <span className="text-xs text-gray-400 font-medium">Export:</span>
          <a href={`/api/export/csv?language=${lang}`} target="_blank" rel="noreferrer"
            className="text-xs font-semibold text-liberia-blue hover:underline">CSV</a>
          <a href={`/api/export/json?language=${lang}`} target="_blank" rel="noreferrer"
            className="text-xs font-semibold text-liberia-blue hover:underline">JSON</a>
          <a href={`/api/export/huggingface?language=${lang}`} target="_blank" rel="noreferrer"
            className="text-xs font-semibold text-liberia-blue hover:underline">JSONL</a>
          <a href={`/api/export/csv?language=${lang}&validated=true`} target="_blank" rel="noreferrer"
            className="text-xs font-semibold text-green-700 hover:underline">Validated CSV</a>
          <button onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-700 text-xl leading-none font-bold">×</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-400 p-5">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">No translations found for {label} yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 text-xs">
                <th className="pb-2 font-medium px-4 py-3">Source (EN)</th>
                <th className="pb-2 font-medium px-4">{label} Translation</th>
                <th className="pb-2 font-medium px-4">Contributor</th>
                <th className="pb-2 font-medium px-4">Domain</th>
                <th className="pb-2 font-medium px-4">Quality</th>
                <th className="pb-2 font-medium px-4">Status</th>
                <th className="pb-2 font-medium px-4">Audio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="line-clamp-2 text-xs">{t.sample?.text}</p>
                    <span className="text-xs text-gray-400">{t.sample?.difficulty} · {t.sample?.domain}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-xs">
                    <p className="line-clamp-2">{t.translated_text}</p>
                    {t.dialect && <span className="text-xs text-gray-400">{t.dialect}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <p className="font-medium text-gray-700">{t.contributor?.name}</p>
                    <p>{t.contributor?.region_of_origin}</p>
                    {t.contributor?.is_l1_speaker && <span className="text-liberia-red font-semibold">L1</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOMAIN_BADGE[t.sample?.domain] || 'bg-gray-100 text-gray-600'}`}>
                      {t.sample?.domain}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-700">
                    {t.quality_score != null ? `${(t.quality_score * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.is_validated ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {t.is_validated ? '✓ Validated' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.audio_path ? <span className="text-liberia-red font-bold">🎙 Yes</span> : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{meta.total} records · page {page} of {meta.pages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">← Prev</button>
            <button disabled={page === meta.pages} onClick={() => setPage(p => p + 1)}
              className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DatasetTab() {
  const apiLangs = useLanguages();
  const langs = apiLangs.length > 0 ? apiLangs : FALLBACK_LANGUAGES;
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { lang, action: 'publish'|'unpublish'|'delete' }
  const [selectedLang, setSelectedLang] = useState(null); // { value, label }

  const load = useCallback(() => {
    setLoading(true);
    listPublished()
      .then((res) => setPublications(res.data))
      .catch(() => setError('Failed to load publications.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pubMap = Object.fromEntries(publications.map((p) => [p.language, p]));

  const handleConfirmedAction = async () => {
    const { lang, action } = confirmAction;
    setConfirmAction(null);
    setActing(lang);
    setError('');
    try {
      if (action === 'publish')   await publishLanguage(lang);
      else if (action === 'delete') await deletePublication(lang);
      else await unpublishLanguage(lang);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed.');
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dataset Publications</h1>
      <p className="text-sm text-gray-500 mb-6">Publish a language to make validated translations downloadable via API key.</p>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {confirmAction && (
        <ConfirmDialog
          message={
            confirmAction.action === 'delete'
              ? `Permanently delete the ${confirmAction.lang} publication record? This cannot be undone.`
              : confirmAction.action === 'unpublish'
              ? `Unpublish the ${confirmAction.lang} dataset? It will no longer be downloadable.`
              : `Publish the ${confirmAction.lang} dataset?`
          }
          confirmLabel={confirmAction.action === 'delete' ? 'Delete' : confirmAction.action === 'unpublish' ? 'Unpublish' : 'Publish'}
          danger={confirmAction.action === 'unpublish' || confirmAction.action === 'delete'}
          onConfirm={handleConfirmedAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <div className="card overflow-x-auto">
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Language</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Records</th>
                <th className="pb-2 font-medium">Published</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {langs.map((l) => {
                const pub = pubMap[l.value];
                const isSelected = selectedLang?.value === l.value;
                return (
                  <tr key={l.value}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-liberia-red/5 border-l-2 border-liberia-red' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedLang(isSelected ? null : { value: l.value, label: l.label })}>
                    <td className="py-3 font-medium pl-2">
                      <span className="flex items-center gap-1.5">
                        {isSelected ? '▾' : '▸'} {l.label}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`badge ${pub ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {pub ? 'Published' : 'Unpublished'}
                      </span>
                    </td>
                    <td className="py-3">{pub?.record_count ?? '—'}</td>
                    <td className="py-3 text-gray-400">{pub ? new Date(pub.published_at).toLocaleDateString() : '—'}</td>
                    <td className="py-3 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {pub ? (
                        <>
                          <button onClick={() => setConfirmAction({ lang: l.value, action: 'unpublish' })}
                            disabled={acting === l.value}
                            className="text-xs text-amber-600 font-semibold hover:underline disabled:opacity-50">
                            {acting === l.value ? '…' : 'Unpublish'}
                          </button>
                          <button onClick={() => setConfirmAction({ lang: l.value, action: 'delete' })}
                            disabled={acting === l.value}
                            className="text-xs text-red-500 font-semibold hover:underline disabled:opacity-50">
                            Delete Record
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmAction({ lang: l.value, action: 'publish' })}
                          disabled={acting === l.value}
                          className="text-xs text-liberia-blue font-semibold hover:underline disabled:opacity-50">
                          {acting === l.value ? '…' : 'Publish'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Inline dataset viewer — appears when a language row is clicked */}
      {selectedLang && (
        <LangViewer
          key={selectedLang.value}
          lang={selectedLang.value}
          label={selectedLang.label}
          onClose={() => setSelectedLang(null)}
        />
      )}
    </div>
  );
}

// ── Contributors ──────────────────────────────────────────────────────────────

function ContributorsTab() {
  const [contributors, setContributors] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listContributorsAdmin(page, 20, search)
      .then((res) => {
        setContributors(res.data.contributors);
        setMeta(res.data.pagination);
      })
      .catch(() => setError('Failed to load contributors.'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(deleteTarget.id);
    try {
      await deleteContributor(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete contributor.');
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Contributor Management</h1>
      <p className="text-sm text-gray-500 mb-6">View all contributors and remove those who violate community guidelines.</p>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete contributor "${deleteTarget.name}" and all their data? This cannot be undone.`}
          confirmLabel="Delete Contributor"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="card mb-4">
        <input
          type="text"
          className="input-field w-full md:w-64"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : contributors.length === 0 ? (
          <p className="text-sm text-gray-400">No contributors found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Translations</th>
                <th className="pb-2 font-medium">Reputation</th>
                <th className="pb-2 font-medium">Profile</th>
                <th className="pb-2 font-medium">Joined</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contributors.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium">
                    {c.is_admin && <span className="badge bg-purple-100 text-purple-700 mr-2">Admin</span>}
                    {c.name}
                  </td>
                  <td className="py-3 text-xs text-gray-500">{c.email}</td>
                  <td className="py-3">{c._count.translations}</td>
                  <td className="py-3">{(c.reputation_score || 1).toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`badge ${c.is_profile_complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {c.is_profile_complete ? 'Complete' : 'Incomplete'}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="py-3">
                    {c.is_admin ? (
                      <span className="text-xs text-gray-300 font-medium" title="Demote this account from admin before deleting">
                        🔒 Admin
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(c)}
                        disabled={deleting === c.id}
                        className="text-xs text-red-500 font-semibold hover:underline disabled:opacity-50"
                      >
                        {deleting === c.id ? '…' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-gray-500 self-center">Page {page} of {meta.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
            className="btn-secondary text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-xl p-5 ${accent ? 'bg-liberia-red text-white' : 'bg-white border border-gray-100 shadow-sm'}`}>
      <p className={`text-4xl font-black ${accent ? 'text-white' : 'text-liberia-red'}`}>{value}</p>
      <p className={`text-sm font-semibold mt-1 ${accent ? 'text-red-100' : 'text-gray-700'}`}>{label}</p>
      {sub && <p className={`text-xs mt-0.5 ${accent ? 'text-red-200' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

function HBar({ label, value, max, secondValue, secondLabel }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const pct2 = max > 0 && secondValue ? Math.round((secondValue / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm font-medium text-gray-700 w-28 flex-shrink-0 text-right">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden flex">
        {secondValue != null && (
          <div className="h-full bg-liberia-red/20 transition-all" style={{ width: `${pct2}%` }} title={`${secondLabel}: ${secondValue}`} />
        )}
        <div className="h-full bg-liberia-red transition-all" style={{ width: `${pct}%` }} title={`${value}`} />
      </div>
      <span className="text-sm font-bold text-gray-800 w-8 text-right">{value}</span>
    </div>
  );
}

function StatsTab() {
  const apiLangs = useLanguages();
  const langs = apiLangs.length > 0 ? apiLangs : FALLBACK_LANGUAGES;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getStats()
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxLangTotal = stats
    ? Math.max(...langs.map((l) => stats.per_language?.[l.value]?.total || 0), 1)
    : 1;
  const maxDomain = stats
    ? Math.max(...(stats.domain_breakdown?.map((d) => d.sample_count) || [1]), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Platform Stats</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live snapshot of dataset collection progress.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {!stats && !error && <p className="text-gray-400 text-sm">Loading…</p>}

      {stats && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard accent label="Total Translations" value={stats.total_translations.toLocaleString()}
              sub={`${stats.total_validated} validated`} />
            <StatCard label="Source Sentences" value={stats.total_samples.toLocaleString()}
              sub="English corpus size" />
            <StatCard label="Contributors" value={stats.total_contributors.toLocaleString()}
              sub="Active accounts" />
            <StatCard label="Avg Quality" value={stats.average_quality_score
              ? `${(stats.average_quality_score * 100).toFixed(0)}%` : '—'}
              sub={`${stats.validation_rate}% validation rate`} />
          </div>

          {/* Audio vs Text */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <h3 className="font-black text-gray-800 mb-1">Text vs Audio Submissions</h3>
            <p className="text-xs text-gray-400 mb-4">Contributors can optionally record spoken translations alongside text.</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 bg-liberia-red/5 rounded-xl border border-liberia-red/20">
                <p className="text-3xl font-black text-liberia-red">{stats.text_only?.toLocaleString() ?? 0}</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">Text Only</p>
              </div>
              <div className="text-center p-4 bg-liberia-red/5 rounded-xl border border-liberia-red/20">
                <p className="text-3xl font-black text-liberia-red">{stats.audio_recordings?.toLocaleString() ?? 0}</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">With Audio Recording</p>
              </div>
            </div>
            {stats.total_translations > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Audio coverage</span>
                  <span>{Math.round(((stats.audio_recordings ?? 0) / stats.total_translations) * 100)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-liberia-red rounded-full transition-all"
                    style={{ width: `${Math.round(((stats.audio_recordings ?? 0) / stats.total_translations) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Per-language bar chart */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <h3 className="font-black text-gray-800 mb-1">Translations per Language</h3>
            <p className="text-xs text-gray-400 mb-4">Red bar = total · lighter overlay = validated · each language needs 3 translations per sentence to lock it.</p>
            <div className="space-y-0.5">
              {langs.map((l) => {
                const d = stats.per_language?.[l.value] || {};
                return (
                  <HBar key={l.value} label={l.label}
                    value={d.total || 0}
                    secondValue={d.validated || 0}
                    secondLabel="Validated"
                    max={maxLangTotal} />
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-liberia-red inline-block" />Total</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-liberia-red/20 inline-block" />Validated</span>
            </div>
          </div>

          {/* Locked samples */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <h3 className="font-black text-gray-800 mb-1">Fully Covered Sentences (Locked)</h3>
            <p className="text-xs text-gray-400 mb-4">A sentence is locked per language once it has received 3 translations. This shows collection completeness.</p>
            <div className="space-y-0.5">
              {langs.map((l) => {
                const locked = stats.per_language?.[l.value]?.locked_samples || 0;
                return (
                  <HBar key={l.value} label={l.label} value={locked} max={stats.total_samples} />
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">out of {stats.total_samples} source sentences</p>
          </div>

          {/* Domain breakdown */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <h3 className="font-black text-gray-800 mb-1">Source Sentence Domains</h3>
            <p className="text-xs text-gray-400 mb-4">Distribution of English source sentences by topic — ensures the dataset covers diverse real-world contexts.</p>
            <div className="space-y-0.5">
              {stats.domain_breakdown?.sort((a, b) => b.sample_count - a.sample_count).map((d) => (
                <HBar key={d.domain} label={d.domain} value={d.sample_count} max={maxDomain} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Campaigns ────────────────────────────────────────────────────────────────

const CAMPAIGN_LANGS    = ['kpelle','bassa','grebo','vai','mende','loma','krahn','dan'];
const CAMPAIGN_DOMAINS  = ['','general','health','legal','education','news','conversational'];
const STATUS_BADGE_CAMP = {
  ACTIVE:    'bg-green-100 text-green-700',
  UPCOMING:  'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-500',
};

const EMPTY_FORM = { title:'', description:'', language:'kpelle', domain:'', goal:100, start_date:'', end_date:'', badge_slug:'' };

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editing, setEditing]     = useState(null); // campaign id being edited
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listCampaigns()
      .then((r) => setCampaigns(r.data))
      .catch(() => setError('Failed to load campaigns.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, goal: parseInt(form.goal, 10), domain: form.domain || null };
      if (editing) await updateCampaign(editing, payload);
      else         await createCampaign(payload);
      setForm(EMPTY_FORM); setEditing(null); setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleEdit = (c) => {
    setForm({
      title: c.title, description: c.description || '', language: c.language,
      domain: c.domain || '', goal: c.goal,
      start_date: c.start_date?.slice(0,10), end_date: c.end_date?.slice(0,10),
      badge_slug: c.badge_slug || '',
    });
    setEditing(c.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await deleteCampaign(id).catch(() => {});
    load();
  };

  const handleToggle = async (c) => {
    await updateCampaign(c.id, { is_active: !c.is_active });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Drive focused translation collection for specific languages or domains.</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); setShowForm((v) => !v); }}
          className="bg-liberia-red hover:bg-red-800 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
          {showForm ? 'Cancel' : '+ New Campaign'}
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="font-black text-gray-800">{editing ? 'Edit Campaign' : 'New Campaign'}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
              <input required value={form.title} onChange={setF('title')} className="input-field" placeholder="e.g. Kpelle Health Month" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={setF('description')} className="input-field resize-none" placeholder="Brief description shown to contributors…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Language *</label>
              <select required value={form.language} onChange={setF('language')} className="input-field bg-white">
                {CAMPAIGN_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Domain (optional)</label>
              <select value={form.domain} onChange={setF('domain')} className="input-field bg-white">
                {CAMPAIGN_DOMAINS.map(d => <option key={d} value={d}>{d || 'All domains'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Goal (translations) *</label>
              <input required type="number" min="1" value={form.goal} onChange={setF('goal')} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Badge slug (optional)</label>
              <input value={form.badge_slug} onChange={setF('badge_slug')} className="input-field" placeholder="e.g. campaign_hero" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date *</label>
              <input required type="date" value={form.start_date} onChange={setF('start_date')} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date *</label>
              <input required type="date" value={form.end_date} onChange={setF('end_date')} className="input-field" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="bg-liberia-red hover:bg-red-800 disabled:opacity-60 text-white font-bold px-6 py-2 rounded-lg text-sm">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Campaign'}
          </button>
        </form>
      )}

      {/* List */}
      {loading ? <p className="text-sm text-gray-400">Loading…</p> : campaigns.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🎯</p>
          <p className="font-semibold">No campaigns yet. Create one to focus contributor efforts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-black text-gray-900">{c.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE_CAMP[c.derived_status] || 'bg-gray-100 text-gray-500'}`}>
                      {c.derived_status}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 capitalize">{c.language}</span>
                    {c.domain && <span className="text-xs text-gray-400 capitalize">{c.domain}</span>}
                  </div>
                  {c.description && <p className="text-sm text-gray-500 mb-2">{c.description}</p>}
                  <p className="text-xs text-gray-400">
                    {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}
                    {' · '}{c.creator?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(c)} className="text-xs text-liberia-blue font-semibold hover:underline">Edit</button>
                  <button onClick={() => handleToggle(c)} className="text-xs text-amber-600 font-semibold hover:underline">
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 font-semibold hover:underline">Delete</button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{c.progress.toLocaleString()} / {c.goal.toLocaleString()} translations</span>
                  <span className="font-bold text-liberia-red">{c.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-liberia-red rounded-full transition-all" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Support Tickets ───────────────────────────────────────────────────────────

const STATUS_COLORS = {
  OPEN:        'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED:    'bg-green-100 text-green-800',
  CLOSED:      'bg-gray-100 text-gray-600',
};
const PRIORITY_COLORS = {
  LOW:    'bg-gray-100 text-gray-500',
  NORMAL: 'bg-blue-50 text-blue-600',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};
const ALL_STATUSES   = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const ALL_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const ALL_CATEGORIES = ['GENERAL', 'TECHNICAL', 'TRANSLATION_QUALITY', 'ACCOUNT', 'DATA_REQUEST', 'FUNDING', 'OTHER'];

function SupportTab() {
  const [tickets, setTickets]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [selected, setSelected]     = useState(null); // ticket being viewed
  const [stats, setStats]           = useState(null);

  // Detail panel state
  const [response, setResponse]     = useState('');
  const [newStatus, setNewStatus]   = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: 25 };
    if (filterStatus)   params.status   = filterStatus;
    if (filterCategory) params.category = filterCategory;
    Promise.all([
      listTickets(params),
      getTicketStats(),
    ])
      .then(([tRes, sRes]) => {
        setTickets(tRes.data.tickets);
        setTotal(tRes.data.total);
        setStats(sRes.data);
      })
      .catch(() => setError('Failed to load tickets.'))
      .finally(() => setLoading(false));
  }, [page, filterStatus, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const openTicket = (t) => {
    setSelected(t);
    setResponse(t.response || '');
    setNewStatus(t.status);
    setNewPriority(t.priority);
    setSaveMsg('');
  };

  const saveTicket = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await updateTicket(selected.id, {
        status:   newStatus,
        priority: newPriority,
        response: response,
      });
      setSaveMsg('Saved.');
      setSelected(updated.data);
      load();
    } catch {
      setSaveMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-1">Support Tickets</h1>
      <p className="text-gray-500 text-sm mb-6">Messages submitted via the Contact page.</p>

      {/* Stats row */}
      {stats && (
        <div className="flex flex-wrap gap-3 mb-6">
          {stats.by_status.map(s => (
            <span key={s.status} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
              {s.status}: {s._count}
            </span>
          ))}
        </div>
      )}

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">All Categories</option>
          {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">Refresh</button>
      </div>

      <div className="flex gap-6">
        {/* Ticket list */}
        <div className="flex-1 min-w-0">
          <div className="card overflow-x-auto">
            {loading ? <p className="text-sm text-gray-400">Loading…</p> : tickets.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No tickets found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">Category</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium hidden md:table-cell">Priority</th>
                    <th className="pb-2 font-medium hidden lg:table-cell">From</th>
                    <th className="pb-2 font-medium hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tickets.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => openTicket(t)}
                      className={`hover:bg-gray-50 cursor-pointer ${selected?.id === t.id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="py-2 pr-3 font-medium text-gray-800 max-w-[180px] truncate">{t.subject}</td>
                      <td className="py-2 pr-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-500">{t.category.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="py-2 pr-3 hidden md:table-cell">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                      </td>
                      <td className="py-2 pr-3 hidden lg:table-cell text-gray-500 text-xs">{t.name}</td>
                      <td className="py-2 text-gray-400 text-xs hidden lg:table-cell">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination */}
          {total > 25 && (
            <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
              <span>{total} tickets total</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Prev</button>
                <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 text-sm self-start">
            <div className="flex items-start justify-between">
              <h3 className="font-black text-gray-800 leading-snug">{selected.subject}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-2">×</button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <div><span className="font-semibold text-gray-700">From:</span> {selected.name} ({selected.email})</div>
              <div><span className="font-semibold text-gray-700">Category:</span> {selected.category.replace(/_/g, ' ')}</div>
              <div><span className="font-semibold text-gray-700">Submitted:</span> {new Date(selected.created_at).toLocaleString()}</div>
              {selected.contributor && (
                <div><span className="font-semibold text-gray-700">Account:</span> Rep {selected.contributor.reputation_score?.toFixed(1)}</div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-xs leading-relaxed max-h-40 overflow-y-auto">
              {selected.message}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white">
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">Priority</label>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white">
                {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">Internal Response / Notes</label>
              <textarea
                rows={4}
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Add a note or response…"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-liberia-blue"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveTicket}
                disabled={saving}
                className="bg-liberia-blue hover:bg-blue-900 disabled:opacity-60 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saveMsg && <span className="text-xs text-gray-500">{saveMsg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Donations ─────────────────────────────────────────────────────────────────

const PROVIDER_COLORS = {
  STRIPE:   'bg-indigo-100 text-indigo-700',
  MTN_MOMO: 'bg-yellow-100 text-yellow-800',
};
const DONATION_STATUS_COLORS = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  FAILED:    'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function DonationsTab() {
  const [donations, setDonations] = useState([]);
  const [total, setTotal]         = useState(0);
  const [stats, setStats]         = useState([]);
  const [page, setPage]           = useState(1);
  const [filterStatus, setFilter] = useState('');
  const [filterProvider, setProvider] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: 50 };
    if (filterStatus)   params.status   = filterStatus;
    if (filterProvider) params.provider = filterProvider;
    listDonations(params)
      .then((r) => { setDonations(r.data.donations); setTotal(r.data.total); setStats(r.data.stats || []); })
      .catch(() => setError('Failed to load donations.'))
      .finally(() => setLoading(false));
  }, [page, filterStatus, filterProvider]);

  useEffect(() => { load(); }, [load]);

  const totalRaised = stats
    .filter((s) => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + (s._sum?.amount || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-1">Donations</h1>
      <p className="text-sm text-gray-500 mb-6">All donation transactions via Stripe and MTN Mobile Money.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-liberia-red text-white rounded-xl p-4 text-center">
          <p className="text-3xl font-black">${totalRaised.toFixed(2)}</p>
          <p className="text-red-100 text-xs mt-1">Total Raised</p>
        </div>
        {['COMPLETED', 'PENDING', 'FAILED'].map((s) => {
          const row = stats.find((r) => r.status === s);
          return (
            <div key={s} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-gray-800">{row?._count ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">{s.toLowerCase()}</p>
            </div>
          );
        })}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterStatus} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">All Statuses</option>
          {['COMPLETED','PENDING','FAILED','CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterProvider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">All Methods</option>
          <option value="STRIPE">Stripe (Card)</option>
          <option value="MTN_MOMO">MTN Mobile Money</option>
        </select>
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">Refresh</button>
        <span className="text-sm text-gray-400 self-center ml-auto">{total} records</span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : donations.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No donations yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Donor</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="py-2 text-xs text-gray-400">{new Date(d.created_at).toLocaleString()}</td>
                  <td className="py-2">
                    {d.is_anonymous ? (
                      <span className="text-gray-400 italic text-xs">Anonymous</span>
                    ) : (
                      <div>
                        <p className="font-medium text-gray-800">{d.donor_name || '—'}</p>
                        <p className="text-xs text-gray-400">{d.donor_email || ''}</p>
                      </div>
                    )}
                  </td>
                  <td className="py-2 font-black text-gray-800">
                    {d.amount.toFixed(2)} <span className="text-xs font-normal text-gray-400">{d.currency}</span>
                  </td>
                  <td className="py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROVIDER_COLORS[d.provider] || 'bg-gray-100 text-gray-600'}`}>
                      {d.provider === 'STRIPE' ? '💳 Card' : '📱 MTN'}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DONATION_STATUS_COLORS[d.status] || 'bg-gray-100'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500 max-w-xs truncate">{d.message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 50 && (
        <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Prev</button>
            <button disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
