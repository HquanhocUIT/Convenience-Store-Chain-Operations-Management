import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

function StockBadge({ status }) {
  const s = (status||'').toLowerCase();
  if (s === 'ok') return <span className="badge-ok">OK</span>;
  if (s === 'low') return <span className="badge-low">Low Stock</span>;
  if (s === 'critical') return <span className="badge-critical">Critical</span>;
  return <span className="badge-inactive">Unknown</span>;
}

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [form, setForm] = useState({ name:'', category:'Beverages', current_stock:'', threshold:'' });
  const productModalRef = useRef(null); const restockModalRef = useRef(null);
  const bsProd = useRef(null); const bsRestock = useRef(null);

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    if (productModalRef.current && window.bootstrap) {
      bsProd.current = new window.bootstrap.Modal(productModalRef.current);
      productModalRef.current.addEventListener('hidden.bs.modal', () => { setEditingId(null); setForm({ name:'', category:'Beverages', current_stock:'', threshold:'' }); });
    }
    if (restockModalRef.current && window.bootstrap) {
      bsRestock.current = new window.bootstrap.Modal(restockModalRef.current);
      restockModalRef.current.addEventListener('hidden.bs.modal', () => { setRestockId(null); setRestockQty(''); });
    }
  }, []);

  async function loadProducts() {
    try { const r = await apiFetch('/products'); const d = await r.json(); setProducts(Array.isArray(d) ? d : (d.products || d.data || [])); } catch(e) { console.error(e); }
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    const payload = { ...form, current_stock: parseInt(form.current_stock), threshold: parseInt(form.threshold), price: 1000 };
    try {
      const r = await apiFetch(editingId ? `/products/${editingId}` : '/products', { method: editingId ? 'PUT':'POST', body: JSON.stringify(payload) });
      if (!r.ok) { const err = await r.json(); alert(err.message||'Failed'); return; }
      bsProd.current?.hide(); await loadProducts();
    } catch(e) { console.error(e); }
  }

  async function handleRestock(e) {
    e.preventDefault();
    const qty = parseInt(restockQty);
    if (!restockId || isNaN(qty) || qty < 0) { alert('Invalid quantity'); return; }
    const eps = [{ method:'PUT', path:`/products/${restockId}/stock` }, { method:'PATCH', path:`/products/${restockId}/stock` }, { method:'POST', path:`/products/${restockId}/stock` }];
    for (const ep of eps) {
      try { const r = await apiFetch(ep.path, { method: ep.method, body: JSON.stringify({ quantity: qty }) }); if (r.ok) { bsRestock.current?.hide(); await loadProducts(); return; } } catch {}
    }
    alert('Restock failed');
  }

  const filtered = products.filter(p => (p.name||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left"><h1>Inventory</h1><p>Product stock levels across all stores</p></div>
          <div style={{ display:'flex', gap:8 }}>
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn-primary-cs" onClick={() => { setEditingId(null); setForm({ name:'', category:'Beverages', current_stock:'', threshold:'' }); bsProd.current?.show(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Product
            </button>
          </div>
        </div>

        <div className="cs-card" style={{ padding:0, overflow:'hidden' }}>
          <table className="cs-table">
            <thead><tr><th>Product Name</th><th>Category</th><th>Stock</th><th>Threshold</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>No products found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight:600 }}>{p.name}</td>
                  <td style={{ color:'var(--text-muted)' }}>{p.category||'Uncategorized'}</td>
                  <td style={{ fontWeight:700, color: (p.current_stock??p.stock??0) <= (p.threshold??0) ? 'var(--warning)' : 'var(--text)' }}>{p.current_stock??p.stock??0}</td>
                  <td style={{ color:'var(--text-muted)' }}>{p.threshold??p.stock_threshold??0}</td>
                  <td><StockBadge status={p.status||p.stock_status} /></td>
                  <td style={{ display:'flex', gap:6 }}>
                    <button className="btn-ghost-cs" onClick={() => { setEditingId(p.id); setForm({ name:p.name, category:p.category||'Beverages', current_stock:p.current_stock??p.stock??0, threshold:p.threshold??p.stock_threshold??0 }); bsProd.current?.show(); }}>Edit</button>
                    <button className="btn-ghost-cs" style={{ color:'var(--accent)', borderColor:'rgba(56,189,248,0.3)' }} onClick={() => { setRestockId(p.id); bsRestock.current?.show(); }}>Restock</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Product Modal */}
      <div className="modal fade" ref={productModalRef} tabIndex="-1">
        <div className="modal-dialog"><div className="modal-content">
          <div className="modal-header"><h5 className="modal-title">{editingId ? 'Edit Product' : 'New Product'}</h5><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
          <form onSubmit={handleProductSubmit}>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div><label className="form-label">Product Name</label><input className="form-control" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div><label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {['Beverages','Snacks','Food','Household'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div><label className="form-label">Initial Stock</label><input type="number" className="form-control" min="0" value={form.current_stock} onChange={e=>setForm(f=>({...f,current_stock:e.target.value}))} required /></div>
                <div><label className="form-label">Alert Threshold</label><input type="number" className="form-control" min="0" value={form.threshold} onChange={e=>setForm(f=>({...f,threshold:e.target.value}))} required /></div>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn-ghost-cs" data-bs-dismiss="modal">Cancel</button><button type="submit" className="btn-primary-cs">Save</button></div>
          </form>
        </div></div>
      </div>

      {/* Restock Modal */}
      <div className="modal fade" ref={restockModalRef} tabIndex="-1">
        <div className="modal-dialog modal-sm"><div className="modal-content">
          <div className="modal-header"><h5 className="modal-title">Restock Product</h5><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
          <form onSubmit={handleRestock}>
            <div className="modal-body"><label className="form-label">Quantity to Add</label><input type="number" className="form-control" min="1" value={restockQty} onChange={e=>setRestockQty(e.target.value)} required /></div>
            <div className="modal-footer"><button type="submit" className="btn-primary-cs">Update Stock</button></div>
          </form>
        </div></div>
      </div>
    </div>
  );
}
