import { useState, useEffect } from 'react';
import { Download, BarChart2, FileText, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useCurrency } from '../hooks/useCurrency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

const MONTHS_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#6c63ff','#00d4ff','#00e676','#ffb74d','#ff5252','#ea80fc','#69f0ae','#80d8ff'];

export default function ReportsPage() {
  const { symbol } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'

  useEffect(() => {
    setLoading(true);
    const params = viewMode === 'monthly'
      ? `year=${year}&month=${month}`
      : `year=${year}`;
    api.get(`/reports/summary?${params}`)
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load report data'))
      .finally(() => setLoading(false));
  }, [month, year, viewMode]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = await api.get(`/reports/export/${format}?month=${month}&year=${year}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-report-${MONTHS_NAMES[month - 1]}-${year}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded!`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting('');
    }
  };

  const barData = data?.trend?.filter(t => t.income > 0 || t.expense > 0) || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Visual analytics and export</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {['monthly', 'yearly'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  viewMode === m ? 'bg-primary-600 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}>
                {m}
              </button>
            ))}
          </div>
          {viewMode === 'monthly' && (
            <select className="select w-auto" value={month} onChange={e => setMonth(+e.target.value)}>
              {MONTHS_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          )}
          <select className="select w-auto" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Income', value: data.summary.income, color: 'text-accent-green', icon: '💰' },
            { label: 'Expenses', value: data.summary.expense, color: 'text-accent-red', icon: '💸' },
            { label: 'Balance', value: Math.abs(data.summary.balance), color: data.summary.balance >= 0 ? 'text-primary-400' : 'text-accent-red', icon: '⚖️' },
            { label: 'Savings Rate', value: `${data.summary.savingsRate}%`, color: 'text-accent-amber', icon: '🏦', isStr: true },
          ].map(({ label, value, color, icon, isStr }) => (
            <div key={label} className="card p-4">
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-slate-500 text-xs mb-0.5">{label}</p>
              <p className={`text-xl font-bold ${color}`}>
                {isStr ? value : `${symbol}${(value || 0).toFixed(2)}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-3 chart-container">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart2 size={18} className="text-primary-400" />
            Income vs Expenses ({year})
          </h3>
          {loading ? (
            <div className="skeleton h-56 rounded-xl" />
          ) : barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2845" />
                <XAxis dataKey="month" tickFormatter={m => MONTHS_NAMES[m-1]}
                  tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${symbol}${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`${symbol}${v.toFixed(2)}`]} contentStyle={{
                  background: '#1a1a2e', border: '1px solid rgba(108,99,255,0.2)',
                  borderRadius: '12px', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                <Bar dataKey="income" name="Income" fill="#00e676" radius={[4,4,0,0]} />
                <Bar dataKey="expense" name="Expense" fill="#ff5252" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-500">No data for selected period</div>
          )}
        </div>

        {/* Category Pie */}
        <div className="lg:col-span-2 chart-container">
          <h3 className="font-semibold text-slate-800 mb-4">Spending by Category</h3>
          {loading ? (
            <div className="skeleton h-56 rounded-xl" />
          ) : data?.categoryBreakdown?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.categoryBreakdown} dataKey="total" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {data.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => [`${symbol}${v.toFixed(2)}`]}
                    contentStyle={{ background: '#1a1a2e', borderRadius: '12px', border: 'none', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto scrollbar-hide">
                {data.categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {cat.icon} {cat.name}
                    </span>
                    <span className="text-slate-800 font-medium">{symbol}{cat.total.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No expense data</div>
          )}
        </div>
      </div>

      {/* Export section */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-1">Export Report</h3>
        <p className="text-slate-500 text-sm mb-4">
          Download your {MONTHS_NAMES[month - 1]} {year} financial report
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            className="btn-secondary gap-2 hover:border-accent-red/50 hover:text-accent-red"
            id="export-pdf-btn"
          >
            <FileText size={16} />
            {exporting === 'pdf' ? 'Generating...' : 'Export PDF'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={!!exporting}
            className="btn-secondary gap-2 hover:border-accent-green/50 hover:text-accent-green"
            id="export-excel-btn"
          >
            <FileSpreadsheet size={16} />
            {exporting === 'excel' ? 'Generating...' : 'Export Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
