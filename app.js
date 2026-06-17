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
