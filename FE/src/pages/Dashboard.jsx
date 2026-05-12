import { useEffect, useState, useRef } from 'react';
import {
  Chart, BarElement, CategoryScale, LinearScale, Tooltip,
  BarController
} from 'chart.js';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const MOCK = {
  totalStores: 5, totalProducts: 12, lowStockCount: 7, today_orders_count: 23,
  weekly_sales: [
    { date: 'Mon', revenue: 1200 }, { date: 'Tue', revenue: 1900 },
    { date: 'Wed', revenue: 1500 }, { date: 'Thu', revenue: 2100 },
    { date: 'Fri', revenue: 2800 }, { date: 'Sat', revenue: 3500 }, { date: 'Sun', revenue: 3100 },
  ],
};

export default function Dashboard() {
  const [kpis, setKpis] = useState({ stores: '--', products: '--', lowStock: '--', orders: '--' });
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  const chartInst = useRef(null);

  useEffect(() => {
    async function load() {
      let d = null;
      try { const r = await apiFetch('/dashboard'); if (r.ok) d = await r.json(); } catch {}
      d = d || MOCK;
      setKpis({ stores: d.totalStores ?? d.total_stores ?? 0, products: d.totalProducts ?? d.total_products ?? 0, lowStock: d.lowStockCount ?? d.low_stock_count ?? 0, orders: d.recentOrders ?? d.today_orders_count ?? 0 });
      const w = d.weekly_sales || d.weekly || d.weeklySales;
      if (Array.isArray(w)) setChartData({ labels: w.map(s => s.date), values: w.map(s => s.revenue) });
    }
    load();
  }, []);

  useEffect(() => {
    if (!chartData || !chartRef.current) return;
    if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
    chartInst.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{ data: chartData.values, backgroundColor: 'rgba(56,189,248,0.7)', borderRadius: 6, borderSkipped: false, hoverBackgroundColor: '#38bdf8' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toLocaleString()}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7c8db5', font: { family: "'Plus Jakarta Sans'" } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7c8db5', callback: v => '$' + v.toLocaleString(), font: { family: "'Plus Jakarta Sans'" } } },
        },
      },
    });
    return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
  }, [chartData]);

  const cards = [
    { label: 'Total Branches', value: kpis.stores, color: 'blue', icon: 'M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z M3 9l9-7 9 7' },
    { label: 'Total Products', value: kpis.products, color: 'green', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
    { label: 'Low Stock Items', value: kpis.lowStock, color: 'yellow', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01' },
    { label: "Today's Orders", value: kpis.orders, color: 'purple', icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0' },
  ];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <h1>Dashboard</h1>
            <p>Welcome back — here's your store overview</p>
          </div>
        </div>

        <div className="kpi-grid">
          {cards.map(c => (
            <div key={c.label} className={`kpi-card ${c.color}`}>
              <div className="kpi-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={c.icon} />
                </svg>
              </div>
              <div className="kpi-value">{c.value}</div>
              <div className="kpi-label">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="cs-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Revenue — Last 7 Days</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Total: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  ${chartData ? chartData.values.reduce((a, b) => a + b, 0).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ height: 280, position: 'relative' }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
      </main>
    </div>
  );
}
