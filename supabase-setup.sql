-- ============================================
-- SETUP DATABASE ABSENSI RESTORAN
-- Jalankan script ini di SQL Editor Supabase
-- ============================================

-- 0. Drop tabel lama jika ada (RESET DATABASE)
DROP TABLE IF EXISTS perizinan CASCADE;
DROP TABLE IF EXISTS riwayat_absen CASCADE;
DROP TABLE IF EXISTS cabang CASCADE;

-- 1. Buat tabel cabang
CREATE TABLE cabang (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meter INTEGER DEFAULT 50,
  password_admin VARCHAR(255) NOT NULL,
  shift_1_start TIME DEFAULT '08:00:00',
  shift_1_end TIME DEFAULT '16:00:00',
  shift_2_start TIME DEFAULT '16:00:00',
  shift_2_end TIME DEFAULT '23:59:59',
  shift_mid_start TIME DEFAULT '11:00:00',
  shift_mid_end TIME DEFAULT '19:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Buat tabel riwayat_absen
CREATE TABLE riwayat_absen (
  id SERIAL PRIMARY KEY,
  nama_karyawan VARCHAR(100) NOT NULL,
  cabang_id INTEGER REFERENCES cabang(id),
  cabang_nama VARCHAR(100) NOT NULL,
  shift VARCHAR(20) NOT NULL,
  foto_url TEXT NOT NULL,
  jarak_meter DECIMAL(10, 2) NOT NULL,
  status_validasi VARCHAR(20) NOT NULL,
  waktu_absen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_telat BOOLEAN DEFAULT false,
  menit_telat INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Buat tabel perizinan (cuti/sakit/izin)
CREATE TABLE perizinan (
  id SERIAL PRIMARY KEY,
  nama_karyawan VARCHAR(100) NOT NULL,
  cabang_id INTEGER REFERENCES cabang(id),
  cabang_nama VARCHAR(100) NOT NULL,
  jenis_izin VARCHAR(50) NOT NULL, -- 'Cuti', 'Sakit', 'Izin', 'Lainnya'
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  alasan TEXT,
  status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  foto_bukti_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Buat storage bucket untuk foto absen
-- Jalankan ini di Supabase Storage tab atau gunakan SQL:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('foto-absen', 'foto-absen', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Atur RLS (Row Level Security) policies
ALTER TABLE cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_absen ENABLE ROW LEVEL SECURITY;
ALTER TABLE perizinan ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist
DROP POLICY IF EXISTS "Public read cabang" ON cabang;
DROP POLICY IF EXISTS "Public read riwayat_absen" ON riwayat_absen;
DROP POLICY IF EXISTS "Public insert riwayat_absen" ON riwayat_absen;
DROP POLICY IF EXISTS "Public read perizinan" ON perizinan;
DROP POLICY IF EXISTS "Public insert perizinan" ON perizinan;
DROP POLICY IF EXISTS "Public update perizinan" ON perizinan;
DROP POLICY IF EXISTS "Public read foto-absen" ON storage.objects;
DROP POLICY IF EXISTS "Public upload foto-absen" ON storage.objects;

-- Policy untuk cabang (public read untuk dropdown)
CREATE POLICY "Public read cabang" ON cabang
  FOR SELECT USING (true);

-- Policy untuk riwayat_absen (public read untuk admin, public insert untuk absensi)
CREATE POLICY "Public read riwayat_absen" ON riwayat_absen
  FOR SELECT USING (true);

CREATE POLICY "Public insert riwayat_absen" ON riwayat_absen
  FOR INSERT WITH CHECK (true);

-- Policy untuk perizinan (public read untuk admin, public insert untuk request, public update untuk approve/reject)
CREATE POLICY "Public read perizinan" ON perizinan
  FOR SELECT USING (true);

CREATE POLICY "Public insert perizinan" ON perizinan
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update perizinan" ON perizinan
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Policy untuk storage bucket (public read, public upload)
CREATE POLICY "Public read foto-absen" ON storage.objects
  FOR SELECT USING (bucket_id = 'foto-absen');

CREATE POLICY "Public upload foto-absen" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'foto-absen');

-- 5. Insert data contoh cabang (HAPUS jika tidak perlu)
INSERT INTO cabang (nama, latitude, longitude, radius_meter, password_admin, shift_1_start, shift_1_end, shift_2_start, shift_2_end, shift_mid_start, shift_mid_end) VALUES
  ('Cabang Pusat', -7.5532112, 110.7981296, 200, 'admin123', '08:00:00', '16:00:00', '16:00:00', '23:59:59', '11:00:00', '19:00:00'),
  ('Cabang Selatan', -6.2250, 106.8000, 200, 'admin456', '08:00:00', '16:00:00', '16:00:00', '23:59:59', '11:00:00', '19:00:00'),
  ('Cabang Utara', -6.1800, 106.9000, 200, 'admin789', '08:00:00', '16:00:00', '16:00:00', '23:59:59', '11:00:00', '19:00:00')
ON CONFLICT DO NOTHING;

-- 6. Buat index untuk performa
CREATE INDEX IF NOT EXISTS idx_riwayat_absen_cabang_id ON riwayat_absen(cabang_id);
CREATE INDEX IF NOT EXISTS idx_riwayat_absen_created_at ON riwayat_absen(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_riwayat_absen_shift ON riwayat_absen(shift);

-- ============================================
-- CATATAN PENTING:
-- ============================================
-- 1. Pastikan URL dan ANON KEY Supabase sudah di-set di .env.local
-- 2. Koordinat GPS di atas adalah contoh (Jakarta), ganti dengan lokasi restoran Anda
-- 3. Password admin di atas adalah contoh, ganti dengan password yang aman
-- 4. Untuk Super Admin, gunakan password: superadmin123 (hardcoded di aplikasi)
-- 5. Pastikan storage bucket 'foto-absen' sudah dibuat dan public
-- ============================================
