import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getActiveConsentPolicies, getMyConsent, recordConsent } from '../api/consent';

const LABELS = {
  text_contribution: 'Store and review my written translations',
  target_audio: 'Store and use my target-language recordings',
  english_audio: 'Store and use my English readings',
  model_training: 'Use approved contributions for model training',
  public_release: 'Include approved contributions in public dataset releases',
  commercial_use: 'Allow commercial use under the future dataset licence',
  future_research: 'Allow use in future research within the stated terms',
};

export default function Consent() {
  const [policies, setPolicies] = useState([]);
  const [consent, setConsent] = useState([]);
  const [selected, setSelected] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [policyResponse, consentResponse] = await Promise.all([getActiveConsentPolicies(), getMyConsent()]);
    setPolicies(policyResponse.data.policies);
    setConsent(consentResponse.data.consent);
    const effective = consentResponse.data.consent[0]?.effective || {};
    setSelected(Object.fromEntries(Object.keys(LABELS).map((scope) => [scope, Boolean(effective[scope])])));
  };

  useEffect(() => { load().catch(() => setMessage('Could not load consent records.')); }, []);

  const submit = async (decision) => {
    const policy = policies.find((item) => item.policy_key === 'participant_consent');
    const scopes = Object.entries(selected).filter(([, value]) => value).map(([scope]) => scope);
    if (!policy || scopes.length === 0) return;
    setSaving(true);
    try {
      await recordConsent({ policy_id: policy.id, decision, scopes });
      setMessage(decision === 'GRANTED' ? 'Your consent choices were recorded.' : 'Your selected consent scopes were withdrawn. New exports will exclude them.');
      await load();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not record your choice.');
    } finally { setSaving(false); }
  };

  const activePolicy = policies.find((item) => item.policy_key === 'participant_consent');
  const current = consent.find((item) => item.policy.id === activePolicy?.id);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Consent and data choices</h1>
        <p className="text-gray-500 mt-2 mb-6">Review, grant, or withdraw each use separately. Every change is retained in an audit history.</p>
        {message && <div className="card mb-4 text-sm">{message}</div>}
        {!activePolicy ? (
          <div className="card border-amber-200 bg-amber-50 text-amber-800">Collection is paused because no approved participant consent document is active.</div>
        ) : (
          <div className="card">
            <div className="flex justify-between gap-4 mb-4">
              <div><h2 className="font-bold">{activePolicy.title}</h2><p className="text-sm text-gray-500">Version {activePolicy.version}</p></div>
              {activePolicy.content_url && <a className="text-liberia-blue underline text-sm" href={activePolicy.content_url} target="_blank" rel="noreferrer">Read the document</a>}
            </div>
            <div className="space-y-3">
              {Object.entries(LABELS).map(([scope, label]) => (
                <label key={scope} className="flex gap-3 items-start p-3 border rounded-lg">
                  <input type="checkbox" className="mt-1" checked={Boolean(selected[scope])} onChange={(event) => setSelected({ ...selected, [scope]: event.target.checked })} />
                  <span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-gray-500">Current: {current?.effective?.[scope] ? 'granted' : 'not granted'}</span></span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-primary" disabled={saving} onClick={() => submit('GRANTED')}>Record selected grants</button>
              <button className="btn-secondary" disabled={saving} onClick={() => submit('WITHDRAWN')}>Withdraw selected scopes</button>
            </div>
          </div>
        )}
        {current?.events?.length > 0 && <div className="card mt-5"><h2 className="font-bold mb-3">History</h2>{[...current.events].reverse().map((event) => <div key={event.id} className="border-t py-3 text-sm"><span className="font-medium">{event.decision}</span> — {event.scopes.join(', ')}<span className="block text-xs text-gray-500">{new Date(event.recorded_at).toLocaleString()}</span></div>)}</div>}
      </main>
    </div>
  );
}
