/**
 * Kerajaan Awan 3D - Modul Narator (Awan si Pemandu)
 * Menyediakan balon ucapan ramah, Mode Cerita vs Mode Teknis, dan tombol "Analogi Lain".
 */

export class Narrator {
  constructor(containerElement) {
    this.container = containerElement;
    this.mode = 'story'; // 'story' | 'technical'
    this.currentTopic = 'intro';
    this.analogyIndex = 0;

    this.analogies = {
      vns: [
        {
          story: "Bayangkan Kocok sedang menyusun balok-balok mainan di 3 meja. Saat susunan mulai macet di lembah lokal, Kocok sengaja 'mengguncang' meja (shaking) agar balok melompat keluar, lalu merapikannya satu demi satu (local search)!",
          tech: "Variable Neighborhood Search (VNS) menggabungkan shaking bertingkat N_k untuk menghindari jebakan optimum lokal, diikuti local search (move & swap) yang bersifat eksploitatif menuju minimum lokal baru."
        },
        {
          story: "Analogi lain: Seperti merapikan tumpukan buku di rak perpustakaan! Jika rak tengah terlalu penuh, kita ambil beberapa buku acak dan letakkan di rak yang masih longgar sampai tinggi semua rak seimbang.",
          tech: "Analogi alternatif: Penjadwalan berorientasi Load-Balancing. Shaking berperan sebagai mutasi makro non-deterministik, sedangkan local search mengevaluasi first-improvement pada delta makespan antar VM."
        }
      ],
      bfo: [
        {
          story: "Pip adalah bakteri cerdas yang mencari gumpalan nutrisi! Pip berputar (tumble) mencari arah wangi makanan. Jika arahnya membuat beban makin ringan (makin kenyang), Pip berenang lurus (swim) secepat mungkin!",
          tech: "Bacterial Foraging Optimization (BFO) mengemulasi kemotaksis E. coli. Kemotaksis mengeksplorasi gradien nutrisi (fitness function), dilanjutkan fase reproduksi mempertahankan 50% populasi terbaik dan eliminasi-dispersi mencegah konvergensi dini."
        },
        {
          story: "Analogi lain: Seperti kawanan penjelajah yang mencari jalan tercepat di labirin berkabut! Setiap penjelajah mencoba belokan kecil; jika jalan terlihat lapang, mereka lari maju. Penjelajah tersesat digantikan oleh peta terbaik.",
          tech: "Analogi alternatif: Algoritma metaheuristik berbasis populasi diskret. Fase tumble setara stochastic neighbor sampling, sedangkan fase swim mengeksploitasi momentum penurunan makespan sepanjang dimensi yang sama."
        }
      ],
      problem: [
        {
          story: "Selamat datang di Kerajaan Awan! Di sini ada pulau-pulau melayang (VM) dan kristal-kristal bercahaya (Task). Tugas kita adalah membagi kristal agar pulau yang paling lelah (Makespan) bisa selesai secepat mungkin!",
          tech: "Cloud Task Scheduling merupakan masalah optimasi kombinatorial NP-Hard. Tujuannya adalah meminimalkan makespan (max completion time) pada VM heterogen dengan kapasitas komputasi (MIPS) yang berbeda."
        },
        {
          story: "Jika sebuah pulau diberi kristal terlalu berat, benderanya akan naik tinggi dan membuat pulau lain menganggur menunggu. Kuncinya adalah keseimbangan beban!",
          tech: "Objektif utama: Min(Makespan) = Min(max_{j} [Load_j / Speed_j]). Batas ideal (Lower Bound) dihitung dari rasio total panjang task terhadap total kapasitas VM."
        }
      ]
    };

    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="narrator-card">
        <div class="narrator-avatar">
          <div class="cloud-face">☁️</div>
          <div class="narrator-info">
            <span class="narrator-name">Awan si Pemandu</span>
            <div class="mode-badges">
              <button class="btn-mode-toggle" id="btn-toggle-mode">
                Mode: <strong id="current-mode-label">Cerita</strong> 🔄
              </button>
            </div>
          </div>
        </div>

        <div class="speech-bubble" id="speech-bubble-text">
          Halo penjelajah awan! Klik tombol apa pun atau langkah algoritma untuk memulai.
        </div>

        <div class="narrator-actions">
          <button class="btn-analogy" id="btn-alt-analogy">💡 Jelaskan dengan Analogi Lain</button>
        </div>
      </div>
    `;

    this.speechEl = this.container.querySelector('#speech-bubble-text');
    this.modeLabelEl = this.container.querySelector('#current-mode-label');

    this.container.querySelector('#btn-toggle-mode').addEventListener('click', () => {
      this.mode = this.mode === 'story' ? 'technical' : 'story';
      this.modeLabelEl.textContent = this.mode === 'story' ? 'Cerita' : 'Teknis';
      this.refreshCurrentTopic();
    });

    this.container.querySelector('#btn-alt-analogy').addEventListener('click', () => {
      this.analogyIndex = (this.analogyIndex + 1) % 2;
      this.refreshCurrentTopic();
    });
  }

  setTopic(topicKey) {
    if (this.analogies[topicKey]) {
      this.currentTopic = topicKey;
      this.refreshCurrentTopic();
    }
  }

  refreshCurrentTopic() {
    const list = this.analogies[this.currentTopic];
    if (list) {
      const item = list[this.analogyIndex] || list[0];
      const text = this.mode === 'story' ? item.story : item.tech;
      this.say(text);
    }
  }

  say(text) {
    if (this.speechEl) {
      this.speechEl.innerHTML = text;
      this.speechEl.classList.remove('speech-pop');
      void this.speechEl.offsetWidth; // trigger reflow
      this.speechEl.classList.add('speech-pop');
    }
  }

  handleEvent(event) {
    if (event.description) {
      this.say(event.description);
    }
  }
}

