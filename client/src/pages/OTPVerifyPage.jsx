import { useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function OTPVerifyPage() {
  const { verifyOTP } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Please enter all 6 digits');
    setLoading(true);
    try {
      await verifyOTP(email, code);
      toast.success('Email verified! Welcome aboard 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New OTP sent!');
    } catch {
      toast.error('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Check your email</h2>
          <p className="text-slate-400 mb-2">We sent a 6-digit code to</p>
          <p className="text-primary-400 font-semibold mb-8">{email}</p>

          {/* OTP Input boxes */}
          <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-dark-700 text-slate-100 outline-none transition-all duration-200
                  ${digit ? 'border-primary-500 shadow-glow-primary' : 'border-dark-500 focus:border-primary-500 focus:shadow-glow-primary'}`}
                id={`otp-${i}`}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 6}
            className="btn-primary w-full btn-lg mb-4"
            id="otp-verify-btn"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <p className="text-slate-400 text-sm">
            Didn't receive it?{' '}
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-primary-400 font-semibold hover:text-primary-300 disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          </p>

          <Link to="/register" className="inline-block mt-4 text-sm text-slate-500 hover:text-slate-400">
            ← Back to register
          </Link>
        </div>
      </div>
    </div>
  );
}
