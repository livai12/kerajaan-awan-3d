/**
 * Kerajaan Awan 3D - Modul Engine BFO (Bacterial Foraging Optimization)
 * Karakter: Pip (Bakteri Agar-Agar Translusen)
 * Adaptasi Diskret untuk Cloud Task Scheduling:
 * - Setiap bakteri merepresentasikan satu solusi penempatan task.
 * - Tumble diwujudkan sebagai mutasi acak penempatan satu task.
 * - Swim diwujudkan sebagai langkah perbaikan lanjutan ke arah yang menguntungkan.
 * - Reproduction mempertahankan 50% bakteri terbaik dan menggandakannya.
 * - Elimination-dispersal mereset bakteri acak dengan probabilitas P_ed untuk diversifikasi.
 */

import { calculateMakespan } from './problem.js';

export class BFOEngine {
  constructor(tasks, vms, options = {}) {
    this.tasks = tasks;
    this.vms = vms;
    this.populationSize = options.populationSize || 6; // 6 Pip di 6 dunia mini
    this.maxSwimSteps = options.maxSwimSteps || 2;
    this.eliminationProb = options.eliminationProb || 0.25;
    this.reset();
  }

  reset() {
    this.bacteria = [];
    for (let i = 0; i < this.populationSize; i++) {
      const solution = this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
      const makespan = calculateMakespan(solution, this.tasks, this.vms);
      this.bacteria.push({
        id: i,
        solution,
        makespan,
        health: makespan // semakin kecil semakin sehat
      });
    }

    this.evaluations = this.populationSize;
    this.iteration = 0;
    this.currentPhase = 'chemotaxis'; // 'chemotaxis' | 'reproduction' | 'elimination'
    this.phaseStep = 0;

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
   * Menjalankan 1 sub-siklus atau fase BFO
   */
  step() {
    const events = [];
    this.iteration++;

    // 1. FASE CHEMOTAXIS (Tumble & Swim untuk setiap bakteri Pip)
    for (let bIdx = 0; bIdx < this.bacteria.length; bIdx++) {
      const bac = this.bacteria[bIdx];
      const prevMakespan = bac.makespan;

      // TUMBLE: mutasi 1 task acak ke VM lain
      const taskIdx = Math.floor(Math.random() * this.tasks.length);
      const oldVm = bac.solution[taskIdx];
      let newVm = Math.floor(Math.random() * (this.vms.length - 1));
      if (newVm >= oldVm) newVm++;

      const tumbleSolution = [...bac.solution];
      tumbleSolution[taskIdx] = newVm;
      const tumbleMakespan = calculateMakespan(tumbleSolution, this.tasks, this.vms);
      this.evaluations++;

      events.push({
        type: 'tumble',
        bacteriumIdx: bIdx,
        taskIdx,
        oldVm,
        newVm,
        oldMakespan: prevMakespan,
        newMakespan: tumbleMakespan,
        improved: tumbleMakespan < prevMakespan,
        solution: [...tumbleSolution],
        description: `Pip #${bIdx + 1} berputar (tumble) dan memindahkan kristal #${taskIdx + 1} ke VM #${newVm + 1}. Makespan: ${tumbleMakespan.toFixed(1)}s.`
      });

      // SWIM: jika langkah tumble membaik, berenang (swim) searah
      if (tumbleMakespan < prevMakespan) {
        bac.solution = tumbleSolution;
        bac.makespan = tumbleMakespan;
        bac.health += tumbleMakespan;

        let currentMakespan = tumbleMakespan;
        for (let s = 1; s <= this.maxSwimSteps; s++) {
          // Coba mutasi task lain yang juga ke VM baru atau searah
          const anotherTask = Math.floor(Math.random() * this.tasks.length);
          const swimSolution = [...bac.solution];
          swimSolution[anotherTask] = newVm;
          const swimMakespan = calculateMakespan(swimSolution, this.tasks, this.vms);
          this.evaluations++;

          if (swimMakespan < currentMakespan) {
            bac.solution = swimSolution;
            bac.makespan = swimMakespan;
            bac.health += swimMakespan;
            currentMakespan = swimMakespan;

            events.push({
              type: 'swim',
              bacteriumIdx: bIdx,
              taskIdx: anotherTask,
              toVm: newVm,
              swimStep: s,
              newMakespan: swimMakespan,
              solution: [...swimSolution],
              description: `Arah bernutrisi! Pip #${bIdx + 1} melesat berenang (swim langkah ${s}) membawa kristal #${anotherTask + 1}. Makespan turun ke ${swimMakespan.toFixed(1)}s!`
            });
          } else {
            break; // Stop berenang jika tidak membaik lagi
          }
        }
      }
    }

    // Periksa mahkota kepemimpinan
    const oldBestIdx = this.bestBacterium.id;
    this.updateBest();
    if (this.bestBacterium.id !== oldBestIdx || this.bestBacterium.makespan < this.bestMakespan) {
      events.push({
        type: 'best',
        bestBacteriumIdx: this.bestBacterium.id,
        makespan: this.bestMakespan,
        solution: [...this.bestSolution],
        description: `Mahkota kepemimpinan berpindah ke Pip #${this.bestBacterium.id + 1} dengan Makespan terbaik ${this.bestMakespan.toFixed(1)}s!`
      });
    }

    // 2. FASE REPRODUCTION (Setiap 3 iterasi)
    if (this.iteration % 3 === 0) {
      this.bacteria.sort((a, b) => a.health - b.health);
      const half = Math.floor(this.populationSize / 2);
      const eliminated = [];
      const cloned = [];

      for (let i = 0; i < half; i++) {
        const victimIdx = half + i;
        const healthyIdx = i;
        eliminated.push(this.bacteria[victimIdx].id);
        cloned.push(this.bacteria[healthyIdx].id);

        // Kloning bakteri sehat menggantikan yang mati
        this.bacteria[victimIdx] = {
          id: this.bacteria[victimIdx].id,
          solution: [...this.bacteria[healthyIdx].solution],
          makespan: this.bacteria[healthyIdx].makespan,
          health: this.bacteria[healthyIdx].health
        };
      }

      events.push({
        type: 'reproduce',
        eliminated,
        cloned,
        description: `Fase Reproduksi: Separuh Pip terburuk gugur, separuh Pip tersehat membelah diri dengan gelembung energi!`
      });
    }

    // 3. FASE ELIMINATION & DISPERSAL (Setiap 5 iterasi)
    if (this.iteration % 5 === 0) {
      const dispersed = [];
      for (let i = 0; i < this.bacteria.length; i++) {
        // Jangan buang pemimpin terbaik agar elitism terjaga
        if (this.bacteria[i].id === this.bestBacterium.id) continue;

        if (Math.random() < this.eliminationProb) {
          dispersed.push(this.bacteria[i].id);
          this.bacteria[i].solution = this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
          this.bacteria[i].makespan = calculateMakespan(this.bacteria[i].solution, this.tasks, this.vms);
          this.bacteria[i].health = this.bacteria[i].makespan;
          this.evaluations++;
        }
      }

      if (dispersed.length > 0) {
        events.push({
          type: 'eliminate',
          dispersedIndices: dispersed,
          description: `Eliminasi & Dispersi: Kepulan asap muncul! ${dispersed.length} Pip terlempar ke pulau acak untuk mencegah koloni mandek di jebakan lokal.`
        });
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

