# Catat Harga — Bahan Baku Produksi Tas

Aplikasi web untuk mencatat riwayat harga bahan baku produksi tas.

## Setup

### 1. Database (Supabase)

1. Buka https://supabase.com dan daftar (free tier)
2. Buat project baru
3. Buka **SQL Editor**
4. Paste isi `supabase-setup.sql` lalu Run
5. Buka **Settings → API**
6. Copy **Project URL** dan **anon public key**

### 2. Konfigurasi App

Buka `app.js`, ganti:
```js
const SUPABASE_URL = 'TODO: ganti dengan Supabase URL';
const SUPABASE_ANON_KEY = 'TODO: ganti dengan Supabase anon key';
```

### 3. Hosting (Vercel — gratis)

1. Push repo ke GitHub
2. Buka https://vercel.com → Import repo
3. Deploy — selesai

## File Structure

```
├── index.html           — UI (Tailwind CDN)
├── app.js               — Semua logika (Supabase, CRUD, UI)
├── supabase-setup.sql   — Setup database & RLS
└── docs/
    └── superpowers/
        ├── specs/        — Spesifikasi desain
        └── plans/        — Rencana implementasi
```

## Fitur

- Catat harga barang dengan berbagai satuan (meter, yard, roll, pcs, bungkus, dll)
- Kelola daftar toko (nama, alamat, kontak)
- Filter & cari entry harga
- Riwayat perubahan harga per barang
- Responsive (HP & laptop)
- Hosting gratis
