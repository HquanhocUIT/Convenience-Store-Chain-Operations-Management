// backend/db/seed.js
// Chỉ seed ORDERS + INVENTORY (chạy SAU khi đã chạy SQL schema ở Supabase)
// Chạy: node db/seed.js

require('dotenv').config();
const supabase = require('../data/supabase');

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const PRODUCTS = [
  { id: 1,  price: 15000 }, { id: 2,  price: 15000 }, { id: 3,  price: 8000  },
  { id: 4,  price: 5000  }, { id: 5,  price: 22000 }, { id: 6,  price: 9000  },
  { id: 7,  price: 18000 }, { id: 8,  price: 12000 }, { id: 9,  price: 25000 },
  { id: 10, price: 16000 }, { id: 11, price: 12000 }, { id: 12, price: 10000 },
  { id: 13, price: 20000 }, { id: 14, price: 18000 }, { id: 15, price: 12000 },
  { id: 16, price: 15000 }, { id: 17, price: 7000  }, { id: 18, price: 8000  },
  { id: 19, price: 45000 }, { id: 20, price: 35000 },
];

const STORE_IDS = [1, 2, 3, 5, 6];

async function seedInventory() {
  console.log('📦 Seeding inventory...');
  await supabase.from('inventory').delete().gte('id', 0);

  const rows = [];
  for (const storeId of STORE_IDS) {
    for (const p of PRODUCTS) {
      rows.push({ product_id: p.id, store_id: storeId, current_stock: randInt(0, 150) });
    }
  }

  const { error } = await supabase.from('inventory').insert(rows);
  if (error) { console.error('❌ inventory:', error.message); process.exit(1); }
  console.log(`✅ inventory — ${rows.length} rows`);
}

async function seedOrders() {
  console.log('🧾 Seeding orders (60 ngày)...');
  await supabase.from('order_items').delete().gte('id', 0);
  await supabase.from('orders').delete().gte('id', 0);

  const orders = [];
  const orderItems = [];
  let orderId = 1;

  for (let d = 59; d >= 0; d--) {
    const perDay = randInt(5, 15);
    for (let j = 0; j < perDay; j++) {
      const storeId   = STORE_IDS[orderId % STORE_IDS.length];
      const itemCount = randInt(1, 5);
      const shuffled  = [...PRODUCTS].sort(() => Math.random() - 0.5).slice(0, itemCount);
      let total = 0;

      for (const p of shuffled) {
        const qty = randInt(1, 6);
        orderItems.push({ order_id: orderId, product_id: p.id, quantity: qty, unit_price: p.price });
        total += p.price * qty;
      }

      orders.push({
        id: orderId,
        store_id: storeId,
        created_by: 1,
        total_amount: total,
        status: 'completed',
        created_at: daysAgo(d),
      });
      orderId++;
    }
  }

  // Insert orders theo batch 100
  for (let i = 0; i < orders.length; i += 100) {
    const { error } = await supabase.from('orders').insert(orders.slice(i, i + 100));
    if (error) { console.error('❌ orders:', error.message); process.exit(1); }
  }
  console.log(`✅ orders — ${orders.length} rows`);

  // Insert order_items theo batch 200
  for (let i = 0; i < orderItems.length; i += 200) {
    const { error } = await supabase.from('order_items').insert(orderItems.slice(i, i + 200));
    if (error) { console.error('❌ order_items:', error.message); process.exit(1); }
  }
  console.log(`✅ order_items — ${orderItems.length} rows`);
}

async function main() {
  console.log('\n🌱 Starting seed...\n');
  await seedInventory();
  await seedOrders();
  console.log('\n🎉 Seed hoàn tất!');
  console.log('🔑 Login: demo / demo  hoặc  admin@cschain.vn / Admin@123');
}

main().catch(console.error);
