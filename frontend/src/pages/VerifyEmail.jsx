import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as authApi from '../api/auth';

export default function VerifyEmail() {
  const { token } = useParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    authApi.verifyEmail(token)
      .then((res) => {
        login(res.data.contributor);
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 2500);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'This verification link is invalid or has expired.');
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-liberia-blue h-1.5" />
      <div className="bg-liberia-blue text-white px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold hover:text-gray-300 transition-colors">
          ← Home
        </Link>
        <span className="text-xs text-gray-400 uppercase tracking-widest">Account Activation</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="h-1 bg-liberia-red rounded-t" />
          <div className="bg-white border border-gray-200 border-t-0 shadow-sm rounded-b p-10 text-center">

            {status === 'loading' && <LoadingState />}
            {status === 'success' && <SuccessState />}
            {status === 'error'   && <ErrorState message={message} />}

          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <div className="w-14 h-14 border-4 border-gray-200 border-t-liberia-red rounded-full animate-spin mx-auto mb-5" />
      <h2 className="text-xl font-black text-liberia-blue mb-2">Verifying your email…</h2>
      <p className="text-sm text-gray-500">Just a moment.</p>
    </>
  );
}

function SuccessState() {
  return (
    <>
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-liberia-blue mb-2">Email Verified!</h2>
      <p className="text-gray-600 mb-1">Your account is now active.</p>
      <p className="text-sm text-gray-400">Redirecting you to your dashboard…</p>
    </>
  );
}

function ErrorState({ message }) {
  return (
    <>
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-liberia-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-liberia-blue mb-2">Verification Failed</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex flex-col gap-3">
        <Link to="/auth" className="btn-primary-red inline-block">
          Back to Sign In
        </Link>
        <Link to="/auth" state={{ resend: true }}
          className="text-sm text-liberia-red hover:underline font-semibold">
          Resend verification email
        </Link>
      </div>
    </>
  );
}
