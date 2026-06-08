import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { LanguageProvider } from './components/LanguageSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import Landing        from './pages/Landing';
import Auth           from './pages/Auth';
import VerifyEmail    from './pages/VerifyEmail';
import ResetPassword  from './pages/ResetPassword';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard      from './pages/Dashboard';
import Translate      from './pages/Translate';
import Admin          from './pages/Admin';
import Contributors   from './pages/Contributors';
import FAQ            from './pages/FAQ';
import Contact        from './pages/Contact';
import Funding        from './pages/Funding';
import Donate         from './pages/Donate';
import Campaigns      from './pages/Campaigns';
import ApiDocs        from './pages/ApiDocs';
import Datasets       from './pages/Datasets';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/"                  element={<Landing />} />
            <Route path="/auth"              element={<Auth />} />
            <Route path="/auth/verify/:token"           element={<VerifyEmail />} />
            <Route path="/auth/reset-password/:token"   element={<ResetPassword />} />
            <Route path="/contributors"      element={<Contributors />} />
            <Route path="/faq"               element={<FAQ />} />
            <Route path="/contact"           element={<Contact />} />
            <Route path="/funding"           element={<Funding />} />
            <Route path="/donate"            element={<Donate />} />
            <Route path="/donate/success"    element={<Donate />} />
            <Route path="/campaigns"         element={<Campaigns />} />
            <Route path="/api-docs"          element={<ApiDocs />} />
            <Route path="/datasets"          element={
              <ProtectedRoute><Datasets /></ProtectedRoute>
            } />

            {/* SSO profile completion — requires a cookie/session but NOT a complete profile */}
            <Route path="/auth/complete"     element={<CompleteProfile />} />

            {/* Protected — full profile required */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <ErrorBoundary><Dashboard /></ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/translate" element={
              <ProtectedRoute><Translate /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <ErrorBoundary><Admin /></ErrorBoundary>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
