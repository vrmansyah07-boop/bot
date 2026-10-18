# 🎙️ StreamVox YT - YouTube LiveChat Alert & TTS Studio

Aplikasi web modern ala **Streamlabs / StreamElements** khusus untuk YouTube Live Streaming Anda. Ketika ada penonton yang mengirim pesan di Live Chat, aplikasi ini secara otomatis:
1. **Memunculkan notifikasi alert animasi** dengan avatar, nama penonton, badge peran (Streamer, Moderator, Member VIP, Superchat), dan isi pesan.
2. **Membunyikan efek chime bell** (Cyber Ding, Bubble Pop, Arcade 8-Bit, Crystal Bell, Soft Marimba).
3. **Langsung membacakan isi chat secara otomatis (Text-to-Speech / TTS)** dengan suara Bahasa Indonesia!
4. **Mendukung OBS Studio / Streamlabs Desktop** dengan tampilan Browser Source transparan.

---

## ⚡ Cara Cepat Menjalankan

Server lokal saat ini sudah aktif dan dapat langsung dibuka di browser:
- 🎮 **Dashboard Streamer**: [http://localhost:3030/](http://localhost:3030/)
- 🎥 **OBS Browser Source Overlay**: [http://localhost:3030/overlay.html](http://localhost:3030/overlay.html)

Untuk menjalankan di kemudian hari:
Cukup klik ganda (double click) file **`start.bat`** di folder:
`C:\Users\JAPUY\.gemini\antigravity-ide\scratch\youtube-streamlabs-tts`

---

## 🚀 Fitur Utama

1. **Suara Natural Manusia (Bukan Seperti Robot / AI Kaku)**:
   - Menggunakan audio studio jernih model **Google Cloud WaveNet Bahasa Indonesia** (suara alami persis seperti yang digunakan di Saweria / streamer top Indonesia).
   - Dilengkapi **Kamus Gaul & Slang Streamer Indonesia**: otomatis menerjemahkan singkatan chat penonton (*mabar &rarr; main bareng*, *bgt &rarr; banget*, *yg &rarr; yang*, *udh &rarr; udah*, *gg &rarr; gege*, *ez &rarr; izi*, *wkwk &rarr; wkwk*, dll) sehingga intonasi saat dibacakan terdengar luwes dan alami seperti orang asli.
   - Pilihan intonasi ramah pembawa acara (*"Dari {author}, {message}"*, *"Komentar dari {author}, {message}"*).
   - Opsi cadangan offline: Suara bawaan Windows/Browser (Microsoft Gadis/Ardi Natural, Google ID).
2. **Filter & Anti-Spam Cerdas**:
   - Filter kata-kata kotor / toxic otomatis disensor menjadi *"sensor"*.
   - Pemangkas tawa panjang (`wkwkwkwkwk` &rarr; `wkwk`, `hahahaha` &rarr; `haha`).
   - Batas maksimal karakter agar penonton tidak spam chat panjang yang mengunci suara TTS.
3. **5 Suara Efek Alert (Chime Bells)**:
   - Dibuat langsung dengan Web Audio API sintetis (tanpa perlu file eksternal yang rawan hilang/rusak).
4. **Mode Simulasi / Demo Mode**:
   - Anda bisa menguji seluruh suara TTS dan animasi alert sebelum live streaming dimulai tanpa perlu siaran live nyata.
5. **Tombol Darurat (Panic Stop)**:
   - Langsung mematikan suara dan mengosongkan antrean jika ada chat yang tidak diinginkan.

---

## 🎥 Cara Pasang di OBS Studio

1. Buka **OBS Studio**.
2. Pada panel **Sources (Sumber)** di bagian bawah, klik tanda **+ (Tambah)** &rarr; pilih **Browser**.
3. Beri nama: `Alert Chat TTS`.
4. Isi kolom **URL** dengan:
   ```text
   http://localhost:3030/overlay.html
   ```
5. Atur ukuran:
   - **Width**: `650`
   - **Height**: `220`
6. Klik **OK**. Latar belakang otomatis 100% transparan!

---

## 🔑 Cara Dapatkan YouTube Data API v3 Key Gratis

Google memberikan kuota gratis sebesar 10.000 unit/hari untuk membaca live chat:
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat Project baru (misal: *StreamAlerts*).
3. Cari dan aktifkan **YouTube Data API v3**.
4. Buka menu **Credentials** &rarr; klik **+ CREATE CREDENTIALS** &rarr; pilih **API key**.
5. Salin kode API key dan tempelkan ke kolom API Key di dashboard StreamVox.

---

## 🚀 Cara Upload ke GitHub & Deploy Online di Vercel (Gratis 100%)

Aplikasi ini sudah dilengkapi arsitektur **Vercel Serverless Function** (`api/tts.js`), `package.json`, dan `vercel.json` sehingga langsung siap di-deploy secara online.

### 1. Upload ke GitHub
1. Buka [github.com](https://github.com/) dan buat repository baru (misal beri nama `streamvox-yt`).
2. Pilih status **Public**, lalu klik **Create repository**.
3. Di halaman repository yang baru dibuat, klik tombol / link **"uploading an existing file"**.
4. Buka folder proyek ini di komputer Anda:
   `C:\Users\JAPUY\.gemini\antigravity-ide\scratch\youtube-streamlabs-tts`
5. Drag & drop seluruh file dan folder `api` ke halaman GitHub.
6. Klik **Commit changes**.

### 2. Hubungkan & Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com/) dan login menggunakan akun GitHub Anda.
2. Klik tombol **Add New...** &rarr; pilih **Project**.
3. Cari repository `streamvox-yt` yang baru saja Anda buat, lalu klik **Import**.
4. Biarkan semua setting default, lalu klik **Deploy**!
5. Dalam 30 detik, website online Anda sudah aktif dengan URL seperti:
   `https://streamvox-yt.vercel.app`

### 3. Pasang URL Online di OBS Studio
Gunakan URL Vercel Anda di OBS Studio:
```text
https://nama-projek-anda.vercel.app/overlay.html?v=VIDEO_ID_ANDA&key=API_KEY_ANDA
```
Overlay akan langsung aktif membaca chat live streaming Anda dari mana saja!
