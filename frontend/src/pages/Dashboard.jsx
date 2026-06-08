import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../hooks/useAuth';
import { getMyTranslations } from '../api/translations';
import { createApiKey, listApiKeys, revokeApiKey } from '../api/apiKeys';
import { updateProfile, changeEmail, changePassword, setup2FA, verify2FA, disable2FA } from '../api/auth';
import { useLanguages, LANGUAGES as FALLBACK_LANGUAGES } from '../components/LanguageSelector';
import { myBadges, myStreak } from '../api/badges';

const DOMAIN_COLORS = {
  health:         'bg-green-100 text-green-800',
  legal:          'bg-purple-100 text-purple-800',
  education:      'bg-blue-100 text-blue-800',
  news:           'bg-yellow-100 text-yellow-800',
  conversational: 'bg-pink-100 text-pink-800',
  general:        'bg-gray-100 text-gray-700',
};

const AGE_GROUPS = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_35',    label: '18–35' },
  { value: '36_55',    label: '36–55' },
  { value: '56_plus',  label: '56+' },
];

const HISTORY_LIMIT = 20;

// ── Show/hide password ────────────────────────────────────────────────────────
function PwInput({ value, onChange, placeholder = '••••••••', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className="input-field pr-10"
        placeholder={placeholder} value={value} onChange={onChange} {...props} />
      <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show
          ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        }
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user, login } = useAuth();
  const apiLangs = useLanguages();
  const langs = apiLangs.length > 0 ? apiLangs : FALLBACK_LANGUAGES;

  const [activeSection, setActiveSection] = useState('overview');

  // Translation history
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [translationsError, setTranslationsError] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyMeta, setHistoryMeta] = useState(null);

  // API key state
  const [apiKeys, setApiKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [keysError, setKeysError] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null);

  // Edit profile state
  const [profileForm, setProfileForm] = useState({
    name: '', native_language: '', native_dialect: '',
    region_of_origin: '', age_group: '', is_l1_speaker: false,
    profession: '',
  });
  const [profilePhoto, setProfilePhoto]         = useState(null);   // File object
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null); // object URL
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Change email state
  const [emailForm, setEmailForm] = useState({ newEmail: '', confirmEmail: '' });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg]       = useState('');

  // Badges + streak
  const [badges, setBadges]   = useState([]);
  const [streak, setStreak]   = useState(0);

  useEffect(() => {
    myBadges().then((r) => setBadges(r.data)).catch(() => {});
    myStreak().then((r) => setStreak(r.data.streak ?? 0)).catch(() => {});
  }, []);

  // Change password state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  // 2FA state
  const [tfaData, setTfaData] = useState(null);   // { secret, qr_code }
  const [tfaCode, setTfaCode] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaMsg, setTfaMsg] = useState('');
  const [tfaEnabled, setTfaEnabled] = useState(user?.totp_enabled ?? false);
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    if (user) {
      setProfileForm({
        name:             user.name             || '',
        native_language:  user.native_language  || '',
        native_dialect:   user.native_dialect   || '',
        region_of_origin: user.region_of_origin || '',
        age_group:        user.age_group        || '',
        is_l1_speaker:    Boolean(user.is_l1_speaker),
        profession:       user.profession       || '',
      });
      setTfaEnabled(user.totp_enabled ?? false);
    }
  }, [user]);

  const loadTranslations = useCallback((page) => {
    setLoading(true);
    setTranslationsError('');
    getMyTranslations({ page, limit: HISTORY_LIMIT })
      .then((res) => { setTranslations(res.data.data || res.data); setHistoryMeta(res.data.meta || null); })
      .catch(() => setTranslationsError('Failed to load translation history.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTranslations(historyPage); }, [historyPage, loadTranslations]);

  useEffect(() => {
    setKeysLoading(true);
    setKeysError('');
    listApiKeys()
      .then((res) => setApiKeys(res.data.data || res.data))
      .catch(() => setKeysError('Failed to load API keys. Please refresh.'))
      .finally(() => setKeysLoading(false));
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePhoto(file);
    // Revoke any previous preview URL to avoid memory leaks
    if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
    setProfilePhotoPreview(null);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const fd = new FormData();
      Object.entries(profileForm).forEach(([k, v]) => fd.append(k, String(v)));
      if (profilePhoto) fd.append('photo', profilePhoto);
      const res = await updateProfile(fd);
      login(res.data.contributor);
      setProfileMsg('Profile updated successfully.');
      setProfilePhoto(null);
      if (profilePhotoPreview) { URL.revokeObjectURL(profilePhotoPreview); setProfilePhotoPreview(null); }
    } catch (err) {
      setProfileMsg(err.response?.data?.error || 'Update failed. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailMsg('');
    if (!emailForm.newEmail) { setEmailMsg('Please enter a new email address.'); return; }
    if (emailForm.newEmail !== emailForm.confirmEmail) { setEmailMsg('Email addresses do not match.'); return; }
    if (emailForm.newEmail === user?.email) { setEmailMsg('That is already your current email.'); return; }
    setEmailSaving(true);
    try {
      const res = await changeEmail(emailForm.newEmail);
      setEmailMsg(res.data.message);
      setEmailForm({ newEmail: '', confirmEmail: '' });
    } catch (err) {
      setEmailMsg(err.response?.data?.error || 'Failed to update email. Please try again.');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.next !== pwForm.confirm) { setPwMsg('Passwords do not match.'); return; }
    if (pwForm.next.length < 8) { setPwMsg('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(pwForm.next)) { setPwMsg('Password must contain an uppercase letter.'); return; }
    if (!/[a-z]/.test(pwForm.next)) { setPwMsg('Password must contain a lowercase letter.'); return; }
    if (!/[0-9]/.test(pwForm.next)) { setPwMsg('Password must contain a number.'); return; }
    setPwSaving(true);
    try {
      await changePassword({ current_password: pwForm.current, new_password: pwForm.next });
      setPwMsg('Password changed successfully.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSetup2FA = async () => {
    setTfaLoading(true);
    setTfaMsg('');
    try {
      const res = await setup2FA();
      setTfaData(res.data);
    } catch (err) {
      setTfaMsg(err.response?.data?.error || 'Failed to start 2FA setup.');
    } finally {
      setTfaLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setTfaLoading(true);
    setTfaMsg('');
    try {
      await verify2FA(tfaCode);
      setTfaEnabled(true);
      setTfaData(null);
      setTfaCode('');
      setTfaMsg('2FA enabled successfully.');
    } catch (err) {
      setTfaMsg(err.response?.data?.error || 'Invalid code.');
    } finally {
      setTfaLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setTfaLoading(true);
    setTfaMsg('');
    try {
      await disable2FA(disableCode);
      setTfaEnabled(false);
      setDisableCode('');
      setTfaMsg('2FA disabled.');
    } catch (err) {
      setTfaMsg(err.response?.data?.error || 'Invalid code.');
    } finally {
      setTfaLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setKeyError('');
    try {
      const res = await createApiKey({ name: newKeyName });
      setCreatedKey(res.data);
      setApiKeys((prev) => [
        { id: res.data.id, prefix: res.data.prefix, name: res.data.name, is_active: true, created_at: res.data.created_at, last_used_at: null },
        ...prev,
      ]);
      setNewKeyName('');
    } catch (err) {
      setKeyError(err.response?.data?.error || 'Failed to create key.');
    }
  };

  const handleRevoke = async (id) => {
    try {
      await revokeApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      setRevokeTarget(null);
    } catch (err) {
      setKeysError(err.response?.data?.error || 'Failed to revoke key.');
      setRevokeTarget(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdKey.raw_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const byLang = langs.reduce((acc, l) => {
    acc[l.value] = translations.filter((t) => t.target_language === l.value).length;
    return acc;
  }, {});

  const reputationColor =
    user?.reputation_score >= 4   ? 'text-green-600' :
    user?.reputation_score >= 2.5 ? 'text-liberia-red' : 'text-amber-600';

  const apiBase = window.location.origin.includes('localhost')
    ? 'http://localhost:4000/api'
    : `${window.location.origin}/api`;

  const SECTIONS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'profile',   label: 'Edit Profile' },
    { id: 'security',  label: 'Security' },
    { id: 'api-keys',  label: 'API Keys' },
    { id: 'history',   label: 'History' },
  ];

  const navClass = (id) =>
    `w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
     ${activeSection === id
       ? 'bg-liberia-red text-white'
       : 'text-gray-500 hover:text-liberia-red hover:bg-gray-50'}`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {/* Inner sidebar */}
      <div className="w-44 flex-shrink-0 bg-white border-r border-gray-100 py-6 hidden md:block">
        <nav className="px-3 space-y-1">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} className={navClass(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile section selector */}
      <div className="md:hidden w-full fixed bottom-0 left-0 bg-white border-t border-gray-200 flex z-10 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex-shrink-0 px-3 py-3 text-xs font-semibold transition-colors
              ${activeSection === s.id
                ? 'text-liberia-red border-t-2 border-liberia-red -mt-px'
                : 'text-gray-400 hover:text-liberia-red'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <main className="flex-1 px-6 py-8 pb-20 md:pb-8 max-w-3xl">

        {/* ── Overview ── */}
        {activeSection === 'overview' && (
          <ErrorBoundary>
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-liberia-red">Dashboard</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {user ? `Welcome back, ${user.name}` : 'Loading…'}
                </p>
              </div>

              {!user && (
                <div className="card animate-pulse space-y-3 mb-6">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
              )}

              {user && !user.is_profile_complete && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                  <p className="font-semibold text-amber-800 mb-1">Complete your profile first</p>
                  <p className="text-amber-700 mb-3">Fill in your language and region before translating.</p>
                  <button onClick={() => setActiveSection('profile')} className="btn-primary text-sm">
                    Complete Profile
                  </button>
                </div>
              )}

              {user && (
                <>
                  {/* Profile card */}
                  <div className="card mb-6 flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="w-14 h-14 rounded-full bg-liberia-red text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-liberia-red">{user.name}</h2>
                      <p className="text-gray-500 text-sm">{user.email} · {user.region_of_origin}</p>
                      <p className="text-sm mt-0.5">
                        Native: <span className="font-medium capitalize">{user.native_language}</span>
                        {user.native_dialect && <span className="text-gray-400"> ({user.native_dialect})</span>}
                        {user.is_l1_speaker && <span className="ml-2 badge bg-liberia-red/10 text-liberia-red">L1 Speaker</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase tracking-widest">Reputation</p>
                      <p className={`text-4xl font-black ${reputationColor}`}>
                        {user.reputation_score?.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-400">/ 5.0</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Translations" value={translations.length} />
                    <StatCard label="Validated"    value={translations.filter((t) => t.is_validated).length} />
                    <StatCard label="With Audio"   value={translations.filter((t) => t.audio_path).length} />
                    <StatCard label="Languages"    value={Object.values(byLang).filter(Boolean).length} />
                  </div>

                  {/* Streak + Badges */}
                  {(streak > 0 || badges.length > 0) && (
                    <div className="card mb-6">
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <h3 className="font-bold text-liberia-red">Achievements</h3>
                        {streak > 0 && (
                          <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-bold px-3 py-1 rounded-full">
                            🔥 {streak}-day streak
                          </span>
                        )}
                      </div>
                      {badges.length === 0 ? (
                        <p className="text-sm text-gray-400">Submit your first translation to earn badges.</p>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {badges.map((b) => (
                            <div key={b.id} title={b.desc}
                              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-default hover:border-liberia-red/50 transition-colors">
                              <span className="text-xl">{b.icon || '🏅'}</span>
                              <div>
                                <p className="text-xs font-black text-gray-800 leading-tight">{b.name}</p>
                                <p className="text-xs text-gray-400 leading-tight">{b.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Language breakdown */}
                  <div className="card mb-6">
                    <h3 className="font-bold text-liberia-red mb-4">Contributions by Language</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {langs.map((l) => (
                        <div key={l.value} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-sm font-semibold text-liberia-red">{l.label}</p>
                          <p className="text-3xl font-bold mt-1 text-liberia-red">{byLang[l.value] || 0}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {user.is_profile_complete
                    ? <Link to="/translate" className="btn-primary">+ Start Translating</Link>
                    : <button onClick={() => setActiveSection('profile')} className="btn-primary">Complete Profile to Translate</button>
                  }
                </>
              )}
            </div>
          </ErrorBoundary>
        )}

        {/* ── Edit Profile ── */}
        {activeSection === 'profile' && (
          <ErrorBoundary>
            <div>
              <h1 className="text-2xl font-bold text-liberia-red mb-6">Edit Profile</h1>
              <form onSubmit={handleProfileSave} className="card space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input className="input-field" value={profileForm.name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Native Language</label>
                    <select className="input-field" value={profileForm.native_language}
                      onChange={(e) => setProfileForm((f) => ({ ...f, native_language: e.target.value }))}>
                      <option value="">-- Select --</option>
                      {langs.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dialect (optional)</label>
                    <input className="input-field" placeholder="e.g. Central Kpelle"
                      value={profileForm.native_dialect}
                      onChange={(e) => setProfileForm((f) => ({ ...f, native_dialect: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region of Origin</label>
                    <input className="input-field" placeholder="e.g. Lofa County"
                      value={profileForm.region_of_origin}
                      onChange={(e) => setProfileForm((f) => ({ ...f, region_of_origin: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                    <select className="input-field" value={profileForm.age_group}
                      onChange={(e) => setProfileForm((f) => ({ ...f, age_group: e.target.value }))}>
                      <option value="">-- Select --</option>
                      {AGE_GROUPS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="l1" checked={profileForm.is_l1_speaker}
                    onChange={(e) => setProfileForm((f) => ({ ...f, is_l1_speaker: e.target.checked }))}
                    className="w-4 h-4 rounded accent-liberia-red" />
                  <label htmlFor="l1" className="text-sm text-gray-700">
                    I am a first-language (L1) speaker of my native language
                  </label>
                </div>

                {/* Profile photo upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-liberia-red flex items-center justify-center flex-shrink-0 border-2 border-gray-200">
                      {profilePhotoPreview || user?.photo_url ? (
                        <img
                          src={profilePhotoPreview || (user.photo_url?.startsWith('uploads/') ? `/${user.photo_url}` : user.photo_url)}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-xl font-bold select-none">
                          {user?.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                      <label htmlFor="photo-upload" className="btn-secondary text-sm cursor-pointer inline-block">
                        Choose Photo
                      </label>
                      {profilePhotoPreview && (
                        <button type="button" onClick={handleRemovePhoto}
                          className="ml-2 text-sm text-gray-400 hover:text-liberia-red transition-colors">
                          Remove
                        </button>
                      )}
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, GIF or WebP — max 5 MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profession (optional)</label>
                  <input className="input-field" placeholder="e.g. Teacher, Linguist"
                    value={profileForm.profession}
                    onChange={(e) => setProfileForm((f) => ({ ...f, profession: e.target.value }))} />
                </div>

                {profileMsg && (
                  <p className={`text-sm font-medium ${profileMsg.includes('success') ? 'text-green-600' : 'text-liberia-red'}`}>
                    {profileMsg}
                  </p>
                )}

                <button type="submit" disabled={profileSaving} className="btn-primary">
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>

              {/* Email change */}
              <div className="card mt-6">
                <h2 className="font-bold text-liberia-red mb-1">Change Email Address</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Current: <span className="font-medium text-gray-700">{user?.email}</span>
                  {user?.oauth_provider && (
                    <span className="ml-2 text-xs text-gray-400">(linked via {user.oauth_provider})</span>
                  )}
                </p>
                <form onSubmit={handleEmailChange} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Email Address</label>
                    <input
                      type="email"
                      required
                      className="input-field"
                      placeholder="new@example.com"
                      value={emailForm.newEmail}
                      onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Email</label>
                    <input
                      type="email"
                      required
                      className="input-field"
                      placeholder="new@example.com"
                      value={emailForm.confirmEmail}
                      onChange={(e) => setEmailForm((f) => ({ ...f, confirmEmail: e.target.value }))}
                    />
                  </div>
                  {emailMsg && (
                    <p className={`text-sm font-medium ${
                      emailMsg.toLowerCase().includes('sent') || emailMsg.toLowerCase().includes('updated')
                        ? 'text-green-600' : 'text-liberia-red'
                    }`}>
                      {emailMsg}
                    </p>
                  )}
                  <button type="submit" disabled={emailSaving} className="btn-primary">
                    {emailSaving ? 'Saving…' : 'Update Email'}
                  </button>
                </form>
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* ── Security ── */}
        {activeSection === 'security' && (
          <ErrorBoundary>
            <div className="space-y-8">
              <h1 className="text-2xl font-bold text-liberia-red">Security</h1>

              {/* Change password */}
              {user?.oauth_provider ? (
                <div className="card">
                  <h2 className="font-bold text-liberia-red mb-2">Change Password</h2>
                  <p className="text-sm text-gray-500">
                    Your account uses {user.oauth_provider} sign-in. Password change is not available.
                  </p>
                </div>
              ) : (
                <div className="card">
                  <h2 className="font-bold text-liberia-red mb-4">Change Password</h2>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <PwInput value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <PwInput value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} required />
                      <p className="text-xs text-gray-400 mt-1">Min 8 chars, uppercase, lowercase, and number required.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <PwInput value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} required />
                    </div>
                    {pwMsg && (
                      <p className={`text-sm font-medium ${pwMsg.includes('success') ? 'text-green-600' : 'text-liberia-red'}`}>
                        {pwMsg}
                      </p>
                    )}
                    <button type="submit" disabled={pwSaving} className="btn-primary">
                      {pwSaving ? 'Saving…' : 'Change Password'}
                    </button>
                  </form>
                </div>
              )}

              {/* 2FA */}
              <div className="card">
                <h2 className="font-bold text-liberia-red mb-1">Two-Factor Authentication (2FA)</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Use an authenticator app (Google Authenticator, Authy, etc.) for extra security.
                </p>

                {tfaMsg && (
                  <p className={`text-sm font-medium mb-4 ${tfaMsg.includes('success') || tfaMsg.includes('enabled') || tfaMsg.includes('disabled') ? 'text-green-600' : 'text-liberia-red'}`}>
                    {tfaMsg}
                  </p>
                )}

                {tfaEnabled && !tfaData && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-green-100 text-green-700">✓ 2FA Enabled</span>
                    </div>
                    <p className="text-sm text-gray-500">Enter your current authenticator code to disable 2FA.</p>
                    <form onSubmit={handleDisable2FA} className="flex gap-2">
                      <input className="input-field w-36 font-mono tracking-widest text-center" maxLength={6}
                        placeholder="000000" value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))} required />
                      <button type="submit" disabled={tfaLoading} className="btn-danger">
                        {tfaLoading ? '…' : 'Disable 2FA'}
                      </button>
                    </form>
                  </div>
                )}

                {!tfaEnabled && !tfaData && (
                  <button onClick={handleSetup2FA} disabled={tfaLoading} className="btn-primary">
                    {tfaLoading ? 'Setting up…' : 'Set Up 2FA'}
                  </button>
                )}

                {tfaData && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
                    </p>
                    <img src={tfaData.qr_code} alt="2FA QR code" className="w-40 h-40 border border-gray-200 rounded-lg" />
                    <p className="text-xs text-gray-400">
                      Manual entry: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{tfaData.secret}</code>
                    </p>
                    <form onSubmit={handleVerify2FA} className="flex gap-2">
                      <input className="input-field w-36 font-mono tracking-widest text-center" maxLength={6}
                        placeholder="000000" value={tfaCode}
                        onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ''))} required />
                      <button type="submit" disabled={tfaLoading} className="btn-primary">
                        {tfaLoading ? '…' : 'Verify & Enable'}
                      </button>
                      <button type="button" onClick={() => { setTfaData(null); setTfaCode(''); setTfaMsg(''); }}
                        className="btn-secondary">Cancel</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* ── API Keys ── */}
        {activeSection === 'api-keys' && (
          <ErrorBoundary>
            <div>
              <h1 className="text-2xl font-bold text-liberia-red mb-2">API Keys</h1>
              <p className="text-sm text-gray-500 mb-6">
                Use an API key to download published datasets programmatically.
              </p>

              {createdKey && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-semibold text-amber-800 mb-1">Copy your key now — it won&apos;t be shown again</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 text-xs bg-white border border-amber-200 rounded px-3 py-2 font-mono break-all">
                      {createdKey.raw_key}
                    </code>
                    <button onClick={handleCopy} className="btn-secondary text-xs whitespace-nowrap">
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-amber-700">Integration examples</p>
                    <pre className="text-xs bg-gray-900 text-green-300 rounded-lg p-3 overflow-x-auto">{`# Python\nimport requests\nr = requests.get(\n    "${apiBase}/dataset",\n    params={"language": "kpelle", "format": "json"},\n    headers={"Authorization": "ApiKey ${createdKey.raw_key}"},\n)\ndata = r.json()["data"]`}</pre>
                    <pre className="text-xs bg-gray-900 text-green-300 rounded-lg p-3 overflow-x-auto">{`// JavaScript\nconst res = await fetch(\n  "${apiBase}/dataset?language=kpelle",\n  { headers: { Authorization: "ApiKey ${createdKey.raw_key}" } }\n);\nconst { data } = await res.json();`}</pre>
                  </div>
                  <button onClick={() => setCreatedKey(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline">
                    Dismiss
                  </button>
                </div>
              )}

              <form onSubmit={handleCreateKey} className="flex gap-2 mb-4">
                <input className="input-field flex-1" placeholder="Key label, e.g. My Research Project"
                  value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} required />
                <button type="submit" className="btn-primary whitespace-nowrap">Create Key</button>
              </form>
              {keyError  && <p className="text-xs text-liberia-red mb-3">{keyError}</p>}
              {keysError && <p className="text-xs text-liberia-red mb-3">{keysError}</p>}

              {revokeTarget && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                  <p className="font-semibold text-red-800 mb-2">Revoke &ldquo;{revokeTarget.name}&rdquo;? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleRevoke(revokeTarget.id)}
                      className="bg-liberia-red hover:bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                      Yes, Revoke
                    </button>
                    <button onClick={() => setRevokeTarget(null)} className="btn-secondary text-xs">Cancel</button>
                  </div>
                </div>
              )}

              <div className="card divide-y">
                {keysLoading && <p className="text-sm text-gray-400 py-3">Loading…</p>}
                {!keysLoading && apiKeys.length === 0 && (
                  <p className="text-sm text-gray-400 py-3">No API keys yet.</p>
                )}
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-liberia-red">{k.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{k.prefix}…</p>
                      <p className="text-xs text-gray-400">
                        Created {new Date(k.created_at).toLocaleDateString()}
                        {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button onClick={() => setRevokeTarget(k)}
                      className="text-xs text-liberia-red hover:underline font-medium ml-4">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* ── History ── */}
        {activeSection === 'history' && (
          <ErrorBoundary>
            <div>
              <h1 className="text-2xl font-bold text-liberia-red mb-6">Translation History</h1>

              {translationsError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-liberia-red flex items-center justify-between">
                  {translationsError}
                  <button onClick={() => loadTranslations(historyPage)} className="underline font-medium ml-3">Retry</button>
                </div>
              )}

              <div className="card">
                {loading && <p className="text-gray-400 text-sm">Loading…</p>}
                {!loading && !translationsError && translations.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-gray-400 mb-3">No translations yet.</p>
                    <Link to="/translate" className="btn-primary">Make your first translation</Link>
                  </div>
                )}
                <div className="divide-y">
                  {translations.map((t) => (
                    <div key={t.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 truncate">{t.sample?.text}</p>
                          <p className="text-sm font-medium text-liberia-red mt-1">→ {t.translated_text}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`badge ${DOMAIN_COLORS[t.sample?.domain] || 'bg-gray-100'}`}>
                            {t.sample?.domain}
                          </span>
                          <span className={`badge ${t.is_validated ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {t.is_validated ? '✓ Validated' : 'Pending'}
                          </span>
                          {t.quality_score != null && (
                            <span className="text-xs text-gray-400">Q: {(t.quality_score * 100).toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(t.created_at).toLocaleDateString()} ·{' '}
                        <span className="capitalize">{t.target_language}</span>
                        {t.dialect && ` (${t.dialect})`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {historyMeta && historyMeta.pages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-6">
                  <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1} className="btn-secondary text-sm disabled:opacity-40">
                    ← Prev
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {historyPage} of {historyMeta.pages}
                    <span className="text-gray-400 ml-2">({historyMeta.total} total)</span>
                  </span>
                  <button onClick={() => setHistoryPage((p) => Math.min(historyMeta.pages, p + 1))}
                    disabled={historyPage === historyMeta.pages} className="btn-secondary text-sm disabled:opacity-40">
                    Next →
                  </button>
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card text-center py-5">
      <p className="text-3xl font-bold text-liberia-red">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
