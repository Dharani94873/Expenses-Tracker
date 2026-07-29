import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, X, Pencil, Trash2, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const schema = yup.object({
  type: yup.string().oneOf(['income', 'expense']).required(),
  amount: yup.number().positive('Must be positive').required('Amount is required'),
  category: yup.string().required('Category is required'),
  date: yup.string().required('Date is required'),
  description: yup.string().max(200),
  paymentMethod: yup.string(),
  notes: yup.string().max(500),
});

const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'upi', 'other'];

function TransactionModal({ onClose, onSaved, editData, categories }) {
  const isEdit = !!editData;
  const [receiptFile, setReceiptFile] = useState(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: editData ? {
      type: editData.type,
      amount: editData.amount,
      category: editData.category?._id,
      date: format(new Date(editData.date), 'yyyy-MM-dd'),
      description: editData.description || '',
      paymentMethod: editData.paymentMethod || 'card',
      notes: editData.notes || '',
    } : {
      type: 'expense',
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'card',
    },
  });

  const selectedType = watch('type');
  const filteredCats = categories.filter(c => c.type === selectedType || c.type === 'both');

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== '') formData.append(k, v); });
      if (receiptFile) formData.append('receipt', receiptFile);

      if (isEdit) {
        await api.put(`/transactions/${editData._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Transaction updated');
      } else {
        await api.post('/transactions', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Transaction added');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="font-bold text-slate-900">{isEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="modal-body space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            {['expense', 'income'].map((t) => (
              <button key={t} type="button"
                onClick={() => setValue('type', t)}
                className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200
                  ${selectedType === t
                    ? t === 'expense' ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-green/20 text-accent-green'
                    : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'expense' ? '💸' : '💰'} {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Amount</label>
              <input type="number" step="0.01" placeholder="0.00"
                className={`input ${errors.amount ? 'input-error' : ''}`}
                {...register('amount')} />
              {errors.amount && <p className="error-msg">{errors.amount.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Date</label>
              <input type="date" className={`input ${errors.date ? 'input-error' : ''}`}
                {...register('date')} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Category</label>
            <select className={`select ${errors.category ? 'input-error' : ''}`} {...register('category')}>
              <option value="">Select category</option>
              {filteredCats.map((c) => (
                <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
              ))}
            </select>
            {errors.category && <p className="error-msg">{errors.category.message}</p>}
          </div>

          <div className="form-group">
            <label className="label">Description</label>
            <input type="text" placeholder="What was this for?" className="input"
              {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Payment Method</label>
              <select className="select" {...register('paymentMethod')}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Receipt (optional)</label>
              <label className="input flex items-center gap-2 cursor-pointer hover:border-primary-500 transition-colors">
                <Upload size={14} className="text-slate-500 flex-shrink-0" />
                <span className="text-slate-500 text-xs truncate">
                  {receiptFile ? receiptFile.name : 'Choose file'}
                </span>
                <input type="file" accept="image/*,.pdf" className="sr-only"
                  onChange={(e) => setReceiptFile(e.target.files[0])} />
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Notes</label>
            <textarea rows={2} placeholder="Additional notes..." className="input resize-none"
              {...register('notes')} />
          </div>

          {editData?.receiptUrl && (
            <a href={editData.receiptUrl} target="_blank" rel="noreferrer"
              className="text-xs text-primary-400 hover:underline flex items-center gap-1">
              📎 View existing receipt
            </a>
          )}
        </form>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button form="" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ search: '', type: '', category: '', startDate: '', endDate: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) });
      const { data } = await api.get(`/transactions?${params}`);
      setTransactions(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchTransactions();
    api.get('/categories').then(r => setCategories(r.data.data)).catch(() => {});
  }, [fetchTransactions]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      toast.success('Transaction deleted');
      setDeleteId(null);
      fetchTransactions();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const clearFilters = () => {
    setFilters({ search: '', type: '', category: '', startDate: '', endDate: '' });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">{pagination.total} total records</p>
        </div>
        <button onClick={() => { setEditData(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} />Add Transaction
        </button>
      </div>

      {/* Search + Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => { setFilters(p => ({ ...p, search: e.target.value })); setPage(1); }}
              className="input pl-9" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary gap-2 ${hasActiveFilters ? 'border-primary-500/50 text-primary-400' : ''}`}>
            <Filter size={15} />Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-ghost btn-icon" title="Clear filters">
              <X size={15} />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200 animate-slide-down">
            <select className="select" value={filters.type}
              onChange={(e) => { setFilters(p => ({ ...p, type: e.target.value })); setPage(1); }}>
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select className="select" value={filters.category}
              onChange={(e) => { setFilters(p => ({ ...p, category: e.target.value })); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
            <input type="date" className="input" placeholder="Start Date" value={filters.startDate}
              onChange={(e) => { setFilters(p => ({ ...p, startDate: e.target.value })); setPage(1); }} />
            <input type="date" className="input" placeholder="End Date" value={filters.endDate}
              onChange={(e) => { setFilters(p => ({ ...p, endDate: e.target.value })); setPage(1); }} />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Payment</th>
              <th>Type</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 rounded w-full" /></td>
                  ))}
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="text-3xl mb-2">📭</div>
                  <p>No transactions found</p>
                  {hasActiveFilters && <button onClick={clearFilters} className="text-primary-400 text-sm mt-1">Clear filters</button>}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx._id}>
                  <td className="text-slate-500 text-xs">{format(new Date(tx.date), 'MMM d, yyyy')}</td>
                  <td>
                    <p className="text-slate-800 font-medium">{tx.description || '—'}</p>
                    {tx.notes && <p className="text-xs text-slate-500 truncate max-w-[180px]">{tx.notes}</p>}
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span>{tx.category?.icon}</span>
                      <span className="text-xs">{tx.category?.name}</span>
                    </span>
                  </td>
                  <td className="text-xs text-slate-500 capitalize">{tx.paymentMethod?.replace('_', ' ')}</td>
                  <td>
                    <span className={`badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`text-right font-bold ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {tx.receiptUrl && (
                        <a href={tx.receiptUrl} target="_blank" rel="noreferrer"
                          className="btn-icon btn-ghost text-primary-400" title="View receipt">📎</a>
                      )}
                      <button onClick={() => { setEditData(tx); setShowModal(true); }}
                        className="btn-icon btn-ghost" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(tx._id)}
                        className="btn-icon btn-danger" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <p>Page {pagination.page} of {pagination.pages} · {pagination.total} records</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
              className="btn-secondary btn-sm disabled:opacity-40">
              <ChevronLeft size={14} />Prev
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages}
              className="btn-secondary btn-sm disabled:opacity-40">
              Next<ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <TransactionModal onClose={() => setShowModal(false)} onSaved={fetchTransactions}
          editData={editData} categories={categories} />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-body text-center py-6">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Transaction?</h3>
              <p className="text-slate-500 text-sm">This action cannot be undone.</p>
            </div>
            <div className="modal-footer justify-center">
              <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
