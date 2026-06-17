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
