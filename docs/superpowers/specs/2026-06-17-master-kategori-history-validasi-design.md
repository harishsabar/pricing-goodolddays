# Master Kategori, History Harga & Validasi — Design Spec

## Overview
Add three features to Catat Harga: (1) master category table with CRUD, (2) enriched product detail + price change history in modal, (3) client-side validation on all forms.

## 1. Database Schema

### New table: `kategori`
```sql
CREATE TABLE kategori (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE
);
```

### Migrate `barang`
- Add `kategori_id BIGINT REFERENCES kategori(id)`
- Migrate existing `barang.kategori` (text) values into `kategori` table, then set `barang.kategori_id`
- Drop `barang.kategori` (text) column
- Create index on `barang.kategori_id`
- Update RLS policy for `kategori` table (public access, same pattern as `toko`)

## 2. Master Kategori CRUD

### Navigation
- New tab in header nav: **Entry | Toko | Kategori**

### Views
- **Kategori list view** (`#view-kategori-list`): table/card list of all categories, each with Edit/Hapus buttons
- **Kategori form modal**: input nama category only, add/edit mode
- Delete guarded: cannot delete kategori if any `barang` references it

### Form Entry Integration
- Dropdown `#field-kategori` populated from `kategori` table (not from distinct barang names)
- Field is required

## 3. History Harga with Product Detail

### Modal Enhancement (`#riwayat-modal`)
- **Header**: Show product name, category badge, total entry count, average price
- **Body**: Table of price entries, each row showing:
  - Tanggal
  - Harga (Rp)
  - Satuan
  - Toko
  - Selisih: change from previous price (Rp and %), with green (up) / red (down) coloring
- Edit button (✎) on each row — unchanged
- Sort: newest first

## 4. Client-Side Validation

### Entry Form
- All fields required: nama barang, kategori, satuan, harga, toko, tanggal
- Inline error messages (red text below each field) on submit attempt
- Submit button disabled until all valid

### Toko Form
- Nama toko required
- Inline validation on submit

### Kategori Form
- Nama kategori required
- Duplicate name check before submit

## Changes

### supabase-setup.sql
- Add `CREATE TABLE kategori` statement
- Add migration commands for `barang.kategori_id`
- Add RLS policy for `kategori`

### index.html
- New nav tab: Kategori
- New view: `#view-kategori-list`
- New modal: `#kategori-modal` (form)
- Enhanced `#riwayat-modal` header with detail info + selisih column
- Inline validation error elements under each form field

### app.js
- New DB functions: `getKategoriAll()`, `createKategori()`, `updateKategori()`, `deleteKategori()`, `getKategoriById()`
- New view functions: `loadKategoriList()`, `openKategoriModal()`, `closeKategoriModal()`, `saveKategori()`, `editKategoriModal()`, `deleteKategoriHandler()`
- Enhanced `openRiwayat()`: show detail header + compute price diffs
- Enhanced `saveEntry()`: validate all fields, show inline errors
- Enhanced `saveToko()`: validate nama
- Helper: `validateField(el, errorElId, message)`, `clearErrors()`
- Load form options: populate kategori from kategori table

## Success Criteria
1. Can create, edit, delete categories from dedicated page
2. Entry form kategori dropdown shows master categories
3. Cannot delete category used by existing barang
4. Modal shows product detail (name, category, avg price, entry count)
5. Modal shows price changes with selisih/percentage
6. All forms validate before submit — no empty fields accepted
7. Inline error messages shown, not alert()
8. Existing functionality unchanged
