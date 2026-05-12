import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', manager: '' });
  const modalRef = useRef(null);
  const bsModal = useRef(null);

  useEffect(() => { loadBranches(); }, []);
  useEffect(() => {
    if (modalRef.current && window.bootstrap) {
      bsModal.current = new window.bootstrap.Modal(modalRef.current);
      modalRef.current.addEventListener('hidden.bs.modal', () => { setEditingId(null); setForm({ name:'', address:'', manager:'' }); });
    }
  }, []);

  async function loadBranches() {
    try { const r = await apiFetch('/branches'); const j = await r.json(); setBranches(Array.isArray(j) ? j : (j.branches || [])); } catch(e) { console.error(e); }
  }

  function openAdd() { setEditingId(null); setForm({ name:'', address:'', manager:'' }); bsModal.current?.show(); }
  function openEdit(b) { setEditingId(b.id); setForm({ name: b.name, address: b.address||'', manager: b.manager||'' }); bsModal.current?.show(); }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const r = await apiFetch(editingId ? `/branches/${editingId}` : '/branches', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(form) });
      if (!r.ok) { const err = await r.json(); alert(err.message || 'Failed'); return; }
      bsModal.current?.hide(); await loadBranches();
    } catch(e) { console.error(e); }
  }

  async function toggleBranch(b) {
    const ns = b.status === 'active' ? 'inactive' : 'active';
    try {
      const r = await apiFetch(`/branches/${b.id}`, { method: 'PUT', body: JSON.stringify({ status: ns }) });
      if (!r.ok) { const err = await r.json(); alert(err.message || 'Failed'); return; }
      setBranches(prev => prev.map(x => x.id === b.id ? { ...x, status: ns } : x));
    } catch(e) { console.error(e); }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left"><h1>Branches</h1><p>Manage all store locations</p></div>
          <button className="btn-primary-cs" onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Branch
          </button>
        </div>

        <div className="cs-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="cs-table">
            <thead><tr><th>Branch Name</th><th>Address</th><th>Manager</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {branches.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No branches found.</td></tr>
              ) : branches.map(b => {
                const active = b.status === 'active';
                return (
                  <tr key={b.id} className={active ? '' : 'dim-row'}>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{b.address || '—'}</td>
                    <td>{b.manager || '—'}</td>
                    <td><span className={active ? 'badge-active' : 'badge-inactive'}>{active ? 'Active' : 'Disabled'}</span></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost-cs" onClick={() => openEdit(b)}>Edit</button>
                      <button className={active ? 'btn-danger-ghost' : 'btn-success-ghost'} onClick={() => toggleBranch(b)}>
                        {active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <div className="modal fade" ref={modalRef} tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{editingId ? 'Edit Branch' : 'New Branch'}</h5><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><label className="form-label">Branch Name</label><input className="form-control" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
                <div><label className="form-label">Address</label><input className="form-control" value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} required /></div>
                <div><label className="form-label">Manager Name</label><input className="form-control" value={form.manager} onChange={e => setForm(f=>({...f,manager:e.target.value}))} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost-cs" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn-primary-cs">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
