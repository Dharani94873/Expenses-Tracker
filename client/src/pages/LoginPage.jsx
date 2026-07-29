import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Mail, Lock, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [cachedCreds, setCachedCreds] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const result = await login(data);
      if (result?.requires2FA) {
        setRequires2FA(true);
        setCachedCreds(data);
        toast('Enter your 2FA code to continue', { icon: '🔐' });
      } else {
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
    }
  };

  const handle2FA = async () => {
    try {
      await login({ ...cachedCreds, twoFAToken });
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch {
      toast.error('Invalid 2FA code');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center p-12">
          <div className="text-6xl mb-6">💰</div>
          <h2 className="text-4xl font-bold gradient-text mb-4">ExpenseTracker</h2>
          <p className="text-slate-400 text-lg max-w-sm mx-auto">
            Take control of your finances with smart budgeting and real-time insights.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '📊', title: 'Analytics', desc: 'Visual spending insights' },
              { icon: '🔔', title: 'Alerts', desc: 'Budget threshold alerts' },
              { icon: '📄', title: 'Reports', desc: 'PDF & Excel exports' },
              { icon: '🔒', title: 'Secure', desc: 'Bank-level encryption' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="glass-card p-4">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="font-semibold text-slate-200 text-sm">{title}</p>
                <p className="text-slate-500 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo (mobile only) */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl">💰</span>
            <h1 className="text-2xl font-bold gradient-text mt-2">ExpenseTracker</h1>
          </div>

          <div className="card p-8 animate-slide-up">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Welcome back</h2>
            <p className="text-slate-400 mb-7">Sign in to your account</p>

            {!requires2FA ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="form-group">
                  <label className="label" htmlFor="email">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="error-msg">{errors.email.message}</p>}
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="password">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="error-msg">{errors.password.message}</p>}
                </div>

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full btn-lg"
                  id="login-submit"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div className="text-center">
                  <div className="text-4xl mb-3">🔐</div>
                  <p className="text-slate-300">Enter your 6-digit authentication code</p>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="input text-center text-2xl tracking-widest font-mono"
                  value={twoFAToken}
                  onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/, ''))}
                />
                <button onClick={handle2FA} className="btn-primary w-full btn-lg">
                  Verify
                </button>
                <button onClick={() => setRequires2FA(false)} className="btn-ghost w-full">
                  ← Back
                </button>
              </div>
            )}

            <p className="text-center text-slate-400 text-sm mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 font-semibold hover:text-primary-300">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
