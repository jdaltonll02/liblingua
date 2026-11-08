import { useState, useEffect, useCallback } from 'react';
import { createManualTranslation, listManualTranslations, deleteManualTranslation } from '../api/admin';
import { useLanguages, LANGUAGES as FALLBACK_LANGUAGES } from './LanguageSelector';
const MT_DOMAINS      = ['general','health','legal','education','news','conversational'];
const MT_DIFFICULTIES = ['easy','medium','hard'];

const DOMAIN_BADGE = {
  health: 'bg-green-100 text-green-700',  legal: 'bg-purple-100 text-purple-700',
  education: 'bg-blue-100 text-blue-700', news: 'bg-yellow-100 text-yellow-800',
  conversational: 'bg-pink-100 text-pink-700', general: 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = (firstLang = '') => ({
  source_text: '', domain: 'general', difficulty: 'medium',
  target_language: firstLang, dialect: '', translated_text: '',
  quality_score: '1.0', is_gold_standard: false,
});

export default function ManualTranslateTab() {
  const apiLangs = useLanguages();
  const MT_LANGUAGES = apiLangs.length > 0 ? apiLangs : FALLBACK_LANGUAGES;

  const [form, setForm]           = useState(() => EMPTY_FORM(MT_LANGUAGES[0]?.value || ''));
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');
  const [saveErr, setSaveErr]     = useState('');
  const [history, setHistory]     = useState([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histPage, setHistPage]   = useState(1);
  const [histLoading, setHistLoading] = useState(false);
  const [filterLang, setFilterLang]   = useState('');
  const [deleting, setDeleting]       = useState(null);

  // Once API languages load, seed the form with the first language if none set
  useEffect(() => {
    if (MT_LANGUAGES.length > 0 && !form.target_language) {
      setForm((f) => ({ ...f, target_language: MT_LANGUAGES[0].value }));
    }
  }, [MT_LANGUAGES.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const setF = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const loadHistory = useCallback(() => {
    setHistLoading(true);
    listManualTranslations({ page: histPage, limit: 25, language: filterLang || undefined })
      .then((r) => { setHistory(r.data.translations); setHistTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [histPage, filterLang]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveMsg(''); setSaveErr('');
    try {
      const res = await createManualTranslation({
        ...form,
        quality_score: parseFloat(form.quality_score),
      });
      setSaveMsg(res.data.message);
      setForm(EMPTY);
      loadHistory();
    } catch (err) {
      setSaveErr(err.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this translation?')) return;
    setDeleting(id);
    await deleteManualTranslation(id).catch(() => {});
    setDeleting(null);
    loadHistory();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">My Translations</h1>
        <p className="text-sm text-gray-500">
          Enter any English text and your translation directly — no random sampling.
          All submissions are auto-validated at the quality score you set.
          This tool is for admin use only.
        </p>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-black text-gray-800 text-lg">New Translation</h2>

        {/* English source */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            English Source Text <span className="text-liberia-red">*</span>
          </label>
          <textarea
            required rows={3}
            value={form.source_text}
            onChange={setF('source_text')}
            placeholder="Type or paste the English sentence you want to translate…"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red resize-none transition-shadow"
          />
          <p className="text-xs text-gray-400 mt-1">
            If this text already exists in the corpus the existing sample will be reused.
          </p>
        </div>

        {/* Domain + Difficulty */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Domain <span className="text-liberia-red">*</span></label>
            <select value={form.domain} onChange={setF('domain')}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red bg-white capitalize">
              {MT_DOMAINS.map(d => (
                <option key={d} value={d} className="capitalize">{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty</label>
            <select value={form.difficulty} onChange={setF('difficulty')}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red bg-white capitalize">
              {MT_DIFFICULTIES.map(d => (
                <option key={d} value={d} className="capitalize">{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Target language + dialect */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Target Language <span className="text-liberia-red">*</span></label>
            <select value={form.target_language} onChange={setF('target_language')}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red bg-white">
              {MT_LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Dialect (optional)</label>
            <input
              value={form.dialect}
              onChange={setF('dialect')}
              placeholder="e.g. Central Kpelle"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red"
            />
          </div>
        </div>

        {/* Translation */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Your Translation <span className="text-liberia-red">*</span>
          </label>
          <textarea
            required rows={4}
            value={form.translated_text}
            onChange={setF('translated_text')}
            placeholder="Type your translation here…"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red resize-none transition-shadow"
          />
        </div>

        {/* Quality + Gold standard */}
        <div className="flex flex-wrap items-center gap-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Quality Score</label>
            <input
              type="number" min="0" max="1" step="0.01"
              value={form.quality_score}
              onChange={setF('quality_score')}
              className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red text-center"
            />
            <span className="text-xs text-gray-400">0–1 · default 1.0</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_gold_standard}
              onChange={setF('is_gold_standard')}
              className="w-4 h-4 accent-liberia-red rounded"
            />
            <span>Mark as <strong>Gold Standard</strong></span>
          </label>
        </div>

        {/* Feedback */}
        {saveMsg && (
          <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
            <span>✓</span> {saveMsg}
          </p>
        )}
        {saveErr && (
          <p className="text-sm font-semibold text-liberia-red">{saveErr}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-liberia-red hover:bg-red-800 disabled:opacity-60 text-white font-black px-10 py-3 rounded-xl transition-colors text-sm">
          {saving ? 'Saving…' : 'Save Translation'}
        </button>
      </form>

      {/* ── History ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-black text-gray-800 text-lg">My Translation History</h2>
          <div className="flex items-center gap-3">
            <select value={filterLang}
              onChange={(e) => { setFilterLang(e.target.value); setHistPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="">All Languages</option>
              {MT_LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400 font-medium">
              {histTotal} record{histTotal !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {histLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">✍️</p>
            <p className="font-semibold">No translations yet.</p>
            <p className="text-sm mt-1">Use the form above to add your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((t) => (
              <div key={t.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Metadata row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-black uppercase tracking-wide text-liberia-red capitalize">
                        {t.target_language}
                      </span>
                      {t.dialect && (
                        <span className="text-xs text-gray-400">· {t.dialect}</span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DOMAIN_BADGE[t.sample?.domain] || 'bg-gray-100 text-gray-500'}`}>
                        {t.sample?.domain}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        t.sample?.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700'
                        : t.sample?.difficulty === 'hard' ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.sample?.difficulty}
                      </span>
                      {t.sample?.is_gold_standard && (
                        <span className="text-xs font-bold text-amber-600">⭐ Gold</span>
                      )}
                      {t.is_validated && (
                        <span className="text-xs font-bold text-green-600">✓ Validated</span>
                      )}
                      {t.quality_score != null && (
                        <span className="text-xs text-gray-500 font-medium">
                          Q: {(t.quality_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    {/* Source text */}
                    <p className="text-xs text-gray-400 mb-1.5 leading-relaxed">
                      <span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mr-1">EN</span>
                      {t.sample?.text}
                    </p>

                    {/* Translation */}
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">
                      <span className="font-black text-liberia-red uppercase tracking-wide text-[10px] mr-1 capitalize">
                        {t.target_language}
                      </span>
                      {t.translated_text}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-xs text-gray-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      className="text-xs text-red-400 hover:text-red-600 font-semibold disabled:opacity-40 transition-colors">
                      {deleting === t.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {histTotal > 25 && (
          <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
            <span>Page {histPage} · {histTotal} total</span>
            <div className="flex gap-2">
              <button disabled={histPage === 1} onClick={() => setHistPage(p => p - 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">← Prev</button>
              <button disabled={histPage * 25 >= histTotal} onClick={() => setHistPage(p => p + 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
