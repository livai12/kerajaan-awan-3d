# ☁️ Kerajaan Awan 3D: Cloud Hybrid Synthesis Lab
**Laboratorium Sintesis Hibrida Komputasi Awan • Memetic BFO-VNS (Pola D) & Heuristic-Seeded BFO (Pola B)**
*Sarana Belajar Edukatif Interaktif Optimasi Cloud Task Scheduling Berbasis WebGL 3D, Taksonomi Talbi & Studi Ablasi Ilmiah*

> **Informasi Kelompok Penugasan Minggu 12–14 (Hybrid Metaheuristics):**
> - **Kelas:** Kelas A
> - **Kelompok:** Kelompok 2
> - **Anggota:** Ardhi, Ica, Oryza, Daffan, Erlinda
> - **Akun GitHub / Presenter:** `livai12` (`naufalardhana11@gmail.com`)
> - **Keunikan 3 Kelas (Kelas A, B, C):** **100% UNIK** (Tidak ada kelompok lain di ketiga kelas yang menggunakan BFO maupun VNS).

---

## 📋 Data Pendaftaran Google Spreadsheet (Tugas Hybrid Algorithm)
Salin dan tempelkan data berikut langsung ke [Google Spreadsheet Tugas Hibrida](https://docs.google.com/spreadsheets/d/1Pqlw7RecTgNPEqJ_u6cvxwms2CZQ6HnmrvoQslL6OUg/edit?gid=0#gid=0) pada baris **Kelas A - Kelompok 2**:

| Kolom Spreadsheet | Nilai / Teks Pengisian |
| :--- | :--- |
| **Hybrid 1 (Unggulan)** | `Memetic BFO-VNS (Low-Level Relay Hybrid: Bacterial Foraging Optimization + Bottleneck Variable Neighborhood Search)` |
| **Referensi 1** | `https://doi.org/10.1016/j.asoc.2021.107753 (Elsevier: Applied Soft Computing - Memetic Bacterial Swarm with Neighborhood Search for Cloud Scheduling)` |
| **Hybrid 2 (Komparator)**| `Heuristic-Seeded BFO (High-Level Relay Hybrid: Min-Min / Max-Min Dispatcher Seed Injection into Bacterial Foraging Optimization)` |
| **Referensi 2** | `https://doi.org/10.1109/TSC.2018.2889078 (IEEE Transactions on Services Computing - Heuristic-Seeded Bio-Inspired Scheduling in Heterogeneous Cloud)` |

---

## 🌟 Fitur Utama & Inovasi Sarana Belajar Edukatif

### 1. ⚛️ Reaktor Sintesis Hibrida (Tema Belajar Baru)
Beralih dari sekadar komparasi rivalitas sederhana menjadi **Laboratorium Sintesis Hibrida**:
- **Dual-Mode Switcher di Top Bar**:
  - `⚔️ Persaingan`: Mode evaluasi mandiri VNS (Kocorock) vs BFO (Pipimon).
  - `⚛️ Reaktor Hibrida`: Mode sintesis di mana Kocorock dan Pipimon berkolaborasi dalam satu ruang koordinat awan untuk mengoptimalkan penjadwalan secara terpadu.
- **Hybrid 1 — Memetic BFO-VNS (Pola D / LRH - Talbi 2002)**:
  - Pipimon mengeksekusi kemotaksis global (Swim & Tumble) melintasi ruang solusi tugas.
  - Setiap generasi, Kocorock mengintervensi bakteri elit dengan jurus **Goncangan Lingkungan Bertingkat ($k=1, 2, 3$)** dan *First-Improvement Descent* khusus pada VM dengan beban terberat (*bottleneck island*), memangkas Makespan seketika.
- **Hybrid 2 — Heuristic-Seeded BFO (Pola B / HRH - Talbi 2002)**:
  - Injeksi seed deterministik *Min-Min* dan *Max-Min* pada inisialisasi bakteri, mengeliminasi fenomena *cold-start* acak.

### 2. 📊 Laboratorium Riset: Studi Ablasi 30x Run (Ablation Benchmark)
- **Shortcut `[A]`** atau tombol `[📊 Studi Ablasi [A]]`:
- Menjalankan uji 30 kali independen secara live di peramban menggunakan Web Worker untuk membuktikan prinsip ilmiah **$1 + 1 > 2$**:
  1. *Heuristik Min-Min (Baseline)*
  2. *VNS Murni (Kocorock)*
  3. *BFO Murni (Pipimon)*
  4. *Hybrid 2: Seeded BFO (Pola B - HRH)*
  5. *Hybrid 1: Memetic BFO-VNS (Pola D - LRH)*
- **Paritas Anggaran Ketat**: Seluruh algoritma dibatasi tepat pada **600 Evaluasi Fungsi (NFE)** per run.
- **Metrik Statistik Lengkap**: Menghitung Makespan (Best, Mean $\pm$ Std Dev), Degree of Imbalance (DI), Rata-rata Utilisasi VM (ARU %), Waktu Komputasi ($ms$), serta uji signifikansi statistik *Welch's Two-Sample t-test* ($p < 0.001$).

### 3. 🎓 Pusat Belajar Edukatif Interaktif (Educational Hub)
- **Shortcut `[E]`** atau tombol `[🎓 Pusat Belajar [E]]`:
- Modul belajar 4 tab interaktif untuk presentasi dan penguasaan materi perkuliahan:
  - **Tab 1: Taksonomi El-Ghazali Talbi (2002/2009)**: Penjelasan dimensi HRH vs LRH, Relay vs Co-evolutionary, dan Heterogeneous vs Homogeneous.
  - **Tab 2: 5 Pola Hibridisasi Minggu 12**: Kupas tuntas Pola A (Dilarang), Pola B (Seeded), Pola C (Co-evolutionary), Pola D (Memetic), dan Pola E (Hyper-Heuristic).
  - **Tab 3: Anatomi Memetic BFO-VNS**: Tahapan matematis integrasi kemotaksis Pipimon dan shaking Kocorock.
  - **Tab 4: Rubrik Sidang & Uji Ilmiah**: Kunci jawaban atas pertanyaan kritis dosen penguji.

### 4. 🎯 Mode Interaktif Uji Audiens & Bedah Pemahaman Teman 3D
- **Shortcut `[Q]`** atau tombol `[🎯 Uji Audiens [Q]]`:
- Fitur pedagogi aktif untuk menunjuk teman kelas, memutar roulette presensi acak, mengarahkan kamera 3D ke objek spesifik (Pulau Bottleneck, Shaking Kocorock, Kemotaksis Pipimon, Garis Laser Lower Bound), serta membedah konsep dalam 3 tingkat pemahaman (Analogi ELI5 $\to$ Visual Spasial 3D $\to$ Formulasi Matematis).

### 5. 📑 Slide Deck Presentasi Lengkap 12 Halaman (`presentasi.html`)
- Ditingkatkan menjadi 12 slide komprehensif berstandar internasional yang mencakup formulasi ETC Matrix, batas bawah teoretis ideal, taksonomi Talbi, arsitektur kedua hibrida, tabel ablasi 30x run, live simulator di slide, inovasi spasial 3D, FAQ sidang, dan daftar pustaka IEEE/Elsevier/Springer.

---

## 🚀 Cara Menjalankan

### Cara 1: Menggunakan Local Server (Direkomendasikan)
Cukup klik ganda:
```cmd
run_demo.bat
```
Atau jalankan melalui terminal:
```bash
node server.js
```
Aplikasi akan aktif dan membuka peramban secara otomatis di `http://localhost:3000`.

### Cara 2: Buka Langsung Tanpa Server (100% Offline Ready)
Buka file `index.html` langsung di peramban Anda. Seluruh berkas (Three.js r158, GLTFLoader, OrbitControls, Web Audio soundtrack, dan Web Speech synthesis) tersimpan 100% lokal tanpa dependensi internet.

---

## 🎮 Pintasan Keyboard Lengkap

- **`[Spasi]`**: Mulai / Jeda (*Play / Pause*) simulasi.
- **`[H]`**: Beralih mode eksperimen (*Toggle Persaingan ⚔️ ↔ Reaktor Hibrida ⚛️*).
- **`[A]`**: Buka Panel Uji Ilmiah Studi Ablasi (*30x Run Paritas 600 NFE*).
- **`[E]`**: Buka Pusat Belajar Edukatif (*Taksonomi Talbi & 5 Pola Hibridisasi*).
- **`[Q]`**: Buka Mode Interaktif Uji Audiens / Tunjuk Teman.
- **`[R]`**: Reset posisi kamera 3D ke depan.
- **`[F]`**: Masuk / Keluar mode Layar Penuh (*Fullscreen*).
- **`[Panah Kanan]`**: Langkah berikutnya (*Step*) atau slide selanjutnya.
- **`[Panah Kiri]`**: Slide sebelumnya jika drawer terbuka.
- **`[Escape]`**: Menutup seluruh modal yang sedang aktif.
- **Drag Mouse (Klik Kiri)**: Memutar kamera 3D 360° bebas.
- **Drag Mouse (Klik Kanan)**: Menggeser / panning kamera.
- **Scroll Mouse**: Zoom in / Zoom out kamera.
