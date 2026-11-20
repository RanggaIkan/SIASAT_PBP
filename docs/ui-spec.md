# SIASAT — UI/UX & Component Contract

Stack: React 18 + Vite + React Router v6 + Tailwind CSS + Axios + Lucide React.
Sumber normatif: `SRS_SIASAT_v2.0.md` (Bab 2.5, 3, 7.1, 8, Lampiran B). Semua label UI = Bahasa Indonesia baku.
Konsumen: `@frontend-core` (theme, `components/ui`, layout, auth, routing, API client, admin pages) · `@frontend-academic` (student & lecturer pages).

---

## 1. Theme — Soft Daylight & Airy White

**DILARANG**: sidebar/topbar gelap atau navy, hitam `#000`, warna primer jenuh (merah/biru/hijau murni), `shadow-lg+`, `rounded-none`.

### 1.1 Tailwind config (`tailwind.config.js`)
```js
theme: { extend: {
  fontFamily: {
    heading: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
    sans:    ['Inter', 'ui-sans-serif', 'sans-serif'],
    mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
  },
  colors: { ink: '#1E293B', muted: '#64748B' },
}}
```
`index.html` load Google Fonts: Plus Jakarta Sans 600/700, Inter 400/500/600, JetBrains Mono 400/500. `body` = `font-sans text-[#1E293B] bg-slate-50 antialiased`. `h1-h3` = `font-heading font-semibold`.

### 1.2 Token table
| Elemen | Class |
|---|---|
| Sidebar & Topbar | `bg-white border-slate-200` (sidebar `border-r`, topbar `border-b`) |
| Canvas | `bg-slate-50` (`#F8FAFC`) |
| Card / Panel / Modal / Table wrapper | `bg-white rounded-2xl border border-slate-200 shadow-sm` |
| Teks utama / sekunder | `text-[#1E293B]` / `text-[#64748B]` |
| Menu sidebar aktif | `bg-[#EEF2FF] text-[#4338CA] rounded-xl font-semibold` + dot `h-1.5 w-1.5 rounded-full bg-[#4F46E5]` di kanan |
| Menu sidebar idle | `text-[#64748B] hover:bg-slate-50 hover:text-[#1E293B] rounded-xl` |
| Input / Select | `h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]`; error: `border-[#FECDD3]` + helper `text-[#BE123C] text-xs` |
| Table | `thead bg-slate-50 text-[#64748B] text-xs uppercase tracking-wide`; `tbody divide-y divide-slate-100`; `tr:hover bg-slate-50/60`; wrapper `overflow-x-auto` |
| Focus ring (semua interaktif) | `focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40` |
| Kode akademik | `font-mono text-[13px]` untuk NIM (`student_number`), NIDN (`lecturer_number`), `course_code`, `room`, jam (`HH:mm`), `class_code` |

### 1.3 Status pill palette (`rounded-full border px-2.5 py-0.5 text-xs font-medium inline-flex items-center gap-1.5`)
| Tone | Class | Dot |
|---|---|---|
| `emerald` | `bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]` | `bg-[#10B981]` |
| `amber`   | `bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]` | `bg-[#F59E0B]` |
| `rose`    | `bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]` | `bg-[#F43F5E]` |
| `slate` (netral, hanya info non-status) | `bg-slate-50 text-[#64748B] border-slate-200` | `bg-slate-400` |

Wajib dot (`h-1.5 w-1.5 rounded-full`) **atau** ikon Lucide + label teks (warna bukan satu-satunya penanda).

---

## 2. Shared Components — `frontend/src/components/ui/`
Export via `components/ui/index.js`. Semua named export + default JSX function component, props di-`JSDoc`.

### 2.1 `StatusBadge`
```jsx
<StatusBadge type="studyPlan|session|attendance|published|active|custom" value={...} />
// custom: <StatusBadge tone="emerald|amber|rose|slate" label="Bentrok Jadwal" icon={AlertTriangle?} />
```
Pemetaan **eksak** (tak ada fallback ke teks mentah; nilai tak dikenal → `slate` + `String(value)`):

| `type` | `value` | Label | Tone |
|---|---|---|---|
| `studyPlan` | `confirmed` | `Terkonfirmasi` | emerald |
| `studyPlan` | `draft` | `Draft` | amber |
| `session` (`attendance_status`) | `not_opened` | `Belum dibuka` | amber |
| `session` | `open` | `Terbuka` | emerald |
| `session` | `closed` | `Ditutup` | rose |
| `attendance` | `present` | `Hadir` | emerald |
| `attendance` | `excused` | `Izin` | amber |
| `attendance` | `sick` | `Sakit` | amber |
| `attendance` | `absent` | `Alpa` | rose |
| `attendance` | `null`/`undefined`/`unrecorded` | `Belum mengisi` | amber |
| `published` (`is_published`) | `true` | `Terpublikasi` | emerald |
| `published` | `false` | `Belum Dipublikasikan` | amber |
| `active` (`is_active`) | `true` | `Aktif` | emerald |
| `active` | `false` | `Nonaktif` | rose |

Preset tag custom (konstanta `BADGE_PRESETS`): `QUOTA_FULL` → `Kuota Penuh` rose · `SCHEDULE_CONFLICT` → `Bentrok Jadwal` rose · `DUPLICATE_COURSE` → `MK Ganda` rose · `SELECTED` → `Dipilih` emerald · `KRS_OPEN` → `KRS Terbuka` emerald · `KRS_NOT_OPEN` → `KRS Belum Dibuka` amber · `KRS_CLOSED` → `KRS Ditutup` rose · `LAST_SEAT` → `Sisa 1 Kursi` amber.
Jika respons API menyertakan `status_label`, UI tetap memakai tabel di atas (sumber label tunggal di FE).

### 2.2 `LoadingButton`
```ts
props: {
  loading?: boolean; disabled?: boolean;
  variant?: 'primary'|'secondary'|'danger'|'soft'; // default 'primary'
  size?: 'sm'|'md';                                // default 'md' (h-10), sm = h-8 text-xs
  icon?: LucideIcon; loadingText?: string;
  onClick?: (e) => void | Promise<any>; type?: 'button'|'submit'; fullWidth?: boolean; className?: string
}
```
| Variant | Class |
|---|---|
| primary | `bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-sm` |
| secondary | `bg-white border border-slate-200 text-[#1E293B] hover:bg-slate-50` |
| danger | `bg-white border border-[#FECDD3] text-[#BE123C] hover:bg-[#FFF1F2]` (aksi destruktif tetap pastel) |
| soft | `bg-[#EEF2FF] text-[#4338CA] hover:bg-indigo-100` |

Base: `inline-flex items-center justify-center gap-2 rounded-xl px-4 font-medium transition focus-visible:ring-2`. Disabled/loading: `opacity-60 cursor-not-allowed pointer-events-none`.
**Behavior (NFR-UI-04)**:
1. `onClick` yang mengembalikan Promise → komponen **internal lock** sinkron (`useRef` guard + `setBusy(true)`) sebelum await; klik kedua diabaikan walau parent belum re-render. Unlock di `finally`.
2. Saat `loading || busy`: `disabled`, `aria-busy="true"`, ikon `Loader2` `animate-spin` menggantikan `icon`, teks = `loadingText ?? children`.
3. Wajib dipakai untuk: Simpan Draft KRS, Konfirmasi KRS Final, Buat Pertemuan, Buka/Tutup/Buka Ulang Presensi, Hadir/Isi Presensi, Simpan Draft Nilai, Publikasikan Nilai, Revisi Nilai, serta semua submit form.

### 2.3 `Modal`
```ts
props: { isOpen: boolean; onClose: () => void; title: string; children; footer?: ReactNode;
         size?: 'sm'|'md'|'lg'|'xl' (max-w-sm/md/lg/2xl, default 'md'); variant?: 'dialog'|'slideover'; // slideover = kanan, w-full sm:max-w-xl
         closeOnBackdrop?: boolean (default true); dismissible?: boolean (default true; false saat submit sedang loading) }
```
- Render via `createPortal` ke `document.body`; backdrop `fixed inset-0 bg-slate-900/30 backdrop-blur-[2px]` (terang, bukan hitam pekat).
- Panel: `bg-white rounded-2xl border border-slate-200 shadow-xl`; header (`font-heading font-semibold` + tombol `X`), body `p-6 max-h-[70vh] overflow-y-auto`, footer `border-t border-slate-100 px-6 py-4 flex justify-end gap-2`. Mobile: `max-h-[90vh] mx-4`; slideover = `rounded-l-2xl rounded-r-none`.
- A11y: `role="dialog" aria-modal="true" aria-labelledby`, focus trap, fokus awal ke elemen pertama, `Esc` menutup (jika `dismissible`), kembalikan fokus ke pemicu, lock `body` scroll.

### 2.4 `AlertBanner`
```ts
props: { error?: AxiosError|ApiError|null; message?: string; variant?: 'error'|'warning'|'success'|'info'; onDismiss?: () => void; className?: string }
```
Util `parseApiError(error) → { status, errorCode, message, fieldErrors: Record<string,string[]>, conflictingClasses: [], ungradedStudents: [], raw }` (export dari `lib/apiError.js`). Sumber: `error.response?.data` mengikuti envelope `{success:false,error_code,message,errors}`; tanpa response (network) → `message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'`, `errorCode: 'NETWORK_ERROR'`.

Render (NFR-UI-03):
| Kondisi `errors` | Tampilan |
|---|---|
| `errors.conflicting_classes[]` | Judul = `message`; daftar `<li>` per item: `course_code` (mono) • `course_name` `class_code` — `reason`. Tag kecil `Kuota Penuh` jika `error_code==='CLASS_QUOTA_FULL'`, `Bentrok Jadwal` jika `SCHEDULE_CONFLICT`/`*_CONFLICT`. Item tambahan `quota/enrolled_count` → `30/30`. |
| `errors.ungraded_students[]` | Judul = `message`; daftar `student_number` (mono) — `name` (“Belum memiliki nilai”). |
| `errors` object field (422 `VALIDATION_ERROR`) | Judul = `message`; bullet `field: pesan` (tanpa kunci tersarang bermakna). Halaman form juga menaruh pesan per-field di bawah input via `fieldErrors[name]?.[0]`. |
| `errors: null` | hanya `message`. |

Warna: `error` = rose pastel (`bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C]`, ikon `AlertCircle`); `warning` = amber pastel; `success` = emerald pastel (`CheckCircle2`); `info` = `bg-[#EEF2FF] border-indigo-200 text-[#4338CA]`. `role="alert"` (error/warning) atau `role="status"`. `rounded-2xl border p-4`, tombol dismiss opsional.
Handler global Axios: `401` → bersihkan token + redirect `/login` + toast info “Sesi Anda telah berakhir”. `403/404/409/422/429` → **ditangani halaman** via `AlertBanner` (bukan toast). `429` pesan: dari backend; tombol login disabled sementara.

### 2.5 `Card`
```ts
<Card title? subtitle? actions? padding='p-5'|'p-0' className> ... </Card>
```
`bg-white rounded-2xl border border-slate-200 shadow-sm`; header `flex justify-between` + `border-b border-slate-100` bila `title`. Pelengkap: `StatCard` (label muted + nilai `font-heading text-2xl`), `EmptyState` (ikon Lucide + teks Indonesia, mis. “Belum ada data.”), `Skeleton` (`animate-pulse rounded-xl bg-slate-100`), `ProgressBar` (track `bg-slate-100 rounded-full h-2.5`, fill `bg-[#4F46E5]`; >100% atau overflow → fill `bg-[#F43F5E]`), `DataTable`, `Field`, `Tabs` (underline `border-b-2 border-[#4F46E5] text-[#4338CA]`, idle `text-[#64748B]`; role `tablist`).

### 2.6 `AppLayout`
Desktop `>= 1024px` (`lg:`): sidebar tetap `w-64` (256px) `bg-white border-r border-slate-200`, konten `lg:pl-64`.
Mobile `< 1024px`: sidebar jadi **drawer** kiri `w-72` (`translate-x` transition, backdrop `bg-slate-900/30`), dibuka tombol hamburger (`Menu`) di topbar, tutup saat navigasi/`Esc`/backdrop. Tombol aksi utama tidak boleh tersembunyi pada 360px (NFR-UI-05); tabel lebar → `overflow-x-auto` atau card list di `< md`.

**Sidebar**: logo `SIASAT` (`font-heading font-bold text-[#4338CA]` + kotak ikon `GraduationCap` `bg-[#EEF2FF] rounded-xl`), nav per role (di bawah), footer tombol `Keluar` (`LogOut`, `POST /api/auth/logout`).
**Topbar** (`h-16 bg-white border-b border-slate-200 sticky top-0 z-30`): kiri hamburger (mobile) + judul halaman; kanan:
1. **Semester aktif**: `Semester Ganjil 2026/2027` (`CalendarDays`, chip slate). Sumber: student `GET /api/student/semesters`; admin `GET /api/admin/semesters` (is_active). Lecturer: dari `class.semester` jika ada, selain itu sembunyikan.
2. **Pill Periode KRS** (hitung di FE dengan jam `Asia/Jakarta` dari `enrollment_start_at`/`enrollment_end_at`; hanya untuk student & admin): `KRS Terbuka` emerald · `KRS Belum Dibuka` amber (sebelum start) · `KRS Ditutup` rose (setelah end / tak ada semester aktif).
3. **Identity badge**: avatar inisial (`bg-[#EEF2FF] text-[#4338CA] rounded-full`) + `name` + role pill slate (`Admin Akademik`/`Dosen`/`Mahasiswa`) + kode mono (NIM/NIDN). Sembunyikan nama/kode `< sm`, sisakan avatar.

**Nav per role** (ikon Lucide):
| Role | Menu → route |
|---|---|
| admin | `Mahasiswa` `/admin/students` (Users) · `Dosen` `/admin/lecturers` (UserSquare) · `Mata Kuliah` `/admin/courses` (BookOpen) · `Semester` `/admin/semesters` (CalendarRange) · `Kelas Paralel` `/admin/classes` (LayoutGrid) · `Monitoring KHS` `/admin/transcripts` (FileText) · `Jejak Audit` `/admin/audit-logs` (ScrollText) |
| student | `KRS` `/student/krs` (ClipboardList) · `Jadwal Kuliah` `/student/schedule` (CalendarDays) · `Presensi` `/student/attendance` (CheckSquare) · `KHS` `/student/transcript` (GraduationCap) |
| lecturer | `Kelas Diampu` `/lecturer/classes` (Presentation) |

Routing & guard (`@frontend-core`): `ProtectedRoute role=` → belum login → `/login`; role salah → redirect ke home role-nya. Home: admin `/admin/students`, student `/student/krs`, lecturer `/lecturer/classes`. Token Sanctum di `localStorage` (`siasat_token`), Axios `Authorization: Bearer`, baseURL `import.meta.env.VITE_API_URL` (default `http://127.0.0.1:8000/api`). Bootstrap sesi: `GET /api/auth/me`.

### 2.7 Konvensi umum
- Waktu: API ISO-8601 UTC → tampil WIB via `Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta'})`. Helper `lib/datetime.js`: `formatWibTime(iso)` → `HH:mm:ss` + suffix ` WIB`; `formatWibDateTime(iso)` → `19 Nov 2026, 08.15 WIB`; `toWibInputValue(iso)` / `fromWibInputValue(local)` untuk `<input type="datetime-local">` (offset `+07:00` → kirim UTC ISO).
- Hari: `day_of_week` ditampilkan `Senin..Minggu`. Jam `start_time–end_time` mono `HH:mm`.
- Tombol aksi submit selalu `LoadingButton`. Tiap halaman: state `loading` (Skeleton), `error` (AlertBanner), `empty` (EmptyState).
- Setelah mutasi sukses: toast ringan (`bg-white border-emerald-200`, ikon emerald, auto-hide 4 dtk, `aria-live="polite"`) + refetch.
- Kolom daftar panjang: `search` client-side minimal untuk admin tables; tidak perlu pagination server jika backend tidak mengirim `meta`.
- Respons list bisa berupa `data: []` atau `data: { items|data: [] }`; helper `unwrapList(res)` menormalkan.

---

## 3. Page Blueprints
Setiap blok: route · endpoint (Lampiran B.1) · isi UI. Nama field = snake_case dari backend.

### 3.1 Auth — `LoginPage` (`/login`)
- Layout tengah, canvas `bg-slate-50`, Card `max-w-md` : logo, judul `Masuk ke SIASAT`, subjudul `Sistem Informasi Akademik Terpadu`.
- Form: `Username`, `Kata sandi` (toggle `Eye/EyeOff`), `LoadingButton` **Masuk** (fullWidth). `POST /api/auth/login` → simpan `data.token` + `data.user` → redirect home role. Error: `AlertBanner` (401 kredensial salah, 403 akun nonaktif, 429 `Terlalu banyak percobaan` + disable tombol 60 dtk, 422 field).
- **Akses Cepat Demo** (Card kecil bawah, label muted): 4 tombol `soft` — `Admin` (`admin`), `Dosen 1` (`dosen1`), `Mahasiswa 1` (`mahasiswa1`), `Mahasiswa 2` (`mahasiswa2`); klik = isi field + submit langsung (loading pada tombol yang diklik, semua tombol disabled). Kredensial demo diambil dari `VITE_DEMO_PASSWORD` (default `password`) — **verifikasi dengan DemoSeeder backend** (`@backend`), jangan hardcode berbeda.

### 3.2 Admin (`/admin/*`, role `admin`) — owner `@frontend-core`
Pola CRUD umum: `PageHeader` (judul + tombol primer `Tambah …`), search, tabel dalam Card `p-0`, aksi baris `Ubah` (secondary sm), form dalam `Modal` (`size=lg`), submit `LoadingButton`, error 422 per-field + `AlertBanner`. Aktif/nonaktif = `StatusBadge type="active"`.

| Halaman | Route | Endpoint | UI |
|---|---|---|---|
| `StudentsPage` | `/admin/students` | `GET/POST /admin/students`, `PUT /admin/students/{studentId}` | Kolom: `NIM` (mono, `student_number`), `Nama`, `Program Studi`/`Angkatan` (jika ada), `Maks. SKS` (`max_credits`), `Status` (badge Aktif/Nonaktif), `Aksi`. Form: `username`, `name`, `email`, `password` (wajib saat tambah, opsional saat ubah), `student_number`, `max_credits` (default 24), switch `Akun aktif` (`is_active`). Konfirmasi saat menonaktifkan: “Sesi login mahasiswa akan dicabut.” |
| `LecturersPage` | `/admin/lecturers` | `GET/POST /admin/lecturers`, `PUT /admin/lecturers/{lecturerId}` | `NIDN` (mono, `lecturer_number`), `Nama`, `Email`, `Status`. Form setara students. |
| `CoursesPage` | `/admin/courses` | `GET/POST /admin/courses`, `PUT /admin/courses/{courseId}` | `Kode MK` (mono, `course_code`, unik), `Nama Mata Kuliah`, `SKS` (`credits` select 1–6). |
| `SemestersPage` | `/admin/semesters` | `GET/POST /admin/semesters`, `PUT /admin/semesters/{semesterId}` | Kartu/tabel: `name`, `Periode KRS` (`enrollment_start_at` – `enrollment_end_at` WIB), status KRS (pill §2.6), badge `Aktif`. Form: nama, tanggal mulai/selesai semester (jika ada), `datetime-local` **Mulai KRS** & **Selesai KRS** (konversi WIB↔UTC), switch **Jadikan semester aktif** (`is_active`; helper: “Semester aktif lain akan dinonaktifkan.”). Aksi cepat demo (hanya PUT): `Buka KRS Sekarang` (start = sekarang−1 jam, end = +7 hari) dan `Tutup KRS Sekarang` (end = sekarang−1 mnt). Setelah simpan → refetch topbar. |
| `ClassesPage` | `/admin/classes` | `GET/POST /admin/classes`, `PUT /admin/classes/{classId}`, `GET /admin/classes/{classId}/participants`, `GET /admin/classes/{classId}/sessions`, `GET /admin/sessions/{sessionId}/attendances` | Filter `Semester` (`semester_id`, default aktif). Tabel: `Kode MK`(mono) + `Mata Kuliah` + `Kelas` (`class_code`), `Dosen`, `Hari`/`Jam` (mono), `Ruang` (mono `room`), `Kuota` (`enrolled_count/quota` + mini ProgressBar; penuh → pill `Kuota Penuh`), `Aksi`: `Ubah`, `Monitoring`. Form (Modal lg): `semester_id`, `course_id`, `lecturer_id`, `class_code`, `day_of_week`, `start_time`, `end_time`, `room`, `quota`. **Error handling**: `409` bentrok dosen/ruangan → `AlertBanner` di dalam modal (`conflicting_classes` terdaftar), `422` `quota < enrolled_count` → pesan field `quota`; bila `enrolled_count > 0` field `course_id`, `day_of_week`, `start_time`, `end_time`, `room`, `lecturer_id`(jadwal/MK) di-`disabled` + helper “Terkunci karena sudah ada peserta (BR-18)”; hanya `quota`/`class_code` yang bisa diubah; tetap tampilkan banner dari backend bila ditolak. **Monitoring** = `Modal variant="slideover" size=xl` dengan 3 tab: (1) `Peserta` (tabel NIM mono, Nama, status KRS `Terkonfirmasi`), (2) `Pertemuan` (`session_number`, `session_date`, `topic`, `StatusBadge session`), klik baris → (3) `Rekap Presensi` (`GET /admin/sessions/{id}/attendances`: NIM, Nama, status `StatusBadge attendance`, waktu WIB mono). Read-only, tanpa aksi ubah. |
| `TranscriptMonitorPage` | `/admin/transcripts` | `GET /admin/students` (picker), `GET /admin/students/{studentId}/transcript?semester_id=` | Select `Mahasiswa` (cari NIM/nama) + select `Semester` → komponen KHS yang sama dengan §3.3 `TranscriptPage` (shared `TranscriptView` di `components/academic/`, **owner `@frontend-academic`**; core cukup meng-import). Read-only. |
| `AuditLogsPage` | `/admin/audit-logs` | `GET /admin/audit-logs` | Tabel read-only: `Waktu` (WIB), `Pengguna` (`user.name`/`user_id`), `Aksi` (`action`, mono pill slate; label ramah: `published_grade_revised` → `Revisi Nilai Terpublikasi`, `attendance_session_reopened` → `Presensi Dibuka Ulang`, selainnya tampil mentah), `Entitas` (`entity_type #entity_id`), `Detail` (tombol “Lihat” → Modal berisi JSON `old_values`/`new_values`/`reason` di `<pre class="bg-slate-50 rounded-xl p-3 text-xs font-mono">`). Filter text `action`. |

### 3.3 Student (`/student/*`, role `student`) — owner `@frontend-academic`

**`KrsPage` (`/student/krs`)** — `GET /student/semesters`, `GET /student/classes`, `GET /student/study-plan`, `PUT /student/study-plan/draft`, `POST /student/study-plan/confirm`
- Header: judul `Kartu Rencana Studi`, `StatusBadge studyPlan` (Draft / Terkonfirmasi) + pill periode KRS.
- Card **Total SKS**: teks `{total_credits} / {max_credits} SKS` + `ProgressBar` (fill rose bila `total_credits > max_credits`). Dihitung live dari pilihan lokal (jumlah `credits` kelas terpilih); `max_credits` dari `study-plan`/`me`.
- Aksi (sticky bottom bar di mobile `fixed bottom-0 bg-white border-t`): `LoadingButton variant=secondary` **Simpan Draft KRS** (`PUT /study-plan/draft` body `{ course_class_ids: [...] }` — **nama field diverifikasi ke backend**), `LoadingButton primary` **Konfirmasi KRS Final** → `Modal` konfirmasi: judul “Konfirmasi KRS Final?”, isi “KRS yang sudah dikonfirmasi bersifat **final** dan tidak dapat diubah.” + ringkasan daftar kelas & total SKS; footer `Batal` / `Ya, Konfirmasi` (LoadingButton, `POST /study-plan/confirm`).
- Disabled kondisi: periode KRS tidak `Terbuka` → semua aksi & pemilihan disabled + `AlertBanner warning` “Periode KRS belum dibuka/telah ditutup.”; status `confirmed` → mode read-only dengan banner emerald “KRS Anda telah dikonfirmasi (final).” dan daftar kelas terpilih saja.
- **Katalog kelas**: grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` Card per kelas: `course_code` (mono) • `class_code`, `course_name` (heading), `credits SKS`, dosen, `Hari`, `HH:mm–HH:mm` (mono), `room` (mono), `Kuota enrolled_count/quota` + mini ProgressBar. Tombol toggle `Pilih` (soft) ↔ `Batalkan` (secondary); kartu terpilih `ring-2 ring-[#4F46E5]/30 border-[#4F46E5]` + tag `Dipilih`. Tag **client-side** (hitung dari pilihan lokal): `Kuota Penuh` (`enrolled_count >= quota`, tombol Pilih disabled kecuali sudah terpilih di draft), `Bentrok Jadwal` (hari sama & `start < other.end && other.start < end` dengan kelas terpilih lain; tooltip nama kelas yang bentrok), `MK Ganda` (`course_id` sama dengan kelas terpilih lain). Tag peringatan bersifat informatif; backend tetap otoritatif.
- Error 409/422 dari draft/confirm → `AlertBanner` di atas daftar (conflicting_classes, kuota penuh, MK ganda, kelebihan SKS — NFR-UI-03); refetch katalog setelah `CLASS_QUOTA_FULL`.
- Search `Cari mata kuliah` + empty state.

**`SchedulePage` (`/student/schedule`)** — `GET /student/schedule`
- Hanya dari KRS Final; bila belum ada → EmptyState “Belum ada jadwal. Konfirmasi KRS terlebih dahulu.” + link ke `/student/krs`.
- Desktop: grid mingguan 6 kolom Senin–Sabtu (card per kelas: jam mono, `course_name` `class_code`, `room` mono, dosen); Mobile: list per hari (accordion). Tiap kartu link ke `/student/attendance?class_id=`.

**`AttendancePage` (`/student/attendance`)** — `GET /student/schedule` (daftar kelas), `GET /student/classes/{classId}/sessions`, `POST /student/sessions/{sessionId}/attendances`
- Select `Kelas` (dari jadwal; query `?class_id=`), default kelas pertama.
- Daftar pertemuan (Card/list; tabel di `md+`, card di mobile) per baris: `Kelas` (`course_name` `class_code`), `Pertemuan {session_number}` (`session_number`), `topic`, tanggal `session_date`, `StatusBadge session` (`attendance_status`), kolom **Kehadiran**:
  - `attendance_status === 'open'` dan belum hadir → `LoadingButton primary` **Hadir / Isi Presensi** (`icon CheckCircle2`). Klik → **langsung loading + disabled** (NFR-UI-04, lock sinkron), `POST …/attendances` tanpa body. Sukses/idempotent `200` → baris langsung menjadi `StatusBadge present` + teks mono **`Hadir • HH:mm:ss WIB`** (dari `recorded_at`, jangan tunggu refetch).
  - Sudah ada record → badge sesuai `attendance_status` pribadi (`present/excused/sick/absent`) + waktu WIB jika `recorded_at`.
  - `not_opened` → teks muted “Presensi belum dibuka”, tombol tidak ditampilkan. `closed` tanpa record → badge `Belum mengisi` (amber) + teks muted “Presensi telah ditutup”. Jangan tampilkan `Alpa` kecuali dosen menetapkannya.
  - Field baris dari API: `id`, `session_number`, `session_date`, `topic`, `attendance_status` (sesi), `my_attendance`/`attendance` (`status`, `recorded_at`) — adaptasi nama persis dari respons backend; bungkus di `normalizeSession()`.
- Error (403 `FORBIDDEN_CLASS_ACCESS`, 409 sesi tidak terbuka) → `AlertBanner` di atas daftar; refetch sesi.

**`TranscriptPage` (`/student/transcript`)** — `GET /student/semesters`, `GET /student/transcript?semester_id=`
- Dropdown `Semester` (default semester aktif). Card **IPS**: label `Indeks Prestasi Semester (IPS)`, nilai besar `font-heading text-4xl text-[#4338CA]` format `0.00` dan total SKS tercatat; bila IPS 0 & tak ada nilai terpublikasi → muted “Belum ada nilai terpublikasi”.
- Tabel KHS: `Kode MK` (mono), `Mata Kuliah`, `SKS`, `Nilai Angka` (`score`), `Huruf` (`grade_letter`), `Bobot` (`grade_point`, 2 desimal), `Status` (`StatusBadge published`). Jika `is_published=false` (atau nilai `null`): kolom nilai/huruf/bobot menampilkan `—` dan status **`Belum Dipublikasikan`** (amber). Frontend tidak pernah menampilkan nilai draft (backend sudah menyensor, NFR-06).
- `TranscriptView` (shared, juga dipakai admin): props `{ data, loading, error }`.

### 3.4 Lecturer (`/lecturer/*`, role `lecturer`) — owner `@frontend-academic`

**`LecturerClassesPage` (`/lecturer/classes`)** — `GET /lecturer/classes`
- Grid Card per kelas paralel (terpisah: *Basis Data A* vs *Basis Data B*): `course_code` mono, `course_name` + `class_code`, `Hari`, `HH:mm–HH:mm`, `room`, `Peserta enrolled_count/quota`, tombol `Buka Kelas` → `/lecturer/classes/{classId}`.

**`LecturerClassDetailPage` (`/lecturer/classes/:classId`)** — header kelas (Card ringkas + tombol `Kembali`) + `Tabs`:

**Tab 1 — `Daftar Peserta`** · `GET /lecturer/classes/{classId}/participants`
Tabel: `No`, `NIM` (mono), `Nama`, `Status KRS` (`Terkonfirmasi`). Total peserta di header tab.

**Tab 2 — `Pertemuan & Presensi`** · `GET/POST /lecturer/classes/{classId}/sessions`, `PUT/DELETE /lecturer/sessions/{sessionId}`, `PATCH /lecturer/sessions/{sessionId}/attendance-status`, `GET /lecturer/sessions/{sessionId}/attendances`, `PUT /lecturer/sessions/{sessionId}/attendances/{studentId}`
- Tombol `Buat Pertemuan` (LoadingButton primary) → Modal form: `session_date` (date), `topic` (text); `session_number` otomatis dari backend (tampilkan info “Nomor pertemuan diberikan otomatis”).
- Daftar pertemuan (card per sesi): `Pertemuan {session_number}`, `topic`, tanggal, `StatusBadge session`, `opened_at`/`closed_at` WIB bila ada, aksi sesuai state:
  | `attendance_status` | Aksi |
  |---|---|
  | `not_opened` | `Buka Presensi` (primary) → PATCH `{attendance_status:'open'}` · `Ubah` (PUT `session_date`,`topic`) · `Hapus` (danger, Modal konfirmasi; DELETE; bila backend 409 → banner “Pertemuan tidak dapat dihapus karena sudah memiliki data presensi”) |
  | `open` | `Tutup Presensi` (secondary) → PATCH `{attendance_status:'closed'}`; `Ubah` tetap tersedia |
  | `closed` | `Buka Ulang Presensi` (soft) → **Modal wajib `reason`** (textarea, wajib non-kosong, min 5 karakter FE; tampilkan error field `reason` dari backend) → PATCH `{attendance_status:'open', reason}`; footer `Batal` / `Buka Ulang` (LoadingButton). Info: “Data presensi yang sudah tercatat tetap dipertahankan. Aktivitas dicatat pada jejak audit.” |
  Buka/Tutup langsung `LoadingButton` loading+disabled (NFR-UI-04). `Hapus` & `Ubah` tersembunyi/disabled bila `open`/`closed` sesuai BR-20 (hapus hanya `not_opened`).
- Tombol `Rekap Presensi` per sesi → expand/Modal `size=xl` : tabel `NIM` (mono), `Nama`, `Status`, `Waktu` (WIB mono `HH:mm:ss`), `Aksi`:
  - Ada record → `StatusBadge attendance` (`Hadir`, `Izin`, `Sakit`, `Alpa`) + waktu `recorded_at`.
  - Tidak ada record → `StatusBadge` **`Belum mengisi`** + waktu `—`.
  - Kolom Aksi: **select inline** `Ubah status` opsi `Hadir (present)`, `Izin (excused)`, `Sakit (sick)`, `Alpa (absent)` (label ditampilkan Indonesia saja; value enum). On change → `PUT …/attendances/{studentId}` `{status, notes?}`; select disabled + spinner kecil selama request; update baris dari respons; error → `AlertBanner` di atas tabel. Opsional `notes` via ikon `MessageSquare` popover. Ringkasan di atas: `Hadir n • Izin n • Sakit n • Alpa n • Belum mengisi n` (pill).

**Tab 3 — `Penilaian Akhir`** · `GET/PUT /lecturer/classes/{classId}/grades`, `POST /lecturer/classes/{classId}/grades/publish`
- Tabel peserta: `NIM` (mono), `Nama`, input `Nilai (0–100)` (`score`, number step 0.01 min 0 max 100), **Pratinjau Huruf/Bobot live** dari skala BR-13 (fungsi `scoreToGrade(score)` di `lib/grade.js`), `Status` (`StatusBadge published`).
  | score | Huruf | Bobot |
  |---|---|---|
  | 85–100 | A | 4.00 |
  | 80–<85 | AB | 3.50 |
  | 70–<80 | B | 3.00 |
  | 65–<70 | BC | 2.50 |
  | 55–<65 | C | 2.00 |
  | 40–<55 | D | 1.00 |
  | 0–<40 | E | 0.00 |
  Input kosong → pratinjau `—`. Nilai di luar 0–100/non-angka → border rose + helper “Nilai harus 0–100”, tombol simpan disabled. Pratinjau pill netral `slate` (`font-mono`: `A • 4.00`); `score` adalah sumber kebenaran (kirim `score`, jangan kirim `grade_letter` bertentangan).
- Baris `is_published=true`: input disabled kecuali tombol `Revisi` (soft sm) → **Modal Revisi Nilai Terpublikasi**: input `Nilai Baru` + pratinjau live, textarea `revision_reason` (**wajib ≥ 10 karakter**, counter `n/10`, tombol `Simpan Revisi` disabled sebelum terpenuhi), banner info “Revisi dicatat pada jejak audit (nilai sebelum & sesudah).”; submit `PUT …/grades` dengan item `{student_id, score, revision_reason}`.
- Aksi bawah (sticky mobile): `LoadingButton secondary` **Simpan Draft Nilai** (PUT, kirim hanya baris berubah yang belum terpublikasi; bentuk payload `{ grades: [{student_id, score, ...}] }` — **verifikasi ke backend**), `LoadingButton primary` **Publikasikan Nilai Kelas** → Modal konfirmasi “Seluruh nilai kelas akan tampil di KHS mahasiswa.” → `POST …/grades/publish`.
- **`ungraded_students` (422)**: `AlertBanner` (rose) menampilkan pesan + daftar `student_number` (mono) — `name`; baris mahasiswa terkait di tabel diberi `bg-[#FFF1F2]/60` + helper “Belum ada nilai”. Sukses → toast “Nilai kelas berhasil dipublikasikan.”, semua badge menjadi `Terpublikasi`.
- Jika semua nilai terpublikasi → tombol publish disabled dengan label tetap, banner info “Seluruh nilai telah dipublikasikan. Gunakan Revisi untuk mengoreksi.”

---

## 4. Struktur Berkas & Kepemilikan
```
frontend/src/
  components/ui/        StatusBadge LoadingButton Modal AlertBanner Card(+StatCard,EmptyState,Skeleton,ProgressBar,DataTable,Field,Tabs,Toast)   → @frontend-core
  components/layout/    AppLayout Sidebar Topbar ProtectedRoute                                                                              → @frontend-core
  components/academic/  TranscriptView SessionAttendanceTable GradeTable ClassCard ...                                                      → @frontend-academic
  lib/                  api.js(axios) apiError.js datetime.js grade.js auth context                                                          → @frontend-core (grade.js: @frontend-academic)
  pages/auth/ pages/admin/                                                                                                                → @frontend-core
  pages/student/ pages/lecturer/                                                                                                           → @frontend-academic
```
Kontrak impor: halaman academic hanya mengimpor `components/ui`, `AppLayout`, `lib/*` dari core; **tidak** mengubah berkas core. Perubahan kontrak → post di board ke `@uiux-designer`.

## 5. Checklist Penerimaan UI
- [ ] Tidak ada elemen sidebar/topbar gelap; semua permukaan `#FFFFFF`/`#F8FAFC`.
- [ ] Semua badge status memakai `StatusBadge` + dot + label Indonesia persis §2.1.
- [ ] Setiap tombol sensitif (NFR-UI-04 §2.2) lock saat request; klik ganda hanya 1 request.
- [ ] Error KRS/kelas/nilai menampilkan alasan spesifik backend via `AlertBanner` (NFR-UI-03).
- [ ] Halaman presensi: kelas, `session_number`, topik, status; setelah hadir → `Hadir • HH:mm:ss WIB` (NFR-UI-02).
- [ ] KHS: `Belum Dipublikasikan` untuk `is_published=false`; tidak ada nilai draft di DOM.
- [ ] Responsif 360px–1440px; drawer `< 1024px`; tombol aksi utama selalu terlihat (NFR-UI-05).
- [ ] Kode akademik memakai `font-mono`.
