import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [filterStore, setFilterStore] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ full_name:'', role:'staff', shift:'morning', store_name:'' });
  const modalRef = useRef(null); const bsModal = useRef(null);

  useEffect(() => { loadStores(); loadEmployees(); }, []);
  useEffect(() => {
    if (modalRef.current && window.bootstrap) {
      bsModal.current = new window.bootstrap.Modal(modalRef.current);
      modalRef.current.addEventListener('hidden.bs.modal', () => { setEditingId(null); setForm({ full_name:'', role:'staff', shift:'morning', store_name:'' }); });
    }
  }, []);

  async function loadStores() {
    try { const r = await apiFetch('/stores'); const j = await r.json(); setStores(j.stores || (Array.isArray(j) ? j : [])); } catch(e) { console.error(e); }
  }
  async function loadEmployees() {
    try { const r = await apiFetch('/employees'); if (!r.ok) return; const d = await r.json(); setEmployees(Array.isArray(d) ? d : (d.employees||[])); } catch(e) { if (e.message !== 'unauthorized') console.error(e); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const email = form.full_name.replace(/\s+/g,'.').toLowerCase() + '@cschain.vn';
    try {
      const r = editingId
        ? await apiFetch(`/employees/${editingId}`, { method:'PUT', body:JSON.stringify(form) })
        : await apiFetch('/employees', { method:'POST', body:JSON.stringify({...form, email}) });
      if (!r.ok) { const err = await r.json(); alert(err.message||'Failed'); return; }
      bsModal.current?.hide(); await loadEmployees();
    } catch(e) { console.error(e); }
  }

  async function toggleEmployee(emp) {
    const ns = !emp.is_active;
    try {
      const r = await apiFetch(`/employees/${emp.id}`, { method:'PUT', body:JSON.stringify({ is_active: ns }) });
      if (!r.ok) { const err = await r.json(); alert(err.message||'Failed'); return; }
      setEmployees(prev => prev.map(e => e.id === emp.id ? {...e, is_active: ns} : e));
    } catch(e) { console.error(e); }
  }

  const filtered = filterStore === 'all' ? employees : employees.filter(e => e.store_name === filterStore);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left"><h1>Employees</h1><p>Staff management across all branches</p></div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select className="cs-select" value={filterStore} onChange={e => setFilterStore(e.target.value)}>
              <option value="all">All Stores</option>
              {stores.map(s => <option key={s.id||s.name} value={s.name}>{s.name}</option>)}
            </select>
            <button className="btn-primary-cs" onClick={() => { setEditingId(null); setForm({ full_name:'', role:'staff', shift:'morning', store_name: stores[0]?.name||'' }); bsModal.current?.show(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Employee
            </button>
          </div>
        </div>

        <div className="cs-card" style={{ padding:0, overflow:'hidden' }}>
          <table className="cs-table">
            <thead><tr><th>Name</th><th>Role</th><th>Store</th><th>Shift</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>No employees found.</td></tr>
              ) : filtered.map(emp => {
                const active = emp.is_active === true;
                return (
                  <tr key={emp.id} className={active ? '' : 'dim-row'}>
                    <td style={{ fontWeight:600 }}>{emp.full_name}</td>
                    <td><span className={emp.role === 'manager' ? 'badge-manager' : 'badge-staff'}>{emp.role}</span></td>
                    <td style={{ color:'var(--text-muted)' }}>{emp.store_name||'—'}</td>
                    <td style={{ color:'var(--text-muted)', textTransform:'capitalize' }}>{emp.shift||'—'}</td>
                    <td><span className={active ? 'badge-active' : 'badge-inactive'}>{active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ display:'flex', gap:6 }}>
                      <button className="btn-ghost-cs" onClick={() => { setEditingId(emp.id); setForm({ full_name:emp.full_name, role:emp.role, shift:emp.shift||'morning', store_name:emp.store_name||'' }); bsModal.current?.show(); }}>Edit</button>
                      <button className={active ? 'btn-danger-ghost' : 'btn-success-ghost'} onClick={() => toggleEmployee(emp)}>{active ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <div className="modal fade" ref={modalRef} tabIndex="-1">
        <div className="modal-dialog"><div className="modal-content">
          <div className="modal-header"><h5 className="modal-title">{editingId ? 'Edit Employee' : 'New Employee'}</h5><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div><label className="form-label">Full Name</label><input className="form-control" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    <option value="manager">Manager</option><option value="staff">Staff</option>
                  </select>
                </div>
                <div><label className="form-label">Shift</label>
                  <select className="form-select" value={form.shift} onChange={e=>setForm(f=>({...f,shift:e.target.value}))}>
                    <option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option>
                  </select>
                </div>
              </div>
              <div><label className="form-label">Assign to Store</label>
                <select className="form-select" value={form.store_name} onChange={e=>setForm(f=>({...f,store_name:e.target.value}))}>
                  {stores.map(s=><option key={s.id||s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn-ghost-cs" data-bs-dismiss="modal">Cancel</button><button type="submit" className="btn-primary-cs">Save</button></div>
          </form>
        </div></div>
      </div>
    </div>
  );
}
