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
