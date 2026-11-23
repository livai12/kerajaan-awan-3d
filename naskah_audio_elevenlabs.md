# 🎙️ Naskah Audio ElevenLabs: Abyssal Grid 3D
### Penjadwalan Tugas Komputasi Cloud Heterogen (Algoritma Hybrid Memetic BFO-VNS)

> **Panduan Penggunaan ElevenLabs:**
> 1. Buka [ElevenLabs Text to Speech](https://elevenlabs.io/).
> 2. Salin teks per babak di bawah ini beserta tag intonasi dalam kurung siku `[...]`.
> 3. Pilihan Model: **Eleven Multilingual v2** atau **Eleven Turbo v2.5**.
> 4. Rekomendasi Karakter Suara:
>    - **Narator / Intro:** Suara *whispering, deep, atmospheric* (Contoh: *Callum* atau *Daniel*).
>    - **Magma-Kocorock:** Suara *deep, booming, masculine, heroic* (Contoh: *Adam*, *George*, atau *Marcus*).
>    - **Aqua-Pipimon:** Suara *kawaii, cheerful, clear, high-pitch energetic* (Contoh: *Freya*, *Dorothy*, atau *Serena*).

---

## 🎬 Prolog: Pembuka Gerbang Abyssal Grid 3D
*(Dimainkan saat pertama kali pengguna membuka web dan musik lava infernal mulai berdentum)*

**[Narator / Bisikan Atmosferik]:**  
`[whispering] Kedalaman sebelas ribu meter di bawah laut. [mysterious] Di antara rekahan palung magma dan samudera abadi... Selamat datang di markas Abyssal Grid Three-D!`

**[Magma-Kocorock]:**  
`[deep-voice] [booming] Akulah Magma-Kocorock! Penjaga stabilitas infrastruktur data center di palung neraka ini. Di sini, jutaan paket komputasi heterogen mengalir tanpa henti!`

**[Aqua-Pipimon]:**  
`[cheerful] [giggling] Dan aku Aqua-Pipimon! Pemimpin koloni bio-swarm tetesan air samudera! [curious] Lihat, ada penjelajah baru yang tiba di hadapan kita!`

---

## 🚶 Scene 1: Karakter Melompat Maju Menawarkan Tur
*(Aqua-Pipimon melompat lincah mendekat ke arah POV pemain, diikuti langkah gagah Magma-Kocorock)*

**[Aqua-Pipimon]:**  
`[cheerful] [excited] Hai kamu yang ada di sana! [waving] Selamat datang di markas kami! Jangan takut dengan lava pijar di sekelilingmu ya!`

**[Magma-Kocorock]:**  
`[proud] [calm] Kami berdua ditugaskan oleh dosen penguji untuk memecahkan krisis komputasi terberat di abad ini: bagaimana membagi ribuan tugas ke mesin virtual heterogen tanpa ada mesin yang meledak karena kelebihan beban!`

**[Aqua-Pipimon]:**  
`[bouncy] [enthusiastic] Maukah kamu ikut tur pembelajaran eksklusif bersama kami? [whispering] Kami punya Ruang Teater Holografik raksasa di dalam! [cheerful] Di sana, kami berdua akan menjadi gurumu, lengkap dengan layar bioskop interaktif dan mini-game seru! Ayo, tekan tombol Ikuti Tur sekarang!`

---

## 🏛️ Scene 2: Cutscene Transisi ke Teater Holografik
*(Kamera bertransisi sinematik melalui portal pusaran energi menuju Ruang Kelas Teater Bioskop Besar)*

**[Narator]:**  
`[mysterious] Menginisiasi protokol teleportasi... [whispering] Memasuki Auditorium Holografik Abyssal.`

**[Magma-Kocorock]:**  
`[booming] [proud] Selamat datang di Ruang Teater Holografik Abyssal! Perhatikan layar raksasa di tengah panggung ini. Aku dan Pipimon akan berdiri di samping layar untuk memandu setiap konsep penting.`

---

## 📺 Slide 1: Pengantar Cloud Task Scheduling & Tantangan Heterogenitas
*(Layar besar menampilkan arsitektur Cloud Computing dengan 10 tugas dan 3 VM heterogen)*

**[Aqua-Pipimon]:**  
`[academic] [cheerful] Mari kita mulai materi pertama! Di era cloud modern, kita memiliki ribuan tugas dengan panjang instruksi yang berbeda-beda, mulai dari jutaan instruksi tugas ringan hingga tugas komputasi berat.`

**[Magma-Kocorock]:**  
`[deep-voice] [serious] Masalahnya, mesin virtual kita tidak sama alias heterogen! VM Satu berkecepatan kilat tiga ribu lima ratus MIPS, VM Dua dua ribu MIPS, dan VM Tiga seribu MIPS. Jika kita asal menjadwalkan tugas, tugas raksasa bisa menumpuk di mesin yang lambat, memicu bottleneck parah dan pemborosan energi!`

---

## 📺 Slide 2: Formulasi Matematis & Metrik Makespan ($C_{\max}$)
*(Layar besar menampilkan formula Makespan, utilisasi, dan garis Theoretical Lower Bound)*

**[Magma-Kocorock]:**  
`[academic] [focused] Perhatikan rumus emas di layar: Makespan atau C-Max adalah waktu penyelesaian tugas terlama di antara seluruh mesin virtual. Target kita adalah meminimalkan nilai Makespan ini!`

**[Aqua-Pipimon]:**  
`[enthusiastic] Betul sekali! Garis laser biru di layar adalah Theoretical Lower Bound, yaitu batas bawah ideal secara teoretis jika seluruh kapasitas MIPS terpakai seratus persen seimbang tanpa ada mesin yang menganggur!`

---

## 📺 Slide 3: Jurus Shaking Magma-Kocorock (Variable Neighborhood Search)
*(Layar besar menampilkan animasi kapak obsidian Kocorock menghantam bottleneck dengan radius k=1..3)*

**[Magma-Kocorock]:**  
`[booming] [fierce] Sekarang giliranku unjuk gigi! Algoritmaku bernama VNS atau Variable Neighborhood Search. Saat antrean tugas macet di satu pulau, aku menggunakan jurus Shaking dengan radius k bertingkat!`

**[Magma-Kocorock]:**  
`[focused] [proud] Radius k sama dengan satu memindahkan satu tugas bottleneck. Jika belum membaik, radius k diperbesar menjadi dua dan tiga! Dipadukan dengan First-Improvement Descent, tugas segera dipindahkan ke mesin yang lebih longgar. Sangat tajam untuk eksploitasi lokal!`

---

## 📺 Slide 4: Koloni Kemotaksis Aqua-Pipimon (Bacterial Foraging Optimization)
*(Layar besar menampilkan koloni tetesan air Pipimon berenang memindai gradien nutrisi)*

**[Aqua-Pipimon]:**  
`[cheerful] [giggling] Tapi Kocorock sering buntu jika terjebak di optimum lokal! Nah, itulah kehebatan algoritmaku: Bacterial Foraging Optimization!`

**[Aqua-Pipimon]:**  
`[excited] Ribuan bakteri droplet kami berenang memindai seluruh lanskap solusi menggunakan dinamika Kemotaksis, yaitu Tumble dan Swim! Kami berenang menuju konsentrasi nutrisi tertinggi, yaitu Makespan paling rendah. Bakteri terbaik membelah diri pada fase reproduksi, dan eliminasi dispersi mengacak koloni agar tidak pernah tersesat!`

---

## 📺 Slide 5: Reaktor Sintesis Hibrida Memetic BFO-VNS ($1 + 1 > 2$)
*(Layar besar menampilkan fusi inti plasma cyan-magma dan perbandingan kurva konvergensi)*

**[Magma-Kocorock]:**  
`[dramatic] [epic] Dan inilah mahakarya penelitian kita: Reaktor Sintesis Hibrida Memetic BFO-VNS! VNS mandiri cepat namun mudah terjebak. BFO mandiri luas namun lambat konvergen di tahap akhir.`

**[Aqua-Pipimon]:**  
`[joyful] Saat kami berdua bergabung, armada BFO memandu koloni menemukan lembah optimal global, lalu kapak VNS Kocorock mengasah solusi hingga titik Makespan terendah teoretis! Terbukti secara ilmiah: satu tambah satu lebih besar dari dua!`

---

## 🎮 Slide 6: Mini-Game Interaktif - Cloud Dispatcher Challenge
*(Layar besar berubah menjadi papan game interaktif dengan 10 tugas dan 3 VM)*

**[Aqua-Pipimon]:**  
`[playful] [excited] Nah, sekarang giliranmu menguji kemampuan! Kami sudah menyiapkan Cloud Dispatcher Challenge langsung di layar bioskop ini!`

**[Magma-Kocorock]:**  
`[challenging] [grinning] Coba geser sepuluh tugas tersebut ke tiga VM yang tersedia. Bisakah kamu menyeimbangkan beban dan mengalahkan rekor Makespan algoritma hibrida kami? Buktikan kemampuan logikamu sekarang!`

---

## 📊 Slide 7: Hasil Benchmark 30x Run & Kesimpulan untuk Dosen Penguji
*(Layar besar menampilkan tabel komparasi statistik 30 run independen dan chart konvergensi)*

**[Magma-Kocorock]:**  
`[academic] [authoritative] Sebagai penutup akademik, pengujian ketat tiga puluh kali run independen dengan enam ratus evaluasi setara membuktikan: Algoritma Hibrida Memetic berhasil memangkas Makespan hingga tiga puluh empat koma delapan persen dibanding metode tunggal!`

**[Aqua-Pipimon]:**  
`[proud] [warm] Tingkat utilisasi CPU mencapai sembilan puluh dua koma empat persen dengan Degree of Imbalance mendekati nol! [cheerful] Terima kasih sudah mengikuti tur edukasi di markas Abyssal Grid Three-D! Kamu bisa menekan tombol Tutup Teater untuk kembali menjelajah kastil sesuka hatimu!`

---

## 📁 Panduan Penempatan Berkas Audio (Opsional)
Jika Anda ingin menyematkan hasil generate MP3 ElevenLabs ke dalam proyek:
1. Buat folder `audio/` di dalam root direktori proyek: `kerajaan-awan-3d/audio/`
2. Simpan file dengan konvensi nama berikut:
   - `audio/prologue.mp3` : Prologue (Gerbang Masuk)
   - `audio/invite.mp3` : Tawaran Tur Pipimon & Kocorock
   - `audio/cutscene.mp3` : Transisi Warp Portal
   - `audio/slide1.mp3` s/d `audio/slide7.mp3` : Narasi Bab 1 s/d Bab 7
3. Secara default, sistem saat ini telah dilengkapi **Web Speech API & Audio Synthesis bawaan** yang otomatis membacakan narasi secara langsung di browser tanpa perlu generate MP3 terlebih dahulu. Jika file MP3 ditempatkan, Anda dapat langsung mengintegrasikannya dengan instansiasi `new Audio('audio/slide1.mp3').play()`.
