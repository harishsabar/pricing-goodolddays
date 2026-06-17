-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel barang
CREATE TABLE IF NOT EXISTS barang (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT ''
);

-- Tabel kategori
CREATE TABLE IF NOT EXISTS kategori (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE
);

-- Migrasi: pindah kategori text ke tabel kategori (re-runnable)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='barang' AND column_name='kategori'
  ) THEN
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

    ALTER TABLE barang DROP COLUMN IF EXISTS kategori;
  END IF;
END $$;

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

DROP POLICY IF EXISTS "Public access to barang" ON barang;
CREATE POLICY "Public access to barang" ON barang FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public access to toko" ON toko;
CREATE POLICY "Public access to toko" ON toko FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public access to entry_harga" ON entry_harga;
CREATE POLICY "Public access to entry_harga" ON entry_harga FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to kategori" ON kategori;
CREATE POLICY "Public access to kategori" ON kategori FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_entry_harga_barang_id ON entry_harga(barang_id);
CREATE INDEX IF NOT EXISTS idx_entry_harga_toko_id ON entry_harga(toko_id);

ALTER TABLE entry_harga ADD CONSTRAINT chk_harga_positive CHECK (harga >= 0);
