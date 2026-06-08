import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import * as authApi from '../api/auth';

const AGE_GROUPS = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_35',    label: '18–35' },
  { value: '36_55',    label: '36–55' },
  { value: '56_plus',  label: '56+' },
];

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function StrengthBar({ password }) {
  const s = getStrength(password);
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-600'];
  if (!password) return null;
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= s ? colors[s] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`text-xs ${s <= 2 ? 'text-red-500' : s <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
        {labels[s]}
      </p>
    </div>
  );
}

// ── Show/hide password input ──────────────────────────────────────────────────
const PasswordInput = forwardRef(function PasswordInput(
  { placeholder = '••••••••', showStrength = false, strengthValue = '', ...props },
  ref
) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className="input-field pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {showStrength && <StrengthBar password={strengthValue} />}
    </div>
  );
});

// ── OAuth buttons ─────────────────────────────────────────────────────────────
function OAuthButtons() {
  const error = new URLSearchParams(window.location.search).get('error');
  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error === 'oauth_not_configured'
            ? 'Social sign-in is not configured on this server.'
            : 'Social sign-in failed. Please try again or use email.'}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <a href={`${API_BASE}/auth/google`}
          className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors">
          <GoogleIcon /> Google
        </a>
        <a href={`${API_BASE}/auth/github`}
          className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors">
          <GitHubIcon /> GitHub
        </a>
      </div>
      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400 uppercase tracking-widest">or continue with email</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Auth() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [serverError, setServerError] = useState('');
  const [checkEmail, setCheckEmail] = useState(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setTab(searchParams.get('tab') === 'register' ? 'register' : 'login');
    setServerError('');
    setCheckEmail(null);
    setUnverifiedEmail(null);
    setShowForgot(false);
  }, [searchParams]);

  if (checkEmail) return <CheckEmailScreen email={checkEmail} onBack={() => setCheckEmail(null)} />;
  if (showForgot) return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-liberia-blue text-white px-6 py-4">
        <Link to="/" className="text-sm font-semibold hover:text-gray-300 transition-colors">← Back to Home</Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="h-1 bg-liberia-red rounded-t mb-0" />
          <div className="bg-white border border-gray-200 border-t-0 rounded-b shadow-sm p-8">
            <h1 className="text-2xl font-black text-liberia-blue mb-1">
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {tab === 'login'
                ? 'Welcome back to the liblingua.'
                : 'Join the effort to preserve Liberian languages.'}
            </p>

            <OAuthButtons />

            <div className="flex gap-1 bg-gray-100 p-1 rounded mb-6">
              {['login', 'register'].map((t) => (
                <button key={t} onClick={() => { setTab(t); setServerError(''); setUnverifiedEmail(null); }}
                  className={`flex-1 py-2 rounded text-sm font-semibold transition-colors capitalize
                    ${tab === t ? 'bg-white text-liberia-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {serverError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {serverError}
              </div>
            )}

            {unverifiedEmail && (
              <UnverifiedNotice email={unverifiedEmail} onResent={() => setUnverifiedEmail(null)} />
            )}

            {tab === 'login'
              ? <LoginForm
                  setServerError={setServerError}
                  setUnverifiedEmail={setUnverifiedEmail}
                  login={login}
                  navigate={navigate}
                  onForgot={() => setShowForgot(true)}
                />
              : <RegisterForm setServerError={setServerError} onSuccess={(email) => setCheckEmail(email)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Forgot password screen ────────────────────────────────────────────────────
function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-liberia-blue text-white px-6 py-4">
        <button onClick={onBack} className="text-sm font-semibold hover:text-gray-300 transition-colors">← Back</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="h-1 bg-liberia-red rounded-t" />
          <div className="bg-white border border-gray-200 border-t-0 rounded-b shadow-sm p-8">
            <h2 className="text-2xl font-black text-liberia-blue mb-2">Reset Password</h2>
            {sent ? (
              <p className="text-sm text-gray-600 mt-4">
                If that email is registered, a reset link has been sent. Check your inbox.
              </p>
            ) : (
              <form onSubmit={handle} className="space-y-4 mt-4">
                <p className="text-sm text-gray-500">Enter your email and we'll send you a reset link.</p>
                <input type="email" className="input-field" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Check-your-email screen ───────────────────────────────────────────────────
function CheckEmailScreen({ email, onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-liberia-blue text-white px-6 py-4">
        <button onClick={onBack} className="text-sm font-semibold hover:text-gray-300 transition-colors">← Back</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="h-1 bg-liberia-red rounded-t" />
          <div className="bg-white border border-gray-200 border-t-0 rounded-b shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-liberia-red/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-liberia-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-liberia-blue mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-1">We sent a verification link to:</p>
            <p className="font-bold text-liberia-blue mb-5">{email}</p>
            <p className="text-sm text-gray-500 mb-6">
              Click the link in the email to activate your account. Check your spam folder if you don't see it.
            </p>
            <button onClick={onBack} className="text-sm text-liberia-red hover:underline font-semibold">
              Resend verification email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Unverified notice ─────────────────────────────────────────────────────────
function UnverifiedNotice({ email, onResent }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification(email);
      setSent(true);
      setTimeout(onResent, 2000);
    } catch { /* ignore */ } finally { setSending(false); }
  };

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
      <p className="font-semibold mb-1">Email not verified</p>
      <p className="text-amber-700 mb-2">Please verify your email before signing in.</p>
      {sent ? (
        <p className="text-green-700 font-semibold">Verification email resent!</p>
      ) : (
        <button onClick={resend} disabled={sending}
          className="text-liberia-red font-semibold hover:underline disabled:opacity-50">
          {sending ? 'Sending…' : 'Resend verification email'}
        </button>
      )}
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ setServerError, setUnverifiedEmail, login, navigate, onForgot }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    setServerError('');
    setUnverifiedEmail(null);
    try {
      const res = await authApi.login(data);
      login(res.data.contributor);
      navigate('/dashboard');
    } catch (err) {
      const body = err.response?.data;
      if (body?.email_unverified) {
        setUnverifiedEmail(body.email || data.email);
      } else {
        setServerError(body?.error || 'Login failed');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
        <input type="email" className="input-field" placeholder="you@example.com"
          {...register('email', { required: 'Email is required' })} />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
        <PasswordInput placeholder="••••••••" {...register('password', { required: 'Password is required' })} />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>
      <div className="text-right">
        <button type="button" onClick={onForgot} className="text-xs text-liberia-red hover:underline font-medium">
          Forgot password?
        </button>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}

// ── Register form ─────────────────────────────────────────────────────────────
function RegisterForm({ setServerError, onSuccess }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { is_l1_speaker: false },
  });
  const passwordValue = watch('password', '');
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const payload = { ...data, is_l1_speaker: data.is_l1_speaker === 'true' || data.is_l1_speaker === true };
      const res = await authApi.register(payload);
      if (res.data.contributor) {
        login(res.data.contributor);
        navigate('/dashboard');
        return;
      }
      onSuccess(res.data.email || data.email);
    } catch (err) {
      setServerError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
        <input className="input-field" placeholder="Jallah Kamara"
          {...register('name', { required: 'Name is required' })} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
        <input type="email" className="input-field" placeholder="you@example.com"
          {...register('email', { required: 'Email is required' })} />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
        <PasswordInput
          placeholder="••••••••"
          showStrength
          strengthValue={passwordValue}
          {...register('password', {
            required: 'Required',
            minLength: { value: 8, message: 'Min 8 characters' },
            validate: {
              upper: (v) => /[A-Z]/.test(v) || 'Must contain an uppercase letter',
              lower: (v) => /[a-z]/.test(v) || 'Must contain a lowercase letter',
              digit: (v) => /[0-9]/.test(v) || 'Must contain a number',
            },
          })}
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Native Language</label>
        <input className="input-field" placeholder="e.g. Kpelle"
          {...register('native_language', { required: 'Required' })} />
        {errors.native_language && <p className="text-xs text-red-500 mt-1">{errors.native_language.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Dialect (optional)</label>
        <input className="input-field" placeholder="e.g. Central Kpelle" {...register('native_dialect')} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Region of Origin</label>
        <input className="input-field" placeholder="e.g. Bong County"
          {...register('region_of_origin', { required: 'Required' })} />
        {errors.region_of_origin && <p className="text-xs text-red-500 mt-1">{errors.region_of_origin.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Age Group</label>
        <select className="input-field" {...register('age_group', { required: 'Required' })}>
          <option value="">— Select —</option>
          {AGE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        {errors.age_group && <p className="text-xs text-red-500 mt-1">{errors.age_group.message}</p>}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" {...register('is_l1_speaker')}
          className="w-4 h-4 text-liberia-red rounded border-gray-300 focus:ring-liberia-red" />
        <span className="text-sm text-gray-700">I am a native (L1) speaker of my listed language</span>
      </label>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Creating account…' : 'Create Account'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        You'll receive a verification email before you can sign in.
      </p>
    </form>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}
