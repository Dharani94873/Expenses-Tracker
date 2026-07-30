import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Target } from 'lucide-react';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { useCurrency } from '../hooks/useCurrency';

const MONTHS_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const schema = yup.object({
  category: yup.string().required('Category is required'),
  limitAmount: yup.number().positive().min(1).required('Limit is required'),
  month: yup.number().min(1).max(12).required(),
  year: yup.number().min(2020).max(2100).required(),
  alertThresholdPercent: yup.number().min(1).max(100),
});

function BudgetCard({ budget, onDelete, symbol }) {
  const pct = Math.min(budget.percent, 100);
  const color = pct >= 100 ? '#ff5252' : pct >= 80 ? '#ffb74d' : '#00e676';

  return (
    <div className="card-hover p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
            {budget.category?.icon || '💰'}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{budget.category?.name}</p>
            <p className="text-xs text-slate-500">
              {MONTHS_NAMES[budget.month - 1]} {budget.year}
            </p>
          </div>
        </div>
        <button onClick={() => onDelete(budget._id)} className="btn-icon btn-danger btn-sm">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Spent</span>
          <span style={{ color }} className="font-bold">{budget.percent}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"
            style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}40` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-100 rounded-lg p-2">
          <p className="text-xs text-slate-500">Budget</p>
          <p className="text-sm font-bold text-slate-800">{symbol}{budget.limitAmount.toFixed(0)}</p>
        </div>
        <div className="bg-slate-100 rounded-lg p-2">
          <p className="text-xs text-slate-500">Spent</p>
          <p className="text-sm font-bold" style={{ color: budget.spent > budget.limitAmount ? '#ff5252' : '#e2e8f0' }}>
            {symbol}{budget.spent.toFixed(0)}
          </p>
        </div>
        <div className="bg-slate-100 rounded-lg p-2">
          <p className="text-xs text-slate-500">Left</p>
          <p className="text-sm font-bold" style={{ color: budget.remaining > 0 ? '#00e676' : '#ff5252' }}>
            {symbol}{budget.remaining.toFixed(0)}
          </p>
        </div>
      </div>

      {budget.percent >= budget.alertThresholdPercent && (
        <div className={`mt-3 text-xs rounded-lg px-3 py-2 flex items-center gap-1.5
          ${budget.percent >= 100 ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-amber/10 text-accent-amber'}`}>
          {budget.percent >= 100 ? '🔴 Budget exceeded!' : `⚠️ ${100 - budget.percent}% remaining`}
        </div>
      )}
    </div>
  );
}

function BudgetModal({ onClose, onSaved, categories }) {
  const now = new Date();
  const { symbol } = useCurrency();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      alertThresholdPercent: 80,
    },
  });

  const onSubmit = async (data) => {
    try {
      await api.post('/budgets', data);
      toast.success('Budget saved!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="font-bold text-slate-900">Set Budget</h2>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="modal-body space-y-4">
          <div className="form-group">
            <label className="label">Category</label>
            <select className={`select ${errors.category ? 'input-error' : ''}`} {...register('category')}>
              <option value="">Select category</option>
              {categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => (
                <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
              ))}
            </select>
            {errors.category && <p className="error-msg">{errors.category.message}</p>}
          </div>

          <div className="form-group">
            <label className="label">Monthly Limit ({symbol})</label>
            <input type="number" step="0.01" placeholder="e.g. 500"
              className={`input ${errors.limitAmount ? 'input-error' : ''}`}
              {...register('limitAmount')} />
            {errors.limitAmount && <p className="error-msg">{errors.limitAmount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Month</label>
              <select className="select" {...register('month')}>
                {MONTHS_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Year</label>
              <select className="select" {...register('year')}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Alert Threshold (%)</label>
            <input type="number" min="1" max="100" className="input" {...register('alertThresholdPercent')} />
            <p className="text-xs text-slate-500 mt-1">Notify when spending reaches this percentage</p>
          </div>
        </form>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : 'Set Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const { symbol } = useCurrency();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetsRes, summaryRes, catsRes] = await Promise.all([
        api.get(`/budgets?month=${month}&year=${year}`),
        api.get(`/budgets/summary?month=${month}&year=${year}`),
        api.get('/categories'),
      ]);
      setBudgets(budgetsRes.data.data);
      setSummary(summaryRes.data.summary);
      setCategories(catsRes.data.data);
    } catch {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      toast.success('Budget deleted');
      fetchBudgets();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="text-slate-500 text-sm mt-0.5">Set limits and track spending by category</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="select w-auto" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="select w-auto" value={year} onChange={(e) => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} />Set Budget
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Budget', value: summary.totalBudget, color: 'text-primary-400' },
            { label: 'Total Spent', value: summary.totalSpent, color: 'text-accent-red' },
            { label: 'Remaining', value: summary.totalRemaining, color: 'text-accent-green' },
            { label: 'Overall', value: `${summary.overallPercent}%`, color: summary.overallPercent >= 100 ? 'text-accent-red' : 'text-accent-amber', isPercent: true },
          ].map(({ label, value, color, isPercent }) => (
            <div key={label} className="card p-4 text-center">
              <p className="text-slate-500 text-xs mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>
                {isPercent ? value : `${symbol}${(value || 0).toFixed(0)}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Budget cards grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="card p-12 text-center">
          <Target size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No budgets set</h3>
          <p className="text-slate-500 text-sm mb-4">Set spending limits to stay on track</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} />Create your first budget
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => (
            <BudgetCard key={b._id} budget={b} onDelete={handleDelete} symbol={symbol} />
          ))}
        </div>
      )}

      {showModal && (
        <BudgetModal onClose={() => setShowModal(false)} onSaved={fetchBudgets} categories={categories} />
      )}
    </div>
  );
}
