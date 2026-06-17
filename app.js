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
