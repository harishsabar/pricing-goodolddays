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

CREATE POLICY "Public access to barang" ON barang FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to toko" ON toko FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to entry_harga" ON entry_harga FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_entry_harga_barang_id ON entry_harga(barang_id);
CREATE INDEX IF NOT EXISTS idx_entry_harga_toko_id ON entry_harga(toko_id);

ALTER TABLE entry_harga ADD CONSTRAINT chk_harga_positive CHECK (harga >= 0);
