/**
 * Kerajaan Awan 3D - Modul Engine Hybrid 2: Heuristic-Seeded BFO (Min-Min / Max-Min -> BFO)
 * Pola B (Heuristik -> Metaheuristik) / High-Level Relay Hybrid (HRH - Talbi 2002)
 * 
 * Konsep:
 * - Menggunakan dispatching rule deterministik Min-Min dan Max-Min untuk menginjeksi
 *   populasi awal koloni bakteri Pipimon.
 * - Mencegah eksplorasi acak dari titik awal yang buruk (cold start),
 *   sehingga kemotaksis BFO langsung mengeksplorasi lembah optimum berpotensi tinggi.
 */

import { calculateMakespan, scheduleMinMin, scheduleMaxMin } from './problem.js';

export class HeuristicSeededBFOEngine {
  constructor(tasks, vms, options = {}) {
    this.tasks = tasks;
    this.vms = vms;
    this.populationSize = options.populationSize || 6;
    this.maxSwimSteps = options.maxSwimSteps || 2;
    this.eliminationProb = options.eliminationProb || 0.2;
    this.maxNFE = options.maxNFE || 600;
    this.reset();
  }

  reset() {
    this.bacteria = [];
    this.evaluations = 0;

    // Seed 1: Min-Min Heuristic
    const minMinSol = scheduleMinMin(this.tasks, this.vms);
    const minMinMs = calculateMakespan(minMinSol, this.tasks, this.vms);
    this.evaluations++;
    this.bacteria.push({
      id: 0,
      solution: minMinSol,
      makespan: minMinMs,
      health: minMinMs,
      seedType: 'Min-Min'
    });

    // Seed 2: Max-Min Heuristic
    const maxMinSol = scheduleMaxMin(this.tasks, this.vms);
    const maxMinMs = calculateMakespan(maxMinSol, this.tasks, this.vms);
    this.evaluations++;
    this.bacteria.push({
      id: 1,
      solution: maxMinSol,
      makespan: maxMinMs,
      health: maxMinMs,
      seedType: 'Max-Min'
    });

    // Sisa populasi: Mutasi terarah dari seed untuk menjaga diversitas koloni
    for (let i = 2; i < this.populationSize; i++) {
      const baseSol = (i % 2 === 0) ? minMinSol : maxMinSol;
      const mutatedSol = [...baseSol];
      // Acak 2 task
      for (let m = 0; m < 2; m++) {
        const tIdx = Math.floor(Math.random() * this.tasks.length);
        mutatedSol[tIdx] = Math.floor(Math.random() * this.vms.length);
      }
      const ms = calculateMakespan(mutatedSol, this.tasks, this.vms);
      this.evaluations++;
      this.bacteria.push({
        id: i,
        solution: mutatedSol,
        makespan: ms,
        health: ms,
        seedType: 'Perturbed Seed'
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

  step() {
    if (this.evaluations >= this.maxNFE) {
      return [{ type: 'completed', message: `Mencapai batas anggaran NFE (${this.maxNFE})` }];
    }

    const events = [];
    this.iteration++;

    // CHEMOTAXIS (Tumble & Swim)
    for (let bIdx = 0; bIdx < this.bacteria.length; bIdx++) {
      if (this.evaluations >= this.maxNFE) break;
      const bac = this.bacteria[bIdx];

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
          type: 'seeded_bfo_tumble_success',
          bacteriumIdx: bIdx,
          taskIdx,
          oldVm,
          newVm,
          makespan: tumbleMakespan,
          description: `Bakteri #${bIdx + 1} (Seed ${bac.seedType}) perbaikan Tumble: Makespan ${tumbleMakespan.toFixed(1)}s`
        });

        // Swim
        let swimStep = 0;
        let lastMakespan = tumbleMakespan;
        while (swimStep < this.maxSwimSteps && this.evaluations < this.maxNFE) {
          const swimTaskIdx = (taskIdx + 1 + swimStep) % this.tasks.length;
          const swimSol = [...bac.solution];
          swimSol[swimTaskIdx] = newVm;
          const swimMakespan = calculateMakespan(swimSol, this.tasks, this.vms);
          this.evaluations++;

          if (swimMakespan < lastMakespan) {
            bac.solution = swimSol;
            bac.makespan = swimMakespan;
            bac.health += swimMakespan;
            lastMakespan = swimMakespan;
            swimStep++;
          } else {
            break;
          }
        }
      }
    }

    this.updateBest();

    // REPRODUKSI & DISPERSI
    if (this.iteration % 3 === 0 && this.evaluations < this.maxNFE) {
      this.bacteria.sort((a, b) => a.makespan - b.makespan);
      const half = Math.floor(this.bacteria.length / 2);
      for (let i = 0; i < half; i++) {
        const src = this.bacteria[i];
        this.bacteria[half + i] = {
          id: half + i,
          solution: [...src.solution],
          makespan: src.makespan,
          health: src.health,
          seedType: src.seedType
        };
      }

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
            seedType: 'Dispersed'
          };
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
