/**
 * Kerajaan Awan 3D - Modul Engine Hybrid 1: Memetic BFO-VNS
 * Pola D (Metaheuristik + Local Search) / Low-Level Relay Hybrid (LRH - Talbi 2002)
 * 
 * Sinergi Dua Karakter (Laboratorium Sintesis Hibrida):
 * - Pipimon (BFO Swarm): Menjelajah ruang pencarian global melalui dinamika Kemotaksis (Tumble & Swim),
 *   Reproduksi, dan Eliminasi-Dispersi.
 * - Kocorock (VNS Local Search): Mengintervensi bakteri elit dengan Goncangan Lingkungan Bertingkat (k=1..3)
 *   dan First-Improvement Descent khusus pada Pulau Bottleneck (VM tersibuk).
 */

import { calculateMakespan, calculateVmLoads } from './problem.js';

export class MemeticBFOVNSEngine {
  constructor(tasks, vms, options = {}) {
    this.tasks = tasks;
    this.vms = vms;
    this.populationSize = options.populationSize || 6;
    this.maxSwimSteps = options.maxSwimSteps || 2;
    this.eliminationProb = options.eliminationProb || 0.2;
    this.kMax = options.kMax || 3;
    this.vnsInterval = options.vnsInterval || 1; // Tiap generasi elit diguncang VNS
    this.maxNFE = options.maxNFE || 600;
    this.reset();
  }

  reset(initialSolution = null) {
    this.bacteria = [];
    this.evaluations = 0;

    for (let i = 0; i < this.populationSize; i++) {
      let solution;
      if (i === 0 && initialSolution) {
        solution = [...initialSolution];
      } else {
        solution = this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
      }
      const makespan = calculateMakespan(solution, this.tasks, this.vms);
      this.evaluations++;
      this.bacteria.push({
        id: i,
        solution,
        makespan,
        health: makespan,
        k: 1
      });
    }

    this.iteration = 0;
    this.updateBest();
    this.history = [{ iteration: 0, makespan: this.bestMakespan, evalCount: this.evaluations }];
  }

  updateBest() {
    this.bacteria.sort((a, b) => a.makespan - b.makespan);
    this.bestBacterium = this.bacteria[0];
    this.bestMakespan = this.bestBacterium.makespan;
    this.bestSolution = [...this.bestBacterium.solution];
  }

  /**
   * 1 Siklus Generasi Memetic Hibrida:
   * 1. Fase BFO Chemotaxis (Pipimon)
   * 2. Fase VNS Local Search pada Elit (Kocorock)
   * 3. Fase Reproduksi & Dispersi
   */
  step() {
    if (this.evaluations >= this.maxNFE) {
      return [{ type: 'completed', message: `Mencapai batas anggaran NFE (${this.maxNFE})` }];
    }

    const events = [];
    this.iteration++;

    // ==================== 1. CHEMOTAXIS PIPIMON (SWARM EXPLORATION) ====================
    for (let bIdx = 0; bIdx < this.bacteria.length; bIdx++) {
      if (this.evaluations >= this.maxNFE) break;
      const bac = this.bacteria[bIdx];

      // TUMBLE: Mutasi 1 task ke VM lain
      const taskIdx = Math.floor(Math.random() * this.tasks.length);
      const oldVm = bac.solution[taskIdx];
      let newVm = Math.floor(Math.random() * (this.vms.length - 1));
      if (newVm >= oldVm) newVm++;

      const tumbleSolution = [...bac.solution];
      tumbleSolution[taskIdx] = newVm;
      const tumbleMakespan = calculateMakespan(tumbleSolution, this.tasks, this.vms);
      this.evaluations++;

      if (tumbleMakespan < bac.makespan) {
        bac.solution = tumbleSolution;
        bac.makespan = tumbleMakespan;
        bac.health += tumbleMakespan;

        events.push({
          type: 'bfo_tumble_success',
          bacteriumIdx: bIdx,
          taskIdx,
          oldVm,
          newVm,
          makespan: tumbleMakespan,
          description: `Pipimon #${bIdx + 1} Tumble sukses: Kristal-${taskIdx + 1} &rarr; VM-${newVm + 1} (Makespan: ${tumbleMakespan.toFixed(1)}s)`
        });

        // SWIM: Teruskan ke arah perbaikan
        let swimStep = 0;
        let lastMakespan = tumbleMakespan;
        while (swimStep < this.maxSwimSteps && this.evaluations < this.maxNFE) {
          const swimTaskIdx = (taskIdx + 1 + swimStep) % this.tasks.length;
          const swimSol = [...bac.solution];
          swimSol[swimTaskIdx] = newVm; // arahkan task berikutnya ke VM yang sama
          const swimMakespan = calculateMakespan(swimSol, this.tasks, this.vms);
          this.evaluations++;

          if (swimMakespan < lastMakespan) {
            bac.solution = swimSol;
            bac.makespan = swimMakespan;
            bac.health += swimMakespan;
            lastMakespan = swimMakespan;
            swimStep++;
            events.push({
              type: 'bfo_swim_success',
              bacteriumIdx: bIdx,
              taskIdx: swimTaskIdx,
              newVm,
              makespan: swimMakespan,
              description: `Pipimon #${bIdx + 1} Berenang maju (Swim step ${swimStep})! Makespan turun: ${swimMakespan.toFixed(1)}s`
            });
          } else {
            break;
          }
        }
      }
    }

    this.updateBest();

    // ==================== 2. MEMETIC VNS DESCENT KOCOROCK (LOCAL EXPLOITATION) ====================
    // Diterapkan pada 2 bakteri terunggul (elite) untuk mengintensifikasi cekungan optimum
    if (this.iteration % this.vnsInterval === 0 && this.evaluations < this.maxNFE) {
      const eliteCount = Math.min(2, this.bacteria.length);
      for (let e = 0; e < eliteCount; e++) {
        if (this.evaluations >= this.maxNFE) break;
        const elite = this.bacteria[e];
        let k = elite.k || 1;

        // VNS SHAKING PADA PULAU BOTTLENECK:
        // Goncang k task dari VM yang paling macet (busiest VM)
        const loads = calculateVmLoads(elite.solution, this.tasks, this.vms);
        const maxLoad = Math.max(...loads);
        const busiestVm = loads.indexOf(maxLoad);
        const tasksOnBusiest = [];
        for (let t = 0; t < this.tasks.length; t++) {
          if (elite.solution[t] === busiestVm) tasksOnBusiest.push(t);
        }

        const shakenSolution = [...elite.solution];
        const perturbed = [];
        if (tasksOnBusiest.length > 0) {
          // Shuffle dan ambil k tasks
          const shakenTasks = [...tasksOnBusiest].sort(() => Math.random() - 0.5).slice(0, Math.min(k, tasksOnBusiest.length));
          for (const tIdx of shakenTasks) {
            let targetVm = Math.floor(Math.random() * (this.vms.length - 1));
            if (targetVm >= busiestVm) targetVm++;
            shakenSolution[tIdx] = targetVm;
            perturbed.push({ taskIdx: tIdx, oldVm: busiestVm, targetVm });
          }
        }

        // FIRST-IMPROVEMENT LOCAL SEARCH: Cari pemindahan task yang langsung memperbaiki makespan
        let currentCandSol = [...shakenSolution];
        let currentCandMakespan = calculateMakespan(currentCandSol, this.tasks, this.vms);
        this.evaluations++;

        let lsImproved = false;
        const candLoads = calculateVmLoads(currentCandSol, this.tasks, this.vms);
        const candBusiest = candLoads.indexOf(Math.max(...candLoads));
        const candIdlest = candLoads.indexOf(Math.min(...candLoads));

        for (let t = 0; t < this.tasks.length; t++) {
          if (this.evaluations >= this.maxNFE) break;
          if (currentCandSol[t] === candBusiest) {
            const testSol = [...currentCandSol];
            testSol[t] = candIdlest;
            const testMakespan = calculateMakespan(testSol, this.tasks, this.vms);
            this.evaluations++;

            if (testMakespan < currentCandMakespan) {
              currentCandSol = testSol;
              currentCandMakespan = testMakespan;
              lsImproved = true;
              break; // First-improvement descent
            }
          }
        }

        // ATURAN PENERIMAAN VNS (Neighborhood Change)
        if (currentCandMakespan < elite.makespan) {
          elite.solution = currentCandSol;
          elite.makespan = currentCandMakespan;
          elite.health = currentCandMakespan;
          elite.k = 1; // Reset radius intensifikasi

          events.push({
            type: 'memetic_vns_improvement',
            bacteriumIdx: e,
            k,
            makespan: currentCandMakespan,
            busiestVm,
            description: `Kocorock mengetuk tongkat (k=${k}) pada Pulau Bottleneck #${busiestVm + 1}! Memetic VNS berhasil menurunkan Makespan &rarr; ${currentCandMakespan.toFixed(1)}s (k direset ke 1)`
          });
        } else {
          elite.k = (k < this.kMax) ? k + 1 : 1; // Diversifikasi
          events.push({
            type: 'memetic_vns_stagnant',
            bacteriumIdx: e,
            k: elite.k,
            description: `Goncangan Kocorock belum membaik, memperluas radius goncangan k &rarr; ${elite.k}`
          });
        }
      }
    }

    this.updateBest();

    // ==================== 3. REPRODUKSI & DISPERSI BFO ====================
    if (this.iteration % 3 === 0 && this.evaluations < this.maxNFE) {
      this.bacteria.sort((a, b) => a.makespan - b.makespan);
      const half = Math.floor(this.bacteria.length / 2);
      for (let i = 0; i < half; i++) {
        // 50% terburuk digantikan salinan 50% terbaik
        const src = this.bacteria[i];
        this.bacteria[half + i] = {
          id: half + i,
          solution: [...src.solution],
          makespan: src.makespan,
          health: src.health,
          k: 1
        };
      }
      events.push({
        type: 'bfo_reproduction',
        description: `Siklus Reproduksi: 50% bakteri terunggul membelah diri mempertahankan kualitas genetis koloni.`
      });

      // Eliminasi-Dispersi Acak (P_ed)
      for (let i = 0; i < this.bacteria.length; i++) {
        if (Math.random() < this.eliminationProb && this.evaluations < this.maxNFE) {
          const randSol = this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
          const randMs = calculateMakespan(randSol, this.tasks, this.vms);
          this.evaluations++;
          this.bacteria[i] = {
            id: i,
            solution: randSol,
            makespan: randMs,
            health: randMs,
            k: 1
          };
          events.push({
            type: 'bfo_elimination',
            bacteriumIdx: i,
            description: `Dispersi Alamiah: Pipimon #${i + 1} bermutasi acak ke kuadran awan baru untuk menghindari jebakan lokal.`
          });
        }
      }
    }

    this.updateBest();
    this.history.push({
      iteration: this.iteration,
      makespan: this.bestMakespan,
      evalCount: this.evaluations
    });

    return events;
  }
}
