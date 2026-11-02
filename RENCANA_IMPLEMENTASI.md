# Kerajaan Awan 3D: Konsep Karakter dan Rencana Implementasi

Demo week 10 SOKA: BFO (No. 57) dan VNS (No. 58) untuk cloud task scheduling.
Dokumen ini merapikan ide karakter 3D dan menyusun rencana kerja bertingkat supaya nilai maksimal dan demo tetap aman.

---

## 1. Prinsip utama

1. **Karakter harus menjelaskan, bukan menghias.** Setiap gerakan karakter mewakili satu kejadian algoritma. Kalau sebuah animasi tidak bisa dijawab dengan "ini artinya apa", animasi itu dibuang.
2. **Mesin algoritma terpisah dari tampilan.** Algoritma ditulis sebagai kode murni yang mengeluarkan *event*. Tampilan 2D, tampilan 3D, dan log penjelasan hanya membaca event yang sama. Hasilnya: visual tidak mungkin bohong, dan pindah 2D/3D tidak merusak apa pun.
3. **Dibuat dengan kode.** Karakter dirakit dari primitif Three.js (bola, kapsul, kerucut), bukan model unduhan. Ini sejalan dengan syarat "visualisasi by code", ringan, dan tidak ada risiko lisensi aset.
4. **Selalu ada jalur aman.** Tampilan 2D yang sudah jadi tetap tersedia sebagai cadangan jika WebGL bermasalah di perangkat demo.
5. **Kerjakan berdasarkan prioritas (P0, P1, P2).** P0 wajib selesai, P1 menambah nilai, P2 hanya kalau waktu sisa.

---

## 2. Pemetaan syarat tugas ke fitur

| Syarat dari tugas | Fitur yang memenuhinya | Prioritas |
|---|---|---|
| Presentasi dengan HTML | Satu file HTML, navigasi slide, mode layar penuh | P0 (sudah ada) |
| Ada sumber paper | Slide sumber dengan sitasi lengkap paper tugas (BFO 2026, VNS 2024) dan rujukan asal-usul | P0 |
| Cara kerja algoritma | Fase bernama (shaking, local search, chemotaxis, reproduction, elimination) yang dijalankan per langkah, plus panel "Apa yang baru terjadi?" | P0 (sudah ada) |
| Interaktif | Klik task untuk memindahkan, Langkah/Auto/Ulang, slider task dan VM, kecepatan animasi | P0 |
| Visualisasi yang membuat paham | Karakter 3D yang gerakannya = kejadian algoritma, bar makespan sebagai "sumber kebenaran" | P0/P1 |
| Penjelasan cloud task scheduling | Slide masalah dengan VM heterogen, perbandingan dengan baseline (Round Robin, Random, Greedy) | P1 |
| Visualisasi dibuat dengan kode | Seluruh karakter dan adegan prosedural, tanpa gambar atau model eksternal | P0 |
| Ditunjuk teman, lalu menjelaskan ulang | Mode Cerita dan Mode Teknis, kuis checkpoint, tombol "Jelaskan dengan analogi lain" (bagian 8) | P1 |

---

## 3. Dunia dan karakter

### 3.1 Pemetaan masalah ke objek 3D

| Elemen masalah | Objek di dunia | Catatan |
|---|---|---|
| VM | Pulau melayang | Panjang pulau = kapasitas tampilan. VM cepat bisa diberi warna atau lampu lebih terang |
| Task | Kristal | Ukuran dan panjang = lama eksekusi, warna = identitas task (sama dengan tampilan 2D) |
| Makespan | Bendera di ujung pulau tersibuk | Bendera mengikuti beban terbesar secara live |
| Batas ideal | Garis cahaya putus-putus | Sama seperti tampilan 2D |
| Solusi | Susunan kristal di semua pulau | Satu solusi = satu pemandangan |

### 3.2 Tiga karakter

**Pip, si bakteri (BFO).**
Badan agar-agar translusen, dua mata besar, ekor flagella yang bergoyang. Ada enam Pip (satu per solusi) di enam "dunia mini". Pip terbaik diberi mahkota kecil.

**Kocok, si golem pengocok (VNS).**
Golem batu bulat dengan tongkat. Dia mengangkat dan mengguncang pulau (shaking), lalu merapikan kristal dengan tangannya (local search). Ukuran guncangan k ditunjukkan oleh jumlah ketukan tongkat.

**Awan, pemandu (narator).**
Roh awan kecil yang melayang di sudut layar. Dia menunjuk objek yang sedang dibahas, mengucapkan satu kalimat penjelasan per langkah, dan menjadi karakter yang "menjelaskan ulang" saat penonton belum paham.

Nama dan gaya boleh diganti, selama peran dan aturan animasinya tetap.

### 3.3 Gaya visual

- `MeshToonMaterial` dengan tiga tingkat bayangan, plus outline tipis (teknik inverted hull: duplikat mesh, `BackSide`, skala 1.04). Hasilnya terlihat seperti animasi, bukan 3D mentah.
- Palet sama dengan halaman saat ini: biru-pink-peach, kristal memakai warna GEM yang sama dengan blok 2D.
- Langit, awan, dan bukit tetap berupa lapisan CSS di belakang kanvas 3D (kanvas transparan) supaya murah dan konsisten dengan referensi.

---

## 4. Bahasa animasi: event menjadi gerakan

Ini bagian terpenting untuk skor "visualisasi yang membuat paham". Setiap baris wajib punya makna yang bisa diucapkan saat presentasi.

### 4.1 VNS (Kocok)

| Event algoritma | Animasi | Makna untuk penonton |
|---|---|---|
| `shake(k)` | Kocok mengetuk tongkat k kali, k kristal terlempar ke pulau lain, kamera bergetar ringan | Sengaja merusak solusi agar keluar dari lembah lokal |
| `ls.move` | Kocok mengambil satu kristal dari pulau tersibuk dan menaruhnya di pulau paling longgar | Local search: memindahkan task selama makespan turun |
| `ls.swap` | Dua kristal bertukar tempat sambil berputar | Local search: tukar task antar-VM |
| `accept` | Kocok mengangkat tangan, bendera makespan turun, kilau hijau | Solusi baru lebih baik, simpan |
| `reject` | Kocok menggeleng, pulau kembali ke solusi terbaik, angka k naik | Belum lebih baik, perbesar kocokan |

### 4.2 BFO (Pip)

| Event algoritma | Animasi | Makna untuk penonton |
|---|---|---|
| `tumble` | Pip berputar di tempat lalu menghadap arah acak, satu kristal berpindah | Mencoba satu perubahan kecil |
| `swim` | Pip melesat maju dengan jejak cahaya, satu kristal lagi berpindah | Arah tadi membaik, lanjutkan |
| `reproduce` | Pip terburuk memudar, Pip terbaik membelah dua dengan efek gelembung | Separuh terburuk mati, separuh terbaik berkembang biak |
| `eliminate` | Pip menghilang dengan asap, muncul lagi di dunia acak | Dilempar acak agar tidak terjebak |
| `best` | Mahkota berpindah ke Pip dengan makespan terkecil | Siapa yang sedang memimpin |

### 4.3 Aturan kejelasan

- Hanya satu aksi dimainkan pada satu waktu (antrean), kecepatan bisa diatur 0.5x sampai 3x.
- Setiap aksi dibarengi satu kalimat di panel penjelasan dan balon ucapan Awan.
- Saat Auto aktif, animasi dipersingkat tetapi urutannya tetap sama.

---

## 5. Arsitektur teknis

```
algoritma (JS murni)  ->  event queue  ->  animator (tween)  ->  renderer
   vns.js / bfo.js          {type, data}       memutar event       2D (bar)  dan  3D (Three.js)
                                                                    + log teks + balon Awan
```

**Modul yang disarankan** (semua boleh tetap dalam satu file HTML, hanya dipisah per bagian):

1. `Problem`: data task, VM (kecepatan opsional), fungsi `makespan`, `fitness`.
2. `Engine`: `vns.step()`, `bfo.step()` yang mengembalikan daftar event dan state baru.
3. `Animator`: antrean event, `await playEvent(e)`, kontrol kecepatan, skip.
4. `View2D`: bar yang sudah ada.
5. `View3D`: scene Three.js, pembuat karakter, mapper event ke animasi.
6. `UI`: slide, tombol, kuis, mode presentasi.

**Keputusan teknis:**

- **Three.js**: pakai build UMD yang di-pin ke versi pasti (misalnya r158, `build/three.min.js`) dari `cdn.jsdelivr.net/npm/`. Versi ini sudah punya `CapsuleGeometry`. Periksa kembali URL dan versinya saat implementasi.
- **Kontrol kamera**: `OrbitControls` versi UMD sudah tidak tersedia di versi Three.js terbaru. Tulis kontrol sederhana sendiri (drag untuk memutar dengan batas sudut, scroll untuk zoom), sekitar 40 baris.
- **Mode offline**: untuk hari demo, unduh `three.min.js` dan sisipkan langsung ke dalam file HTML (sekitar 600 KB, jauh di bawah batas ukuran). Internet kampus tidak boleh menjadi satu-satunya titik gagal.
- **Interaksi 3D**: `Raycaster` untuk klik kristal, lalu klik pulau tujuan, sama dengan perilaku 2D.
- **Performa**: batasi `devicePixelRatio` maksimal 2, jangan pakai bayangan dinamis (atau maksimal satu lampu), hentikan `requestAnimationFrame` saat slide bukan aktif atau tab tersembunyi, hormati `prefers-reduced-motion`.
- **Cadangan**: jika `WebGLRenderingContext` tidak tersedia atau FPS di bawah 20 selama 3 detik, otomatis kembali ke View2D dan tampilkan satu kalimat pemberitahuan.
- **Tanda kutip dan teks**: seluruh teks penjelasan tetap di HTML/DOM (bukan di dalam kanvas) agar mudah dibaca dan diubah.

---

## 6. Rencana implementasi bertahap

Estimasi jam untuk satu orang. Sesuaikan dengan jumlah anggota dan sisa hari sebelum demo. Urutan ini sengaja membuat setiap akhir fase sudah layak didemokan.

### Fase 0: Fondasi (P0, 2 sampai 3 jam)
- Pisahkan algoritma menjadi mesin yang mengeluarkan event (bagian 5).
- Pindahkan prototipe 2D yang ada ke pola event + renderer.
- **Selesai jika:** tampilan 2D berjalan persis seperti sebelumnya, tetapi digerakkan oleh event.

### Fase 1: Adegan 3D statis (P0, 3 sampai 4 jam)
- Scene, kamera, lampu, kanvas transparan di atas langit CSS.
- Pulau (VM), kristal (task), bendera makespan, garis ideal.
- Sinkron dengan state: mengubah solusi di 2D langsung terlihat di 3D.
- **Selesai jika:** klik kristal lalu pulau memindahkan task, makespan di 2D dan 3D selalu sama.

### Fase 2: Kocok dan VNS (P0, 3 sampai 4 jam)
- Rakit karakter Kocok dari primitif, buat animasi idle, ketuk tongkat, angkat tangan, geleng.
- Hubungkan event `shake`, `ls.move`, `ls.swap`, `accept`, `reject`.
- **Selesai jika:** satu iterasi VNS bisa dijelaskan hanya dengan menonton Kocok.

### Fase 3: Pip dan BFO (P0, 4 sampai 5 jam)
- Rakit Pip, enam dunia mini, mahkota untuk yang terbaik.
- Hubungkan `tumble`, `swim`, `reproduce`, `eliminate`, `best`.
- **Selesai jika:** satu siklus BFO (tiga fase) bisa diikuti tanpa membaca teks.

### Fase 4: Awan dan pedagogi (P1, 3 sampai 4 jam)
- Karakter Awan dengan balon ucapan, menunjuk objek yang dibahas.
- Mode Cerita (analogi) dan Mode Teknis (istilah dan rumus).
- Kuis checkpoint 4 sampai 6 soal dan tombol "Jelaskan dengan analogi lain" (bagian 8).
- **Selesai jika:** orang yang belum paham bisa dibimbing ulang tanpa membuka slide lain.

### Fase 5: Rigor akademik dan baseline (P1, 3 sampai 4 jam)
- VM heterogen (kecepatan berbeda), waktu eksekusi = panjang task / kecepatan VM.
- Baseline: Random, Round Robin, Greedy (task terpanjang ke VM yang selesai paling awal).
- Eksperimen adil (bagian 7) dan tampilan hasil (rata-rata, simpangan baku, kurva).
- **Selesai jika:** ada satu slide yang menjawab "kenapa harus metaheuristik" dengan angka.

### Fase 6: Polesan dan ketahanan (P1/P2, 2 sampai 3 jam)
- Mode presentasi (font besar, kontrol minimal), pintasan keyboard, layar penuh.
- Cadangan 2D otomatis, three.js disisipkan untuk offline, uji di proyektor.
- Efek tambahan (partikel, suara kecil dengan tombol bisu) hanya jika semuanya di atas sudah beres (P2).
- **Selesai jika:** latihan penuh 3 kali tanpa error.

**Total P0:** sekitar 12 sampai 16 jam. P0 + P1: sekitar 20 sampai 26 jam.

---

## 7. Eksperimen yang adil (menaikkan bobot akademik)

Prototipe sekarang membandingkan kedua algoritma per iterasi. Itu kurang adil karena satu iterasi BFO dan satu iterasi VNS memakai jumlah evaluasi fitness yang berbeda. Perbaikan:

1. **Samakan anggaran**: hitung jumlah evaluasi fitness, beri anggaran yang sama (misalnya 2.000 evaluasi) untuk keduanya, lalu gambar kurva terhadap evaluasi.
2. **Ulang banyak kali**: 30 kali dengan seed berbeda, tampilkan rata-rata dan simpangan baku (atau boxplot sederhana).
3. **Beberapa ukuran masalah**: misalnya 20 task/4 VM, 50 task/8 VM, 100 task/10 VM.
4. **Metrik tambahan**: makespan, rata-rata utilisasi VM, derajat ketidakseimbangan beban.
5. **Baseline**: Random, Round Robin, Greedy, agar terlihat seberapa jauh metaheuristik memperbaiki.
6. **Kesimpulan jujur**: sebutkan kapan masing-masing unggul. Tidak ada pemenang mutlak, dan jawaban jujur lebih dihargai daripada klaim berlebihan.
7. **Catat parameter**: jumlah bakteri, langkah chemotaxis, probabilitas elimination, k maksimum VNS. Tulis di slide, karena penguji sering menanyakannya.
8. **Jelaskan adaptasi**: BFO asli bekerja di ruang kontinu. Untuk scheduling, solusi dikodekan sebagai "task ke VM" (diskret), sehingga langkah tumble diwujudkan sebagai perubahan penempatan satu task. Sebutkan ini terang-terangan sebagai adaptasi, dan cocokkan detailnya dengan paper tugas (2026).

---

## 8. Skrip demo dan sesi menjelaskan ulang

### 8.1 Alur sekitar 7 menit

| Menit | Bagian | Yang ditunjukkan |
|---|---|---|
| 0:00 | Pembuka | Dunia Kerajaan Awan, satu kalimat masalahnya |
| 0:45 | Masalah | Klik task memindahkan ke VM, penonton merasakan sulitnya makespan seimbang |
| 1:45 | VNS | Kocok mengocok dan merapikan, dua iterasi, kurva turun |
| 3:15 | BFO | Pip dan tiga fase, satu siklus penuh |
| 4:45 | Adu | 30 kali percobaan, baseline, kesimpulan jujur |
| 6:00 | Sumber dan ringkasan | Paper, parameter, adaptasi |
| 6:30 | Tanya jawab / ditunjuk | Mode penjelasan ulang |

### 8.2 Mode "jelaskan ulang"

Tugas meminta kalian bisa menjelaskan ulang bagian yang belum dipahami orang yang ditunjuk. Siapkan alatnya:

- **Kuis checkpoint** setelah VNS dan BFO (contoh: "Fase mana yang menjaga eksplorasi?", "Kenapa k dinaikkan saat tidak membaik?"). Jawaban salah membuka penjelasan singkat dari Awan.
- **Tombol "Analogi lain"**: tiap konsep punya dua analogi. VNS: pengocok mainan puzzle, atau mengatur ulang rak buku. BFO: bakteri mencari makanan, atau kawanan semut mencari jalan.
- **Tombol "Ulangi satu langkah"**: memutar ulang event terakhir dengan kecepatan 0.5x dan jeda di tiap fase.
- **Mode Teknis**: menampilkan fungsi, parameter, dan kompleksitas bagi yang ingin lebih dalam.
- **Pembagian peran**: satu orang mengoperasikan, satu orang menjelaskan, dan siapa pun yang ditanya bisa mengambil alih. Latih bertukar peran.

---

## 9. Pertanyaan yang kemungkinan muncul

1. Kenapa makespan sebagai objektif, bukan biaya atau energi? (Karena paling umum dipakai di cloud task scheduling, dan mudah divisualkan. Objektif lain bisa ditambah sebagai bobot.)
2. Apa bedanya eksplorasi dan eksploitasi, dan algoritma mana yang kuat di mana? (Gunakan tabel perbedaan di slide terakhir.)
3. Bagaimana mencegah terjebak optimum lokal? (VNS: shaking dengan k membesar. BFO: elimination-dispersal.)
4. Kenapa parameter dipilih seperti itu? (Sebutkan nilai, alasan singkat, dan bahwa tuning bisa diperluas.)
5. Apakah hasilnya optimal? (Tidak dijamin. Bandingkan dengan batas bawah total beban dibagi jumlah VM.)
6. Bagaimana jika VM tidak identik? (Fase 5: waktu = panjang/kecepatan.)
7. Apa kelemahan implementasi kalian? (Jawab jujur: simulasi, tanpa jaringan dan antrean nyata, parameter belum dituning luas.)

---

## 10. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Animasi 3D mengalihkan dari penjelasan | Penonton terkesan tapi tidak paham | Aturan 1 di bagian 1, bar makespan selalu terlihat, log teks tetap ada |
| WebGL bermasalah di perangkat demo | Layar kosong | Cadangan 2D otomatis, uji di perangkat dan proyektor yang sama |
| Internet kampus buruk | Three.js gagal dimuat | Sisipkan three.min.js ke dalam file HTML |
| Waktu habis | Fitur setengah jadi | Kerjakan per fase, tiap fase layak demo, potong P2 dan P1 dulu |
| Performa berat di laptop biasa | Patah-patah | Low-poly, tanpa bayangan dinamis, batasi pixel ratio, hentikan render saat tidak aktif |
| Pertanyaan teknis tak terjawab | Nilai turun | Bagian 9, semua anggota menguasai parameter dan adaptasi |
| Klaim hasil berlebihan | Kredibilitas turun | Eksperimen adil dan kesimpulan jujur (bagian 7) |

---

## 11. Pembagian kerja yang disarankan

Sesuaikan dengan jumlah anggota kelompok.

- **Engine dan eksperimen**: mesin algoritma, event, baseline, eksperimen adil (Fase 0, 5).
- **3D dan karakter**: scene, Kocok, Pip, animasi (Fase 1, 2, 3).
- **Pedagogi dan konten**: Awan, kuis, analogi, teks Indonesia, sitasi paper (Fase 4 dan slide sumber).
- **Integrasi dan latihan**: mode presentasi, cadangan, uji perangkat, skrip dan latihan demo (Fase 6).

Semua anggota wajib menjalankan seluruh demo minimal sekali dan mampu menjelaskan kedua algoritma.

---

## 12. Daftar periksa H-1

- [ ] Sitasi paper tugas (BFO 2026, VNS 2024) sudah lengkap dan benar
- [ ] Three.js tersisip di file, demo jalan tanpa internet
- [ ] Diuji di laptop demo dan proyektor/layar yang sama
- [ ] Cadangan 2D teruji (matikan WebGL secara sengaja)
- [ ] Parameter dan adaptasi diskret tertulis di slide
- [ ] Hasil eksperimen sama dengan yang ditampilkan (seed dicatat)
- [ ] Latihan penuh 3 kali, termasuk simulasi ditunjuk dan menjelaskan ulang
- [ ] Setiap anggota bisa menjawab daftar pertanyaan di bagian 9
- [ ] Salinan file di flashdisk dan drive
