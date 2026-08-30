// apps/web/src/app/(auth)/login/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Lock,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  GraduationCap,
  Phone,
  CheckCircle2,
  Mail,
  Building,
} from 'lucide-react';

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '718018327158-br3d94rjnl5vcfdcp66teotjcrjnmn6e.apps.googleusercontent.com';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('rajanprasaila@gmail.com');
  const [password, setPassword] = useState('Admin@Examly2026!');
  const [error, setError] = useState('');
  const [blockedNotice, setBlockedNotice] = useState<{ email?: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);

  // Student Onboarding Modal State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAuthData, setOnboardingAuthData] = useState<any>(null);
  const [onboardingFullName, setOnboardingFullName] = useState('');
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [onboardingRollNumber, setOnboardingRollNumber] = useState('');
  const [onboardingBatchId, setOnboardingBatchId] = useState('');
  const [onboardingProvince, setOnboardingProvince] = useState('Bagmati');
  const [onboardingDistrict, setOnboardingDistrict] = useState('Kathmandu');
  const [onboardingMunicipality, setOnboardingMunicipality] = useState('Kathmandu Metropolitan City');
  const [onboardingWard, setOnboardingWard] = useState('04');
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);

  // Initialize Google Identity Services
  useEffect(() => {
    const initGoogle = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const btnContainer = document.getElementById('google-signin-btn');
          if (btnContainer) {
            btnContainer.innerHTML = '';
            (window as any).google.accounts.id.renderButton(btnContainer, {
              theme: 'outline',
              size: 'large',
              width: 360,
              text: 'continue_with',
              shape: 'pill',
              logo_alignment: 'left',
            });
          }
          setIsGoogleScriptLoaded(true);
        } catch (e) {
          console.error('Google GSI init error:', e);
        }
      }
    };

    initGoogle();
    const interval = setInterval(() => {
      if ((window as any).google) {
        initGoogle();
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleGooglePrompt = () => {
    if (typeof window !== 'undefined' && (window as any).google) {
      try {
        (window as any).google.accounts.id.prompt();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleGoogleCallback = async (response: any) => {
    setError('');
    setBlockedNotice(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/google', {
        idToken: response.credential,
        deviceInfo: 'Examly Web Desktop',
      });

      const { user, accessToken, refreshToken, requiresOnboarding } = res.data;

      // Check if user is blocked
      if (user?.status === 'BLOCKED') {
        setBlockedNotice({
          email: user.email,
          message:
            'Your account has been deactivated or blocked by the institute administrator. Please contact your coordinator or support@examly.io to restore access.',
        });
        setIsLoading(false);
        return;
      }

      // Check if student profile needs completion / details update
      if (requiresOnboarding || (user.role === 'STUDENT' && !user.phone)) {
        login({ accessToken, refreshToken, user });
        setOnboardingAuthData(res.data);
        setOnboardingFullName(user.fullName || '');
        setOnboardingEmail(user.email || '');
        setOnboardingPhone(user.phone || '');
        setOnboardingRollNumber(user.studentProfile?.rollNumber || `STU-${Math.floor(10000 + Math.random() * 90000)}`);
        setOnboardingBatchId(user.studentProfile?.batchId || '');
        setOnboardingProvince(user.studentProfile?.province || 'Bagmati');
        setOnboardingDistrict(user.studentProfile?.district || 'Kathmandu');
        setOnboardingMunicipality(user.studentProfile?.municipality || 'Kathmandu Metropolitan City');
        setOnboardingWard(user.studentProfile?.wardNumber || '04');

        // Fetch active batches for selection
        try {
          const batchRes = await api.get('/batches');
          setAvailableBatches(batchRes.data || []);
          if (batchRes.data?.length > 0 && !user.studentProfile?.batchId) {
            setOnboardingBatchId(batchRes.data[0].id);
          }
        } catch {
          // ignore
        }

        setShowOnboarding(true);
        setIsLoading(false);
        return;
      }

      // Login directly
      login(res.data);
      router.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Google authentication failed';
      if (msg.includes('USER_BLOCKED') || msg.includes('blocked') || msg.includes('deactivated')) {
        setBlockedNotice({
          message:
            'Your account has been deactivated or blocked by the institute administrator. Please contact your academic coordinator or support@examly.io to restore access.',
        });
      } else {
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingPhone) {
      alert('Please enter a valid contact phone number.');
      return;
    }

    setIsOnboardingSubmitting(true);
    try {
      const res = await api.post('/auth/onboarding', {
        fullName: onboardingFullName,
        phone: onboardingPhone,
        rollNumber: onboardingRollNumber,
        batchId: onboardingBatchId,
        province: onboardingProvince,
        district: onboardingDistrict,
        municipality: onboardingMunicipality,
        wardNumber: onboardingWard,
      });

      if (res.data?.user) {
        login({
          accessToken: onboardingAuthData.accessToken,
          refreshToken: onboardingAuthData.refreshToken,
          user: res.data.user,
        });
      }

      setShowOnboarding(false);
      router.push('/');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete profile onboarding');
    } finally {
      setIsOnboardingSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBlockedNotice(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', {
        identifier,
        password,
        deviceInfo: 'Examly Web Admin Desktop',
      });

      login(res.data);
      router.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid credentials or connection failed';
      if (msg.includes('blocked') || msg.includes('deactivated') || msg.includes('inactive')) {
        setBlockedNotice({
          email: identifier,
          message:
            'Your account has been deactivated or blocked by the institute administrator. Please contact your coordinator or support@examly.io to restore access.',
        });
      } else {
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError('');
    setBlockedNotice(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Load Google Identity Services */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIsGoogleScriptLoaded(true)}
      />

      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand-600/20 to-accent-purple/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
        {/* Brand Logo & Title */}
        <div className="text-center mb-7">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-indigo items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-brand-500/30 mb-4">
            E
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Examly Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-Tenant Learning & Examination System</p>
        </div>

        {/* ── USER FRIENDLY BLOCKED NOTICE ── */}
        {blockedNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <div className="font-bold text-amber-200 text-sm">Account Access Suspended</div>
                <p className="text-amber-300/90 leading-relaxed">{blockedNotice.message}</p>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href="mailto:support@examly.io?subject=Account%20Reactivation%20Request"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-bold rounded-lg transition-colors"
                  >
                    <Mail className="w-3 h-3" /> Contact Support Team
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standard Error Notice */}
        {error && !blockedNotice && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── SINGLE UNIFIED GOOGLE SIGN-IN BUTTON ── */}
        <div className="w-full relative min-h-[44px] flex justify-center">
          <div id="google-signin-btn" className="w-full flex justify-center relative z-10"></div>
          {!isGoogleScriptLoaded && (
            <button
              type="button"
              onClick={handleGooglePrompt}
              className="w-full max-w-[360px] py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-full shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          )}
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/50"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-slate-900 text-slate-500">or sign in with password</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email, Phone or Roll Number
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="rajanprasaila@gmail.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign In to Console <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Quick Demo Switcher */}
        <div className="mt-7 pt-5 border-t border-slate-800/80">
          <p className="text-[11px] font-medium text-slate-400 mb-3 text-center flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" /> 1-Click Fast Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('rajanprasaila@gmail.com', 'Admin@Examly2026!')}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-brand-500/40 hover:border-brand-500 rounded-xl text-[11px] text-slate-300 font-medium text-left transition-all cursor-pointer"
            >
              👑 <span className="text-white font-bold">Super Admin</span>
              <span className="block text-[9px] text-brand-400 truncate font-mono">rajanprasaila@...</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('director@apexmedical.edu.np', 'Admin@Examly2026!')}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-[11px] text-slate-300 font-medium text-left hover:border-brand-500/50 transition-all cursor-pointer"
            >
              🏫 <span className="text-white font-bold">Institute Admin</span>
              <span className="block text-[9px] text-slate-400 truncate font-mono">director@apex...</span>
            </button>
          </div>
        </div>

        {/* Signup & Support Links */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex justify-between text-xs">
          <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
            Create Account
          </Link>
          <a
            href="mailto:support@examly.io"
            className="text-slate-400 hover:text-brand-400 font-medium transition-colors"
          >
            Need Help?
          </a>
        </div>
      </div>

      {/* ── STUDENT ONBOARDING DETAILS MODAL ── */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="text-center space-y-1.5 pb-2 border-b border-slate-800">
              <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-1">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Complete Student Profile</h2>
              <p className="text-xs text-slate-400">
                Welcome to Examly! Please confirm your student details to activate your enrolled batches & mock tests.
              </p>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-xs">
              {/* Role & Institute Badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-400" />
                  <span className="text-slate-300 font-medium">Assigned Institute:</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
                  Apex Medical Academy
                </span>
              </div>

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={onboardingFullName}
                    onChange={(e) => setOnboardingFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Verified Google Email</label>
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{onboardingEmail}</span>
                  </div>
                </div>
              </div>

              {/* Phone & Roll No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Contact Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="98XXXXXXXX"
                      value={onboardingPhone}
                      onChange={(e) => setOnboardingPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Assigned Roll No</label>
                  <input
                    type="text"
                    value={onboardingRollNumber}
                    onChange={(e) => setOnboardingRollNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              {/* Batch Selection */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Your Batch *</label>
                <select
                  value={onboardingBatchId}
                  onChange={(e) => setOnboardingBatchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                  {availableBatches.length === 0 && (
                    <option value="">General Medical Entrance Batch</option>
                  )}
                </select>
              </div>

              {/* Location Details (Nepal) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Province</label>
                  <select
                    value={onboardingProvince}
                    onChange={(e) => setOnboardingProvince(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="Bagmati">Bagmati Province</option>
                    <option value="Gandaki">Gandaki Province</option>
                    <option value="Koshi">Koshi Province</option>
                    <option value="Madhesh">Madhesh Province</option>
                    <option value="Lumbini">Lumbini Province</option>
                    <option value="Karnali">Karnali Province</option>
                    <option value="Sudurpashchim">Sudurpashchim Province</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">District</label>
                  <input
                    type="text"
                    value={onboardingDistrict}
                    onChange={(e) => setOnboardingDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isOnboardingSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-brand-600 to-accent-indigo hover:from-brand-500 hover:to-accent-indigo/90 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isOnboardingSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirm & Enter Student Portal <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
