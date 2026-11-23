# SIASAT v2.0 — Sistem Informasi Akademik Satya Wacana

Aplikasi manajemen akademik perguruan tinggi fullstack berbasis web yang mengimplementasikan spesifikasi `SRS_SIASAT_v2.0.md`, mencakup autentikasi berbasis peran (Admin Akademik, Dosen, Mahasiswa), pengisian dan konfirmasi KRS transaksional, penjadwalan, presensi per sesi kelas, penilaian dengan publikasi terverifikasi, transkrip & IPK kumulatif, serta audit log.

## Stack Teknologi

- **Frontend:** React 18, Vite 5, React Router v6, Tailwind CSS (tema *Soft Daylight & Airy White*), Axios, Lucide React
- **Backend:** PHP 8.2+, Laravel 12 REST API, Laravel Sanctum (Bearer Token Auth), PHPUnit 11
- **Database:** MySQL 8.4 (InnoDB, penyimpanan timestamp UTC, evaluasi window KRS zona waktu `Asia/Jakarta`)

## Struktur Folder

```text
TAS_PBP/
├── backend/              # REST API Laravel 12, migrasi, seeder, & PHPUnit acceptance tests
├── frontend/             # SPA React 18 + Vite + Tailwind CSS
├── scripts/              # Skrip uji concurrency paralel (AT-05/NFR-05) & backup/restore MySQL (NFR-14)
├── docs/
│   └── ui-spec.md        # Spesifikasi desain antarmuka Soft Daylight & Airy White
├── SRS_SIASAT_v2.0.md    # Dokumen Software Requirements Specification v2.0
└── README.md             # Dokumentasi setup, akun demo, pengujian, dan build
```

## Prasyarat & Setup MySQL (WampServer)

1. Pastikan layanan **MySQL 8.4** di WampServer aktif pada `127.0.0.1:3306` (`user: root`, `password` kosong sesuai konfigurasi default lokal).
2. Buat dua database InnoDB (`utf8mb4_unicode_ci`) melalui phpMyAdmin atau MySQL CLI:

```sql
CREATE DATABASE IF NOT EXISTS siasat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS siasat_db_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

- `siasat_db`: database utama aplikasi (development/demo).
- `siasat_db_test`: database terisolasi yang digunakan oleh PHPUnit (`backend/phpunit.xml`).

## Setup & Menjalankan Backend

```powershell
cd backend
copy .env.example .env
composer install
php artisan key:generate
```

Buka `backend/.env` dan pastikan kredensial database serta akun admin awal sudah diisi (minimal atur `INITIAL_ADMIN_PASSWORD`, misalnya `AdminSiasat123!`, karena `InitialSeeder` mewajibkannya):

```env
DB_DATABASE=siasat_db
DB_USERNAME=root
DB_PASSWORD=

INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=AdminSiasat123!
```

Jalankan migrasi, seeder (`InitialSeeder` + `DemoSeeder`), lalu nyalakan server backend:

```powershell
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```

API backend berjalan di `http://127.0.0.1:8000/api`.

## Setup & Menjalankan Frontend

Buka terminal baru:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Aplikasi frontend berjalan di `http://localhost:5173` (terhubung ke `VITE_API_URL=http://127.0.0.1:8000/api`).

## Daftar Akun Demo

Tersedia otomatis setelah menjalankan `php artisan migrate --seed` (dengan `INITIAL_ADMIN_PASSWORD=AdminSiasat123!`):

| Peran | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| Admin Akademik | `admin` | `AdminSiasat123!` | Manajemen master data, kelas, sesi, transkrip, & audit log |
| Dosen | `dosen1` | `password123` | Dr. Hendra Wijaya (IF201 Basis Data A/B, IF204 RPL A) |
| Dosen | `dosen2` | `password123` | Prof. Ratna Sari (IF202 PBP A/B, IF203 Jaringan Komputer A) |
| Mahasiswa | `student1` | `password123` | Budi Santoso — KRS terkonfirmasi (Basis Data A & PBP B) |
| Mahasiswa | `student2` | `password123` | Siti Aminah — KRS terkonfirmasi (Basis Data B) |
| Mahasiswa | `student3` | `password123` | Andi Pratama — belum KRS |
| Mahasiswa | `student4` | `password123` | Dewi Lestari — belum KRS |
| Mahasiswa | `student5` | `password123` | Rizky Ramadhan — belum KRS |

## Automated Acceptance Tests (AT-01 s.d. AT-09)

Pastikan database `siasat_db_test` sudah dibuat di MySQL, lalu jalankan:

```powershell
cd backend
php artisan test --filter=SiasatAcceptanceTest
```

Untuk menjalankan seluruh test suite backend:

```powershell
cd backend
php artisan test
```

## Production Build Frontend

```powershell
cd frontend
npm run build
```

Hasil build produksi akan tersimpan di `frontend/dist/`.

## Pengujian Concurrency Paralel (AT-05 & NFR-05)

Skrip `scripts/test-concurrency.mjs` (Node.js ESM tanpa dependensi eksternal) menguji transaksi paralel secara nyata:
- **AT-05:** `student3` dan `student4` memperebutkan 1 kursi terakhir kelas `IF203 Jaringan Komputer A` (`29/30`) secara simultan — tepat 1 berhasil (`200 confirmed`), 1 ditolak (`409 CLASS_QUOTA_FULL`), dan `enrolled_count` akhir tetap `30/30`.
- **NFR-02 & NFR-05:** 50 request presensi paralel oleh `student1` pada Sesi #1 `IF201 Basis Data A` — seluruh request sukses (`1x 201` + `49x 200`, nol error), mengembalikan `id` dan `recorded_at` identik, serta tercatat tepat 1 baris pada rekap dosen.

Jalankan 2 instance Laravel secara paralel di dua terminal terpisah (karena PHP built-in server bersifat single-threaded):

```powershell
# Terminal 1
cd backend
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2
cd backend
php artisan serve --host=127.0.0.1 --port=8001
```

Lalu jalankan skrip uji dari root proyek (flag `--reset` menjalankan `php artisan migrate:fresh --seed` sebelum tes):

```powershell
node scripts/test-concurrency.mjs --reset --urls=http://127.0.0.1:8000,http://127.0.0.1:8001
```

## Backup & Restore Database (NFR-14)

Skrip PowerShell di folder `scripts/` otomatis mendeteksi `mysqldump.exe` dan `mysql.exe` dari instalasi WampServer (`C:\wamp64\bin\mysql\mysql*\bin\`) serta membaca kredensial database dari `backend\.env`.

- **Backup manual** (menyimpan ke `backups\siasat_db_YYYYMMDD_HHmmss.sql` dan otomatis menghapus file backup lebih dari **7 hari**):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
```

- **Restore database** (tanpa `-BackupFile` akan memilih file `.sql` terbaru di `backups\`; tambahkan `-Force` untuk melewati konfirmasi interaktif):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\restore.ps1 -BackupFile .\backups\siasat_db_20261120_163000.sql -Force
```

- **Jadwal Backup Harian Otomatis (Windows Task Scheduler, setiap hari pukul 02:00)**:

```powershell
schtasks /Create /SC DAILY /TN "SIASAT_Daily_MySQL_Backup" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"D:\01_Kuliah\TAS_PBP\scripts\backup.ps1\"" /ST 02:00 /F
```
