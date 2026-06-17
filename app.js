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
