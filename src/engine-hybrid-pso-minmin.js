/**
 * Kerajaan Awan 3D - Modul Engine Hybrid 2: PSO-MinMin
 * Sesuai Dokumen Riset: "Analisis Perbandingan Algoritma Hybrid BFO-VNS dan PSO-MinMin"
 * Pola B (Heuristik -> Metaheuristik) / High-Level Relay Hybrid (HRH - Talbi 2002)
 * 
 * Mekanisme Kerja:
 * 1. Inisialisasi Terarah (Min-Min Heuristic): Partikel awal dibangun dari aturan Min-Min
 *    untuk menghindari Makespan acak yang buruk (cold-start).
 * 2. Pembaruan Partikel (Particle Swarm Optimization): Memperbarui kecepatan (v) dan posisi (x)
 *    berdasarkan pBest dan gBest.
 * 3. Trade-off Kinerja: Konvergensi komputasi sangat cepat (Compute Time rendah),
 *    namun rentan bias pada VM dengan MIPS tinggi (DoI sedang hingga tinggi).
 */

import { calculateMakespan, calculateVmLoads, calculateDegreeOfImbalance, scheduleMinMin, scheduleMaxMin } from './problem.js';

export class PSOMinMinEngine {
  constructor(tasks, vms, options = {}) {
    this.tasks = tasks;
    this.vms = vms;
    this.numParticles = options.numParticles || 10;
    this.omega = options.omega || 0.72; // Bobot inersia
    this.c1 = options.c1 || 1.49;       // Koefisien kognitif (pBest)
    this.c2 = options.c2 || 1.49;       // Koefisien sosial (gBest)
    this.vMax = (this.vms.length - 1) * 0.5;
    this.maxNFE = options.maxNFE || 600;
    this.reset();
  }

  reset() {
    this.particles = [];
    this.evaluations = 0;
    this.iteration = 0;

    // 1. Partikel #0: Inisialisasi Min-Min Heuristic (Deterministik)
    const minMinSol = scheduleMinMin(this.tasks, this.vms);
    const minMinMs = calculateMakespan(minMinSol, this.tasks, this.vms);
    this.evaluations++;

    this.gBestSolution = [...minMinSol];
    this.gBestMakespan = minMinMs;

    this.particles.push({
      id: 0,
      position: minMinSol.map(v => v + (Math.random() - 0.5) * 0.1),
      velocity: this.tasks.map(() => (Math.random() - 0.5) * 0.5),
      discreteSolution: [...minMinSol],
      makespan: minMinMs,
      pBestSolution: [...minMinSol],
      pBestMakespan: minMinMs,
      type: 'Min-Min Seed'
    });

    // 2. Partikel #1: Max-Min Heuristic
    const maxMinSol = scheduleMaxMin(this.tasks, this.vms);
    const maxMinMs = calculateMakespan(maxMinSol, this.tasks, this.vms);
    this.evaluations++;

    if (maxMinMs < this.gBestMakespan) {
      this.gBestMakespan = maxMinMs;
      this.gBestSolution = [...maxMinSol];
    }

    this.particles.push({
      id: 1,
      position: maxMinSol.map(v => v + (Math.random() - 0.5) * 0.1),
      velocity: this.tasks.map(() => (Math.random() - 0.5) * 0.5),
      discreteSolution: [...maxMinSol],
      makespan: maxMinMs,
      pBestSolution: [...maxMinSol],
      pBestMakespan: maxMinMs,
      type: 'Max-Min Seed'
    });

    // 3. Sisa Partikel: Kombinasi Perturbed Seed dan Eksplorasi Acak
    for (let i = 2; i < this.numParticles; i++) {
      let initSol;
      if (i < Math.floor(this.numParticles * 0.6)) {
        // Mutasi ringan dari Min-Min seed
        initSol = [...minMinSol];
        const swapCount = 1 + Math.floor(Math.random() * 2);
        for (let s = 0; s < swapCount; s++) {
          const tIdx = Math.floor(Math.random() * this.tasks.length);
          initSol[tIdx] = Math.floor(Math.random() * this.vms.length);
        }
      } else {
        // Acak murni untuk menjaga diversitas kawanan
        initSol = this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
      }

      const ms = calculateMakespan(initSol, this.tasks, this.vms);
      this.evaluations++;

      if (ms < this.gBestMakespan) {
        this.gBestMakespan = ms;
        this.gBestSolution = [...initSol];
      }

      this.particles.push({
        id: i,
        position: initSol.map(v => v + (Math.random() - 0.5) * 0.2),
        velocity: this.tasks.map(() => (Math.random() - 0.5) * 1.0),
        discreteSolution: [...initSol],
        makespan: ms,
        pBestSolution: [...initSol],
        pBestMakespan: ms,
        type: i < Math.floor(this.numParticles * 0.6) ? 'Perturbed Min-Min' : 'Random Swarm'
      });
    }

    this.bestSolution = [...this.gBestSolution];
    this.bestMakespan = this.gBestMakespan;
    this.history = [{ iteration: 0, makespan: this.bestMakespan, evalCount: this.evaluations }];
  }

  /**
   * 1 Langkah Iterasi PSO (Pembaruan Vektor Kecepatan & Posisi)
   */
  step() {
    if (this.evaluations >= this.maxNFE) {
      return {
        type: 'completed',
        solution: [...this.bestSolution],
        makespan: this.bestMakespan,
        evaluations: this.evaluations,
        message: 'Batas NFE 600 tercapai'
      };
    }

    this.iteration++;
    let improvedThisStep = false;

    for (let i = 0; i < this.particles.length; i++) {
      if (this.evaluations >= this.maxNFE) break;
      const p = this.particles[i];

      // Update kecepatan dan posisi tiap dimensi (task)
      for (let j = 0; j < this.tasks.length; j++) {
        const r1 = Math.random();
        const r2 = Math.random();

        // v_j = w*v_j + c1*r1*(pBest_j - x_j) + c2*r2*(gBest_j - x_j)
        p.velocity[j] = (this.omega * p.velocity[j]) +
          (this.c1 * r1 * (p.pBestSolution[j] - p.position[j])) +
          (this.c2 * r2 * (this.gBestSolution[j] - p.position[j]));

        // Bounding kecepatan
        if (p.velocity[j] > this.vMax) p.velocity[j] = this.vMax;
        if (p.velocity[j] < -this.vMax) p.velocity[j] = -this.vMax;

        p.position[j] += p.velocity[j];

        // Pemetaan diskrit (Bounded Rounding ke rentang [0, vms.length-1])
        let mappedVm = Math.round(p.position[j]);
        if (mappedVm < 0) mappedVm = 0;
        if (mappedVm >= this.vms.length) mappedVm = this.vms.length - 1;
        p.discreteSolution[j] = mappedVm;
      }

      // Evaluasi Makespan
      const ms = calculateMakespan(p.discreteSolution, this.tasks, this.vms);
      this.evaluations++;
      p.makespan = ms;

      // Update Personal Best
      if (ms < p.pBestMakespan) {
        p.pBestMakespan = ms;
        p.pBestSolution = [...p.discreteSolution];
      }

      // Update Global Best
      if (ms < this.gBestMakespan) {
        this.gBestMakespan = ms;
        this.gBestSolution = [...p.discreteSolution];
        improvedThisStep = true;
      }
    }

    this.bestSolution = [...this.gBestSolution];
    this.bestMakespan = this.gBestMakespan;

    this.history.push({
      iteration: this.iteration,
      makespan: this.bestMakespan,
      evalCount: this.evaluations
    });

    return {
      type: improvedThisStep ? 'improved' : 'swarm_move',
      solution: [...this.bestSolution],
      makespan: this.bestMakespan,
      evaluations: this.evaluations,
      iteration: this.iteration
    };
  }
}
