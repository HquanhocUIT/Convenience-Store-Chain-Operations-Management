-- ============================================================
-- CS Chain — Supabase Schema
-- Chạy file này trong Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. STORES (Chi nhánh)
create table if not exists stores (
  id         serial primary key,
  name       text not null unique,
  address    text,
  manager    text,
  phone      text,
  email      text,
  status     text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz default now()
);

-- 2. PRODUCTS (Sản phẩm / Hàng hóa)
create table if not exists products (
  id            serial primary key,
  name          text not null,
  category      text default 'Uncategorized',
  price         integer not null default 0,
  current_stock integer not null default 0,
  threshold     integer not null default 10,
  created_at    timestamptz default now()
);

-- 3. EMPLOYEES (Nhân viên)
create table if not exists employees (
  id         serial primary key,
  email      text unique not null,
  full_name  text not null,
  role       text not null default 'staff' check (role in ('admin','manager','staff')),
  store_id   integer references stores(id) on delete set null,
  store_name text,
  shift      text default 'morning' check (shift in ('morning','afternoon','evening','night')),
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

-- 4. ORDERS (Đơn hàng)
create table if not exists orders (
  id         serial primary key,
  store_id   integer references stores(id) on delete set null,
  total      integer not null default 0,
  created_at timestamptz default now()
);

-- 5. ORDER_ITEMS (Chi tiết đơn)
create table if not exists order_items (
  id         serial primary key,
  order_id   integer references orders(id) on delete cascade,
  product_id integer references products(id) on delete set null,
  name       text,
  quantity   integer not null,
  price      integer not null
);

-- ============================================================
-- SEED DATA — xóa cũ rồi insert
-- ============================================================
truncate stores, products, employees, order_items, orders restart identity cascade;

insert into stores (name, address, manager, phone, email, status) values
  ('CS Chain Quận 1',     '123 Lê Lợi, Q.1, TP.HCM',               'Nguyễn Văn An',  '0901234567', 'q1@cschain.vn', 'active'),
  ('CS Chain Quận 3',     '456 Võ Văn Tần, Q.3, TP.HCM',            'Trần Thị Bình',  '0902234567', 'q3@cschain.vn', 'active'),
  ('CS Chain Bình Thạnh', '789 Xô Viết Nghệ Tĩnh, Q.BT, TP.HCM',   'Lê Văn Cường',   '0903234567', 'bt@cschain.vn', 'active'),
  ('CS Chain Phú Nhuận',  '321 Phan Đăng Lưu, Q.PN, TP.HCM',        'Phạm Thị Dung',  '0904234567', 'pn@cschain.vn', 'inactive'),
  ('CS Chain Gò Vấp',     '555 Nguyễn Văn Lượng, Q.GV, TP.HCM',     'Hoàng Văn Em',   '0905234567', 'gv@cschain.vn', 'active');

insert into products (name, category, price, current_stock, threshold) values
  ('Coca Cola 330ml',          'Beverage',     15000,  50, 20),
  ('Pepsi 330ml',               'Beverage',     15000,   5, 20),
  ('Aquafina 500ml',            'Beverage',      8000,   0, 30),
  ('Mì Hảo Hảo Tôm Chua Cay', 'Food',           5000, 120, 50),
  ('Bánh Kinh Đô AFC',          'Snack',         22000,  12, 15),
  ('Sữa Tươi Vinamilk 180ml',  'Beverage',       9000,  85, 30),
  ('Khăn Giấy Choice L',       'Personal Care', 18000,  40, 10),
  ('Xúc Xích Vissan',           'Food',          12000,  60, 20),
  ('Nước Tương Maggi',          'Spice',         25000,  15, 10),
  ('Cà Phê Sữa Highland 180ml','Beverage',      16000,  25, 15),
  ('Trà Xanh Không Độ',        'Beverage',      12000,  45, 20),
  ('Mì Trộn Omachi',            'Food',          10000,   8, 25);

insert into employees (email, full_name, role, store_id, store_name, shift, is_active) values
  ('admin@cschain.vn',    'Đặng Hoàng Nguyên',      'admin',   null, null,                  'morning',   true),
  ('thach@cschain.vn',    'Phạm Ngọc Thạch',         'manager', 1,    'CS Chain Quận 1',     'morning',   true),
  ('huong@cschain.vn',    'Lê Thị Hương',            'staff',   1,    'CS Chain Quận 1',     'afternoon', true),
  ('tai@cschain.vn',      'Nguyễn Tất Tấn Tài',      'staff',   1,    'CS Chain Quận 1',     'night',     true),
  ('quan.pn@cschain.vn',  'Phạm Như Quân',           'manager', 2,    'CS Chain Quận 3',     'morning',   true),
  ('dung@cschain.vn',     'Hoàng Văn Dũng',          'staff',   2,    'CS Chain Quận 3',     'afternoon', true),
  ('lan@cschain.vn',      'Trần Kim Lan',             'staff',   2,    'CS Chain Quận 3',     'night',     true),
  ('tuan@cschain.vn',     'An Minh Tuấn',            'manager', 3,    'CS Chain Bình Thạnh', 'morning',   true),
  ('hoa@cschain.vn',      'Nguyễn Thanh Hoa',        'staff',   3,    'CS Chain Bình Thạnh', 'afternoon', true),
  ('sang@cschain.vn',     'Nguyễn Đình Sang',        'staff',   1,    'CS Chain Quận 1',     'night',     false);

-- Seed 30 ngày orders (chạy bằng function hoặc tự tạo trong app)
-- Orders sẽ được tạo tự động bởi seed.js
