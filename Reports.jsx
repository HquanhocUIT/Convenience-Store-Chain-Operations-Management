/* eslint-disable */
/* eslint-disable no-empty */
import { useEffect, useRef, useState } from 'react';
import {
  Chart, LineElement, LineController, PointElement,
  BarElement, BarController,
  CategoryScale, LinearScale, Filler, Tooltip
} from 'chart.js';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

Chart.register(LineElement, LineController, PointElement, BarElement, BarController, CategoryScale, LinearScale, Filler, Tooltip);

const fmt = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

function PeriodToggle({ period, setPeriod }) {
  return (
    <div className="period-toggle">
      {['daily', 'weekly', 'monthly'].map(p => (
        <button key={p} className={`period-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
          {p === 'daily' ? 'Ngày' : p === 'weekly' ? 'Tuần' : 'Tháng'}
        </button>
      ))}
    </div>
  );
}

// ── TAB 1: Tổng quan ─────────────────────────────────────
function TabOverview() {
  const [period, setPeriod] = useState('daily');
  const [summary, setSummary] = useState({ revenue: '0', orders: 0, avg: '0' });
  const [rows, setRows]       = useState([]);
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  useEffect(() => {
    async function fetch() {
      try {
        const r = await apiFetch(`/sales?period=${period}`);
        if (!r.ok) return;
        const data = await r.json();
        if (!Array.isArray(data)) return;
        const totalRev = data.reduce((s, d) => s + (d.revenue || 0), 0);
        const totalOrd = data.reduce((s, d) => s + (d.order_count || 0), 0);
        setSummary({ revenue: totalRev.toLocaleString('vi-VN'), orders: totalOrd, avg: totalOrd > 0 ? Math.round(totalRev / totalOrd).toLocaleString('vi-VN') : '0' });
        setRows(data);
        renderChart(data);
      } catch {}
    }
    fetch();
  }, [period]);

  function renderChart(data) {
    if (!chartRef.current) return;
    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: data.map(d => d.date || d.start || d.month),
        datasets: [{ data: data.map(d => d.revenue || 0), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#38bdf8', pointRadius: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7c8db5', font: { family: "'Plus Jakarta Sans'" } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7c8db5', callback: v => fmt(v), font: { family: "'Plus Jakarta Sans'" } } },
        },
      },
    });
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <PeriodToggle period={period} setPeriod={setPeriod} />
      </div>

      <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(parseInt(summary.revenue.replace(/\./g,'')) || 0)}</div>
          <div className="stat-label">Tổng doanh thu</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{summary.orders}</div>
          <div className="stat-label">Tổng đơn hàng</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-2)' }}>{fmt(parseInt(summary.avg.replace(/\./g,'')) || 0)}</div>
          <div className="stat-label">Trung bình / đơn</div>
        </div>
      </div>

      <div className="cs-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.25rem' }}>Xu hướng doanh thu</div>
        <div style={{ height: 280, position: 'relative' }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      <div className="cs-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.95rem', borderBottom: '1px solid var(--border)' }}>Lịch sử đơn hàng</div>
        <table className="cs-table">
          <thead><tr><th>Kỳ</th><th>Số đơn</th><th>Doanh thu</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Không có dữ liệu.</td></tr>
            ) : rows.map((d, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--text-muted)' }}>{d.date || (d.start && `${d.start} → ${d.end}`) || d.month}</td>
                <td style={{ fontWeight: 600 }}>{d.order_count || 0}</td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(d.revenue || 0)}</td>
                <td><span className="badge-active">Hoàn thành</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── TAB 2: Theo Chi Nhánh ────────────────────────────────
function TabByBranch() {
  const [period, setPeriod]   = useState('daily');
  const [branches, setBranches] = useState([]);
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  useEffect(() => {
    async function fetch() {
      try {
        const r = await apiFetch(`/sales/by-branch?period=${period}`);
        if (!r.ok) return;
        const data = await r.json();
        if (!Array.isArray(data)) return;
        setBranches(data);
        renderChart(data);
      } catch {}
    }
    fetch();
  }, [period]);

  function renderChart(data) {
    if (!chartRef.current) return;
    if (chartInst.current) chartInst.current.destroy();

    const colors = ['rgba(56,189,248,0.8)', 'rgba(52,211,153,0.8)', 'rgba(251,191,36,0.8)', 'rgba(129,140,248,0.8)', 'rgba(248,113,113,0.8)', 'rgba(251,146,60,0.8)'];

    chartInst.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: data.map(d => d.store_name),
        datasets: [{
          data: data.map(d => d.revenue || 0),
          backgroundColor: data.map((_, i) => colors[i % colors.length]),
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7c8db5', font: { family: "'Plus Jakarta Sans'" }, maxRotation: 20 } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7c8db5', callback: v => fmt(v), font: { family: "'Plus Jakarta Sans'" } } },
        },
      },
    });
  }

  const totalRevenue = branches.reduce((s, b) => s + (b.revenue || 0), 0);
  const totalOrders  = branches.reduce((s, b) => s + (b.order_count || 0), 0);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <PeriodToggle period={period} setPeriod={setPeriod} />
      </div>

      {/* Summary */}
      <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(totalRevenue)}</div>
          <div className="stat-label">Tổng doanh thu</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{totalOrders}</div>
          <div className="stat-label">Tổng đơn hàng</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-2)' }}>{branches.length}</div>
          <div className="stat-label">Chi nhánh có doanh thu</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="cs-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.25rem' }}>So sánh doanh thu theo chi nhánh</div>
        <div style={{ height: 300, position: 'relative' }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      {/* Table */}
      <div className="cs-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.95rem', borderBottom: '1px solid var(--border)' }}>Chi tiết theo chi nhánh</div>
        <table className="cs-table">
          <thead>
            <tr><th>Hạng</th><th>Chi nhánh</th><th>Số đơn</th><th>Doanh thu</th><th>% Tổng</th></tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Không có dữ liệu.</td></tr>
            ) : branches.map((b, i) => {
              const pct = totalRevenue > 0 ? ((b.revenue / totalRevenue) * 100).toFixed(1) : '0';
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <tr key={b.store_id}>
                  <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{medals[i] || `#${i + 1}`}</td>
                  <td style={{ fontWeight: 600 }}>{b.store_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{b.order_count}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(b.revenue)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--navy-3)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}></div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 36 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── MAIN ─────────────────────────────────────────────────
export default function Reports() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <h1>Reports</h1>
            <p>Thống kê doanh thu và phân tích</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
          {[
            { id: 'overview', label: '📊 Tổng quan' },
            { id: 'branch',   label: '🏪 Theo Chi Nhánh' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '0.5rem 1.25rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.875rem', fontWeight: 600, borderRadius: '8px 8px 0 0',
              background: tab === t.id ? 'var(--navy-card)' : 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <TabOverview />}
        {tab === 'branch'   && <TabByBranch />}
      </main>
    </div>
  );
}
