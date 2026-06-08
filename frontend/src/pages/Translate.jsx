import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import LanguageSelector, { useLanguages, LANGUAGES as FALLBACK_LANGUAGES } from '../components/LanguageSelector';
import AudioPlayer from '../components/AudioPlayer';
import AudioRecorder from '../components/AudioRecorder';
import { getRandomSample, getProgress } from '../api/samples';
import { submitTranslation } from '../api/translations';
import CampaignBanner from '../components/CampaignBanner';

const DOMAIN_COLORS = {
  health: 'bg-green-100 text-green-700',
  legal: 'bg-purple-100 text-purple-700',
  education: 'bg-blue-100 text-blue-700',
  news: 'bg-yellow-100 text-yellow-700',
  conversational: 'bg-pink-100 text-pink-700',
  general: 'bg-gray-100 text-gray-600',
};

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
};

export default function Translate() {
  const { user } = useAuth();
  const apiLangs = useLanguages();
  const langs = apiLangs.length > 0 ? apiLangs : FALLBACK_LANGUAGES;
  const defaultLang = langs.find((l) => l.value === user?.native_language)?.value || langs[0]?.value || '';

  const [language, setLanguage] = useState(defaultLang);
  const [dialect, setDialect] = useState(user?.native_dialect || '');
  const [sample, setSample] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [englishAudioFile, setEnglishAudioFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | submitting | success | error | exhausted
  const [message, setMessage] = useState('');

  const fetchSample = useCallback(async (lang) => {
    setStatus('loading');
    setMessage('');
    setTranslatedText('');
    setAudioFile(null);
    setEnglishAudioFile(null);
    setSample(null);
    try {
      const [sampleRes, progressRes] = await Promise.all([
        getRandomSample(lang),
        getProgress(lang),
      ]);
      setSample(sampleRes.data);
      setProgress(progressRes.data);
      setStatus('idle');
    } catch (err) {
      if (err.response?.status === 404) {
        setStatus('exhausted');
        setMessage(err.response.data.error);
      } else {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Failed to load a sample. Please try again.');
      }
    }
  }, []);

  useEffect(() => {
    fetchSample(language);
  }, [language, fetchSample]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  const canSubmit = Boolean(translatedText.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');

    try {
      const formData = new FormData();
      formData.append('sample_id', sample.id);
      formData.append('target_language', language);
      formData.append('translated_text', translatedText.trim());
      if (dialect) formData.append('dialect', dialect);
      if (englishAudioFile) formData.append('english_audio', englishAudioFile);
      if (audioFile) formData.append('audio', audioFile);

      await submitTranslation(formData);
      setStatus('success');
      setMessage('Translation submitted! Loading next sample…');
      setTimeout(() => fetchSample(language), 1800);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Submission failed. Please try again.');
    }
  };

  const progressPct = progress
    ? Math.round(((progress.total - progress.remaining) / progress.total) * 100)
    : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Translation Workspace</h1>
          <p className="text-gray-500 mt-1">Read the English text aloud, then record your spoken translation.</p>
        </div>

        {/* Active campaign for current language */}
        <CampaignBanner currentLanguage={language} />

        {/* Language + Progress bar */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <LanguageSelector value={language} onChange={handleLanguageChange} className="flex-1" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Dialect (optional)</label>
              <input className="input-field" placeholder="e.g. Central Kpelle"
                value={dialect} onChange={(e) => setDialect(e.target.value)} />
            </div>
          </div>

          {progress && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Language completion</span>
                <span>{progress.locked} / {progress.total} samples completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-liberia-blue rounded-full h-2 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Status messages */}
        {status === 'success' && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
            ✓ {message}
          </div>
        )}
        {status === 'error' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {message}
            <button onClick={() => fetchSample(language)} className="ml-3 underline font-medium">Retry</button>
          </div>
        )}
        {status === 'exhausted' && (
          <div className="card text-center py-12">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-2xl font-bold mb-2">All done for this language!</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <p className="text-sm text-gray-400">Try switching to another language above.</p>
          </div>
        )}

        {/* Sample card */}
        {status === 'loading' && (
          <div className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
          </div>
        )}

        {sample && status !== 'loading' && status !== 'exhausted' && (
          <form onSubmit={handleSubmit}>
            {/* Source sample */}
            <div className="card mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${DOMAIN_COLORS[sample.domain] || 'bg-gray-100 text-gray-600'}`}>
                  {sample.domain}
                </span>
                <span className={`badge ${DIFFICULTY_COLORS[sample.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                  {sample.difficulty}
                </span>
                <span className="ml-auto text-xs text-gray-400 font-mono">{sample.id.slice(0, 8)}…</span>
              </div>

              <p className="text-xl font-medium leading-relaxed text-gray-800 select-text">
                {sample.text}
              </p>

              <AudioPlayer src={sample.audio_path} />

              {/* Step 1: English reading */}
              <AudioRecorder
                label="Step 1 — Read the English text aloud (optional)"
                onRecorded={setEnglishAudioFile}
              />
            </div>

            {/* Translation input */}
            <div className="card">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your translation into{' '}
                <span className="text-liberia-blue capitalize">
                  {langs.find((l) => l.value === language)?.label || language}
                </span>
                {dialect && <span className="text-gray-400 font-normal"> ({dialect})</span>}
              </label>
              <textarea
                className="input-field min-h-[140px] resize-y text-base"
                placeholder={`Write your ${langs.find((l) => l.value === language)?.label || language} translation here…`}
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                required
              />

              {/* Step 2: Target language recording */}
              <AudioRecorder
                label="Step 2 — Record your spoken translation (optional)"
                onRecorded={setAudioFile}
              />

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  disabled={status === 'submitting' || !canSubmit}
                  className="btn-primary flex-1"
                >
                  {status === 'submitting' ? 'Submitting…' : 'Submit Translation'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchSample(language)}
                  disabled={status === 'submitting' || status === 'loading'}
                  className="btn-secondary"
                >
                  Skip
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
