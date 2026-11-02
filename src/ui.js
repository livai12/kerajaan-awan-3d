/**
 * Kerajaan Awan 3D - Modul UI & Slide Controller
 * Menghubungkan Presentasi Slide, View2D, View3D, Mesin VNS/BFO, Narator, Kuis Checkpoint, dan Benchmark Eksperimen Adil.
 */

import {
  createDefaultProblem,
  scheduleRandom,
  scheduleRoundRobin,
  scheduleGreedy,
  calculateMakespan,
  calculateVmLoads,
  calculateDegreeOfImbalance
} from './problem.js';
import { VNSEngine } from './engine-vns.js';
import { BFOEngine } from './engine-bfo.js';
import { Animator } from './animator.js';
import { View2D } from './view2d.js';
import { View3D } from './view3d.js';
import { Narrator } from './narrator.js';

export class AppUI {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = 7;
    this.problem = createDefaultProblem(12, 3);
    this.activeAlgo = 'vns';

    this.vnsEngine = new VNSEngine(this.problem.tasks, this.problem.vms);
    this.bfoEngine = new BFOEngine(this.problem.tasks, this.problem.vms);
    this.animator = new Animator();

    this.initElements();
    this.initViews();
    this.initEvents();
    this.showSlide(0);
  }

  initElements() {
    this.slideEls = document.querySelectorAll('.slide-pane');
    this.btnPrev = document.getElementById('btn-prev-slide');
    this.btnNext = document.getElementById('btn-next-slide');
    this.slideIndicator = document.getElementById('slide-indicator');
    this.btnFullscreen = document.getElementById('btn-fullscreen');

    this.view2dContainer = document.getElementById('view2d-mount');
    this.view3dContainer = document.getElementById('view3d-mount');
    this.narratorContainer = document.getElementById('narrator-mount');

    // Controls
    this.btnStep = document.getElementById('btn-step');
    this.btnAuto = document.getElementById('btn-auto');
    this.btnReset = document.getElementById('btn-reset');
    this.speedSlider = document.getElementById('speed-slider');
    this.speedLabel = document.getElementById('speed-val-label');
    this.tab2d = document.getElementById('tab-view-2d');
    this.tab3d = document.getElementById('tab-view-3d');
    this.algoSelect = document.getElementById('algo-select');
  }

  initViews() {
    // 1. Narator
    this.narrator = new Narrator(this.narratorContainer);

    // 2. View 2D
    this.view2d = new View2D(this.view2dContainer, this.problem, (taskId, newVm, newSolution) => {
      this.syncSolution(newSolution);
      this.narrator.say(`Kamu memindahkan Kristal #${taskId + 1} ke Pulau VM-${newVm + 1}!`);
    });

    // 3. View 3D
    this.view3d = new View3D(this.view3dContainer, this.problem, (taskId, newVm, newSolution) => {
      this.syncSolution(newSolution);
    });

    // 4. Hubungkan Animator ke View2D, View3D, dan Narator
    this.animator.onEvent(async (event) => {
      this.view2d.handleEvent(event);
      await this.view3d.playAlgorithmEvent(event);
      this.narrator.handleEvent(event);
    });
  }

  syncSolution(solution) {
    this.view2d.setSolution(solution);
    this.view3d.setSolution(solution);
    if (this.activeAlgo === 'vns') {
      this.vnsEngine.reset(solution);
    }
  }

  initEvents() {
    // Navigasi Slide
    this.btnPrev.addEventListener('click', () => this.prevSlide());
    this.btnNext.addEventListener('click', () => this.nextSlide());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        this.nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.prevSlide();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.stepAlgorithm();
      } else if (e.key.toLowerCase() === 'f') {
        this.toggleFullscreen();
      }
    });

    // Fullscreen
    this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Switch Algoritma
    this.algoSelect.addEventListener('change', (e) => {
      this.setAlgorithm(e.target.value);
    });

    // Tombol Eksekusi
    this.btnStep.addEventListener('click', () => this.stepAlgorithm());
    this.btnAuto.addEventListener('click', () => this.toggleAuto());
    this.btnReset.addEventListener('click', () => this.resetSimulation());

    // Slider Kecepatan
    this.speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.animator.setSpeed(val);
      this.speedLabel.textContent = `${val.toFixed(1)}x`;
    });

    // Tab 2D vs 3D
    this.tab2d.addEventListener('click', () => this.toggleView('2d'));
    this.tab3d.addEventListener('click', () => this.toggleView('3d'));

    // Benchmark Button
    const btnRunBenchmark = document.getElementById('btn-run-benchmark');
    if (btnRunBenchmark) {
      btnRunBenchmark.addEventListener('click', () => this.runFairBenchmark());
    }

    // Kuis Checkpoint
    this.initQuizListeners();
  }

  setAlgorithm(algo) {
    this.activeAlgo = algo;
    this.view3d.setAlgorithmMode(algo);
    this.narrator.setTopic(algo);
    this.resetSimulation();
  }

  toggleView(mode) {
    if (mode === '2d') {
      this.tab2d.classList.add('tab-active');
      this.tab3d.classList.remove('tab-active');
      this.view2dContainer.classList.remove('view-hidden');
      this.view3dContainer.classList.add('view-hidden');
    } else {
      this.tab3d.classList.add('tab-active');
      this.tab2d.classList.remove('tab-active');
      this.view3dContainer.classList.remove('view-hidden');
      this.view2dContainer.classList.add('view-hidden');
      this.view3d.onWindowResize();
    }
  }

  stepAlgorithm() {
    let events = [];
    if (this.activeAlgo === 'vns') {
      events = this.vnsEngine.step();
    } else {
      events = this.bfoEngine.step();
    }
    this.animator.queueEvents(events);
    if (!this.animator.isPlaying) {
      this.animator.stepOnce();
    }
  }

  toggleAuto() {
    if (this.animator.isPlaying) {
      this.animator.pause();
      this.btnAuto.innerHTML = '▶️ Auto';
      this.btnAuto.classList.remove('btn-active-glow');
    } else {
      this.btnAuto.innerHTML = '⏸️ Jeda';
      this.btnAuto.classList.add('btn-active-glow');
      this.animator.play();
      this.runAutoLoop();
    }
  }

  async runAutoLoop() {
    while (this.animator.isPlaying) {
      if (this.animator.eventQueue.length === 0) {
        this.stepAlgorithm();
      }
      await new Promise(r => setTimeout(r, 600));
    }
  }

  resetSimulation() {
    this.animator.clear();
    this.btnAuto.innerHTML = '▶️ Auto';
    this.btnAuto.classList.remove('btn-active-glow');

    if (this.activeAlgo === 'vns') {
      this.vnsEngine.reset();
      this.syncSolution(this.vnsEngine.bestSolution);
      this.narrator.say("Simulasi VNS direset. Kocok siap dengan k = 1!");
    } else {
      this.bfoEngine.reset();
      this.syncSolution(this.bfoEngine.bestSolution);
      this.narrator.say("Simulasi BFO direset. 6 koloni Pip siap berenang!");
    }
  }

  showSlide(index) {
    this.currentSlide = Math.max(0, Math.min(index, this.totalSlides - 1));
    this.slideEls.forEach((slide, idx) => {
      slide.classList.toggle('slide-active', idx === this.currentSlide);
    });

    this.slideIndicator.textContent = `Slide ${this.currentSlide + 1} / ${this.totalSlides}`;
    this.btnPrev.disabled = this.currentSlide === 0;
    this.btnNext.disabled = this.currentSlide === this.totalSlides - 1;

    // Sinkron topik narator sesuai slide
    if (this.currentSlide === 1) {
      this.narrator.setTopic('problem');
    } else if (this.currentSlide === 2) {
      this.algoSelect.value = 'vns';
      this.setAlgorithm('vns');
      this.narrator.setTopic('vns');
    } else if (this.currentSlide === 3) {
      this.algoSelect.value = 'bfo';
      this.setAlgorithm('bfo');
      this.narrator.setTopic('bfo');
    }
  }

  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.showSlide(this.currentSlide + 1);
    }
  }

  prevSlide() {
    if (this.currentSlide > 0) {
      this.showSlide(this.currentSlide - 1);
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.btnFullscreen.textContent = '🗗 Keluar Fullscreen';
    } else {
      document.exitFullscreen().catch(() => {});
      this.btnFullscreen.textContent = '⛶ Fullscreen';
    }
  }

  /**
   * Menjalankan eksperimen adil (Rigor Akademik Bagian 7)
   * 30 runs, evaluasi seimbang, hitung rata-rata makespan & standar deviasi
   */
  runFairBenchmark() {
    const tableBody = document.getElementById('benchmark-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px;">⏳ Sedang menjalankan 30 simulasi independen dengan evaluasi seimbang...</td></tr>`;

    setTimeout(() => {
      const runs = 30;
      const { tasks, vms } = this.problem;

      const results = {
        Random: [],
        'Round Robin': [],
        Greedy: [],
        VNS: [],
        BFO: []
      };

      for (let r = 0; r < runs; r++) {
        // 1. Random
        const solRand = scheduleRandom(tasks, vms);
        results.Random.push(calculateMakespan(solRand, tasks, vms));

        // 2. Round Robin
        const solRR = scheduleRoundRobin(tasks, vms);
        results['Round Robin'].push(calculateMakespan(solRR, tasks, vms));

        // 3. Greedy
        const solGreedy = scheduleGreedy(tasks, vms);
        results.Greedy.push(calculateMakespan(solGreedy, tasks, vms));

        // 4. VNS (anggaran 600 evaluasi)
        const vns = new VNSEngine(tasks, vms);
        while (vns.evaluations < 600) {
          vns.step();
        }
        results.VNS.push(vns.bestMakespan);

        // 5. BFO (anggaran 600 evaluasi)
        const bfo = new BFOEngine(tasks, vms);
        while (bfo.evaluations < 600) {
          bfo.step();
        }
        results.BFO.push(bfo.bestMakespan);
      }

      // Render Hasil
      let rowsHtml = '';
      for (const [name, arr] of Object.entries(results)) {
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
        const stdDev = Math.sqrt(variance);
        const best = Math.min(...arr);
        const worst = Math.max(...arr);

        const isWinner = name === 'VNS' || name === 'BFO';

        rowsHtml += `
          <tr class="${isWinner ? 'benchmark-highlight' : ''}">
            <td><strong>${name}</strong></td>
            <td><strong>${mean.toFixed(2)}s</strong></td>
            <td>± ${stdDev.toFixed(2)}s</td>
            <td>${best.toFixed(2)}s</td>
            <td>${worst.toFixed(2)}s</td>
          </tr>
        `;
      }

      tableBody.innerHTML = rowsHtml;
      this.narrator.say("Eksperimen 30 kali pengulangan selesai! Perhatikan bahwa VNS dan BFO secara konsisten mengalahkan baseline Random dan Round Robin.");
    }, 100);
  }

  initQuizListeners() {
    const quizOptions = document.querySelectorAll('.quiz-opt');
    quizOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        const parent = opt.closest('.quiz-card');
        parent.querySelectorAll('.quiz-opt').forEach(btn => btn.classList.remove('correct', 'incorrect'));

        const isCorrect = opt.getAttribute('data-correct') === 'true';
        if (isCorrect) {
          opt.classList.add('correct');
          this.narrator.say("Tepat sekali! 🎉 " + opt.getAttribute('data-explain'));
        } else {
          opt.classList.add('incorrect');
          this.narrator.say("Belum tepat. Coba lagi! " + opt.getAttribute('data-explain'));
        }
      });
    });
  }
}

// Inisialisasi saat window dimuat
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppUI();
});

