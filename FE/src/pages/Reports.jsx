import { useEffect, useRef, useState } from 'react';
import { Chart, LineElement, LineController, PointElement, CategoryScale, LinearScale, Filler, Tooltip } from 'chart.js';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip);

export default function Reports() {
  const [period, setPeriod] = useState('daily');
  const [summary, setSummary] = useState({ revenue: '0', orders: 0, avg: '0.00' });
  const [rows, setRows] = useState([]);
  const chartRef = useRef(null); const chartInst = useRef(null);

  useEffect(() => { fetchSales(period); }, [period]);

  async function fetchSales(p) {
    try {
      const r = await apiFetch(`/sales?period=${p}`);
      if (!r.ok) throw new Error('Failed');
      const data = await r.json();
      if (!Array.isArray(data)) return;
      const totalRev = data.reduce((s,d) => s + (d.revenue||0), 0);
      const totalOrd = data.reduce((s,d) => s + (d.order_count||0), 0);
      setSummary({ revenue: totalRev.toLocaleString(), orders: totalOrd, avg: (totalRev / Math.max(1, data.length)).toFixed(2) });
      setRows(data);
      renderChart(data);
    } catch(e) { console.error(e); }
  }

  function renderChart(data) {
    if (!chartRef.current) return;
    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: data.map(d => d.date || d.start || d.month),
        datasets: [{ data: data.map(d => d.revenue||0), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#38bdf8', pointRadius: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toLocaleString()}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7c8db5', font: { family: "'Plus Jakarta Sans'" } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7c8db5', callback: v => '$'+v.toLocaleString(), font: { family: "'Plus Jakarta Sans'" } } },
        },
      },
    });
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left"><h1>Sales Reports</h1><p>Revenue trends and order analytics</p></div>
          <div className="period-toggle">
            {['daily','weekly','monthly'].map(p => (
              <button key={p} className={`period-btn${period===p?' active':''}`} onClick={() => setPeriod(p)}>
                {p.charAt(0).toUpperCase()+p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value" style={{ color:'var(--success)' }}>${summary.revenue}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color:'var(--accent)' }}>{summary.orders}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color:'var(--accent-2)' }}>${summary.avg}</div>
            <div className="stat-label">Avg Order Value</div>
          </div>
        </div>

        <div className="cs-card" style={{ marginBottom:'1.5rem' }}>
          <div style={{ fontWeight:600, fontSize:'0.95rem', marginBottom:'1.25rem' }}>Revenue Trend</div>
          <div style={{ height:300, position:'relative' }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        <div className="cs-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'1.25rem 1.25rem 0', fontWeight:600, fontSize:'0.95rem' }}>Order History</div>
          <table className="cs-table" style={{ marginTop:'0.75rem' }}>
            <thead><tr><th>Period</th><th>Orders</th><th>Revenue</th><th>Status</th></tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>No data.</td></tr>
              ) : rows.map((d,i) => (
                <tr key={i}>
                  <td style={{ color:'var(--text-muted)' }}>{d.date || (d.start && `${d.start} → ${d.end}`) || d.month}</td>
                  <td style={{ fontWeight:600 }}>{d.order_count||0}</td>
                  <td style={{ fontWeight:600, color:'var(--success)' }}>${(d.revenue||0).toLocaleString()}</td>
                  <td><span className="badge-active">Completed</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
