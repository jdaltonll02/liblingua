import { useCallback, useEffect, useState } from 'react';
import { createReleaseCandidate, listReleasesAdmin, publishRelease } from '../api/dataset';
import { getGovernanceApprovals, recordGovernanceApproval } from '../api/linguisticMetadata';
import { useLanguages, LANGUAGES as FALLBACK_LANGUAGES } from './LanguageSelector';

function freshSeed() {
  return `liblingua-${window.crypto?.randomUUID?.() || Date.now()}-release-split`;
}

export default function ReleaseManagementTab() {
  const apiLanguages = useLanguages();
  const languages = apiLanguages.length ? apiLanguages : FALLBACK_LANGUAGES;
  const [releases, setReleases] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [form, setForm] = useState({ language: '', semantic_version: '0.1.0', split_seed: freshSeed(), split_mode: 'SOURCE_GROUPED', git_commit: '', changelog: '' });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [releaseResponse, approvalResponse] = await Promise.all([listReleasesAdmin(), getGovernanceApprovals({ resource_type: 'DATASET_RELEASE' })]);
      setReleases(releaseResponse.data.releases || []);
      setApprovals(approvalResponse.data.approvals || []);
    } catch (requestError) { setError(requestError.response?.data?.error || 'Could not load releases.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (event) => {
    event.preventDefault(); setBusy('create'); setError(''); setNotice('');
    try { await createReleaseCandidate(form); setShowForm(false); setNotice('Frozen release candidate created. It cannot change while approvals are collected.'); await load(); }
    catch (requestError) { setError(requestError.response?.data?.error || 'Could not create release candidate.'); }
    finally { setBusy(''); }
  };
  const approve = async (release, role) => {
    setBusy(`${release.id}-${role}`); setError(''); setNotice('');
    try { await recordGovernanceApproval({ resource_type: 'DATASET_RELEASE', resource_id: release.id, authority_role: role, decision: 'APPROVED', notes: `Approved release ${release.semantic_version} through the admin panel` }); setNotice(`${role.toLowerCase()} release approval recorded.`); await load(); }
    catch (requestError) { setError(requestError.response?.data?.error || 'Could not record approval.'); }
    finally { setBusy(''); }
  };
  const publish = async (release) => {
    setBusy(`${release.id}-publish`); setError(''); setNotice('');
    try { await publishRelease(release.id); setNotice('Release published.'); await load(); }
    catch (requestError) { setError(requestError.response?.data?.error || 'Release publication is blocked.'); }
    finally { setBusy(''); }
  };

  return <div className="max-w-7xl">
    <div className="flex flex-wrap items-start justify-between gap-4 mb-7"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-liberia-red">Immutable datasets</p><h1 className="text-3xl font-black mt-1">Release management</h1><p className="text-gray-500 mt-2 max-w-2xl">Freeze approved records into a citable manifest. Public publication remains blocked during the restricted pilot.</p></div><button className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close form' : 'Create release candidate'}</button></div>
    {error && <div className="p-4 mb-5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
    {notice && <div className="p-4 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">{notice}</div>}
    <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800"><strong>Pilot safeguard:</strong> candidates use <code>PILOT_RESTRICTED_1.0</code>. Even an approved candidate cannot become public until Manual Gate 2 selects a final licence.</div>
    {showForm && <form onSubmit={create} className="card mb-7 grid md:grid-cols-2 gap-4">
      <label className="text-sm font-semibold">Language<select required className="input-field mt-1" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}><option value="">Select language</option>{languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="text-sm font-semibold">Semantic version<input required pattern="\d+\.\d+\.\d+" className="input-field mt-1" value={form.semantic_version} onChange={(e) => setForm({ ...form, semantic_version: e.target.value })} /></label>
      <label className="text-sm font-semibold">Split mode<select className="input-field mt-1" value={form.split_mode} onChange={(e) => setForm({ ...form, split_mode: e.target.value })}><option value="SOURCE_GROUPED">Source and duplicate grouped</option><option value="SOURCE_AND_SPEAKER_GROUPED">Source, duplicate, and speaker grouped</option></select></label>
      <label className="text-sm font-semibold">Git commit<input required minLength="7" className="input-field mt-1 font-mono" placeholder="e.g. fac16eb" value={form.git_commit} onChange={(e) => setForm({ ...form, git_commit: e.target.value.trim() })} /></label>
      <label className="text-sm font-semibold md:col-span-2">Persistent split seed<input required minLength="16" className="input-field mt-1 font-mono" value={form.split_seed} onChange={(e) => setForm({ ...form, split_seed: e.target.value })} /></label>
      <label className="text-sm font-semibold md:col-span-2">Changelog<textarea className="input-field mt-1 min-h-24" value={form.changelog} onChange={(e) => setForm({ ...form, changelog: e.target.value })} /></label>
      <div className="md:col-span-2"><button disabled={busy === 'create'} className="btn-primary">{busy === 'create' ? 'Freezing records…' : 'Freeze candidate'}</button></div>
    </form>}
    {loading ? <div className="card animate-pulse h-48" /> : releases.length === 0 ? <div className="card text-center py-14"><h2 className="font-black text-lg">No frozen candidates yet</h2><p className="text-sm text-gray-500 mt-2">First activate policies and language resources, collect consented annotations, and complete independent review.</p></div> : <div className="space-y-4">{releases.map((release) => {
      const releaseApprovals = approvals.filter((item) => item.resource_id === release.id);
      const latest = (role) => releaseApprovals.find((item) => item.authority_role === role);
      return <article key={release.id} className="card !p-5">
        <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-gray-400">{release.language}</p><h2 className="text-xl font-black">Release {release.semantic_version}</h2><p className="text-sm text-gray-500 mt-1">{release.record_count.toLocaleString()} records · {release.split_mode.replaceAll('_',' ')}</p></div><span className={`badge self-start ${release.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{release.status}</span></div>
        <div className="grid lg:grid-cols-2 gap-3 mt-4 text-xs"><div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">Manifest SHA-256</span><code className="block break-all mt-1">{release.manifest_checksum}</code></div><div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400">Artifact SHA-256</span><code className="block break-all mt-1">{release.artifact_checksum}</code></div></div>
        <div className="flex flex-wrap gap-2 mt-4 text-xs"><span className={`px-2 py-1 rounded ${latest('COMMUNITY')?.decision === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>Community: {latest('COMMUNITY')?.approver?.name || 'needed'}</span><span className={`px-2 py-1 rounded ${latest('RESEARCH')?.decision === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>Research: {latest('RESEARCH')?.approver?.name || 'needed'}</span></div>
        {release.status === 'DRAFT' && <div className="flex flex-wrap gap-2 mt-4"><button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={Boolean(busy)} onClick={() => approve(release, 'COMMUNITY')}>Approve as community</button><button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={Boolean(busy)} onClick={() => approve(release, 'RESEARCH')}>Approve as research</button><button className="btn-primary !px-3 !py-1.5 text-xs" disabled={Boolean(busy)} onClick={() => publish(release)}>Publish</button></div>}
      </article>;
    })}</div>}
  </div>;
}
