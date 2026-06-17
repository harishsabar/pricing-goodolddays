// === SUPABASE CONFIG ===
const SUPABASE_URL = 'https://lnqtnmlzmtdfyhyzlrny.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucXRubWx6bXRkZnloeXpscm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODkxNTQsImV4cCI6MjA5NzI2NTE1NH0.-YsZXjwUE-VsSI6Xq3dL-2ZqvvNhKzKjP9RpO3Z09G4';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === AUTH ===
const STATIC_USER = { username: 'admin', password: 'admin123' };

function login(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  if (username === STATIC_USER.username && password === STATIC_USER.password) {
    localStorage.setItem('auth', 'true');
    errorEl.classList.add('hidden');
    navigate('entry-list');
  } else {
    errorEl.textContent = 'Username atau password salah';
    errorEl.classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('auth');
  navigate('login');
}

// === STATE ===
let selectedBarangId = null;
let typeaheadTimer;

// === NAVIGATION ===
function navigate(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById('view-' + view).classList.remove('hidden');

  const isLogin = view === 'login';
  document.getElementById('main-nav').classList.toggle('hidden', isLogin);
  document.getElementById('btn-logout').classList.toggle('hidden', isLogin);

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
  try {
    const { data } = await sb.from('barang').select('*').order('nama');
    return data || [];
  } catch (err) {
    console.error('getBarangAll error:', err);
    return [];
  }
}

async function getBarangById(id) {
  try {
    const { data } = await sb.from('barang').select('*').eq('id', id).single();
    return data;
  } catch (err) {
    console.error('getBarangById error:', err);
    return null;
  }
}

async function searchBarang(query) {
  try {
    if (!query.trim()) return [];
    const { data } = await sb.from('barang')
      .select('*')
      .ilike('nama', `%${query}%`)
      .limit(10);
    return data || [];
  } catch (err) {
    console.error('searchBarang error:', err);
    return [];
  }
}

async function createBarang(nama, kategori) {
  try {
    const { data } = await sb.from('barang').insert({ nama, kategori }).select().single();
    return data;
  } catch (err) {
    console.error('createBarang error:', err);
    return null;
  }
}

async function getKategoriAll() {
  try {
    const { data } = await sb.from('barang').select('kategori').not('kategori', 'eq', '');
    const set = new Set((data || []).map(r => r.kategori));
    return [...set].sort();
  } catch (err) {
    console.error('getKategoriAll error:', err);
    return [];
  }
}

async function getBarangByNama(nama) {
  try {
    const { data } = await sb.from('barang').select('*').eq('nama', nama).maybeSingle();
    return data;
  } catch (err) {
    console.error('getBarangByNama error:', err);
    return null;
  }
}

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

// === TOKO DB ===
async function getTokoAll() {
  try {
    const { data } = await sb.from('toko').select('*').order('nama');
    return data || [];
  } catch (err) {
    console.error('getTokoAll error:', err);
    return [];
  }
}

async function createToko(nama, alamat, kontak) {
  try {
    const { data } = await sb.from('toko').insert({ nama, alamat, kontak }).select().single();
    return data;
  } catch (err) {
    console.error('createToko error:', err);
    return null;
  }
}

async function updateToko(id, updates) {
  try {
    const { data } = await sb.from('toko').update(updates).eq('id', id).select().single();
    return data;
  } catch (err) {
    console.error('updateToko error:', err);
    return null;
  }
}

async function deleteToko(id) {
  try {
    const { error } = await sb.from('toko').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('deleteToko error:', err);
    return false;
  }
}

// === ENTRY DB ===
async function getEntries(filters = {}) {
  try {
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
  } catch (err) {
    console.error('getEntries error:', err);
    return [];
  }
}

async function createEntry(data) {
  try {
    const { data: result } = await sb.from('entry_harga').insert(data).select().single();
    return result;
  } catch (err) {
    console.error('createEntry error:', err);
    return null;
  }
}

async function updateEntry(id, data) {
  try {
    const { data: result } = await sb.from('entry_harga').update(data).eq('id', id).select().single();
    return result;
  } catch (err) {
    console.error('updateEntry error:', err);
    return null;
  }
}

async function deleteEntryData(id) {
  try {
    const { error } = await sb.from('entry_harga').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('deleteEntryData error:', err);
    return false;
  }
}

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

// === ENTRY LIST VIEW ===
async function loadEntries() {
  try {
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
  } catch (err) {
    alert('Gagal memuat data: ' + err.message);
  }
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
  try {
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
  } catch (err) {
    alert('Gagal memuat filter: ' + err.message);
  }
}

// === FORM ENTRY ===
function resetForm() {
  document.getElementById('entry-form').reset();
  document.getElementById('field-entry-id').value = '';
  document.getElementById('field-barang-id').value = '';
  document.getElementById('field-tanggal').value = todayStr();
  document.getElementById('form-title').textContent = 'Tambah Entry';
  document.getElementById('btn-delete').classList.add('hidden');
  selectedBarangId = null;
}

async function loadFormOptions() {
  try {
    const kats = await getKategoriAll();
    const katSelect = document.getElementById('field-kategori');
    katSelect.innerHTML = '<option value="">-- Pilih / Ketik --</option>' + kats.map(k => `<option value="${k}">${k}</option>`).join('');

    const tokos = await getTokoAll();
    const tkSelect = document.getElementById('field-toko');
    tkSelect.innerHTML = '<option value="">-- Pilih Toko --</option>' + tokos.map(t => `<option value="${t.id}">${escHtml(t.nama)}</option>`).join('');
  } catch (err) {
    alert('Gagal memuat form: ' + err.message);
  }
}

async function saveEntry(e) {
  e.preventDefault();
  const btn = document.querySelector('#entry-form button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  try {
    const entryId = document.getElementById('field-entry-id').value;
    let barangId = document.getElementById('field-barang-id').value;
    const nama = document.getElementById('field-nama').value.trim();
    const kategori = document.getElementById('field-kategori').value;
    const satuan = document.getElementById('field-satuan').value.trim();
    const hargaVal = Number(document.getElementById('field-harga').value);
    const harga = isNaN(hargaVal) ? 0 : hargaVal;
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
      await updateEntry(Number(entryId), data);
    } else {
      await createEntry(data);
    }

    navigate('entry-list');
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}

function onNamaBarangInput() {
  clearTimeout(typeaheadTimer);
  typeaheadTimer = setTimeout(() => {
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
  }, 300);
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
  try {
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
    selectedBarangId = entry.barang_id;
  } catch (err) {
    alert('Gagal memuat entry: ' + err.message);
  }
}

async function deleteEntry() {
  try {
    const id = document.getElementById('field-entry-id').value;
    if (!id || !confirm('Hapus entry ini?')) return;
    await deleteEntryData(Number(id));
    navigate('entry-list');
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

// === RIWAYAT MODAL ===
async function openRiwayat(barangId) {
  try {
    const modal = document.getElementById('riwayat-modal');
    const list = document.getElementById('riwayat-list');
    const loading = document.getElementById('riwayat-loading');
    const nama = document.getElementById('riwayat-nama');
    const kategori = document.getElementById('riwayat-kategori');

    const barang = await getBarangById(barangId);
    if (!barang) return;
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
  } catch (err) {
    alert('Gagal memuat riwayat: ' + err.message);
  }
}

function closeRiwayat() {
  document.getElementById('riwayat-modal').classList.remove('open');
}

// === TOKO VIEW ===
async function loadTokoList() {
  try {
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
  } catch (err) {
    alert('Gagal memuat toko: ' + err.message);
  }
}

function openTokoModal() {
  document.getElementById('toko-form').reset();
  document.getElementById('toko-field-id').value = '';
  document.getElementById('toko-modal-title').textContent = 'Tambah Toko';
  document.getElementById('toko-modal').classList.remove('hidden');
  document.getElementById('toko-modal').classList.add('flex');
}

function closeTokoModal() {
  document.getElementById('toko-modal').classList.remove('flex');
  document.getElementById('toko-modal').classList.add('hidden');
}

async function saveToko(e) {
  e.preventDefault();
  try {
    const id = document.getElementById('toko-field-id').value;
    const nama = document.getElementById('toko-field-nama').value.trim();
    const alamat = document.getElementById('toko-field-alamat').value.trim();
    const kontak = document.getElementById('toko-field-kontak').value.trim();

    if (id) {
      await updateToko(Number(id), { nama, alamat, kontak });
    } else {
      await createToko(nama, alamat, kontak);
    }

    closeTokoModal();
    loadTokoList();
  } catch (err) {
    alert('Gagal menyimpan toko: ' + err.message);
  }
}

async function editTokoModal(id) {
  try {
    const { data: toko } = await sb.from('toko').select('*').eq('id', id).single();
    if (!toko) return;
    document.getElementById('toko-field-id').value = toko.id;
    document.getElementById('toko-field-nama').value = toko.nama;
    document.getElementById('toko-field-alamat').value = toko.alamat || '';
    document.getElementById('toko-field-kontak').value = toko.kontak || '';
    document.getElementById('toko-modal-title').textContent = 'Edit Toko';
    document.getElementById('toko-modal').classList.add('flex');
  } catch (err) {
    alert('Gagal memuat toko: ' + err.message);
  }
}

async function deleteTokoHandler(id) {
  try {
    if (!confirm('Hapus toko ini?')) return;
    const { data: refs } = await sb.from('entry_harga').select('id').eq('toko_id', id).limit(1);
    if (refs && refs.length > 0) {
      alert('Tidak bisa hapus: masih ada entry harga yang menggunakan toko ini.');
      return;
    }
    await deleteToko(id);
    loadTokoList();
  } catch (err) {
    alert('Gagal menghapus toko: ' + err.message);
  }
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', login);

  if (localStorage.getItem('auth')) {
    navigate('entry-list');
  } else {
    navigate('login');
  }
});
