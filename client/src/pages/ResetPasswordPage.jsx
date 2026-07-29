import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      return toast.error('Password must contain uppercase, lowercase and number');

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h2>
            <p className="text-slate-500">Choose a strong new password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-group">
              <label className="label" htmlFor="new-password">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="new-password" type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars with uppercase & number"
                  className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="confirm-new-password">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="confirm-new-password" type={showPassword ? 'text' : 'password'}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  className={`input pl-10 ${confirm && confirm !== password ? 'input-error' : ''}`} />
              </div>
              {confirm && confirm !== password && (
                <p className="error-msg">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <Link to="/login" className="inline-block mt-6 text-sm text-slate-500 hover:text-slate-500">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
