# ☁️ Kerajaan Awan 3D: Kocorock (VNS) vs Pipimon (BFO)
**Interactive 3D Cloud Task Scheduling Visualization • VNS (Variable Neighborhood Search) vs BFO (Bacterial Foraging Optimization)**

Sistem presentasi visualisasi interaktif modern berbasis WebGL Three.js, Glassmorphism UI, dan karakter bergaya Pokémon. Mengadopsi standar estetika visual anime-fantasy, pencahayaan lembut (*soft toon lighting*), kontrol kamera 360° penuh, balon percakapan 3D komik, serta audio narasi suara anak kecil berbahasa Indonesia yang dituturkan langsung oleh para karakter.

---

## 🌟 Fitur Utama

1. **Karakter Pokémon 3D & Animasi Melompat Nyata**:
   - **🗿 Kocorock (VNS - Golem Pengguncang Beban)**:
     - Golem batu berhati tangguh dengan inti kristal amber di dada dan mata anime biru menyala.
     - Melompat melengkung (*parabolic arc jump*) antar pulau dengan fisika *squash & stretch* dan mengentakkan Tongkat Goncang (*Shaking Staff*) setinggi 3.6m untuk membongkar pulau terberat (*bottleneck island*).
   - **🦠 Pipimon (BFO - Koloni Bakteri Cerdas)**:
     - Slime cyan bercahaya dengan mata anime berkilau, pipi merona (*kawaii blush*), dan Mahkota Emas Berduri 5.
     - Berenang dan melompat lincah mengikuti gradien nutrisi (*Chemotaxis*), membelah diri (*Reproduction*), dan menyebar (*Dispersal*).
   - **Dual-Engine Model Switcher**: Tombol `✨ Meshy 3D` (model GLB AI bertekstur modern) ↔ `📐 Prosedural` (model rakitan Three.js murni sesuai rubrik).
   - **3D Floating Billboard Badges**: Tag nama melayang 3D di atas kepala karakter (`🗿 KOCOROCK` & `👑 PIPIMON`) yang selalu menghadap kamera.

2. **💬 3D Comic Speech Bubbles (Balon Percakapan Karakter)**:
   - Balon chat gaya kartun/Pokémon melayang tepat di atas kepala Kocorock dan Pipimon.
   - Karakter secara aktif mengumumkan tindakan mereka saat hendak berpindah pulau (*"Ayo lompat ke Pulau #2 agar beban seimbang!"*, *"Jurus Shaking k=2!"*, *"Chemotaxis berhasil! Makespan turun!"*).
   - Muncul dengan animasi *spring-bounce pop-in* yang halus.

3. **🎙️ Audio Narasi Suara Anak Kecil & Background Music Fantasi**:
   - Menggunakan suara anak kecil/anime kid yang ceria, energik, dan ramah (bukan suara robot kaku atau suara perempuan dewasa).
   - **Karakter yang Menjelaskan Langsung**: Kocorock dan Pipimon saling bergantian bertutur dalam 5 Bab Kisah Awan.
   - **Studio Audio Ducking**: Musik latar fantasi (Web Audio API) secara otomatis mengecil lembut saat karakter berbicara, lalu kembali mengalun indah saat selesai.

4. **🌐 Kontrol Kamera 360° Penuh (Spherical Orbit Controls)**:
   - **Drag Klik-Kiri**: Memutar sudut pandang 360° penuh ke segala arah tanpa batas azimut.
   - **Scroll Mouse**: Zoom in/out mulus dari jarak dekat karakter hingga lanskap langit luas.
   - **Drag Klik-Kanan**: Menggeser posisi pandang (*Pan*).
   - **Tombol `🔄` (Rotasi Sinematik Otomatis)**: Memutar kamera 360° secara otomatis dan sinematik saat presentasi.
   - **Dobel-Klik / Tombol `[R]`**: Reset posisi kamera ke pandangan depan ideal secara instan.

5. **⚡ Batas Ideal Makespan 3D (Theoretical Lower Bound)**:
   - Laser pemandu bercahaya hijau horizontal yang ketinggiannya bergerak dinamis mengikuti batas matematis ideal $L_{\max}^* \ge \lceil \frac{\sum t_j}{\sum s_i} \rceil$.

6. **📊 Modul Presentasi & Rigor Akademik**:
   - **Halaman Slide Presentasi Terpisah (`presentasi.html`)**: Slide deck 8 halaman berstandar akademik tinggi untuk ujian/sidang skripsi, dilengkapi latar Three.js 3D interaktif, formulasi matematis formal (ETC Matrix, Makespan, DI, Lower Bound), pseudocode algoritma, live simulator komparasi 30x run, dan FAQ antisipasi pertanyaan dosen penguji.
   - **Auto-Next 5 Detik Mode Kisah Awan**: Apabila tidak ada aksi tombol 'Lanjut' setelah narasi karakter selesai, sistem otomatis berpindah ke bab berikutnya setelah hitung mundur 5 detik secara mulus.
   - **Kurva Konvergensi Live**: Sparkline chart real-time di sudut kiri bawah.
   - **Drawer Slide Ringkas**: 7 slide materi ringkas di dalam halaman utama.
   - **2D Ground Truth Pane**: Panel visualisasi pemetaan beban kristal per VM dengan Degree of Imbalance (DI).

---

## 🚀 Cara Menjalankan

### Cara 1: Menggunakan Local Server (Direkomendasikan)
Cukup klik ganda:
```cmd
run_demo.bat
```
Server ringan native Node.js akan aktif dan otomatis membuka peramban ke `http://localhost:3000`.

### Cara 2: Buka Langsung Tanpa Server (100% Offline Ready)
Buka file `index.html` langsung di peramban Anda. Seluruh pustaka (Three.js r158, GLTFLoader, OrbitControls) dan audio narasi sudah tersimpan secara lokal tanpa ketergantungan koneksi internet luar.

---

## 🎮 Pintasan Keyboard

- **`[Spasi]`**: Mulai / Jeda (*Play / Pause*) simulasi.
- **`[Panah Kanan]`**: Langkah berikutnya (*Step*) atau slide selanjutnya jika drawer terbuka.
- **`[Panah Kiri]`**: Slide sebelumnya jika drawer terbuka.
- **`[R]`**: Reset posisi kamera 3D ke depan.
- **`[F]`**: Masuk / Keluar mode Layar Penuh (*Fullscreen*).
- **`[Escape]`**: Menutup modal drawer atau panel 2D.
- **Drag Mouse (Klik Kiri)**: Memutar kamera 3D 360° bebas.
- **Drag Mouse (Klik Kanan)**: Menggeser / panning kamera.
- **Scroll Mouse**: Zoom in / Zoom out kamera.
