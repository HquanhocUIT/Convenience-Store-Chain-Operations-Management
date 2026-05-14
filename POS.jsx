import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

const fmt = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

function StockBadge({ stock }) {
  if (stock <= 0)  return <span style={badge('var(--danger)')}>Hết hàng</span>;
  if (stock <= 10) return <span style={badge('var(--warning)')}>Còn {stock}</span>;
  return <span style={badge('var(--success)')}>Còn {stock}</span>;
}
function badge(color) {
  return { background: color + '22', color, fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99 };
}

function Receipt({ order, items, store, onClose }) {
  const now = new Date().toLocaleString('vi-VN');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', color: '#111', borderRadius: 12, padding: '2rem', width: 380, fontFamily: 'monospace' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>CS CHAIN</div>
          <div style={{ fontSize: '0.8rem' }}>{store}</div>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>{now}</div>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>Đơn #{order.id}</div>
        </div>
        <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '0.75rem 0', margin: '0.75rem 0' }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
              <span>{it.name} x{it.quantity}</span>
              <span>{fmt(it.unit_price * it.quantity)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
          <span>TỔNG CỘNG</span>
          <span>{fmt(order.total_amount)}</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
          Cảm ơn quý khách! Hẹn gặp lại 😊
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ flex: 1, padding: '0.5rem', background: '#0f1629', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            🖨️ In hóa đơn
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.5rem', background: '#e5e7eb', color: '#111', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POS() {
  const [products, setProducts] = useState([]);
  const [stores, setStores]     = useState([]);
  const [storeId, setStoreId]   = useState('');
  const [cart, setCart]         = useState([]);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading]   = useState(false);
  const [receipt, setReceipt]   = useState(null);

  useEffect(() => { loadStores(); }, []);
  useEffect(() => { if (storeId) loadProducts(storeId); }, [storeId]);

  async function loadStores() {
    try {
      const r = await apiFetch('/stores');
      const j = await r.json();
      const list = j.stores || [];
      setStores(list);
      if (list.length > 0) setStoreId(String(list[0].id));
    } catch (e) { console.error(e); }
  }

  async function loadProducts(sid) {
    try {
      const r = await apiFetch(`/products?store_id=${sid}`);
      const d = await r.json();
      setProducts(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
  }

  function addToCart(p) {
    if ((p.current_stock || 0) <= 0) return;
    setCart(prev => {
      const exist = prev.find(i => i.product_id === p.id);
      if (exist) {
        if (exist.quantity >= p.current_stock) return prev;
        return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: p.id, name: p.name, unit_price: p.price, quantity: 1, max: p.current_stock }];
    });
  }

  function changeQty(productId, delta) {
    setCart(prev => prev.map(i =>
      i.product_id === productId
        ? { ...i, quantity: Math.max(1, Math.min(i.max, i.quantity + delta)) }
        : i
    ));
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  }

  const total = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => {
    const matchSearch   = (p.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || p.category === category;
    return matchSearch && matchCategory;
  });

  async function handleCheckout() {
    if (cart.length === 0 || !storeId) return;
    setLoading(true);
    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          store_id: parseInt(storeId),
          items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || data.message || 'Thanh toán thất bại'); return; }
      const storeName = stores.find(s => String(s.id) === storeId)?.name || 'CS Chain';
      setReceipt({ order: { ...data, total_amount: total }, items: [...cart], store: storeName });
      setCart([]);
      await loadProducts(storeId);
    } catch (e) { alert('Lỗi kết nối server'); console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" style={{ padding: '1.5rem' }}>
        <div className="topbar" style={{ marginBottom: '1rem' }}>
          <div className="topbar-left">
            <h1>POS — Bán Hàng</h1>
            <p>Chọn sản phẩm → thêm vào giỏ → thanh toán</p>
          </div>
          <select className="cs-select" value={storeId} onChange={e => { setStoreId(e.target.value); setCart([]); }} style={{ minWidth: 180 }}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', height: 'calc(100vh - 140px)' }}>

          {/* LEFT: Product Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="search-wrap" style={{ flex: 1 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input className="search-input" style={{ width: '100%' }} placeholder="Tìm sản phẩm…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'var(--navy-2)', borderRadius: 8, padding: 4, flexWrap: 'wrap' }}>
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, background: category === c ? 'var(--accent)' : 'transparent', color: category === c ? '#0f1629' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                    {c === 'all' ? 'Tất cả' : c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', overflowY: 'auto', paddingRight: 4 }}>
              {filtered.map(p => {
                const inCart     = cart.find(i => i.product_id === p.id);
                const outOfStock = (p.current_stock || 0) <= 0;
                return (
                  <div key={p.id} onClick={() => addToCart(p)}
                    style={{ background: 'var(--navy-card)', border: `1px solid ${inCart ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '0.875rem', cursor: outOfStock ? 'not-allowed' : 'pointer', opacity: outOfStock ? 0.4 : 1, transition: 'all 0.15s', position: 'relative' }}>
                    {inCart && (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--accent)', color: '#0f1629', borderRadius: 99, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                        {inCart.quantity}
                      </div>
                    )}
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>
                      {p.category === 'Beverage' ? '🥤' : p.category === 'Food' ? '🍜' : p.category === 'Snack' ? '🍪' : p.category === 'Personal Care' ? '🧴' : '📦'}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{fmt(p.price)}</div>
                    <StockBadge stock={p.current_stock || 0} />
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Không tìm thấy sản phẩm</div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart */}
          <div style={{ background: 'var(--navy-card)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.95rem' }}>
              🛒 Giỏ hàng {cart.length > 0 && <span style={{ background: 'var(--accent)', color: '#0f1629', borderRadius: 99, padding: '1px 8px', fontSize: '0.75rem', marginLeft: 6 }}>{cart.length}</span>}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.875rem' }}>
                  Chưa có sản phẩm<br />Bấm vào sản phẩm để thêm
                </div>
              ) : cart.map(item => (
                <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>{fmt(item.unit_price)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => changeQty(item.product_id, -1)} style={{ width: 24, height: 24, border: '1px solid var(--border)', background: 'var(--navy-3)', color: 'var(--text)', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>−</button>
                    <span style={{ width: 24, textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{item.quantity}</span>
                    <button onClick={() => changeQty(item.product_id, 1)} style={{ width: 24, height: 24, border: '1px solid var(--border)', background: 'var(--navy-3)', color: 'var(--text)', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>+</button>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: 70, textAlign: 'right' }}>{fmt(item.unit_price * item.quantity)}</div>
                  <button onClick={() => removeFromCart(item.product_id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>×</button>
                </div>
              ))}
            </div>

            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Tổng cộng</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(total)}</span>
              </div>
              <button onClick={handleCheckout} disabled={cart.length === 0 || loading}
                style={{ width: '100%', padding: '0.75rem', background: cart.length === 0 ? 'var(--navy-3)' : 'var(--accent)', color: cart.length === 0 ? 'var(--text-muted)' : '#0f1629', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
                {loading ? 'Đang xử lý…' : `💳 Thanh toán ${cart.length > 0 ? fmt(total) : ''}`}
              </button>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} style={{ width: '100%', padding: '0.5rem', background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Xóa giỏ hàng
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {receipt && (
        <Receipt order={receipt.order} items={receipt.items} store={receipt.store} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}
