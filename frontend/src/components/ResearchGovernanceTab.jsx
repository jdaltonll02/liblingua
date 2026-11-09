import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAllResearchPolicies } from '../api/consent';
import {
  activateGovernanceResource,
  createAnnotationGuideline,
  createLanguageVariety,
  createOrthography,
  getAllLinguisticMetadata,
  getGovernanceApprovals,
  recordGovernanceApproval,
} from '../api/linguisticMetadata';
import { listReleasesAdmin } from '../api/dataset';

function StatusBadge({ status }) {
  const style = status === 'ACTIVE' || status === 'PUBLISHED'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'REJECTED' || status === 'RETRACTED'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-800';
  return <span className={`badge ${style}`}>{status}</span>;
}

function ApprovalSummary({ approvals, type, id }) {
  const relevant = approvals.filter((item) => item.resource_type === type && item.resource_id === id);
  const latest = (role) => relevant.find((item) => item.authority_role === role);
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {['COMMUNITY', 'RESEARCH'].map((role) => {
        const approval = latest(role);
        return <span key={role} className={`px-2 py-1 rounded-md ${approval?.decision === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {role === 'COMMUNITY' ? 'Community' : 'Research'}: {approval ? `${approval.decision.toLowerCase()} by ${approval.approver?.name}` : 'needed'}
        </span>;
      })}
    </div>
  );
}

function ResourceActions({ type, resource, approvals, onAction, busy }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <ApprovalSummary approvals={approvals} type={type} id={resource.id} />
      {resource.status !== 'ACTIVE' && <div className="flex flex-wrap gap-2 mt-3">
        <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => onAction('approve', type, resource.id, 'COMMUNITY')}>Approve as community</button>
        <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => onAction('approve', type, resource.id, 'RESEARCH')}>Approve as research</button>
        <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => onAction('activate', type, resource.id)}>Activate</button>
      </div>}
    </div>
  );
}

export default function ResearchGovernanceTab({ onNavigate }) {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState('');
  const [variety, setVariety] = useState({ language_id: '', code: '', name: '', autonym: '', iso639_3: '', glottocode: '', bcp47: '', region: '' });
  const [orthography, setOrthography] = useState({ variety_id: '', code: '', name: '', script: 'Latn', version: '', authority: '', is_default: true });
  const [guideline, setGuideline] = useState({ variety_id: '', orthography_id: '', version: '1.0', title: '', content_url: '', content_hash: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [policyResponse, languageResponse, approvalResponse, releaseResponse] = await Promise.all([
        getAllResearchPolicies(), getAllLinguisticMetadata(), getGovernanceApprovals(), listReleasesAdmin(),
      ]);
      setPolicies(policyResponse.data.policies || []);
      setLanguages(languageResponse.data || []);
      setApprovals(approvalResponse.data.approvals || []);
      setReleases(releaseResponse.data.releases || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load research governance data.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const varieties = useMemo(() => languages.flatMap((language) => language.varieties.map((item) => ({ ...item, language }))), [languages]);
  const activePolicies = policies.filter((item) => item.status === 'ACTIVE').length;
  const activeVarieties = varieties.filter((item) => item.status === 'ACTIVE').length;
  const activeOrthographies = varieties.flatMap((item) => item.orthographies).filter((item) => item.status === 'ACTIVE').length;
  const activeGuidelines = varieties.flatMap((item) => item.guidelines).filter((item) => item.status === 'ACTIVE').length;
  const blockers = [
    activePolicies < 4 && `${4 - activePolicies} required polic${4 - activePolicies === 1 ? 'y is' : 'ies are'} inactive`,
    activeVarieties === 0 && 'No language variety is active',
    activeOrthographies === 0 && 'No orthography is active',
    activeGuidelines === 0 && 'No annotation guideline is active',
  ].filter(Boolean);

  const action = async (kind, resourceType, resourceId, authorityRole) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (kind === 'approve') {
        await recordGovernanceApproval({ resource_type: resourceType, resource_id: resourceId, authority_role: authorityRole, decision: 'APPROVED', notes: `Recorded through the admin panel by ${user?.name || 'administrator'}` });
        setNotice(`${authorityRole.toLowerCase()} approval recorded. The other approval must come from a different account.`);
      } else {
        await activateGovernanceResource({ resource_type: resourceType, resource_id: resourceId });
        setNotice('Resource activated.');
      }
      await load();
    } catch (requestError) { setError(requestError.response?.data?.error || 'The governance action failed.'); }
    finally { setBusy(false); }
  };

  const submitVariety = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await createLanguageVariety(variety); setForm(''); setNotice('Draft language variety created.'); await load(); }
    catch (requestError) { setError(requestError.response?.data?.error || 'Could not create the variety.'); }
    finally { setBusy(false); }
  };
  const submitOrthography = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await createOrthography(orthography); setForm(''); setNotice('Draft orthography created.'); await load(); }
    catch (requestError) { setError(requestError.response?.data?.error || 'Could not create the orthography.'); }
    finally { setBusy(false); }
  };
  const submitGuideline = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await createAnnotationGuideline({ ...guideline, orthography_id: guideline.orthography_id || null }); setForm(''); setNotice('Draft annotation guideline created.'); await load(); }
    catch (requestError) { setError(requestError.response?.data?.error || 'Could not create the guideline.'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="card animate-pulse h-64"><div className="h-6 bg-gray-100 rounded w-1/3" /></div>;
  return (
    <div className="max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-liberia-red">Research operations</p><h1 className="text-3xl font-black text-gray-950 mt-1">Governance & readiness</h1><p className="text-gray-500 mt-2 max-w-2xl">Activate collection only after independent community and research approval of the exact policies and language resources.</p></div>
        <button className="btn-secondary" onClick={load}>Refresh status</button>
      </div>
      {error && <div className="mb-5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
      {notice && <div className="mb-5 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">{notice}</div>}

      <section className={`rounded-2xl border p-5 mb-7 ${blockers.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-black text-gray-900">{blockers.length ? 'Collection is safely paused' : 'Collection prerequisites are active'}</h2><p className="text-sm text-gray-600 mt-1">{blockers.length ? blockers.join(' · ') : 'Continue monitoring consent, provenance, and review queues.'}</p></div><span className={`badge ${blockers.length ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'}`}>{blockers.length ? `${blockers.length} blockers` : 'Ready'}</span></div>
      </section>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        {[
          ['Active policies', `${activePolicies}/4`], ['Active varieties', activeVarieties],
          ['Orthographies', activeOrthographies], ['Guidelines', activeGuidelines],
          ['Release candidates', releases.filter((item) => item.status === 'DRAFT').length],
        ].map(([label, value]) => <div key={label} className="card !p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p><p className="text-2xl font-black mt-2">{value}</p></div>)}
      </div>

      <section className="mb-9">
        <div className="flex items-center justify-between mb-4"><div><h2 className="text-xl font-black">Versioned policies</h2><p className="text-sm text-gray-500">Both approvals must be from different accounts.</p></div></div>
        <div className="grid lg:grid-cols-2 gap-4">
          {policies.map((policy) => <div key={policy.id} className="card !p-5">
            <div className="flex justify-between gap-3"><div><h3 className="font-bold text-gray-900">{policy.title}</h3><p className="text-xs text-gray-500 mt-1">{policy.policy_key} · version {policy.version}</p></div><StatusBadge status={policy.status} /></div>
            {policy.content_url && <a className="text-xs text-liberia-blue underline inline-block mt-3" href={policy.content_url} target="_blank" rel="noreferrer">Review exact document</a>}
            <ResourceActions type="RESEARCH_POLICY" resource={policy} approvals={approvals} onAction={action} busy={busy} />
          </div>)}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4"><div><h2 className="text-xl font-black">Language resources</h2><p className="text-sm text-gray-500">Controlled varieties, writing systems, and versioned annotation instructions.</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary !px-3 !py-2 text-xs" onClick={() => setForm(form === 'variety' ? '' : 'variety')}>New variety</button><button className="btn-secondary !px-3 !py-2 text-xs" onClick={() => setForm(form === 'orthography' ? '' : 'orthography')}>New orthography</button><button className="btn-secondary !px-3 !py-2 text-xs" onClick={() => setForm(form === 'guideline' ? '' : 'guideline')}>New guideline</button></div></div>

        {form === 'variety' && <form onSubmit={submitVariety} className="card mb-5 grid md:grid-cols-3 gap-3">
          <select required className="input-field" value={variety.language_id} onChange={(e) => setVariety({ ...variety, language_id: e.target.value })}><option value="">Parent language</option>{languages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          {['code','name','autonym','iso639_3','glottocode','bcp47','region'].map((field) => <input key={field} required={['code','name'].includes(field)} className="input-field" placeholder={field.replaceAll('_',' ')} value={variety[field]} onChange={(e) => setVariety({ ...variety, [field]: e.target.value })} />)}
          <div className="md:col-span-3"><button disabled={busy} className="btn-primary">Create draft variety</button></div>
        </form>}
        {form === 'orthography' && <form onSubmit={submitOrthography} className="card mb-5 grid md:grid-cols-3 gap-3">
          <select required className="input-field" value={orthography.variety_id} onChange={(e) => setOrthography({ ...orthography, variety_id: e.target.value })}><option value="">Language variety</option>{varieties.map((item) => <option key={item.id} value={item.id}>{item.language.label} · {item.name}</option>)}</select>
          {['code','name','script','version','authority'].map((field) => <input key={field} required={['code','name','script'].includes(field)} className="input-field" placeholder={field} value={orthography[field]} onChange={(e) => setOrthography({ ...orthography, [field]: e.target.value })} />)}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={orthography.is_default} onChange={(e) => setOrthography({ ...orthography, is_default: e.target.checked })} /> Default orthography</label>
          <div className="md:col-span-3"><button disabled={busy} className="btn-primary">Create draft orthography</button></div>
        </form>}
        {form === 'guideline' && <form onSubmit={submitGuideline} className="card mb-5 grid md:grid-cols-2 gap-3">
          <select required className="input-field" value={guideline.variety_id} onChange={(e) => setGuideline({ ...guideline, variety_id: e.target.value, orthography_id: '' })}><option value="">Language variety</option>{varieties.map((item) => <option key={item.id} value={item.id}>{item.language.label} · {item.name}</option>)}</select>
          <select className="input-field" value={guideline.orthography_id} onChange={(e) => setGuideline({ ...guideline, orthography_id: e.target.value })}><option value="">All active orthographies</option>{varieties.find((item) => item.id === guideline.variety_id)?.orthographies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          {['version','title','content_url','content_hash'].map((field) => <input key={field} required className="input-field" placeholder={field.replaceAll('_',' ')} value={guideline[field]} onChange={(e) => setGuideline({ ...guideline, [field]: e.target.value })} />)}
          <div className="md:col-span-2"><button disabled={busy} className="btn-primary">Create draft guideline</button></div>
        </form>}

        {varieties.length === 0 ? <div className="card text-center py-12"><h3 className="font-bold text-gray-800">No controlled language varieties yet</h3><p className="text-sm text-gray-500 mt-2">Create the first draft variety, then have separate community and research accounts approve it.</p></div> : <div className="space-y-4">{varieties.map((item) => <div key={item.id} className="card !p-5">
          <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-gray-400">{item.language.label}</p><h3 className="font-black text-lg">{item.name}{item.autonym ? ` / ${item.autonym}` : ''}</h3><p className="text-xs text-gray-500 mt-1">{[item.code, item.iso639_3, item.glottocode, item.bcp47].filter(Boolean).join(' · ')}</p></div><StatusBadge status={item.status} /></div>
          <ResourceActions type="LANGUAGE_VARIETY" resource={item} approvals={approvals} onAction={action} busy={busy} />
          <div className="grid lg:grid-cols-2 gap-3 mt-4">
            {item.orthographies.map((resource) => <div key={resource.id} className="rounded-xl border p-4"><div className="flex justify-between"><div><p className="font-bold text-sm">{resource.name}</p><p className="text-xs text-gray-500">{resource.script} · {resource.version || 'unversioned'}</p></div><StatusBadge status={resource.status} /></div><ResourceActions type="ORTHOGRAPHY" resource={resource} approvals={approvals} onAction={action} busy={busy} /></div>)}
            {item.guidelines.map((resource) => <div key={resource.id} className="rounded-xl border p-4"><div className="flex justify-between"><div><p className="font-bold text-sm">{resource.title}</p><p className="text-xs text-gray-500">Guideline {resource.version}</p></div><StatusBadge status={resource.status} /></div><ResourceActions type="ANNOTATION_GUIDELINE" resource={resource} approvals={approvals} onAction={action} busy={busy} /></div>)}
          </div>
        </div>)}</div>}
      </section>

      <div className="mt-8 rounded-2xl bg-gray-950 text-white p-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-black">Ready to freeze a release candidate?</h2><p className="text-sm text-gray-300 mt-1">Release creation, checksums, persistent splits, and corrections are managed separately.</p></div><button className="bg-white text-gray-950 font-bold px-4 py-2 rounded-lg" onClick={() => onNavigate?.('dataset')}>Open release management</button></div>
    </div>
  );
}
