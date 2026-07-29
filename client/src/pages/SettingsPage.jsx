import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { User, Lock, Shield, Bell, Eye, EyeOff, QrCode, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const profileSchema = yup.object({
  name: yup.string().min(2).max(50).required('Name is required'),
  currency: yup.string().required(),
});
const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup.string().min(8).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  confirmPassword: yup.string().oneOf([yup.ref('newPassword')], 'Passwords must match').required(),
});

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3 border-b border-dark-600 pb-4">
        <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
          <Icon size={18} />
        </div>
        <h2 className="font-bold text-slate-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [showPassword, setShowPassword] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [qrCode, setQrCode] = useState(null);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);

  const profileForm = useForm({ 
    resolver: yupResolver(profileSchema),
    values: { name: user?.name || '', currency: user?.currency || 'USD' } 
  });
  const passwordForm = useForm({ resolver: yupResolver(passwordSchema) });

  const onUpdateProfile = async (data) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('currency', data.currency);
      if (avatarFile) formData.append('avatar', avatarFile);
      const res = await api.put('/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const onChangePassword = async (data) => {
    try {
      await api.put('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed! Please log in again.');
      passwordForm.reset();
      setShowPassword({ currentPassword: false, newPassword: false, confirmPassword: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleSetup2FA = async () => {
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setQrCode(data.qrCode);
      setShowQR(true);
    } catch {
      toast.error('Failed to setup 2FA');
    }
  };

  const handleEnable2FA = async () => {
    try {
      await api.post('/auth/2fa/enable', { token: twoFAToken });
      updateUser({ twoFAEnabled: true });
      toast.success('2FA enabled!');
      setShowQR(false);
      setTwoFAToken('');
    } catch {
      toast.error('Invalid verification code');
    }
  };

  const handleDisable2FA = async () => {
    try {
      await api.delete('/auth/2fa/disable');
      updateUser({ twoFAEnabled: false });
      toast.success('2FA disabled');
    } catch {
      toast.error('Failed to disable 2FA');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const togglePassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <SectionCard icon={User} title="Profile">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-glow-primary">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase()
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <User size={18} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
          </label>
          <div>
            <p className="font-semibold text-slate-200">{user?.name}</p>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <p className="text-xs text-slate-600 mt-0.5">Click avatar to change photo</p>
          </div>
        </div>

        <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Full Name</label>
              <input className={`input ${profileForm.formState.errors.name ? 'input-error' : ''}`}
                {...profileForm.register('name')} />
              {profileForm.formState.errors.name && (
                <p className="error-msg">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="form-group">
              <label className="label">Currency</label>
              <select className="select" {...profileForm.register('currency')}>
                {['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" className="input opacity-60" value={user?.email || ''} disabled />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
          </div>
          <button type="submit" disabled={profileForm.formState.isSubmitting} className="btn-primary">
            {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </SectionCard>

      {/* Change Password */}
      <SectionCard icon={Lock} title="Change Password">
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
          {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
            <div key={field} className="form-group">
              <label className="label">
                {field === 'currentPassword' ? 'Current Password'
                  : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword[field] ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pl-10 pr-10 ${passwordForm.formState.errors[field] ? 'input-error' : ''}`}
                  {...passwordForm.register(field)}
                />
                <button type="button" onClick={() => togglePassword(field)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordForm.formState.errors[field] && (
                <p className="error-msg">{passwordForm.formState.errors[field].message}</p>
              )}
            </div>
          ))}
          <button type="submit" disabled={passwordForm.formState.isSubmitting} className="btn-primary">
            {passwordForm.formState.isSubmitting ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </SectionCard>

      {/* 2FA */}
      <SectionCard icon={Shield} title="Two-Factor Authentication">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-200 font-medium">
              {user?.twoFAEnabled ? '✅ 2FA is enabled' : '2FA is disabled'}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {user?.twoFAEnabled
                ? 'Your account has an extra layer of protection.'
                : 'Add an authenticator app for extra security.'}
            </p>
          </div>
          {user?.twoFAEnabled ? (
            <button onClick={handleDisable2FA} className="btn-danger btn-sm">Disable</button>
          ) : (
            <button onClick={handleSetup2FA} className="btn-secondary btn-sm gap-1.5">
              <QrCode size={14} />Enable
            </button>
          )}
        </div>

        {showQR && qrCode && (
          <div className="border border-dark-600 rounded-xl p-5 space-y-4 animate-slide-down">
            <p className="text-sm text-slate-300">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-40 h-40 rounded-xl" />
            </div>
            <div className="form-group">
              <label className="label">Enter verification code</label>
              <input type="text" maxLength={6} placeholder="000000"
                className="input text-center tracking-widest text-lg font-mono"
                value={twoFAToken}
                onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowQR(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleEnable2FA} className="btn-primary flex-1">Verify & Enable</button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Danger Zone */}
      <div className="card p-5 border-accent-red/20">
        <h2 className="font-bold text-accent-red mb-3 flex items-center gap-2">⚠️ Danger Zone</h2>
        <p className="text-slate-400 text-sm mb-4">These actions cannot be undone.</p>
        <button className="btn-danger btn-sm" onClick={() => toast.error('Contact support to delete your account')}>
          Delete Account
        </button>
      </div>
    </div>
  );
}
