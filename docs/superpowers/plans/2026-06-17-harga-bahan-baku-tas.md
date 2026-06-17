# Pencatatan Harga Bahan Baku Tas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplikasi web ringan (vanilla HTML/CSS/JS + Supabase) untuk mencatat riwayat harga bahan baku produksi tas.

**Architecture:** Single-page app dalam satu file `index.html` + satu file `app.js`. Semua view ditampilkan dengan show/hide section. Data disimpan di Supabase PostgreSQL dengan public RLS. Vanilla JS, zero build step.

**Tech Stack:** HTML5, Tailwind CSS (CDN), Supabase JS Client v2 (CDN), Supabase PostgreSQL free tier.

## Global Constraints

- Zero framework, zero build step, zero npm dependencies
- Responsive: layout harus rapi di HP dan laptop
- Harga dalam Rupiah (integer, tanpa desimal)
- Tidak perlu authentication — public access via anon key
- Semua file static, deploy ke Vercel/Netlify

---
## File Structure

```
/
├── index.html        — Semua HTML (single page, views di-show/hide)
├── app.js            — Semua JavaScript (init, DB, UI, routing)
├── supabase-setup.sql — SQL untuk create tabel & RLS (dijalankan user di Supabase)
```

---

### Task 1: Setup Supabase & Buat SQL Setup

**Files:**
- Create: `supabase-setup.sql`

**Interfaces:**
- Produces: SQL script untuk create tabel & RLS policy

- [ ] **Tulis `supabase-setup.sql`**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel barang
CREATE TABLE IF NOT EXISTS barang (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT ''
);

-- Tabel toko
CREATE TABLE IF NOT EXISTS toko (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama TEXT NOT NULL,
  alamat TEXT DEFAULT '',
  kontak TEXT DEFAULT ''
);

-- Tabel entry_harga
CREATE TABLE IF NOT EXISTS entry_harga (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  barang_id BIGINT REFERENCES barang(id) ON DELETE CASCADE NOT NULL,
  satuan TEXT NOT NULL,
  harga INTEGER NOT NULL,
  toko_id BIGINT REFERENCES toko(id) ON DELETE SET NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT DEFAULT ''
);

-- Public RLS policies
ALTER TABLE barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE toko ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_harga ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON barang FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON toko FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON entry_harga FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Petunjuk setup untuk user**: buka app.supabase.com → New Project → SQL Editor → paste & run SQL di atas → copy Project URL & anon key dari Settings → API

---

### Task 2: Buat `index.html`

**Files:**
- Create: `index.html`

- [ ] **Tulis `index.html` dengan Tailwind CDN, semua view section, dan include `app.js`**

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catat Harga - Bahan Baku Tas</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    .hidden-view { display: none; }
    #riwayat-modal.open { display: flex; }
    .suggestion-item:hover { background: #f3f4f6; }
  </style>
</head>
<body class="bg-gray-50 font-sans antialiased">
  <div class="max-w-lg mx-auto px-4 py-4" id="app">
    <!-- HEADER -->
    <header class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-gray-800">Catat Harga</h1>
      <nav class="flex gap-2 text-sm">
        <button onclick="navigate('entry-list')" class="text-blue-600 hover:underline" id="nav-entry">Entry</button>
        <button onclick="navigate('toko-list')" class="text-blue-600 hover:underline" id="nav-toko">Toko</button>
      </nav>
    </header>

    <!-- VIEW: Entry List -->
    <section id="view-entry-list" class="view">
      <div class="flex gap-2 mb-3">
        <input type="text" id="search-input" placeholder="Cari barang..." class="flex-1 border rounded-lg px-3 py-2 text-sm" oninput="onSearchChange()">
        <select id="filter-kategori" class="border rounded-lg px-2 py-2 text-sm" onchange="onFilterChange()">
          <option value="">Semua Kategori</option>
        </select>
      </div>
      <div class="flex gap-2 mb-3">
        <select id="filter-toko" class="border rounded-lg px-2 py-2 text-sm flex-1" onchange="onFilterChange()">
          <option value="">Semua Toko</option>
        </select>
        <button onclick="navigate('add-entry')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">+ Tambah</button>
      </div>
      <div id="entry-list" class="space-y-2"></div>
      <div id="entry-loading" class="text-center text-gray-400 py-8 text-sm hidden">Memuat...</div>
    </section>

    <!-- VIEW: Add Entry -->
    <section id="view-add-entry" class="view hidden-view">
      <button onclick="navigate('entry-list')" class="text-blue-600 text-sm mb-3">&larr; Kembali</button>
      <h2 class="text-lg font-semibold mb-3" id="form-title">Tambah Entry</h2>
      <form id="entry-form" onsubmit="saveEntry(event)" class="space-y-3">
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
          <input type="text" id="field-nama" required autocomplete="off" class="w-full border rounded-lg px-3 py-2 text-sm" oninput="onNamaBarangInput()" onblur="setTimeout(()=>hideSuggestions(),200)">
          <div id="suggestion-box" class="absolute top-full left-0 right-0 bg-white border rounded-lg shadow z-10 hidden max-h-40 overflow-y-auto"></div>
        </div>
        <input type="hidden" id="field-barang-id" value="">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
          <select id="field-kategori" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">-- Pilih / Ketik --</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
          <input type="text" id="field-satuan" required list="satuan-list" class="w-full border rounded-lg px-3 py-2 text-sm">
          <datalist id="satuan-list">
            <option value="meter"><option value="yard"><option value="roll"><option value="pcs"><option value="bungkus"><option value="golong"><option value="set">
          </datalist>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
          <input type="number" id="field-harga" required min="0" class="w-full border rounded-lg px-3 py-2 text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Toko</label>
          <div class="flex gap-2">
            <select id="field-toko" class="flex-1 border rounded-lg px-3 py-2 text-sm">
              <option value="">-- Pilih Toko --</option>
            </select>
            <button type="button" onclick="openTokoModal()" class="bg-green-600 text-white px-3 rounded-lg text-sm">+</button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
          <input type="date" id="field-tanggal" class="w-full border rounded-lg px-3 py-2 text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
          <textarea id="field-catatan" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm"></textarea>
        </div>
        <input type="hidden" id="field-entry-id" value="">
        <div class="flex gap-2">
          <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Simpan</button>
          <button type="button" onclick="deleteEntry()" id="btn-delete" class="bg-red-500 text-white px-4 rounded-lg text-sm hidden">Hapus</button>
        </div>
      </form>
    </section>

    <!-- VIEW: Toko List -->
    <section id="view-toko-list" class="view hidden-view">
      <button onclick="navigate('entry-list')" class="text-blue-600 text-sm mb-3">&larr; Kembali</button>
      <h2 class="text-lg font-semibold mb-3">Daftar Toko</h2>
      <button onclick="openTokoModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm mb-3">+ Tambah Toko</button>
      <div id="toko-list" class="space-y-2"></div>
      <div id="toko-loading" class="text-center text-gray-400 py-8 text-sm hidden">Memuat...</div>
    </section>

    <!-- MODAL: Riwayat Barang -->
    <div id="riwayat-modal" class="fixed inset-0 bg-black/40 hidden items-center justify-center z-20 p-4" onclick="if(event.target===this)closeRiwayat()">
      <div class="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-base" id="riwayat-nama"></h3>
            <span class="text-xs text-gray-500" id="riwayat-kategori"></span>
          </div>
          <button onclick="closeRiwayat()" class="text-gray-400 text-xl">&times;</button>
        </div>
        <div id="riwayat-list" class="p-4 space-y-2"></div>
        <div id="riwayat-loading" class="text-center text-gray-400 py-8 text-sm hidden">Memuat...</div>
      </div>
    </div>

    <!-- MODAL: Toko Form -->
    <div id="toko-modal" class="fixed inset-0 bg-black/40 hidden items-center justify-center z-20 p-4" onclick="if(event.target===this)closeTokoModal()">
      <div class="bg-white rounded-xl w-full max-w-sm p-4">
        <h3 class="font-semibold mb-3" id="toko-modal-title">Tambah Toko</h3>
        <form id="toko-form" onsubmit="saveToko(event)" class="space-y-3">
          <input type="hidden" id="toko-field-id">
          <div><label class="block text-sm font-medium mb-1">Nama Toko</label><input type="text" id="toko-field-nama" required class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Alamat</label><textarea id="toko-field-alamat" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm"></textarea></div>
          <div><label class="block text-sm font-medium mb-1">Kontak</label><input type="text" id="toko-field-kontak" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Simpan</button>
            <button type="button" onclick="closeTokoModal()" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm">Batal</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

---

### Task 3: Buat `app.js` — Init, State & Utilities

**Files:**
- Create: `app.js`

**Interfaces:**
- Produces: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (user mengisi), `supabase` client, `state` object, `navigate()`, `rupiah()` (format harga)

- [ ] **Buka `index.html`, cari `TODO: ganti` ganti dengan credentials dari Supabase**

- [ ] **Tulis `app.js` — init, state, navigasi, format**

```js
// === SUPABASE CONFIG ===
const SUPABASE_URL = 'TODO: ganti dengan Supabase URL';
const SUPABASE_ANON_KEY = 'TODO: ganti dengan Supabase anon key';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === STATE ===
let editingEntryId = null;
let selectedBarangId = null;
let editingTokoId = null;

// === NAVIGATION ===
function navigate(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden-view'));
  document.getElementById('view-' + view).classList.remove('hidden-view');
  if (view === 'entry-list') { loadEntries(); loadFilterOptions(); }
  if (view === 'toko-list') { loadTokoList(); }
  if (view === 'add-entry') { resetForm(); loadFormOptions(); }
}

// === FORMAT ===
function rupiah(n) {
  return new Intl.NumberFormat('id-ID').format(n || 0);
}

// === DATE ===
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
```

- [ ] **Verifikasi load**: buka `index.html` di browser, pastikan tidak ada error JS di console (akan muncul "TODO" error karena SUPABASE_URL belum diisi — itu wajar)

---

### Task 4: Database Layer — Barang CRUD

**Files:**
- Modify: `app.js` (tambah fungsi setelah bagian `// === DATE ===`)

- [ ] **Tambah fungsi DB untuk barang**

```js
// === BARANG DB ===
async function getBarangAll() {
  const { data } = await sb.from('barang').select('*').order('nama');
  return data || [];
}

async function getBarangById(id) {
  const { data } = await sb.from('barang').select('*').eq('id', id).single();
  return data;
}

async function searchBarang(query) {
  if (!query.trim()) return [];
  const { data } = await sb.from('barang')
    .select('*')
    .ilike('nama', `%${query}%`)
    .limit(10);
  return data || [];
}

async function createBarang(nama, kategori) {
  const { data } = await sb.from('barang').insert({ nama, kategori }).select().single();
  return data;
}

async function getKategoriAll() {
  const { data } = await sb.from('barang').select('kategori').not('kategori', 'eq', '');
  const set = new Set((data || []).map(r => r.kategori));
  return [...set].sort();
}

async function getBarangByNama(nama) {
  const { data } = await sb.from('barang').select('*').eq('nama', nama).maybeSingle();
  return data;
}
```

- [ ] **Verifikasi**: buka console browser, ketik `getBarangAll().then(console.log)` — harus return array kosong (tidak error)

---

### Task 5: Database Layer — Toko CRUD

**Files:**
- Modify: `app.js` (tambah setelah fungsi barang)

- [ ] **Tambah fungsi DB untuk toko**

```js
// === TOKO DB ===
async function getTokoAll() {
  const { data } = await sb.from('toko').select('*').order('nama');
  return data || [];
}

async function createToko(nama, alamat, kontak) {
  const { data } = await sb.from('toko').insert({ nama, alamat, kontak }).select().single();
  return data;
}

async function updateToko(id, updates) {
  const { data } = await sb.from('toko').update(updates).eq('id', id).select().single();
  return data;
}

async function deleteToko(id) {
  const { error } = await sb.from('toko').delete().eq('id', id);
  return !error;
}
```

---

### Task 6: Database Layer — Entry Harga CRUD

**Files:**
- Modify: `app.js` (tambah setelah fungsi toko)

- [ ] **Tambah fungsi DB untuk entry harga**

```js
// === ENTRY DB ===
async function getEntries(filters = {}) {
  let query = sb.from('entry_harga')
    .select('*, barang:barang_id(*), toko:toko_id(*)')
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false })
    .limit(100);

  if (filters.barang_id) query = query.eq('barang_id', filters.barang_id);
  if (filters.toko_id) query = query.eq('toko_id', filters.toko_id);

  // search & kategori: filter via barang IDs dulu
  if (filters.search || filters.kategori) {
    let bq = sb.from('barang').select('id');
    if (filters.search) bq = bq.ilike('nama', `%${filters.search}%`);
    if (filters.kategori) bq = bq.eq('kategori', filters.kategori);
    const { data: barangs } = await bq;
    const ids = (barangs || []).map(b => b.id);
    if (ids.length === 0) return [];
    query = query.in('barang_id', ids);
  }

  const { data } = await query;
  return data || [];
}

async function createEntry(data) {
  const { data: result } = await sb.from('entry_harga').insert(data).select().single();
  return result;
}

async function updateEntry(id, data) {
  const { data: result } = await sb.from('entry_harga').update(data).eq('id', id).select().single();
  return result;
}

async function deleteEntryData(id) {
  const { error } = await sb.from('entry_harga').delete().eq('id', id);
  return !error;
}

async function getRiwayat(barangId) {
  const { data } = await sb.from('entry_harga')
    .select('*, toko:toko_id(*)')
    .eq('barang_id', barangId)
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });
  return data || [];
}
```

---

### Task 7: Entry List View — Render & Filter

**Files:**
- Modify: `app.js` (tambah setelah fungsi DB entry)

- [ ] **Tambah fungsi render entry list**

```js
// === ENTRY LIST VIEW ===
async function loadEntries() {
  const container = document.getElementById('entry-list');
  const loading = document.getElementById('entry-loading');
  loading.classList.remove('hidden');
  container.innerHTML = '';

  const search = document.getElementById('search-input').value;
  const kategori = document.getElementById('filter-kategori').value;
  const toko = document.getElementById('filter-toko').value;

  const entries = await getEntries({ search, kategori, toko_id: toko || undefined });
  loading.classList.add('hidden');

  if (entries.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Belum ada data. Klik Tambah untuk mulai.</p>';
    return;
  }

  container.innerHTML = entries.map(e => renderEntryCard(e)).join('');
}

function renderEntryCard(e) {
  const barang = e.barang || {};
  const toko = e.toko || {};
  const isChange = e.tanggal !== todayStr();
  return `
    <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.99] transition" onclick="openRiwayat(${barang.id})">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900">${escHtml(barang.nama)}</div>
          <div class="text-xs text-gray-500 mt-0.5">
            <span class="bg-gray-100 rounded px-1.5 py-0.5">${escHtml(barang.kategori || '-')}</span>
            <span class="ml-1">${escHtml(e.satuan)}</span>
            <span class="ml-1">${escHtml(toko.nama || '-')}</span>
          </div>
        </div>
        <div class="text-right flex-shrink-0 ml-2">
          <div class="font-semibold text-blue-700">Rp${rupiah(e.harga)}</div>
          <div class="text-xs ${isChange ? 'text-yellow-600' : 'text-gray-400'}">${e.tanggal}</div>
        </div>
      </div>
      ${e.catatan ? `<div class="text-xs text-gray-400 mt-1">${escHtml(e.catatan)}</div>` : ''}
    </div>
  `;
}

function escHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
```

- [ ] **Tambah handler filter**

```js
function onSearchChange() {
  debouncedLoadEntries();
}

function onFilterChange() {
  loadEntries();
}

let debounceTimer;
function debouncedLoadEntries() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadEntries, 300);
}
```

- [ ] **Tambah fungsi load filter options (kategori & toko)**

```js
async function loadFilterOptions() {
  const kats = await getKategoriAll();
  const katSelect = document.getElementById('filter-kategori');
  const currentKat = katSelect.value;
  katSelect.innerHTML = '<option value="">Semua Kategori</option>' + kats.map(k => `<option value="${k}">${k}</option>`).join('');
  katSelect.value = currentKat || '';

  const tokos = await getTokoAll();
  const tkSelect = document.getElementById('filter-toko');
  const currentTk = tkSelect.value;
  tkSelect.innerHTML = '<option value="">Semua Toko</option>' + tokos.map(t => `<option value="${t.id}">${escHtml(t.nama)}</option>`).join('');
  tkSelect.value = currentTk || '';
}
```

---

### Task 8: Form Entry — Tambah & Edit

**Files:**
- Modify: `app.js` (tambah setelah fungsi filter)

- [ ] **Tambah fungsi form entry**

```js
// === FORM ENTRY ===
function resetForm() {
  document.getElementById('entry-form').reset();
  document.getElementById('field-entry-id').value = '';
  document.getElementById('field-barang-id').value = '';
  document.getElementById('field-tanggal').value = todayStr();
  document.getElementById('form-title').textContent = 'Tambah Entry';
  document.getElementById('btn-delete').classList.add('hidden');
  editingEntryId = null;
  selectedBarangId = null;
}

async function loadFormOptions() {
  const kats = await getKategoriAll();
  const katSelect = document.getElementById('field-kategori');
  katSelect.innerHTML = '<option value="">-- Pilih / Ketik --</option>' + kats.map(k => `<option value="${k}">${k}</option>`).join('');

  const tokos = await getTokoAll();
  const tkSelect = document.getElementById('field-toko');
  tkSelect.innerHTML = '<option value="">-- Pilih Toko --</option>' + tokos.map(t => `<option value="${t.id}">${escHtml(t.nama)}</option>`).join('');
}

async function saveEntry(e) {
  e.preventDefault();
  const entryId = document.getElementById('field-entry-id').value;
  let barangId = document.getElementById('field-barang-id').value;
  const nama = document.getElementById('field-nama').value.trim();
  const kategori = document.getElementById('field-kategori').value;
  const satuan = document.getElementById('field-satuan').value.trim();
  const harga = parseInt(document.getElementById('field-harga').value);
  const tokoId = document.getElementById('field-toko').value || null;
  const tanggal = document.getElementById('field-tanggal').value;
  const catatan = document.getElementById('field-catatan').value.trim();

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

  const data = { barang_id: barangId, satuan, harga, toko_id: tokoId, tanggal, catatan };

  if (entryId) {
    await updateEntry(parseInt(entryId), data);
  } else {
    await createEntry(data);
  }

  navigate('entry-list');
}

function onNamaBarangInput() {
  selectedBarangId = null;
  document.getElementById('field-barang-id').value = '';
  const query = document.getElementById('field-nama').value.trim();
  if (query.length < 1) { hideSuggestions(); return; }
  searchBarang(query).then(results => {
    const box = document.getElementById('suggestion-box');
    if (results.length === 0) { box.classList.add('hidden'); return; }
    box.innerHTML = results.map(r => `
      <div class="suggestion-item px-3 py-2 cursor-pointer text-sm" data-id="${r.id}" data-nama="${escHtml(r.nama)}" data-kategori="${escHtml(r.kategori)}" onmousedown="selectBarangSuggestion(this)">
        <span class="font-medium">${escHtml(r.nama)}</span>
        ${r.kategori ? `<span class="text-gray-400 text-xs ml-1">${escHtml(r.kategori)}</span>` : ''}
      </div>
    `).join('');
    box.classList.remove('hidden');
  });
}

function selectBarangSuggestion(el) {
  selectedBarangId = parseInt(el.dataset.id);
  document.getElementById('field-barang-id').value = selectedBarangId;
  document.getElementById('field-nama').value = el.dataset.nama;
  const katSelect = document.getElementById('field-kategori');
  if (el.dataset.kategori) katSelect.value = el.dataset.kategori;
  hideSuggestions();
}

function hideSuggestions() {
  document.getElementById('suggestion-box').classList.add('hidden');
}

async function editEntry(entryId) {
  const { data: entry } = await sb.from('entry_harga').select('*, barang:barang_id(*)').eq('id', entryId).single();
  if (!entry) return;

  navigate('add-entry');
  document.getElementById('form-title').textContent = 'Edit Entry';
  document.getElementById('field-entry-id').value = entry.id;
  document.getElementById('field-nama').value = entry.barang.nama;
  document.getElementById('field-barang-id').value = entry.barang_id;
  document.getElementById('field-kategori').value = entry.barang.kategori || '';
  document.getElementById('field-satuan').value = entry.satuan;
  document.getElementById('field-harga').value = entry.harga;
  document.getElementById('field-toko').value = entry.toko_id || '';
  document.getElementById('field-tanggal').value = entry.tanggal;
  document.getElementById('field-catatan').value = entry.catatan || '';
  document.getElementById('btn-delete').classList.remove('hidden');
  editingEntryId = entry.id;
  selectedBarangId = entry.barang_id;
}

async function deleteEntry() {
  const id = document.getElementById('field-entry-id').value;
  if (!id || !confirm('Hapus entry ini?')) return;
  await deleteEntryData(parseInt(id));
  navigate('entry-list');
}
```

- [ ] **Di form `deleteEntry()`:
```js
  await deleteEntryData(parseInt(id));
```

---

### Task 9: Riwayat Barang Modal

**Files:**
- Modify: `app.js` (tambah setelah form entry)

- [ ] **Tambah fungsi riwayat modal**

```js
// === RIWAYAT MODAL ===
async function openRiwayat(barangId) {
  const modal = document.getElementById('riwayat-modal');
  const list = document.getElementById('riwayat-list');
  const loading = document.getElementById('riwayat-loading');
  const nama = document.getElementById('riwayat-nama');
  const kategori = document.getElementById('riwayat-kategori');

  const barang = await getBarangById(barangId);
  nama.textContent = barang.nama;
  kategori.textContent = barang.kategori || '-';

  modal.classList.add('open');
  list.innerHTML = '';
  loading.classList.remove('hidden');

  const entries = await getRiwayat(barangId);
  loading.classList.add('hidden');

  if (entries.length === 0) {
    list.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Belum ada riwayat.</p>';
    return;
  }

  list.innerHTML = entries.map(e => {
    const toko = e.toko || {};
    return `
      <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <div class="text-sm">
          <span class="text-gray-500">${e.tanggal}</span>
          <span class="ml-2 text-gray-700">${escHtml(e.satuan)}</span>
          <span class="ml-1 text-gray-400">${escHtml(toko.nama || '-')}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-semibold text-blue-700">Rp${rupiah(e.harga)}</span>
          <button onclick="editEntry(${e.id})" class="text-xs text-blue-500 hover:underline" title="Edit">✎</button>
        </div>
      </div>
    `;
  }).join('');
}

function closeRiwayat() {
  document.getElementById('riwayat-modal').classList.remove('open');
}
```

---

### Task 10: Toko CRUD View & Modal

**Files:**
- Modify: `app.js` (tambah setelah riwayat modal)

- [ ] **Tambah fungsi toko list & modal**

```js
// === TOKO VIEW ===
async function loadTokoList() {
  const container = document.getElementById('toko-list');
  const loading = document.getElementById('toko-loading');
  loading.classList.remove('hidden');
  container.innerHTML = '';

  const tokos = await getTokoAll();
  loading.classList.add('hidden');

  if (tokos.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Belum ada toko.</p>';
    return;
  }

  container.innerHTML = tokos.map(t => `
    <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      <div class="flex items-start justify-between">
        <div>
          <div class="font-medium text-gray-900">${escHtml(t.nama)}</div>
          ${t.alamat ? `<div class="text-xs text-gray-500 mt-0.5">${escHtml(t.alamat)}</div>` : ''}
          ${t.kontak ? `<div class="text-xs text-gray-500">${escHtml(t.kontak)}</div>` : ''}
        </div>
        <div class="flex gap-1">
          <button onclick="editTokoModal(${t.id})" class="text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50">Edit</button>
          <button onclick="deleteTokoHandler(${t.id})" class="text-red-500 text-xs px-2 py-1 rounded hover:bg-red-50">Hapus</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openTokoModal() {
  editingTokoId = null;
  document.getElementById('toko-form').reset();
  document.getElementById('toko-field-id').value = '';
  document.getElementById('toko-modal-title').textContent = 'Tambah Toko';
  document.getElementById('toko-modal').classList.add('flex');
}

function closeTokoModal() {
  document.getElementById('toko-modal').classList.remove('flex');
}

async function saveToko(e) {
  e.preventDefault();
  const id = document.getElementById('toko-field-id').value;
  const nama = document.getElementById('toko-field-nama').value.trim();
  const alamat = document.getElementById('toko-field-alamat').value.trim();
  const kontak = document.getElementById('toko-field-kontak').value.trim();

  if (id) {
    await updateToko(parseInt(id), { nama, alamat, kontak });
  } else {
    await createToko(nama, alamat, kontak);
  }

  closeTokoModal();
  loadTokoList();
}

async function editTokoModal(id) {
  editingTokoId = id;
  const { data: toko } = await sb.from('toko').select('*').eq('id', id).single();
  if (!toko) return;
  document.getElementById('toko-field-id').value = toko.id;
  document.getElementById('toko-field-nama').value = toko.nama;
  document.getElementById('toko-field-alamat').value = toko.alamat || '';
  document.getElementById('toko-field-kontak').value = toko.kontak || '';
  document.getElementById('toko-modal-title').textContent = 'Edit Toko';
  document.getElementById('toko-modal').classList.add('flex');
}

async function deleteTokoHandler(id) {
  if (!confirm('Hapus toko ini?')) return;
  const { data: refs } = await sb.from('entry_harga').select('id').eq('toko_id', id).limit(1);
  if (refs && refs.length > 0) {
    alert('Tidak bisa hapus: masih ada entry harga yang menggunakan toko ini.');
    return;
  }
  await deleteToko(id);
  loadTokoList();
}
```

---

### Task 11: Inisialisasi Awal

**Files:**
- Modify: `app.js` (tambah di akhir file)

- [ ] **Tambah inisialisasi di akhir `app.js`**

```js
// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  navigate('entry-list');
});
```

---

### Task 12: Test Final & Petunjuk Hosting

- [ ] **Test seluruh flow di browser**:
  1. Buka `index.html` (URL dari live-server atau langsung file)
  2. Tambah toko
  3. Tambah entry harga dengan berbagai satuan
  4. Cek filter & search
  5. Klik nama barang → lihat riwayat
  6. Edit entry
  7. Hapus entry

- [ ] **Buat file README.md** (opsional — petunjuk hosting)

- [ ] **Catatan hosting:** user perlu:
  - Push ke GitHub repo
  - Buka vercel.com → Import repo → Environment variables: tidak perlu (key di-hardcode di index.html untuk v1)
  - Deploy, selesai
