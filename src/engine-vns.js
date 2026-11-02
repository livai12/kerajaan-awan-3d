/**
 * Kerajaan Awan 3D - Modul Engine VNS (Variable Neighborhood Search)
 * Karakter: Kocok (Golem Pengocok)
 * Mesin murni: mengeluarkan event { type, data } untuk dikonsumsi View2D, View3D, dan Narator.
 */

import { calculateMakespan, calculateVmLoads } from './problem.js';

export class VNSEngine {
  constructor(tasks, vms, options = {}) {
    this.tasks = tasks;
    this.vms = vms;
    this.kMax = options.kMax || 3;
    this.reset();
  }

  reset(initialSolution = null) {
    if (initialSolution) {
      this.currentSolution = [...initialSolution];
    } else {
      // Inisialisasi acak
      this.currentSolution = this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
    }
    this.bestSolution = [...this.currentSolution];
    this.currentMakespan = calculateMakespan(this.currentSolution, this.tasks, this.vms);
    this.bestMakespan = this.currentMakespan;
    this.k = 1;
    this.iteration = 0;
    this.evaluations = 1;
    this.history = [{ iteration: 0, makespan: this.bestMakespan, evalCount: this.evaluations }];
  }

  /**
   * Menjalankan 1 siklus VNS penuh: Shaking(k) -> Local Search -> Move or Not
   * Mengembalikan daftar event yang terjadi selama siklus ini.
   */
  step() {
    const events = [];
    this.iteration++;

    // 1. SHAKING (Goncangan lingkungan ke-k)
    const shakenSolution = [...this.bestSolution];
    const perturbedTasks = [];

    // Pilih k task acak dan pindahkan ke VM lain secara acak
    const taskIndices = Array.from({ length: this.tasks.length }, (_, i) => i);
    // Shuffle
    for (let i = taskIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [taskIndices[i], taskIndices[j]] = [taskIndices[j], taskIndices[i]];
    }

    const tasksToShake = taskIndices.slice(0, Math.min(this.k, this.tasks.length));
    for (const taskIdx of tasksToShake) {
      const oldVm = shakenSolution[taskIdx];
      let newVm = Math.floor(Math.random() * (this.vms.length - 1));
      if (newVm >= oldVm) newVm++;
      shakenSolution[taskIdx] = newVm;
      perturbedTasks.push({ taskIdx, oldVm, newVm });
    }

    events.push({
      type: 'shake',
      k: this.k,
      perturbedTasks,
      solution: [...shakenSolution],
      description: `Kocok mengetuk tongkat ${this.k} kali: ${this.k} kristal tergoncang ke pulau lain untuk melompat dari jebakan lokal.`
    });

    // 2. LOCAL SEARCH (Pencarian lokal: Move dari pulau tersibuk ke pulau terlengang)
    let candidateSolution = [...shakenSolution];
    let candidateMakespan = calculateMakespan(candidateSolution, this.tasks, this.vms);
    this.evaluations++;

    let improvedInLS = false;
    const loads = calculateVmLoads(candidateSolution, this.tasks, this.vms);
    const busiestVm = loads.indexOf(Math.max(...loads));
    const idlestVm = loads.indexOf(Math.min(...loads));

    // Cari satu task di busiestVm yang jika dipindah ke idlestVm menurunkan makespan
    const busiestTasks = [];
    candidateSolution.forEach((vm, idx) => {
      if (vm === busiestVm) busiestTasks.push(idx);
    });

    for (const tIdx of busiestTasks) {
      const testSolution = [...candidateSolution];
      testSolution[tIdx] = idlestVm;
      const testMakespan = calculateMakespan(testSolution, this.tasks, this.vms);
      this.evaluations++;

      if (testMakespan < candidateMakespan) {
        candidateSolution = testSolution;
        const delta = candidateMakespan - testMakespan;
        candidateMakespan = testMakespan;
        improvedInLS = true;

        events.push({
          type: 'ls.move',
          taskIdx: tIdx,
          fromVm: busiestVm,
          toVm: idlestVm,
          newMakespan: candidateMakespan,
          improvement: delta,
          solution: [...candidateSolution],
          description: `Kocok merapikan kristal #${tIdx + 1} dari pulau tersibuk (#${busiestVm + 1}) ke pulau terlonggar (#${idlestVm + 1}). Beban turun ${delta.toFixed(1)}s!`
        });
        break; // Terapkan perbaikan pertama
      }
    }

    // Jika belum membaik, coba swap 2 task antar dua VM
    if (!improvedInLS && busiestTasks.length > 0) {
      const idlestTasks = [];
      candidateSolution.forEach((vm, idx) => {
        if (vm === idlestVm) idlestTasks.push(idx);
      });

      if (idlestTasks.length > 0) {
        const t1 = busiestTasks[0];
        const t2 = idlestTasks[0];
        const testSolution = [...candidateSolution];
        testSolution[t1] = idlestVm;
        testSolution[t2] = busiestVm;
        const testMakespan = calculateMakespan(testSolution, this.tasks, this.vms);
        this.evaluations++;

        if (testMakespan < candidateMakespan) {
          candidateSolution = testSolution;
          candidateMakespan = testMakespan;
          events.push({
            type: 'ls.swap',
            taskA: t1,
            taskB: t2,
            vmA: busiestVm,
            vmB: idlestVm,
            newMakespan: candidateMakespan,
            solution: [...candidateSolution],
            description: `Kocok menukar posisi kristal #${t1 + 1} dan kristal #${t2 + 1} antar pulau.`
          });
        }
      }
    }

    // 3. SELECTION / ACCEPTANCE (Neighborhood change)
    if (candidateMakespan < this.bestMakespan) {
      const diff = this.bestMakespan - candidateMakespan;
      this.bestSolution = [...candidateSolution];
      this.bestMakespan = candidateMakespan;
      this.k = 1; // Reset k ke lingkungan terkecil
      events.push({
        type: 'accept',
        makespan: this.bestMakespan,
        improvement: diff,
        k: this.k,
        solution: [...this.bestSolution],
        description: `Hebat! Solusi lebih baik ditemukan (Makespan: ${this.bestMakespan.toFixed(1)}s, hemat ${diff.toFixed(1)}s). Kocok merayakan dan mereset k = 1.`
      });
    } else {
      this.k = (this.k % this.kMax) + 1; // Perbesar radius goncangan k
      events.push({
        type: 'reject',
        makespan: this.bestMakespan,
        nextK: this.k,
        solution: [...this.bestSolution],
        description: `Belum menemukan solusi yang lebih unggul. Kocok menggeleng, mempertahankan solusi terbaik sebelumnya, dan menaikkan goncangan ke k = ${this.k}.`
      });
    }

    this.history.push({
      iteration: this.iteration,
      makespan: this.bestMakespan,
      evalCount: this.evaluations
    });

    return events;
  }
}

