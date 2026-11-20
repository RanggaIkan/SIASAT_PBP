#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

function parseArgs(argv) {
  let urls = ['http://127.0.0.1:8000'];
  let reset = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--reset') {
      reset = true;
    } else if (arg.startsWith('--urls=')) {
      urls = arg
        .slice('--urls='.length)
        .split(',')
        .map((u) => u.trim().replace(/\/+$/, ''))
        .filter(Boolean);
    } else if (arg === '--urls' && argv[i + 1]) {
      urls = argv[i + 1]
        .split(',')
        .map((u) => u.trim().replace(/\/+$/, ''))
        .filter(Boolean);
      i += 1;
    }
  }

  if (urls.length === 0) {
    throw new Error('Daftar --urls tidak boleh kosong.');
  }

  return { urls, reset };
}

function resetDatabase() {
  console.log('[SETUP] Menjalankan php artisan migrate:fresh --seed ...');
  execFileSync('php', ['artisan', 'migrate:fresh', '--seed'], {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
  });
  console.log('[SETUP] Database bersih & DemoSeeder siap.\n');
}

async function apiRequest(baseUrl, endpoint, { method = 'GET', token = null, body = null } = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: payload,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return {
    baseUrl,
    status: res.status,
    ok: res.ok,
    body: json,
  };
}

async function login(baseUrl, username, password) {
  const res = await apiRequest(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });

  assert.equal(
    res.status,
    200,
    `Login ${username} gagal (${res.status}): ${JSON.stringify(res.body)}`
  );
  assert.equal(res.body?.success, true, `Login ${username} success !== true`);
  assert.ok(res.body?.data?.token, `Token login ${username} kosong`);

  return {
    username,
    token: res.body.data.token,
    user: res.body.data.user,
  };
}

async function runTest1AT05(urls) {
  console.log('=== TEST 1: AT-05 (Perebutan 1 Kursi Terakhir KRS) ===');
  const urlAt = (i) => urls[i % urls.length];

  const [student3, student4] = await Promise.all([
    login(urlAt(0), 'student3', 'password123'),
    login(urlAt(1), 'student4', 'password123'),
  ]);

  const catalogRes = await apiRequest(urlAt(0), '/api/student/classes', {
    token: student3.token,
  });
  assert.equal(catalogRes.status, 200, `GET /api/student/classes gagal (${catalogRes.status})`);

  const classes = Array.isArray(catalogRes.body?.data) ? catalogRes.body.data : [];
  const jarKomClass = classes.find(
    (c) => c.course?.course_code === 'IF203' && c.class_code === 'A'
  );
  assert.ok(jarKomClass, 'Kelas IF203 Jaringan Komputer A tidak ditemukan.');
  assert.equal(Number(jarKomClass.quota), 30, `Quota awal diharapkan 30, aktual ${jarKomClass.quota}`);
  assert.equal(
    Number(jarKomClass.enrolled_count),
    29,
    `enrolled_count awal diharapkan 29, aktual ${jarKomClass.enrolled_count}`
  );

  console.log(
    `Target kelas: ${jarKomClass.course.course_code} ${jarKomClass.course.course_name} ${jarKomClass.class_code} (ID=${jarKomClass.id}, awal=${jarKomClass.enrolled_count}/${jarKomClass.quota})`
  );

  const startedAt = performance.now();
  const [res3, res4] = await Promise.all([
    apiRequest(urlAt(0), '/api/student/study-plan/confirm', {
      method: 'POST',
      token: student3.token,
      body: { course_class_ids: [jarKomClass.id] },
    }).then((r) => ({ student: 'student3', ...r })),
    apiRequest(urlAt(1), '/api/student/study-plan/confirm', {
      method: 'POST',
      token: student4.token,
      body: { course_class_ids: [jarKomClass.id] },
    }).then((r) => ({ student: 'student4', ...r })),
  ]);
  const elapsedMs = (performance.now() - startedAt).toFixed(1);

  const results = [res3, res4];
  for (const r of results) {
    console.log(
      `  -> ${r.student} @ ${r.baseUrl}: HTTP ${r.status} | success=${r.body?.success} | ` +
        (r.status === 200
          ? `status=${r.body?.data?.study_plan?.status}`
          : `error_code=${r.body?.error_code}`)
    );
  }

  const winners = results.filter(
    (r) => r.status === 200 && r.body?.success === true && r.body?.data?.study_plan?.status === 'confirmed'
  );
  const quotaRejected = results.filter(
    (r) => r.status === 409 && r.body?.success === false && r.body?.error_code === 'CLASS_QUOTA_FULL'
  );

  assert.equal(winners.length, 1, `Diharapkan tepat 1 pemenang HTTP 200 confirmed, aktual ${winners.length}`);
  assert.equal(
    quotaRejected.length,
    1,
    `Diharapkan tepat 1 penolakan HTTP 409 CLASS_QUOTA_FULL, aktual ${quotaRejected.length}`
  );

  const verifyCatalogRes = await apiRequest(urlAt(0), '/api/student/classes', {
    token: student3.token,
  });
  assert.equal(verifyCatalogRes.status, 200, 'Gagal memverifikasi ulang /api/student/classes');

  const updatedJarKom = (verifyCatalogRes.body?.data ?? []).find((c) => c.id === jarKomClass.id);
  assert.ok(updatedJarKom, 'Kelas IF203 A tidak ditemukan saat verifikasi pasca-konfirmasi.');
  assert.equal(
    Number(updatedJarKom.enrolled_count),
    30,
    `enrolled_count akhir diharapkan 30 (tidak boleh 31), aktual ${updatedJarKom.enrolled_count}`
  );
  assert.equal(Number(updatedJarKom.quota), 30, `quota akhir diharapkan 30, aktual ${updatedJarKom.quota}`);

  console.log(
    `[PASS] AT-05: 1 confirmed (${winners[0].student}), 1 CLASS_QUOTA_FULL (${quotaRejected[0].student}), ` +
      `enrolled_count=${updatedJarKom.enrolled_count}/${updatedJarKom.quota} (${elapsedMs} ms)\n`
  );
}

async function runTest2NFR02NFR05(urls) {
  console.log('=== TEST 2: NFR-02 & NFR-05 (Burst 50 Request Presensi Paralel) ===');
  const urlAt = (i) => urls[i % urls.length];

  const [student1, dosen1] = await Promise.all([
    login(urlAt(0), 'student1', 'password123'),
    login(urlAt(1), 'dosen1', 'password123'),
  ]);

  const scheduleRes = await apiRequest(urlAt(0), '/api/student/schedule', {
    token: student1.token,
  });
  assert.equal(scheduleRes.status, 200, `GET /api/student/schedule gagal (${scheduleRes.status})`);

  const scheduleItems = Array.isArray(scheduleRes.body?.data?.items) ? scheduleRes.body.data.items : [];
  const basisDataItem = scheduleItems.find(
    (item) => item.course_class?.course?.course_code === 'IF201' && item.course_class?.class_code === 'A'
  );
  assert.ok(basisDataItem, 'Kelas IF201 Basis Data A tidak ditemukan di jadwal student1.');

  const classId = basisDataItem.course_class_id ?? basisDataItem.course_class.id;
  const sessionsRes = await apiRequest(urlAt(0), `/api/student/classes/${classId}/sessions`, {
    token: student1.token,
  });
  assert.equal(
    sessionsRes.status,
    200,
    `GET /api/student/classes/${classId}/sessions gagal (${sessionsRes.status})`
  );

  const sessions = Array.isArray(sessionsRes.body?.data?.sessions) ? sessionsRes.body.data.sessions : [];
  const openSession = sessions.find(
    (s) => Number(s.session_number) === 1 && s.attendance_status === 'open'
  );
  assert.ok(openSession, 'Pertemuan #1 berstatus open pada Basis Data A tidak ditemukan.');

  const sessionId = openSession.id;
  const totalRequests = 50;
  console.log(
    `Target sesi: Basis Data A (class_id=${classId}), Session #${openSession.session_number} ` +
      `(session_id=${sessionId}, status=${openSession.attendance_status}), mengirim ${totalRequests} request paralel...`
  );

  const startedAt = performance.now();
  const responses = await Promise.all(
    Array.from({ length: totalRequests }, (_, i) =>
      apiRequest(urlAt(i), `/api/student/sessions/${sessionId}/attendances`, {
        method: 'POST',
        token: student1.token,
      })
    )
  );
  const elapsedMs = (performance.now() - startedAt).toFixed(1);

  const statusCounts = {};
  for (const r of responses) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  }

  const invalidStatus = responses.filter((r) => r.status !== 200 && r.status !== 201);
  assert.equal(
    invalidStatus.length,
    0,
    `Ditemukan ${invalidStatus.length} response non-200/201: ${JSON.stringify(
      invalidStatus.slice(0, 3).map((r) => ({ status: r.status, body: r.body }))
    )}`
  );

  const count201 = statusCounts[201] ?? 0;
  const count200 = statusCounts[200] ?? 0;
  assert.equal(count201, 1, `Diharapkan tepat 1 HTTP 201 (insert awal), aktual ${count201}`);
  assert.equal(count200, totalRequests - 1, `Diharapkan ${totalRequests - 1} HTTP 200 (idempotent), aktual ${count200}`);

  const ids = new Set();
  const recordedAts = new Set();
  for (const r of responses) {
    assert.equal(r.body?.success, true, 'Response presensi harus success=true');
    assert.ok(r.body?.data?.id, 'data.id tidak boleh kosong');
    assert.ok(r.body?.data?.recorded_at, 'data.recorded_at tidak boleh kosong');
    ids.add(r.body.data.id);
    recordedAts.add(r.body.data.recorded_at);
  }

  assert.equal(ids.size, 1, `Semua 50 response harus memiliki data.id identik, ditemukan ${ids.size} nilai unik`);
  assert.equal(
    recordedAts.size,
    1,
    `Semua 50 response harus memiliki data.recorded_at identik, ditemukan ${recordedAts.size} nilai unik`
  );

  const [attendanceId] = ids;
  const [recordedAt] = recordedAts;

  const lecturerRecapRes = await apiRequest(
    urlAt(0),
    `/api/lecturer/sessions/${sessionId}/attendances`,
    { token: dosen1.token }
  );
  assert.equal(
    lecturerRecapRes.status,
    200,
    `GET /api/lecturer/sessions/${sessionId}/attendances gagal (${lecturerRecapRes.status})`
  );

  const recap = lecturerRecapRes.body?.data;
  assert.equal(
    Number(recap?.summary?.present),
    1,
    `summary.present diharapkan 1, aktual ${recap?.summary?.present}`
  );

  const student1Id = student1.user?.student?.id;
  const student1Number = student1.user?.student?.student_number;
  const student1Rows = (recap?.participants ?? []).filter(
    (p) => p.student_id === student1Id || p.student_number === student1Number
  );
  assert.equal(
    student1Rows.length,
    1,
    `student1 harus muncul tepat 1 kali di rekap dosen, aktual ${student1Rows.length}`
  );
  assert.equal(student1Rows[0].status, 'present', `Status student1 harus present, aktual ${student1Rows[0].status}`);
  assert.equal(
    student1Rows[0].recorded_at,
    recordedAt,
    `recorded_at di rekap dosen (${student1Rows[0].recorded_at}) tidak sama dengan burst (${recordedAt})`
  );

  console.log(
    `  -> Distribusi HTTP: 201=${count201}, 200=${count200}, error=0 | ` +
      `attendance_id=${attendanceId}, recorded_at=${recordedAt}`
  );
  console.log(
    `  -> Verifikasi dosen1: summary.present=${recap.summary.present}, ` +
      `baris student1=${student1Rows.length} (${student1Rows[0].status})`
  );
  console.log(`[PASS] NFR-02 & NFR-05: 50/50 paralel konsisten & idempoten (${elapsedMs} ms)\n`);
}

async function main() {
  const { urls, reset } = parseArgs(process.argv.slice(2));
  console.log(`Target URL pool (${urls.length}): ${urls.join(', ')}\n`);

  if (reset) {
    resetDatabase();
  }

  await runTest1AT05(urls);
  await runTest2NFR02NFR05(urls);

  console.log('ALL CONCURRENCY TESTS PASSED (AT-05, NFR-02, NFR-05).');
}

main().catch((err) => {
  console.error('\n[FAIL] Concurrency test gagal:', err?.message ?? err);
  process.exit(1);
});
