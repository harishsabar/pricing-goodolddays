# Pencatatan Harga Bahan Baku Produksi Tas

## Ringkasan

Aplikasi web ringan (vanilla HTML/CSS/JS + Supabase) untuk mencatat dan melihat riwayat harga bahan baku produksi tas. Bisa diakses dari mana saja via browser, responsif untuk HP dan laptop, hosting gratis di Vercel/Netlify.

## Database

### Tabel `barang`

| Field     | Type    | Keterangan                        |
|-----------|---------|-----------------------------------|
| id        | integer | primary key, auto-increment       |
| nama      | text    | nama barang                       |
| kategori  | text    | kain, benang, resleting, aksesoris, dll |

### Tabel `entry_harga`

| Field     | Type      | Keterangan                              |
|-----------|-----------|-----------------------------------------|
| id        | integer   | primary key, auto-increment             |
| barang_id | integer   | foreign key ke tabel barang             |
| satuan    | text      | meter, yard, roll, pcs, bungkus, golong, dll |
| harga     | integer   | harga dalam Rupiah per satuan           |
| toko_id   | integer   | foreign key ke tabel toko               |
| tanggal   | date      | tanggal entry                           |
| catatan   | text      | opsional                                |

### Tabel `toko`

| Field   | Type    | Keterangan          |
|---------|---------|---------------------|
| id      | integer | primary key         |
| nama    | text    | nama toko           |
| alamat  | text    | alamat              |
| kontak  | text    | no HP / kontak      |

## Halaman

1. **Entry List** — daftar semua entry harga, diurutkan terbaru
   - Search nama barang (lokal/instant)
   - Filter kategori & toko
   - Klik nama barang → lihat riwayat harga barang tersebut

2. **Tambah Entry** — form:
   - Nama barang (text input, existing barang bisa muncul sebagai suggestion via search ke Supabase)
   - Kategori (dropdown, diisi manual lewat DB)
   - Satuan (text input bebas)
   - Harga (number, Rupiah)
   - Toko (dropdown dari tabel toko, + tombol "Tambah Toko Baru")
   - Tanggal (date picker, default hari ini)
   - Catatan (textarea opsional)

3. **Edit Entry** — form sama seperti tambah, untuk koreksi

4. **Daftar Toko** — CRUD toko (nama, alamat, kontak)

5. **Riwayat Barang** — ditampilkan sebagai modal/panel saat klik nama barang di Entry List. Menampilkan semua entry harga barang itu diurutkan dari terbaru.

## Teknologi

- **Frontend:** Vanilla HTML + CSS + JavaScript (zero framework, zero build step)
- **CSS Framework:** Tailwind CSS via CDN (utility-first, responsive)
- **Database:** Supabase PostgreSQL (free tier)
- **Client Library:** Supabase JS Client via CDN
- **Hosting:** Vercel atau Netlify (static site, deploy dari GitHub)
- **Domain:** Opsional custom domain nanti

## Data Flow

1. User buka halaman → Supabase JS client fetch data (terbatas, pakai pagination atau filter)
2. CRUD operations → langsung ke Supabase via REST API
3. Riwayat barang → query `entry_harga` WHERE `barang_id = X` ORDER BY `tanggal` DESC

## Non-Fungsional

- Responsive: layout menyesuaikan HP dan laptop
- Load cepat: vanilla JS, CDN global, query terfilter (tidak fetch semua data sekaligus)
- Tidak perlu authentication (untuk kemudahan akses)
- Deployment: push ke GitHub → auto-deploy ke Vercel/Netlify
