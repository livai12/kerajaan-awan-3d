/**
 * Kerajaan Awan 3D - Modul Riset & Studi Ablasi (Ablation Study Benchmark)
 * Membandingkan algoritma di bawah paritas ketat anggaran NFE (Number of Fitness Evaluations = 600)
 * Sesuai Dokumen Riset: "Analisis Perbandingan Algoritma Hybrid BFO-VNS dan PSO-MinMin untuk Minimasi Makespan"
 * & Panduan Ilmiah Minggu 12 (Taksonomi El-Ghazali Talbi 2002):
 * 1. Min-Min (Heuristik Deterministik Klasik)
 * 2. VNS Murni (Kocorock - Trajectory Metaheuristic)
 * 3. BFO Murni (Pipimon - Swarm Metaheuristic)
 * 4. Hybrid 2: PSO-MinMin (Pola B - HRH: Heuristik + Metaheuristik)
 * 5. Hybrid 1: Memetic BFO-VNS (Pola D - LRH: Metaheuristik + Metaheuristik)
 */

import {
  calculateMakespan,
  calculateVmLoads,
  calculateDegreeOfImbalance,
  calculateResourceUtilization,
  scheduleMinMin,
  createDefaultProblem
} from './problem.js';

import { VNSEngine } from './engine-vns.js';
import { BFOEngine } from './engine-bfo.js';
import { MemeticBFOVNSEngine } from './engine-hybrid-memetic.js';
import { PSOMinMinEngine } from './engine-hybrid-pso-minmin.js';
import { HeuristicSeededBFOEngine } from './engine-hybrid-seeded.js';

/**
 * Menghitung Rata-rata (Mean)
 */
export function calcMean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Menghitung Standar Deviasi Sampel (Std Dev)
 */
export function calcStdDev(arr, mean = null) {
  if (!arr || arr.length <= 1) return 0;
  const m = mean !== null ? mean : calcMean(arr);
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Welch's Two-Sample t-test p-value approximation
 * Menguji signifikansi statistik antara dua populasi independen dengan varians berbeda
 */
export function calcPValue(arrA, arrB) {
  if (!arrA || !arrB) return 1.0;
  const n1 = arrA.length;
  const n2 = arrB.length;
  if (n1 < 2 || n2 < 2) return 1.0;

  const m1 = calcMean(arrA);
  const m2 = calcMean(arrB);
  const s1 = calcStdDev(arrA, m1);
  const s2 = calcStdDev(arrB, m2);

  const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
  if (se === 0) return m1 === m2 ? 1.0 : 0.0001;

  const t = Math.abs((m1 - m2) / se);

  // Degrees of freedom (Welch-Satterthwaite)
  const dfNum = Math.pow((s1 * s1) / n1 + (s2 * s2) / n2, 2);
  const dfDen = Math.pow((s1 * s1) / n1, 2) / (n1 - 1) + Math.pow((s2 * s2) / n2, 2) / (n2 - 1);
  const df = dfDen === 0 ? n1 + n2 - 2 : dfNum / dfDen;

  // Normal / Student-t CDF approximation (Hill's approximation)
  const x = t;
  const a = 1 / (1 + 0.2316419 * x);
  const d = 0.3989423 * Math.exp(-0.5 * x * x);
  let p = d * a * (0.3193815 + a * (-0.3565638 + a * (1.781478 + a * (-1.821256 + a * 1.330274))));
  p = 2 * p; // two-tailed
  return Math.max(0.0001, Math.min(1.0, p));
}

/**
 * Menjalankan satu run algoritma hingga batas NFE tercapai
 */
export function runSingleAlgorithm(algoType, tasks, vms, maxNFE = 600) {
  const startTime = performance.now();
  let bestSolution = null;
  let bestMakespan = Infinity;

  if (algoType === 'minmin') {
    bestSolution = scheduleMinMin(tasks, vms);
    bestMakespan = calculateMakespan(bestSolution, tasks, vms);
    const duration = performance.now() - startTime;
    const loads = calculateVmLoads(bestSolution, tasks, vms);
    return {
      makespan: bestMakespan,
      di: calculateDegreeOfImbalance(loads),
      util: calculateResourceUtilization(loads),
      timeMs: duration,
      nfe: 1
    };
  }

  if (algoType === 'vns') {
    const engine = new VNSEngine(tasks, vms);
    while (engine.evaluations < maxNFE) {
      engine.step();
    }
    bestSolution = engine.bestSolution;
    bestMakespan = engine.bestMakespan;
    const duration = performance.now() - startTime;
    const loads = calculateVmLoads(bestSolution, tasks, vms);
    return {
      makespan: bestMakespan,
      di: calculateDegreeOfImbalance(loads),
      util: calculateResourceUtilization(loads),
      timeMs: duration,
      nfe: engine.evaluations
    };
  }

  if (algoType === 'bfo') {
    const engine = new BFOEngine(tasks, vms, { populationSize: 6 });
    while (engine.evaluations < maxNFE) {
      engine.step();
    }
    bestSolution = engine.bestSolution;
    bestMakespan = engine.bestMakespan;
    const duration = performance.now() - startTime;
    const loads = calculateVmLoads(bestSolution, tasks, vms);
    return {
      makespan: bestMakespan,
      di: calculateDegreeOfImbalance(loads),
      util: calculateResourceUtilization(loads),
      timeMs: duration,
      nfe: engine.evaluations
    };
  }

  if (algoType === 'hybrid_pso_minmin') {
    const engine = new PSOMinMinEngine(tasks, vms, { maxNFE });
    while (engine.evaluations < maxNFE) {
      engine.step();
    }
    bestSolution = engine.bestSolution;
    bestMakespan = engine.bestMakespan;
    const duration = performance.now() - startTime;
    const loads = calculateVmLoads(bestSolution, tasks, vms);
    return {
      makespan: bestMakespan,
      di: calculateDegreeOfImbalance(loads),
      util: calculateResourceUtilization(loads),
      timeMs: duration,
      nfe: engine.evaluations
    };
  }

  if (algoType === 'hybrid_seeded') {
    const engine = new HeuristicSeededBFOEngine(tasks, vms, { maxNFE });
    while (engine.evaluations < maxNFE) {
      engine.step();
    }
    bestSolution = engine.bestSolution;
    bestMakespan = engine.bestMakespan;
    const duration = performance.now() - startTime;
    const loads = calculateVmLoads(bestSolution, tasks, vms);
    return {
      makespan: bestMakespan,
      di: calculateDegreeOfImbalance(loads),
      util: calculateResourceUtilization(loads),
      timeMs: duration,
      nfe: engine.evaluations
    };
  }

  if (algoType === 'hybrid_memetic') {
    const engine = new MemeticBFOVNSEngine(tasks, vms, { maxNFE });
    while (engine.evaluations < maxNFE) {
      engine.step();
    }
    bestSolution = engine.bestSolution;
    bestMakespan = engine.bestMakespan;
    const duration = performance.now() - startTime;
    const loads = calculateVmLoads(bestSolution, tasks, vms);
    return {
      makespan: bestMakespan,
      di: calculateDegreeOfImbalance(loads),
      util: calculateResourceUtilization(loads),
      timeMs: duration,
      nfe: engine.evaluations
    };
  }

  throw new Error(`Tipe algoritma tidak dikenal: ${algoType}`);
}

/**
 * Menjalankan Benchmark Lengkap Studi Ablasi 30x Run
 */
export function runAblationStudy(tasks, vms, runs = 30, maxNFE = 600) {
  const algorithms = [
    { id: 'minmin', name: 'Heuristik Min-Min', category: 'Baseline Heuristik', pattern: '-' },
    { id: 'vns', name: 'VNS Murni (Kocorock)', category: 'Trajectory Metaheuristic', pattern: '-' },
    { id: 'bfo', name: 'BFO Murni (Pipimon)', category: 'Swarm Metaheuristic', pattern: '-' },
    { id: 'hybrid_pso_minmin', name: 'Hybrid 2: PSO-MinMin', category: 'Pola B (HRH)', pattern: 'Heuristik + Metaheuristik' },
    { id: 'hybrid_memetic', name: 'Hybrid 1: Memetic BFO-VNS', category: 'Pola D (LRH)', pattern: 'Metaheuristik + Metaheuristik' }
  ];

  const results = {};

  for (const algo of algorithms) {
    const makespans = [];
    const dis = [];
    const utils = [];
    const times = [];

    const numRuns = (algo.id === 'minmin') ? 1 : runs;
    for (let r = 0; r < numRuns; r++) {
      const res = runSingleAlgorithm(algo.id, tasks, vms, maxNFE);
      makespans.push(res.makespan);
      dis.push(res.di);
      utils.push(res.util);
      times.push(res.timeMs);
    }

    const meanMs = calcMean(makespans);
    const stdMs = calcStdDev(makespans, meanMs);
    const meanDI = calcMean(dis);
    const stdDI = calcStdDev(dis, meanDI);
    const meanUtil = calcMean(utils);
    const stdUtil = calcStdDev(utils, meanUtil);
    const meanTime = calcMean(times);

    results[algo.id] = {
      id: algo.id,
      name: algo.name,
      category: algo.category,
      pattern: algo.pattern,
      runs: numRuns,
      rawMakespans: makespans,
      rawDIs: dis,
      makespan: {
        best: Math.min(...makespans),
        worst: Math.max(...makespans),
        mean: meanMs,
        std: stdMs
      },
      di: {
        best: Math.min(...dis),
        mean: meanDI,
        std: stdDI
      },
      utilization: {
        best: Math.max(...utils),
        mean: meanUtil,
        std: stdUtil
      },
      timeMs: meanTime
    };
  }

  // Hitung uji signifikansi p-value untuk Hybrid 1 (Memetic BFO-VNS) vs yang lain
  const memeticMS = results['hybrid_memetic'].rawMakespans;
  results['hybrid_memetic'].pValueVsBFO = calcPValue(memeticMS, results['bfo'].rawMakespans);
  results['hybrid_memetic'].pValueVsVNS = calcPValue(memeticMS, results['vns'].rawMakespans);
  results['hybrid_memetic'].pValueVsPSOMinMin = calcPValue(memeticMS, results['hybrid_pso_minmin'].rawMakespans);

  return results;
}
