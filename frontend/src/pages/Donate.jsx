import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import {
  createStripeSession, confirmStripeSession,
  initiateMtnMomo, checkMtnStatus,
  getDonationStats,
} from '../api/donations';

const PRESET_AMOUNTS = [5, 10, 25, 50, 100, 250];

// ── Success screen (after Stripe redirect back) ───────────────────────────────
function SuccessScreen({ sessionId }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    confirmStripeSession(sessionId)
      .then((r) => setInfo(r.data))
      .catch(() => {});
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Thank You!</h1>
        {info && (
          <p className="text-liberia-red text-3xl font-black mb-3">
            ${info.amount?.toFixed(2)} {info.currency}
          </p>
        )}
        <p className="text-gray-500 mb-6">
          Your donation is making a difference. Every contribution helps preserve Liberian languages for future generations.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/translate" className="btn-primary">Start Contributing Translations</Link>
          <Link to="/" className="btn-secondary text-sm">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

// ── MTN MoMo status poller ────────────────────────────────────────────────────
function MtnStatusPoller({ referenceId, onDone }) {
  const [status, setStatus] = useState('PENDING');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!referenceId || status !== 'PENDING') return;
    if (attempts >= 20) { setStatus('TIMEOUT'); return; }

    const t = setTimeout(async () => {
      try {
        const r = await checkMtnStatus(referenceId);
        const s = r.data.status;
        setStatus(s);
        if (s === 'COMPLETED') onDone(true);
        else if (s === 'FAILED') onDone(false);
      } catch {}
      setAttempts((a) => a + 1);
    }, 5000);

    return () => clearTimeout(t);
  }, [referenceId, status, attempts, onDone]);

  const dots = '.'.repeat((attempts % 3) + 1);

  return (
    <div className="text-center py-6">
      {status === 'PENDING' && (
        <>
          <div className="w-12 h-12 border-4 border-liberia-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-gray-800">Waiting for approval{dots}</p>
          <p className="text-sm text-gray-500 mt-1">Check your phone and approve the MTN MoMo prompt</p>
          <p className="text-xs text-gray-400 mt-3">Checking every 5 seconds · {20 - attempts} checks remaining</p>
        </>
      )}
      {status === 'COMPLETED' && (
        <div className="text-green-600">
          <p className="text-2xl font-black mb-1">✓ Payment Received</p>
          <p className="text-sm">Thank you for your donation!</p>
        </div>
      )}
      {(status === 'FAILED' || status === 'TIMEOUT') && (
        <div className="text-red-600">
          <p className="font-black mb-1">{status === 'TIMEOUT' ? 'Payment timed out' : 'Payment failed'}</p>
          <p className="text-sm text-gray-500">Please try again or contact us if the issue persists.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Donate page ──────────────────────────────────────────────────────────
export default function Donate() {
  const [searchParams] = useSearchParams();
  const sessionId  = searchParams.get('session_id');
  const cancelled  = searchParams.get('cancelled');
  const { user }   = useAuth();

  const [method, setMethod]     = useState('stripe'); // 'stripe' | 'mtn'
  const [amount, setAmount]     = useState(25);
  const [custom, setCustom]     = useState('');
  const [form, setForm]         = useState({ name: user?.name || '', email: user?.email || '', message: '', phone: '', anonymous: false });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mtnRef, setMtnRef]     = useState(null);
  const [mtnDone, setMtnDone]   = useState(null); // true=success, false=failed
  const [stats, setStats]       = useState(null);

  useEffect(() => {
    getDonationStats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || '', email: f.email || user.email || '' }));
  }, [user]);

  if (sessionId) return <SuccessScreen sessionId={sessionId} />;

  const finalAmount = custom ? parseFloat(custom) : amount;
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleStripe = async (e) => {
    e.preventDefault();
    setError('');
    if (!finalAmount || finalAmount < 1) { setError('Please enter an amount of at least $1.'); return; }
    setLoading(true);
    try {
      const res = await createStripeSession({
        amount: finalAmount,
        donor_name:   form.anonymous ? '' : form.name,
        donor_email:  form.email,
        message:      form.message,
        is_anonymous: form.anonymous,
      });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start payment. Please try again.');
      setLoading(false);
    }
  };

  const handleMtn = async (e) => {
    e.preventDefault();
    setError('');
    if (!finalAmount || finalAmount < 1) { setError('Please enter an amount of at least 1 LRD.'); return; }
    if (!form.phone) { setError('Phone number is required for MTN MoMo.'); return; }
    setLoading(true);
    try {
      const res = await initiateMtnMomo({
        amount:      finalAmount,
        phone:       form.phone,
        currency:    'LRD',
        donor_name:  form.name,
        donor_email: form.email,
        message:     form.message,
      });
      setMtnRef(res.data.reference_id);
    } catch (err) {
      setError(err.response?.data?.error || 'MTN MoMo request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-liberia-red text-white py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-black mb-2">Make a Donation</h1>
          <p className="text-red-100 text-lg">Help us preserve Liberian languages for future generations.</p>
          {stats && (
            <div className="flex justify-center gap-8 mt-6">
              <div>
                <p className="text-3xl font-black">{stats.donors}</p>
                <p className="text-red-200 text-sm">Donors</p>
              </div>
              <div className="border-l border-red-400" />
              <div>
                <p className="text-3xl font-black">${(stats.total_usd || 0).toLocaleString()}</p>
                <p className="text-red-200 text-sm">Raised (USD)</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-xl mx-auto">

          {cancelled && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              Payment was cancelled. No charge was made. You can try again below.
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Payment method tabs */}
            <div className="flex border-b border-gray-100">
              <button onClick={() => { setMethod('stripe'); setError(''); setMtnRef(null); }}
                className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2
                  ${method === 'stripe' ? 'text-liberia-red border-b-2 border-liberia-red bg-red-50' : 'text-gray-500 hover:text-gray-700'}`}>
                💳 Credit / Debit Card
              </button>
              <button onClick={() => { setMethod('mtn'); setError(''); setMtnRef(null); }}
                className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2
                  ${method === 'mtn' ? 'text-liberia-red border-b-2 border-liberia-red bg-red-50' : 'text-gray-500 hover:text-gray-700'}`}>
                📱 MTN Mobile Money
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Amount selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {method === 'stripe' ? 'Amount (USD)' : 'Amount (LRD)'}
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {PRESET_AMOUNTS.map((a) => (
                    <button key={a} type="button"
                      onClick={() => { setAmount(a); setCustom(''); }}
                      className={`py-2 rounded-lg text-sm font-bold border transition-colors
                        ${amount === a && !custom
                          ? 'bg-liberia-red text-white border-liberia-red'
                          : 'border-gray-200 text-gray-700 hover:border-liberia-red hover:text-liberia-red'}`}>
                      {method === 'stripe' ? `$${a}` : `${a.toLocaleString()} LRD`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder={`Custom amount (${method === 'stripe' ? 'USD' : 'LRD'})`}
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red"
                />
              </div>

              {/* Donor info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                  <input value={form.name} onChange={set('name')} disabled={form.anonymous}
                    placeholder="Your name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={set('email')}
                    placeholder="you@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red" />
                </div>
              </div>

              {/* MTN: phone number */}
              {method === 'mtn' && !mtnRef && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">MTN Phone Number *</label>
                  <input value={form.phone} onChange={set('phone')} placeholder="+231XXXXXXXX"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red" />
                  <p className="text-xs text-gray-400 mt-1">Include country code (e.g. +231 for Liberia)</p>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Message (optional)</label>
                <textarea rows={2} value={form.message} onChange={set('message')}
                  placeholder="Leave a note with your donation…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-red resize-none" />
              </div>

              {/* Anonymous toggle */}
              {method === 'stripe' && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm((f) => ({ ...f, anonymous: e.target.checked }))}
                    className="w-4 h-4 accent-liberia-red" />
                  Donate anonymously
                </label>
              )}

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              {/* MTN status poller */}
              {method === 'mtn' && mtnRef && !mtnDone && (
                <MtnStatusPoller referenceId={mtnRef} onDone={setMtnDone} />
              )}
              {mtnDone === true && (
                <div className="text-center py-4">
                  <p className="text-xl font-black text-green-600">✓ Payment Confirmed!</p>
                  <p className="text-sm text-gray-500 mt-1">Thank you for your donation.</p>
                </div>
              )}
              {mtnDone === false && (
                <div className="text-center py-4">
                  <p className="text-base font-bold text-red-600">Payment was not completed.</p>
                  <button onClick={() => { setMtnRef(null); setMtnDone(null); }} className="text-sm text-liberia-blue hover:underline mt-1">Try again</button>
                </div>
              )}

              {/* Submit */}
              {!(method === 'mtn' && (mtnRef || mtnDone)) && (
                <button
                  onClick={method === 'stripe' ? handleStripe : handleMtn}
                  disabled={loading || !finalAmount}
                  className="w-full bg-liberia-red hover:bg-red-800 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-base transition-colors">
                  {loading ? 'Please wait…'
                    : method === 'stripe'
                      ? `Donate $${finalAmount || '?'} with Card →`
                      : `Send MTN MoMo Request →`}
                </button>
              )}

              <p className="text-xs text-center text-gray-400">
                {method === 'stripe'
                  ? 'Payments processed securely by Stripe. We never see your card details.'
                  : 'You will receive a push notification on your MTN line to approve the payment.'}
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            <Link to="/funding" className="hover:text-liberia-blue">← Back to Support Us</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
