# Master Kategori, History Harga & Validasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add master category CRUD, enriched price history with price diffs, and client-side validation to Catat Harga.

**Architecture:** Single-page app with Supabase backend. Add `kategori` table with FK from `barang`. All CRUD in modals following existing toko pattern. Validation via inline error helpers.

**Tech Stack:** HTML + Tailwind CDN, Supabase JS v2, vanilla JS.

## Global Constraints

- Follow existing code patterns in app.js and index.html exactly (no frameworks, no build tools)
- All new UI uses the same card/modal style as existing toko CRUD
- Validation errors appear inline (red text below fields), not via alert()
- Delete operations show confirm() dialog before executing
- Existing entry_harga and toko tables unchanged

---

### Task 1: Database Schema — Kategori Table & Migration

**Files:**
- Modify: `supabase-setup.sql`

**Interfaces:**
- Consumes: existing `barang` table with `kategori` (text) column
- Produces: `kategori` table, `barang.kategori_id` FK, RLS policy

- [ ] **Step 1: Add kategori table + migration to supabase-setup.sql**

Insert after the `barang` table creation:

```sql
-- Tabel kategori
CREATE TABLE IF NOT EXISTS kategori (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE
);
```

After the existing barang table section, add migration:

```sql
-- Migrasi: pindah kategori text ke tabel kategori
INSERT INTO kategori (nama)
  SELECT DISTINCT TRIM(kategori) FROM barang
  WHERE kategori IS NOT NULL AND TRIM(kategori) != ''
  ON CONFLICT (nama) DO NOTHING;

ALTER TABLE barang ADD COLUMN kategori_id BIGINT REFERENCES kategori(id);

UPDATE barang b
  SET kategori_id = k.id
  FROM kategori k
  WHERE TRIM(b.kategori) = k.nama;

CREATE INDEX IF NOT EXISTS idx_barang_kategori_id ON barang(kategori_id);

-- Hapus kolom kategori text setelah migrasi
ALTER TABLE barang DROP COLUMN IF EXISTS kategori;
```

Add RLS after existing policies:

```sql
ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to kategori" ON kategori FOR ALL USING (true) WITH CHECK (true);
```

---

### Task 2: Kategori CRUD — JavaScript Database Functions

**Files:**
- Modify: `app.js` (append new functions before the `// === ENTRY DB ===` section)

**Interfaces:**
- Consumes: Supabase client `sb`
- Produces: `getKategoriAll()`, `createKategori()`, `updateKategori()`, `deleteKategori()`, `getKategoriById()`

- [ ] **Step 1: Add kategori DB functions after `getBarangByNama()` block**

```javascript
// === KATEGORI DB ===
async function getKategoriAll() {
  try {
    const { data } = await sb.from('kategori').select('*').order('nama');
    return data || [];
  } catch (err) {
    console.error('getKategoriAll error:', err);
    return [];
  }
}

async function createKategori(nama) {
  try {
    const { data } = await sb.from('kategori').insert({ nama }).select().single();
    return data;
  } catch (err) {
    console.error('createKategori error:', err);
    return null;
  }
}

async function updateKategori(id, nama) {
  try {
    const { data } = await sb.from('kategori').update({ nama }).eq('id', id).select().single();
    return data;
  } catch (err) {
    console.error('updateKategori error:', err);
    return null;
  }
}

async function deleteKategori(id) {
  try {
    const { error } = await sb.from('kategori').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('deleteKategori error:', err);
    return false;
  }
}

async function getKategoriById(id) {
  try {
    const { data } = await sb.from('kategori').select('*').eq('id', id).single();
    return data;
  } catch (err) {
    console.error('getKategoriById error:', err);
    return null;
  }
}
```

---

### Task 3: Kategori CRUD — HTML Views & Modal

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add Kategori nav button next to Toko button**

Change line 43-44 from:
```html
<button onclick="navigate('entry-list')" class="text-blue-600 hover:underline" id="nav-entry">Entry</button>
<button onclick="navigate('toko-list')" class="text-blue-600 hover:underline" id="nav-toko">Toko</button>
```
To:
```html
<button onclick="navigate('entry-list')" class="text-blue-600 hover:underline" id="nav-entry">Entry</button>
<button onclick="navigate('toko-list')" class="text-blue-600 hover:underline" id="nav-toko">Toko</button>
<button onclick="navigate('kategori-list')" class="text-blue-600 hover:underline" id="nav-kategori">Kategori</button>
```

- [ ] **Step 2: Add kategori list view after toko-list section**

After the `</section>` closing `view-toko-list` (after line 128), add:

```html
<!-- VIEW: Kategori List -->
<section id="view-kategori-list" class="view hidden">
  <button onclick="navigate('entry-list')" class="text-blue-600 text-sm mb-3">&larr; Kembali</button>
  <h2 class="text-lg font-semibold mb-3">Daftar Kategori</h2>
  <button onclick="openKategoriModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm mb-3">+ Tambah Kategori</button>
  <div id="kategori-list" class="space-y-2"></div>
  <div id="kategori-loading" class="text-center text-gray-400 py-8 text-sm hidden">Memuat...</div>
</section>
```

- [ ] **Step 3: Add kategori form modal after toko-modal**

After the `</div>` closing `toko-modal` (after line 160), add:

```html
<!-- MODAL: Kategori Form -->
<div id="kategori-modal" class="fixed inset-0 bg-black/40 hidden items-center justify-center z-20 p-4" onclick="if(event.target===this)closeKategoriModal()">
  <div class="bg-white rounded-xl w-full max-w-sm p-4">
    <h3 class="font-semibold mb-3" id="kategori-modal-title">Tambah Kategori</h3>
    <form id="kategori-form" onsubmit="saveKategori(event)" class="space-y-3">
      <input type="hidden" id="kategori-field-id">
      <div>
        <label class="block text-sm font-medium mb-1">Nama Kategori</label>
        <input type="text" id="kategori-field-nama" required class="w-full border rounded-lg px-3 py-2 text-sm">
        <p id="kategori-error-nama" class="text-red-500 text-xs mt-1 hidden"></p>
      </div>
      <div class="flex gap-2">
        <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Simpan</button>
        <button type="button" onclick="closeKategoriModal()" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm">Batal</button>
      </div>
    </form>
  </div>
</div>
```

- [ ] **Step 4: Add validation error elements to entry form**

After line 76 (suggestion-box div), wrap kategori field with error element:
```html
<div>
  <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
  <select id="field-kategori" class="w-full border rounded-lg px-3 py-2 text-sm">
    <option value="">-- Pilih Kategori --</option>
  </select>
  <p id="entry-error-kategori" class="text-red-500 text-xs mt-1 hidden"></p>
</div>
```

Add error element after satuan input (after line 91):
```html
<p id="entry-error-satuan" class="text-red-500 text-xs mt-1 hidden"></p>
```

Add error element after harga input (after line 95):
```html
<p id="entry-error-harga" class="text-red-500 text-xs mt-1 hidden"></p>
```

Add error element after toko select (after line 103):
```html
<p id="entry-error-toko" class="text-red-500 text-xs mt-1 hidden"></p>
```

Add error element after tanggal input (after line 108):
```html
<p id="entry-error-tanggal" class="text-red-500 text-xs mt-1 hidden"></p>
```

- [ ] **Step 5: Add validation error element to toko form**

After toko-field-nama input (line 151), add:
```html
<p id="toko-error-nama" class="text-red-500 text-xs mt-1 hidden"></p>
```

- [ ] **Step 6: Enhance riwayat modal header**

Replace lines 133-138 with:
```html
<div class="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
  <div>
    <h3 class="font-semibold text-base" id="riwayat-nama"></h3>
    <div class="text-xs text-gray-500 mt-0.5">
      <span class="bg-gray-100 rounded px-1.5 py-0.5" id="riwayat-kategori"></span>
      <span class="ml-2" id="riwayat-info"></span>
    </div>
  </div>
  <button onclick="closeRiwayat()" class="text-gray-400 text-xl">&times;</button>
</div>
```

---

### Task 4: Kategori CRUD — View Logic

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `getKategoriAll()`, `createKategori()`, `updateKategori()`, `deleteKategori()`, `getKategoriById()` from Task 2
- Produces: Kategori list rendered, modal CRUD working

- [ ] **Step 1: Add navigate() case for kategori-list**

In the `navigate()` function (around line 44-46), add:
```javascript
if (view === 'kategori-list') { loadKategoriList(); }
```

- [ ] **Step 2: Add kategori view functions before `// === ENTRY LIST VIEW ===`**

```javascript
// === KATEGORI VIEW ===
async function loadKategoriList() {
  try {
    const container = document.getElementById('kategori-list');
    const loading = document.getElementById('kategori-loading');
    loading.classList.remove('hidden');
    container.innerHTML = '';

    const kats = await getKategoriAll();
    loading.classList.add('hidden');

    if (kats.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Belum ada kategori.</p>';
      return;
    }

    container.innerHTML = kats.map(k => `
      <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <div class="flex items-start justify-between">
          <div class="font-medium text-gray-900">${escHtml(k.nama)}</div>
          <div class="flex gap-1">
            <button onclick="editKategoriModal(${k.id})" class="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50">Edit</button>
            <button onclick="deleteKategoriHandler(${k.id})" class="text-red-500 text-xs px-2 py-1 rounded hover:bg-red-50">Hapus</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    alert('Gagal memuat kategori: ' + err.message);
  }
}

function openKategoriModal() {
  document.getElementById('kategori-form').reset();
  document.getElementById('kategori-field-id').value = '';
  document.getElementById('kategori-modal-title').textContent = 'Tambah Kategori';
  document.getElementById('kategori-error-nama').classList.add('hidden');
  document.getElementById('kategori-modal').classList.remove('hidden');
  document.getElementById('kategori-modal').classList.add('flex');
}

function closeKategoriModal() {
  document.getElementById('kategori-modal').classList.remove('flex');
  document.getElementById('kategori-modal').classList.add('hidden');
}

async function saveKategori(e) {
  e.preventDefault();
  try {
    const id = document.getElementById('kategori-field-id').value;
    const nama = document.getElementById('kategori-field-nama').value.trim();
    const errorEl = document.getElementById('kategori-error-nama');

    if (!nama) {
      errorEl.textContent = 'Nama kategori wajib diisi';
      errorEl.classList.remove('hidden');
      return;
    }

    errorEl.classList.add('hidden');

    if (id) {
      await updateKategori(Number(id), nama);
    } else {
      const existing = await sb.from('kategori').select('id').eq('nama', nama).maybeSingle();
      if (existing && existing.data) {
        errorEl.textContent = 'Nama kategori sudah ada';
        errorEl.classList.remove('hidden');
        return;
      }
      await createKategori(nama);
    }

    closeKategoriModal();
    loadKategoriList();
  } catch (err) {
    alert('Gagal menyimpan kategori: ' + err.message);
  }
}

async function editKategoriModal(id) {
  try {
    const kategori = await getKategoriById(id);
    if (!kategori) return;
    document.getElementById('kategori-field-id').value = kategori.id;
    document.getElementById('kategori-field-nama').value = kategori.nama;
    document.getElementById('kategori-error-nama').classList.add('hidden');
    document.getElementById('kategori-modal-title').textContent = 'Edit Kategori';
    document.getElementById('kategori-modal').classList.add('flex');
  } catch (err) {
    alert('Gagal memuat kategori: ' + err.message);
  }
}

async function deleteKategoriHandler(id) {
  try {
    if (!confirm('Hapus kategori ini?')) return;
    const { data: refs } = await sb.from('barang').select('id').eq('kategori_id', id).limit(1);
    if (refs && refs.length > 0) {
      alert('Tidak bisa hapus: masih ada barang yang menggunakan kategori ini.');
      return;
    }
    await deleteKategori(id);
    loadKategoriList();
  } catch (err) {
    alert('Gagal menghapus kategori: ' + err.message);
  }
}
```

---

### Task 5: Entry Form — Integrate Master Kategori & Load from Kategori Table

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Update `loadFormOptions()` to use `getKategoriAll()`**

Replace the kategori loading section inside `loadFormOptions()`:

```javascript
const kats = await getKategoriAll();
const katSelect = document.getElementById('field-kategori');
katSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>' + kats.map(k => `<option value="${k.id}">${escHtml(k.nama)}</option>`).join('');
```

- [ ] **Step 2: Update `loadFilterOptions()` to use `getKategoriAll()`**

Replace the kategori loading section inside `loadFilterOptions()`:

```javascript
const kats = await getKategoriAll();
const katSelect = document.getElementById('filter-kategori');
const currentKat = katSelect.value;
katSelect.innerHTML = '<option value="">Semua Kategori</option>' + kats.map(k => `<option value="${k.id}">${escHtml(k.nama)}</option>`).join('');
katSelect.value = currentKat || '';
```

- [ ] **Step 3: Update `saveEntry()` to use kategori_id**

Change the kategori handling lines in `saveEntry()`. The field value now is a kategori_id, not a text string.

Replace line 365:
```javascript
const kategori = document.getElementById('field-kategori').value;
```
With:
```javascript
const kategoriId = document.getElementById('field-kategori').value || null;
```

Replace the block at lines 373-383:
```javascript
if (!barangId) {
  let existing = await getBarangByNama(nama);
  if (existing) {
    barangId = existing.id;
  } else {
    const created = await createBarang(nama, kategori);
    barangId = created.id;
  }
} else if (kategori) {
  await sb.from('barang').update({ kategori }).eq('id', barangId);
}
```
With:
```javascript
if (!barangId) {
  let existing = await getBarangByNama(nama);
  if (existing) {
    barangId = existing.id;
  } else {
    const created = await createBarang(nama, '');
    barangId = created.id;
  }
}
if (kategoriId) {
  await sb.from('barang').update({ kategori_id: Number(kategoriId) }).eq('id', barangId);
}
```

- [ ] **Step 4: Update `getEntries()` filter for kategori**

Replace line 182:
```javascript
if (filters.kategori) bq = bq.eq('kategori', filters.kategori);
```
With:
```javascript
if (filters.kategori) bq = bq.eq('kategori_id', Number(filters.kategori));
```

- [ ] **Step 5: Update `renderEntryCard()` to show category name**

Replace line 277:
```javascript
<span class="bg-gray-100 rounded px-1.5 py-0.5">${escHtml(barang.kategori || '-')}</span>
```
With:
```javascript
<span class="bg-gray-100 rounded px-1.5 py-0.5">${escHtml(barang.kategori ? barang.kategori.nama : '-')}</span>
```
Also update the join in `getEntries()` to include kategori relation. Change line 169-172:
```javascript
let query = sb.from('entry_harga')
  .select('*, barang:barang_id(*), toko:toko_id(*)')
```
To:
```javascript
let query = sb.from('entry_harga')
  .select('*, barang:barang_id(*, kategori:kategori_id(*)), toko:toko_id(*)')
```

- [ ] **Step 6: Update `createBarang()` to remove kategori from insert**

Replace:
```javascript
async function createBarang(nama, kategori) {
  try {
    const { data } = await sb.from('barang').insert({ nama, kategori }).select().single();
    return data;
  } catch (err) {
    console.error('createBarang error:', err);
    return null;
  }
}
```
With:
```javascript
async function createBarang(nama) {
  try {
    const { data } = await sb.from('barang').insert({ nama }).select().single();
    return data;
  } catch (err) {
    console.error('createBarang error:', err);
    return null;
  }
}
```
Also update the call site in `saveEntry()`:
```javascript
const created = await createBarang(nama, '');
```
To:
```javascript
const created = await createBarang(nama);
```

- [ ] **Step 7: Update `openRiwayat()` / `editEntry()` for new relation**

In `editEntry()` (line 438), the selected kategori value needs to be `barang.kategori_id` instead of `barang.kategori`. Change:

```javascript
document.getElementById('field-kategori').value = entry.barang.kategori || '';
```
To:
```javascript
document.getElementById('field-kategori').value = entry.barang.kategori_id || '';
```

---

### Task 6: Enhanced Riwayat Modal — Product Detail & Price Diffs

**Files:**
- Modify: `app.js`
- Modify: `index.html` (already done in Task 3 Step 6)

- [ ] **Step 1: Update `getRiwayat()` to include kategori relation**

```javascript
async function getRiwayat(barangId) {
  try {
    const { data } = await sb.from('entry_harga')
      .select('*, toko:toko_id(*)')
      .eq('barang_id', barangId)
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false });
    return data || [];
  } catch (err) {
    console.error('getRiwayat error:', err);
    return [];
  }
}
```
(This is unchanged, but keep it as-is.)

- [ ] **Step 2: Replace `openRiwayat()` with enhanced version**

Replace the entire `openRiwayat()` function:

```javascript
async function openRiwayat(barangId) {
  try {
    const modal = document.getElementById('riwayat-modal');
    const list = document.getElementById('riwayat-list');
    const loading = document.getElementById('riwayat-loading');
    const nama = document.getElementById('riwayat-nama');
    const kategori = document.getElementById('riwayat-kategori');
    const info = document.getElementById('riwayat-info');

    const barang = await sb.from('barang').select('*, kategori:kategori_id(*)').eq('id', barangId).single();
    if (!barang.data) return;
    const b = barang.data;
    nama.textContent = b.nama;
    kategori.textContent = b.kategori ? b.kategori.nama : '-';

    modal.classList.add('open');
    list.innerHTML = '';
    loading.classList.remove('hidden');

    const entries = await getRiwayat(barangId);
    loading.classList.add('hidden');

    if (entries.length === 0) {
      info.textContent = '';
      list.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Belum ada riwayat.</p>';
      return;
    }

    const total = entries.length;
    const avg = Math.round(entries.reduce((sum, e) => sum + e.harga, 0) / total);
    info.textContent = `${total} entry · Rata-rata Rp${rupiah(avg)}`;

    list.innerHTML = entries.map((e, i) => {
      const toko = e.toko || {};
      const prev = entries[i + 1]; // next in array = previous chronologically
      let selisihHtml = '';
      if (prev && prev.harga !== e.harga) {
        const diff = e.harga - prev.harga;
        const pct = prev.harga > 0 ? ((diff / prev.harga) * 100).toFixed(1) : 0;
        const cls = diff > 0 ? 'text-green-600' : 'text-red-600';
        selisihHtml = `<span class="${cls} text-xs ml-1">${diff > 0 ? '▲' : '▼'} Rp${rupiah(Math.abs(diff))} (${pct}%)</span>`;
      }
      return `
        <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <div class="text-sm">
            <span class="text-gray-500">${e.tanggal}</span>
            <span class="ml-2 text-gray-700">${escHtml(e.satuan)}</span>
            <span class="ml-1 text-gray-400">${escHtml(toko.nama || '-')}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="font-semibold text-blue-700">Rp${rupiah(e.harga)}</span>
            ${selisihHtml}
            <button onclick="editEntry(${e.id})" class="text-xs text-blue-500 hover:underline ml-2" title="Edit">✎</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    alert('Gagal memuat riwayat: ' + err.message);
  }
}
```

---

### Task 7: Client-Side Validation — All Forms

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add validation helper functions before `// === ENTRY LIST VIEW ===`**

```javascript
// === VALIDATION HELPERS ===
function validateField(value, errorElId, message) {
  const errorEl = document.getElementById(errorElId);
  if (!value || (typeof value === 'string' && !value.trim())) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    return false;
  }
  errorEl.classList.add('hidden');
  return true;
}

function clearErrors() {
  document.querySelectorAll('[id$="-error"]').forEach(el => el.classList.add('hidden'));
}
```

- [ ] **Step 2: Add validation to `saveEntry()`**

At the beginning of the try block inside `saveEntry()`, after the field reads:

```javascript
clearErrors();
let isValid = true;

const nama = document.getElementById('field-nama').value.trim();
const kategoriId = document.getElementById('field-kategori').value;
const satuan = document.getElementById('field-satuan').value.trim();
const hargaVal = Number(document.getElementById('field-harga').value);
const harga = isNaN(hargaVal) ? 0 : hargaVal;
const tokoId = document.getElementById('field-toko').value;
const tanggal = document.getElementById('field-tanggal').value;
const catatan = document.getElementById('field-catatan').value.trim();

if (!validateField(nama, 'entry-error-nama', 'Nama barang wajib diisi')) isValid = false;
if (!validateField(kategoriId, 'entry-error-kategori', 'Kategori wajib dipilih')) isValid = false;
if (!validateField(satuan, 'entry-error-satuan', 'Satuan wajib diisi')) isValid = false;
if (!validateField(harga > 0 ? harga.toString() : '', 'entry-error-harga', 'Harga wajib diisi dan harus lebih dari 0')) isValid = false;
if (!validateField(tokoId, 'entry-error-toko', 'Toko wajib dipilih')) isValid = false;
if (!validateField(tanggal, 'entry-error-tanggal', 'Tanggal wajib diisi')) isValid = false;

if (!isValid) {
  btn.disabled = false;
  btn.textContent = 'Simpan';
  return;
}
```

- [ ] **Step 3: Add validation to `saveToko()`**

Inside `saveToko()`, right after reading the id/nama/alamat/kontak:

```javascript
const errorEl = document.getElementById('toko-error-nama');
if (!nama) {
  errorEl.textContent = 'Nama toko wajib diisi';
  errorEl.classList.remove('hidden');
  return;
}
errorEl.classList.add('hidden');
```

- [ ] **Step 4: Add nama error element to toko modal in index.html** (already done in Task 3 Step 5)
