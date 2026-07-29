import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="card p-8 text-center">
          {!sent ? (
            <>
              <div className="text-5xl mb-4">🔑</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
              <p className="text-slate-500 mb-8">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                <div className="form-group">
                  <label className="label" htmlFor="forgot-email">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input id="forgot-email" type="email" placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="animate-fade-in">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox!</h2>
              <p className="text-slate-500 mb-6">
                If <strong className="text-primary-400">{email}</strong> is registered, you'll receive a password reset link within a few minutes.
              </p>
              <p className="text-slate-500 text-sm">Check your spam folder if you don't see it.</p>
            </div>
          )}
          <Link to="/login" className="inline-block mt-6 text-sm text-slate-500 hover:text-slate-500">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
