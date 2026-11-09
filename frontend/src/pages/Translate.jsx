import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import LanguageSelector, { useLanguages, LANGUAGES as FALLBACK_LANGUAGES } from '../components/LanguageSelector';
import AudioPlayer from '../components/AudioPlayer';
import AudioRecorder from '../components/AudioRecorder';
import { createContributorSample, getRandomSample, getProgress } from '../api/samples';
import { submitTranslation } from '../api/translations';
import CampaignBanner from '../components/CampaignBanner';
import { getLinguisticMetadata, getMyLanguageProfiles, saveMyLanguageProfile } from '../api/linguisticMetadata';

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
  const [metadata, setMetadata] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [varietyId, setVarietyId] = useState('');
  const [orthographyId, setOrthographyId] = useState('');
  const [guidelineId, setGuidelineId] = useState('');
  const [register, setRegister] = useState('GENERAL');
  const [uncertainty, setUncertainty] = useState('CONFIDENT');
  const [annotationOutcome, setAnnotationOutcome] = useState('TRANSLATED');
  const [alternativeTranslation, setAlternativeTranslation] = useState('');
  const [annotationNotes, setAnnotationNotes] = useState('');
  const [containsCodeSwitching, setContainsCodeSwitching] = useState(false);
  const [codeSwitchingNotes, setCodeSwitchingNotes] = useState('');
  const [sourceMode, setSourceMode] = useState('random');
  const [ownSource, setOwnSource] = useState({ text: '', domain: 'conversational', difficulty: 'easy' });
  const [ownSourceAttested, setOwnSourceAttested] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    speaking_proficiency: 'PROFICIENT', reading_proficiency: 'WORKING',
    writing_proficiency: 'WORKING', usage_frequency: 'DAILY', is_first_language: true,
  });

  const varieties = metadata?.varieties || [];
  const selectedVariety = varieties.find((item) => item.id === varietyId);
  const orthographies = selectedVariety?.orthographies || [];
  const guidelines = (selectedVariety?.guidelines || []).filter(
    (item) => !item.orthography_id || item.orthography_id === orthographyId,
  );
  const hasProfile = profiles.some((profile) => profile.variety_id === varietyId);

  useEffect(() => {
    let active = true;
    Promise.all([getLinguisticMetadata(language), getMyLanguageProfiles()])
      .then(([metadataRes, profilesRes]) => {
        if (!active) return;
        const languageMetadata = metadataRes.data[0] || null;
        setMetadata(languageMetadata);
        setProfiles(profilesRes.data);
        const firstVariety = languageMetadata?.varieties?.[0];
        setVarietyId(firstVariety?.id || '');
        const firstOrthography = firstVariety?.orthographies?.find((item) => item.is_default) || firstVariety?.orthographies?.[0];
        setOrthographyId(firstOrthography?.id || '');
        const firstGuideline = firstVariety?.guidelines?.find(
          (item) => !item.orthography_id || item.orthography_id === firstOrthography?.id,
        );
        setGuidelineId(firstGuideline?.id || '');
      })
      .catch(() => {
        if (active) setMetadata(null);
      });
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    const firstOrthography = orthographies.find((item) => item.is_default) || orthographies[0];
    if (!orthographies.some((item) => item.id === orthographyId)) setOrthographyId(firstOrthography?.id || '');
  }, [varietyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!guidelines.some((item) => item.id === guidelineId)) setGuidelineId(guidelines[0]?.id || '');
  }, [orthographyId, varietyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSample = useCallback(async (lang) => {
    setStatus('loading');
    setMessage('');
    setTranslatedText('');
    setAudioFile(null);
    setEnglishAudioFile(null);
    setSample(null);
    setSourceMode('random');
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

  const needsText = annotationOutcome === 'TRANSLATED';
  const canSubmit = Boolean(
    varietyId && orthographyId && guidelineId && hasProfile &&
    (needsText ? translatedText.trim() : annotationNotes.trim()) &&
    (!containsCodeSwitching || codeSwitchingNotes.trim()),
  );

  const saveProfile = async () => {
    try {
      const response = await saveMyLanguageProfile({ variety_id: varietyId, ...profileDraft });
      setProfiles((current) => [...current.filter((item) => item.variety_id !== varietyId), response.data]);
      setMessage('Language profile saved. You can now contribute to this variety.');
      setStatus('success');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not save the language profile.');
      setStatus('error');
    }
  };

  const useOwnSentence = async () => {
    if (!ownSourceAttested || ownSource.text.trim().length < 10) return;
    setStatus('loading'); setMessage('');
    try {
      const response = await createContributorSample({
        ...ownSource,
        text: ownSource.text.trim(),
        originality_attested: true,
        contains_personal_data: false,
      });
      setSample({ ...response.data.sample, participant_authored: true });
      setTranslatedText(''); setAudioFile(null); setEnglishAudioFile(null);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Could not prepare your sentence for translation.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');

    try {
      const formData = new FormData();
      formData.append('sample_id', sample.id);
      formData.append('target_language', language);
      formData.append('translated_text', translatedText.trim());
      formData.append('language_variety_id', varietyId);
      formData.append('orthography_id', orthographyId);
      formData.append('guideline_id', guidelineId);
      formData.append('register', register);
      formData.append('uncertainty', uncertainty);
      formData.append('annotation_outcome', annotationOutcome);
      formData.append('contains_code_switching', String(containsCodeSwitching));
      if (codeSwitchingNotes) formData.append('code_switching_notes', codeSwitchingNotes.trim());
      if (alternativeTranslation) formData.append('alternative_translation', alternativeTranslation.trim());
      if (annotationNotes) formData.append('annotation_notes', annotationNotes.trim());
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
          <div className="grid sm:grid-cols-2 gap-4">
            <LanguageSelector value={language} onChange={handleLanguageChange} className="flex-1" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Language variety</label>
              <select className="input-field" value={varietyId} onChange={(e) => setVarietyId(e.target.value)}>
                <option value="">-- Select an approved variety --</option>
                {varieties.map((item) => <option key={item.id} value={item.id}>{item.name}{item.autonym ? ` / ${item.autonym}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orthography</label>
              <select className="input-field" value={orthographyId} onChange={(e) => setOrthographyId(e.target.value)}>
                <option value="">-- Select orthography --</option>
                {orthographies.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.script})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional dialect note (optional)</label>
              <input className="input-field" value={dialect} onChange={(e) => setDialect(e.target.value)} />
            </div>
          </div>

          {!metadata && <p className="mt-4 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">Collection is paused for this language until an approved variety, orthography, and annotation guideline are activated.</p>}
          {selectedVariety && !hasProfile && (
            <div className="mt-4 border border-blue-200 bg-blue-50 p-4 rounded-xl">
              <h2 className="font-semibold text-blue-900">Complete your language profile</h2>
              <p className="text-sm text-blue-700 mt-1">This self-report is required to interpret who produced each annotation.</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {['speaking_proficiency', 'reading_proficiency', 'writing_proficiency'].map((field) => (
                  <label key={field} className="text-sm capitalize">{field.replace('_', ' ')}
                    <select className="input-field mt-1" value={profileDraft[field]} onChange={(e) => setProfileDraft({ ...profileDraft, [field]: e.target.value })}>
                      {['NONE', 'LIMITED', 'WORKING', 'PROFICIENT', 'DOMINANT'].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                ))}
                <label className="text-sm">Usage frequency
                  <select className="input-field mt-1" value={profileDraft.usage_frequency} onChange={(e) => setProfileDraft({ ...profileDraft, usage_frequency: e.target.value })}>
                    {['RARELY', 'MONTHLY', 'WEEKLY', 'DAILY'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
              </div>
              <label className="flex gap-2 items-center mt-3 text-sm"><input type="checkbox" checked={profileDraft.is_first_language} onChange={(e) => setProfileDraft({ ...profileDraft, is_first_language: e.target.checked })} /> This is one of my first languages</label>
              <button type="button" className="btn-secondary mt-3" onClick={saveProfile}>Save language profile</button>
            </div>
          )}

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

        <div className="card mb-6 border-blue-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-bold text-gray-900">Source sentence</h2><p className="text-sm text-gray-600 mt-1">Translating the sentence selected by LibLingua is strongly encouraged because it keeps the dataset balanced.</p></div>
            <button type="button" className="btn-secondary" onClick={() => setSourceMode(sourceMode === 'own' ? 'random' : 'own')}>{sourceMode === 'own' ? 'Use selected sentence' : 'Translate my own sentence'}</button>
          </div>
          {sourceMode === 'own' && <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-900"><strong>Optional and reviewed separately.</strong> Write a sentence you created yourself. Do not copy text or include anyone’s name, contact details, medical details, or other private information. It stays out of dataset releases until reviewed.</p>
            <textarea className="input-field mt-3 min-h-[100px]" maxLength={1000} placeholder="Enter an original English source sentence…" value={ownSource.text} onChange={(e) => setOwnSource({ ...ownSource, text: e.target.value })} />
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <label className="text-sm">Domain<select className="input-field mt-1" value={ownSource.domain} onChange={(e) => setOwnSource({ ...ownSource, domain: e.target.value })}>{Object.keys(DOMAIN_COLORS).map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-sm">Difficulty<select className="input-field mt-1" value={ownSource.difficulty} onChange={(e) => setOwnSource({ ...ownSource, difficulty: e.target.value })}>{['easy', 'medium', 'hard'].map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>
            <label className="flex gap-2 items-start mt-3 text-sm"><input className="mt-1" type="checkbox" checked={ownSourceAttested} onChange={(e) => setOwnSourceAttested(e.target.checked)} /><span>I wrote this sentence myself and confirm it contains no personal or private information.</span></label>
            <button type="button" className="btn-primary mt-3" disabled={!ownSourceAttested || ownSource.text.trim().length < 10 || status === 'loading'} onClick={useOwnSentence}>Use this sentence</button>
          </div>}
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
              {sample.participant_authored && <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">Your original sentence · pending source and privacy review before any dataset release</div>}
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
              {guidelines[0] && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  Follow <a className="underline font-medium" href={guidelines.find((item) => item.id === guidelineId)?.content_url} target="_blank" rel="noreferrer">{guidelines.find((item) => item.id === guidelineId)?.title}</a>
                  {' '}version {guidelines.find((item) => item.id === guidelineId)?.version}.
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <label className="text-sm">Outcome
                  <select className="input-field mt-1" value={annotationOutcome} onChange={(e) => setAnnotationOutcome(e.target.value)}>
                    <option value="TRANSLATED">Translated</option><option value="UNTRANSLATABLE">Untranslatable</option>
                    <option value="CULTURALLY_SENSITIVE">Culturally sensitive</option><option value="NEEDS_CONTEXT">Needs context</option>
                  </select>
                </label>
                <label className="text-sm">Register
                  <select className="input-field mt-1" value={register} onChange={(e) => setRegister(e.target.value)}>
                    {['GENERAL', 'CASUAL', 'FORMAL', 'TECHNICAL', 'CEREMONIAL', 'OTHER'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label className="text-sm">Confidence
                  <select className="input-field mt-1" value={uncertainty} onChange={(e) => setUncertainty(e.target.value)}>
                    <option value="CONFIDENT">Confident</option><option value="SOME_UNCERTAINTY">Some uncertainty</option><option value="NEEDS_DISCUSSION">Needs discussion</option>
                  </select>
                </label>
              </div>
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
                required={needsText}
              />
              <label className="block text-sm mt-3">Alternative translation (optional)
                <textarea className="input-field mt-1" value={alternativeTranslation} onChange={(e) => setAlternativeTranslation(e.target.value)} />
              </label>
              <label className="flex gap-2 items-center mt-3 text-sm"><input type="checkbox" checked={containsCodeSwitching} onChange={(e) => setContainsCodeSwitching(e.target.checked)} /> Contains code-switching</label>
              {containsCodeSwitching && <input className="input-field mt-2" placeholder="Identify the other language and span" value={codeSwitchingNotes} onChange={(e) => setCodeSwitchingNotes(e.target.value)} />}
              <label className="block text-sm mt-3">Annotation notes {needsText ? '(optional)' : '(required)'}
                <textarea className="input-field mt-1" value={annotationNotes} onChange={(e) => setAnnotationNotes(e.target.value)} required={!needsText} />
              </label>

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
