# Sistem Pengaduan & Aspirasi Masyarakat (SpamApp)

Aplikasi mobile berbasis **React Native Expo** yang memudahkan masyarakat untuk melaporkan masalah infrastruktur, pelayanan publik, dan kejadian lainnya kepada pihak berwenang. Aplikasi ini mendukung pelaporan berbasis lokasi (GPS) dan bukti foto real-time.

## 🚀 Fitur Utama

Aplikasi ini memiliki sistem **Multi-Role** yang membagi akses pengguna menjadi tiga:

### 1. Masyarakat (Pelapor)

- **Buat Laporan**: Melaporkan kejadian dengan kategori spesifik (Infrastruktur, Kebersihan, Keamanan, dll).
- **Bukti Valid**: Wajib menyertakan foto dan lokasi (koordinat GPS & alamat otomatis).
- **Pantau Status**: Melihat riwayat laporan dan status penanganannya secara real-time.
- **Notifikasi Visual**: Status laporan dibedakan dengan warna (Pending, Proses, Selesai, Ditolak).
- **Rating & Ulasan**: Memberikan penilaian bintang (1-5) dan ulasan kinerja petugas setelah laporan selesai ditangani.

### 2. Petugas (Eksekutor)

- **Dashboard Tugas**: Melihat daftar tugas yang diberikan oleh Admin.
- **Navigasi Lokasi**: Tombol langsung untuk membuka Google Maps/Waze menuju lokasi laporan.
- **Update Progress**: Mengubah status laporan menjadi "Sedang Dikerjakan" dan "Selesai".
- **Bukti Penyelesaian**: Mengupload foto bukti penanganan dan catatan penyelesaian.
- **Riwayat**: Melihat daftar pekerjaan yang telah diselesaikan beserta rating dari masyarakat.

### 3. Admin (Verifikator)

- **Verifikasi Laporan**: Memvalidasi laporan masuk (Terima/Tolak).
- **Delegasi Tugas**: Menugaskan laporan yang valid kepada Petugas yang tersedia.
- **Monitoring**: Memantau statistik laporan (Total, Pending, Proses, Selesai).
- **Export Laporan**: Mengunduh rekap laporan dalam format PDF berdasarkan filter status.
- **Manajemen Kategori**: Mendukung 7 kategori standar pelaporan.

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) dengan [Expo SDK 50+](https://expo.dev/)
- **Bahasa**: TypeScript
- **Routing**: [Expo Router v3](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (untuk foto laporan)
  - **Maps**: Expo Location & Geocoding
- **PDF**: Expo Print & Sharing

## 📂 Struktur Project

```
app/
├── (admin)/        # Halaman khusus Admin
├── (masyarakat)/   # Halaman khusus Masyarakat
├── (petugas)/      # Halaman khusus Petugas
├── (auth)/         # Halaman Login/Register
components/         # Komponen UI reusable (Card, Input, Toast)
constants/          # Warna, Tema, dan Konfigurasi
hooks/              # Custom Hooks (useAuth, useToast)
lib/                # Konfigurasi Supabase & Helper functions
supabase/           # SQL Migrations & Seeds
types/              # TypeScript Interfaces (Database Types)
```

## ⚙️ Instalasi & Setup

1. **Clone Repository**

   ```bash
   git clone https://github.com/username/spam-app.git
   cd spam-app
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   Buat file `.env` di root project dan isi dengan kredensial Supabase Anda:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Setup Database (Supabase)**
   Jalankan script SQL yang ada di folder `supabase/migrations/` melalui SQL Editor di dashboard Supabase Anda untuk membuat tabel dan policy keamanan (RLS).
   - Pastikan tabel `profiles`, `pengaduan`, dan `kategori_pengaduan` sudah terbuat.
   - Jalankan `fix_categories.sql` untuk inisialisasi kategori standar.
   - Jalankan `add_rating_column.sql` untuk menambahkan fitur rating.
   - Jalankan `allow_rating_update.sql` untuk izin update rating.

5. **Jalankan Aplikasi**

   ```bash
   npx expo start
   ```

   - Scan QR code dengan aplikasi **Expo Go** (Android/iOS).
   - Atau tekan `a` untuk membuka di Android Emulator.

## 📝 Kategori Pelaporan

Aplikasi ini mendukung 7 kategori standar:

1. Infrastruktur (Jalan/Jembatan)
2. Kebersihan & Sampah
3. Keamanan & Ketertiban
4. Pelayanan Publik
5. Kesehatan
6. Bencana Alam
7. Lainnya

## 📄 Lisensi

Project ini dibuat untuk tujuan edukasi dan pengembangan sistem layanan publik.
