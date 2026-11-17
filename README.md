# M&M's — paket website + login

Isi folder ini siap diunggah ke hosting statis.

## Langkah 1 — Firebase (login + penyimpanan)
1. Buka https://console.firebase.google.com → Add project (nama bebas).
2. Build → Authentication → Get started → aktifkan **Google** dan **Email/Password**.
3. Build → Firestore Database → Create database (production mode, region terdekat, mis. asia-northeast1).
   Tab **Rules** → tempel isi `firestore.rules` → Publish.
4. Project settings (ikon gerigi) → Your apps → ikon Web `</>` → daftarkan app → salin objek `firebaseConfig`.
5. Buka `firebase-config.js` dan ganti semua nilai "ISI_..." dengan nilai dari langkah 4.
6. Authentication → Settings → **Authorized domains** → tambahkan domain websitemu (setelah langkah 2).

## Langkah 2 — Hosting (pilih salah satu, gratis)
- **Cloudflare Pages**: Workers & Pages → Create → Pages → Upload assets → unggah isi folder ini.
- **Netlify**: app.netlify.com/drop → seret folder ini.
- **Firebase Hosting**: `npm i -g firebase-tools`, `firebase login`, `firebase init hosting` (public dir = folder ini), `firebase deploy`.

Buka alamat hasilnya di Chrome Android → menu ⋮ → "Pasang aplikasi" / "Tambahkan ke layar utama".

## Langkah 3 — Isi `privacy.html` dan `delete-account.html`
Ganti `[ISI EMAIL KONTAK]` dan `[ISI NAMA PENGEMBANG]`. Alamat kedua halaman dipakai di Play Console (kebijakan privasi dan URL hapus akun).

## Sinkron antar perangkat
Chat, pengaturan, koin, dan cerita disinkron per akun. Progres Kebun Tanaman, favorit game, kartu harian, dll ikut disinkron lewat `mm-sync.js` (kunci API Gemini dan pengaturan khusus perangkat tidak ikut). Foto/suara yang disimpan di perangkat belum disinkron.

## Teman sungguhan (baru)
1. Firebase Console → Firestore → Rules → tempel ulang isi `firestore.rules` (sudah diperbarui) → Publish.
2. Di aplikasi (setelah masuk): tab Obrolan → **Teman** → baris **👥 Teman sungguhan**.
3. Tiap akun punya kode `MM-XXXXXXXX`. Teman memasukkan kodemu, kamu terima, lalu chat. Tombol Bagikan membuat tautan `?add=KODE` yang otomatis mengisi kode.
4. Menu ⋮ di chat: Blokir, Laporkan, Hapus teman. Laporan masuk ke koleksi `reports` (lihat di Firebase Console → Firestore).
5. Perbarui `privacy.html` (sudah ditambah bagian pesan dan laporan).

## Rilis versi baru
Ganti `index.html`, naikkan `VER` di `sw.js` (mis. mm-v37-2), unggah ulang.

## Catatan
- Tanpa isi `firebase-config.js`, aplikasi tetap jalan tanpa login (data hanya di perangkat).
- Balasan AI generatif (tidak tersedia di luar claude.ai) memakai balasan bawaan/skrip. Untuk AI sungguhan perlu server perantara ke Claude API (kunci API tidak boleh ditaruh di halaman).
- Login Google di Play Store (TWA) memakai popup/redirect Chrome; uji di perangkat sebelum rilis.
