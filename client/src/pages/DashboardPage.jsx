import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank,
  ArrowUpRight, ArrowDownRight, Plus
} from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#6c63ff','#00d4ff','#00e676','#ffb74d','#ff5252','#ea80fc','#69f0ae','#80d8ff','#f9e79f','#f1948a'];

function StatCard({ icon: Icon, label, value, change, color, prefix = '$' }) {
  const isPositive = change >= 0;
  return (
    <div className="stat-card group cursor-default">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
        </p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-800 mb-1">{MONTHS[label - 1]}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: ${p.value?.toLocaleString()}</p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs">
      <p className="font-semibold" style={{ color: payload[0].payload.color }}>{payload[0].name}</p>
      <p className="text-slate-700">${payload[0].value?.toFixed(2)}</p>
    </div>
  );
};

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton w-10 h-10 rounded-xl" />
      <div className="space-y-2">
        <div className="skeleton w-20 h-3 rounded" />
        <div className="skeleton w-28 h-7 rounded" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [summaryRes, txRes, budgetRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/transactions?limit=5&sortBy=date&sortOrder=desc'),
          api.get('/budgets/summary'),
        ]);
        setData(summaryRes.data.data);
        setRecentTx(txRes.data.data);
        setBudgetAlerts(budgetRes.data.summary.alerts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d yyyy')}
          </p>
        </div>
        <Link to="/transactions" className="btn-primary">
          <Plus size={16} />Add Transaction
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={TrendingUp} label="Total Income" value={data?.summary.income || 0}
              change={data?.summary.incomeChange} color="bg-accent-green/10 text-accent-green" />
            <StatCard icon={TrendingDown} label="Total Expenses" value={data?.summary.expense || 0}
              change={data?.summary.expenseChange} color="bg-accent-red/10 text-accent-red" />
            <StatCard icon={DollarSign} label="Net Balance" value={Math.abs(data?.summary.balance || 0)}
              color="bg-primary-500/10 text-primary-400" />
            <StatCard icon={PiggyBank} label="Savings Rate" value={data?.summary.savingsRate || 0}
              prefix="" color="bg-accent-amber/10 text-accent-amber" />
          </>
        )}
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="card p-4 border-accent-amber/30 bg-accent-amber/5">
          <p className="text-accent-amber font-semibold text-sm mb-3 flex items-center gap-2">
            ⚠️ Budget Alerts ({budgetAlerts.length})
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {budgetAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                <span className="text-sm text-slate-700">{alert.category.icon} {alert.category.name}</span>
                <span className={`text-sm font-bold ${alert.percent >= 100 ? 'text-accent-red' : 'text-accent-amber'}`}>
                  {alert.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Monthly Trend - 3 columns */}
        <div className="lg:col-span-3 chart-container">
          <h3 className="font-semibold text-slate-800 mb-4">Monthly Trend</h3>
          {loading ? (
            <div className="skeleton h-56 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.trend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2845" />
                <XAxis dataKey="month" tickFormatter={(m) => MONTHS[m - 1]}
                  tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                <Line type="monotone" dataKey="income" name="Income"
                  stroke="#00e676" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="expense" name="Expense"
                  stroke="#ff5252" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Spending by Category - 2 columns */}
        <div className="lg:col-span-2 chart-container">
          <h3 className="font-semibold text-slate-800 mb-4">By Category</h3>
          {loading ? (
            <div className="skeleton h-56 rounded-xl" />
          ) : data?.categoryBreakdown?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.categoryBreakdown} dataKey="total" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {data.categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                {data.categoryBreakdown.slice(0, 5).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {cat.icon} {cat.name}
                    </span>
                    <span className="text-slate-800 font-medium">${cat.total.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
              No expense data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
          <Link to="/transactions" className="text-sm text-primary-400 hover:text-primary-300">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton w-32 h-3.5 rounded" />
                  <div className="skeleton w-20 h-3 rounded" />
                </div>
                <div className="skeleton w-16 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : recentTx.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-2xl mb-2">📭</p>
            <p>No transactions yet</p>
            <Link to="/transactions" className="btn-primary btn-sm mt-3 inline-flex">Add your first one</Link>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {recentTx.map((tx) => (
              <div key={tx._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-100/50 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-slate-100 flex-shrink-0">
                  {tx.category?.icon || '💸'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {tx.description || tx.category?.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tx.category?.name} · {format(new Date(tx.date), 'MMM d')}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
