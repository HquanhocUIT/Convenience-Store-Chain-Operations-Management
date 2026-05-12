# CS Chain — React Frontend

Vite + React + Bootstrap 5. Convert từ HTML/CSS/JS thuần.

## Cấu trúc thư mục

```
src/
├── App.jsx              ← Router chính (6 routes)
├── main.jsx
├── index.css
├── components/
│   └── Navbar.jsx       ← Navbar dùng chung
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx    ← KPI cards + Chart.js bar chart
│   ├── Branches.jsx     ← CRUD + toggle active
│   ├── Inventory.jsx    ← CRUD + restock
│   ├── Employees.jsx    ← CRUD + filter by store
│   └── Reports.jsx      ← Daily/Weekly/Monthly + line chart
└── utils/
    └── api.js           ← apiFetch() helper với JWT auth
```

## Chạy local

```bash
cp .env.example .env      # sửa VITE_API_URL nếu cần
npm install
npm run dev               # → http://localhost:5173
```

Demo offline: login bằng `demo` / `demo`

## Deploy lên Vercel

1. Push folder này lên GitHub
2. Vercel → Import project → chọn repo
3. Framework Preset: Vite
4. Root Directory: `cs-chain-react` (nếu để trong subfolder)
5. Environment Variables: thêm VITE_API_URL = URL backend Render.com
6. Click Deploy

## Kết nối Backend

Tất cả API call dùng apiFetch() trong src/utils/api.js.
Token JWT lưu trong localStorage key "token".
Nếu backend trả 401 → tự redirect về trang login.
