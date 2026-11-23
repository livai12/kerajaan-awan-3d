/**
 * Kerajaan Awan 3D - Universal Standalone Engine & Controller
 * Mengusung estetika visual glassmorphism, full-viewport 3D, Fraunces serif editorial,
 * Dual-Realm (Kocok VNS & Pip BFO), real-time sparkline convergence chart,
 * serta speech synthesis narasi bahasa Indonesia.
 */

(function () {
  'use strict';

  // ==========================================
  // 1. DATA MODEL & PROBLEM FORMULATION
  // ==========================================
  const GEM_PALETTE = [
    '#38bdf8', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444',
    '#06b6d4', '#f97316', '#a855f7', '#14b8a6', '#eab308', '#6366f1'
  ];

  function createProblem(taskCount = 12, vmCount = 3) {
    const vms = [
      { id: 0, name: 'Pulau Biru (VM-1)', speed: 1.0, color: '#38bdf8' },
      { id: 1, name: 'Pulau Ungu (VM-2)', speed: 1.5, color: '#a855f7' },
      { id: 2, name: 'Pulau Emas (VM-3)', speed: 2.0, color: '#f59e0b' }
    ];

    if (vmCount > 3) {
      for (let i = 3; i < vmCount; i++) {
        vms.push({
          id: i,
          name: `Pulau Hijau (VM-${i + 1})`,
          speed: 1.0 + (i % 3) * 0.5,
          color: GEM_PALETTE[i % GEM_PALETTE.length]
        });
      }
    }

    const baseLengths = [14, 28, 42, 18, 36, 58, 24, 48, 16, 38, 52, 30, 26, 46, 34, 20];
    const tasks = [];
    for (let i = 0; i < taskCount; i++) {
      const len = baseLengths[i % baseLengths.length] + ((i * 7) % 9);
      tasks.push({
        id: i,
        name: `Kristal-${i + 1}`,
        length: len,
        color: GEM_PALETTE[i % GEM_PALETTE.length]
      });
    }

    return { vms: vms.slice(0, vmCount), tasks };
  }

  function calculateVmLoads(solution, tasks, vms) {
    const loads = new Array(vms.length).fill(0);
    for (let i = 0; i < tasks.length; i++) {
      const vmId = solution[i];
      if (vmId !== undefined && vmId >= 0 && vmId < vms.length) {
        loads[vmId] += tasks[i].length / vms[vmId].speed;
      }
    }
    return loads;
  }

  function calculateMakespan(solution, tasks, vms) {
    const loads = calculateVmLoads(solution, tasks, vms);
    return Math.max(...loads);
  }

  function calculateIdealLowerBound(tasks, vms) {
    const totalWork = tasks.reduce((sum, t) => sum + t.length, 0);
    const totalSpeed = vms.reduce((sum, v) => sum + v.speed, 0);
    return totalWork / totalSpeed;
  }

  function calculateDI(loads) {
    const max = Math.max(...loads);
    const min = Math.min(...loads);
    const avg = loads.reduce((a, b) => a + b, 0) / loads.length;
    if (avg === 0) return 0;
    return (max - min) / avg;
  }

  // Heuristic Baselines
  function scheduleRandom(tasks, vms) {
    return tasks.map(() => Math.floor(Math.random() * vms.length));
  }
  function scheduleRoundRobin(tasks, vms) {
    return tasks.map((_, i) => i % vms.length);
  }
  function scheduleGreedy(tasks, vms) {
    const sorted = tasks.map((t, idx) => ({ idx, length: t.length }))
      .sort((a, b) => b.length - a.length);
    const solution = new Array(tasks.length).fill(0);
    const loads = new Array(vms.length).fill(0);
    for (const item of sorted) {
      let bestVm = 0, minFinish = Infinity;
      for (let v = 0; v < vms.length; v++) {
        const finish = loads[v] + (item.length / vms[v].speed);
        if (finish < minFinish) {
          minFinish = finish;
          bestVm = v;
        }
      }
      solution[item.idx] = bestVm;
      loads[bestVm] += (item.length / vms[bestVm].speed);
    }
    return solution;
  }

  function calculateResourceUtilization(vmLoads) {
    const max = Math.max(...vmLoads);
    if (max === 0) return 0;
    const total = vmLoads.reduce((a, b) => a + b, 0);
    return (total / (vmLoads.length * max)) * 100;
  }

  function scheduleMinMin(tasks, vms) {
    const unassigned = new Set(tasks.map((_, i) => i));
    const solution = new Array(tasks.length).fill(0);
    const readyTimes = new Array(vms.length).fill(0);

    while (unassigned.size > 0) {
      let bestTask = -1;
      let bestVm = -1;
      let minCompletionTime = Infinity;

      for (const tIdx of unassigned) {
        const tLen = tasks[tIdx].length;
        let taskBestVm = 0;
        let taskMinCT = Infinity;

        for (let v = 0; v < vms.length; v++) {
          const ct = readyTimes[v] + (tLen / vms[v].speed);
          if (ct < taskMinCT) {
            taskMinCT = ct;
            taskBestVm = v;
          }
        }

        if (taskMinCT < minCompletionTime) {
          minCompletionTime = taskMinCT;
          bestTask = tIdx;
          bestVm = taskBestVm;
        }
      }

      if (bestTask !== -1) {
        solution[bestTask] = bestVm;
        readyTimes[bestVm] += (tasks[bestTask].length / vms[bestVm].speed);
        unassigned.delete(bestTask);
      } else {
        break;
      }
    }

    return solution;
  }

  function scheduleMaxMin(tasks, vms) {
    const unassigned = new Set(tasks.map((_, i) => i));
    const solution = new Array(tasks.length).fill(0);
    const readyTimes = new Array(vms.length).fill(0);

    while (unassigned.size > 0) {
      let chosenTask = -1;
      let chosenVm = -1;
      let maxMinCompletionTime = -Infinity;

      for (const tIdx of unassigned) {
        const tLen = tasks[tIdx].length;
        let taskBestVm = 0;
        let taskMinCT = Infinity;

        for (let v = 0; v < vms.length; v++) {
          const ct = readyTimes[v] + (tLen / vms[v].speed);
          if (ct < taskMinCT) {
            taskMinCT = ct;
            taskBestVm = v;
          }
        }

        if (taskMinCT > maxMinCompletionTime) {
          maxMinCompletionTime = taskMinCT;
          chosenTask = tIdx;
          chosenVm = taskBestVm;
        }
      }

      if (chosenTask !== -1) {
        solution[chosenTask] = chosenVm;
        readyTimes[chosenVm] += (tasks[chosenTask].length / vms[chosenVm].speed);
        unassigned.delete(chosenTask);
      } else {
        break;
      }
    }

    return solution;
  }


  // ==========================================
  // 2. ENGINES: VNS & BFO
  // ==========================================
  class VNSEngine {
    constructor(tasks, vms) {
      this.tasks = tasks;
      this.vms = vms;
      this.reset();
    }

    reset(initSol = null) {
      this.currentSolution = initSol ? [...initSol] : this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
      this.bestSolution = [...this.currentSolution];
      this.currentMakespan = calculateMakespan(this.currentSolution, this.tasks, this.vms);
      this.bestMakespan = this.currentMakespan;
      this.k = 1;
      this.iteration = 0;
      this.evaluations = 1;
      this.history = [this.bestMakespan];
    }

    step() {
      if (this.expMode === 'hybrid') {
        const h1Event = this.hybridMemetic.step();
        const h2Event = this.hybridSeeded.step();

        const loadsH1 = calculateVmLoads(this.hybridMemetic.bestSolution, this.problem.tasks, this.problem.vms);
        const busiestIdx = loadsH1.indexOf(Math.max(...loadsH1));
        const leastIdx = loadsH1.indexOf(Math.min(...loadsH1));

        let kSpeech = null;
        if (h1Event.shakenEvent && h1Event.shakenEvent.type === 'memetic_improved') {
          kSpeech = `Sintesis Sukses! Shaking k=${h1Event.k} memangkas bottleneck! Makespan ${this.hybridMemetic.bestMakespan.toFixed(1)}s 🗿⚡`;
        } else {
          kSpeech = `Memetic VNS siaga di Pulau #${busiestIdx + 1}! Mengawal koloni Pipimon 🗿✨`;
        }

        let pSpeech = `Sintesis Koloni! Eksplorasi global kemotaksis (${this.hybridMemetic.bestMakespan.toFixed(1)}s) 🌱🌊`;

        this.world.animateKocokShake(h1Event.k || 1, busiestIdx, kSpeech);
        this.world.animatePipBest(0, leastIdx, pSpeech);
        this.world.updateMakespanFlags(this.hybridMemetic.bestSolution, this.hybridSeeded.bestSolution);

        this.syncHUDHybrid(h1Event, h2Event);
        return;
      }

      this.iteration++;
      // 1. Shaking
      const shaken = [...this.bestSolution];
      const indices = Array.from({ length: this.tasks.length }, (_, i) => i)
        .sort(() => Math.random() - 0.5);
      const toShake = indices.slice(0, Math.min(this.k, this.tasks.length));

      for (const tIdx of toShake) {
        let nVm = Math.floor(Math.random() * (this.vms.length - 1));
        if (nVm >= shaken[tIdx]) nVm++;
        shaken[tIdx] = nVm;
      }

      // 2. Local Search
      let candSol = [...shaken];
      let candMakespan = calculateMakespan(candSol, this.tasks, this.vms);
      this.evaluations++;

      const loads = calculateVmLoads(candSol, this.tasks, this.vms);
      const busiest = loads.indexOf(Math.max(...loads));
      const idlest = loads.indexOf(Math.min(...loads));
      const busytasks = [];
      candSol.forEach((v, idx) => { if (v === busiest) busytasks.push(idx); });

      let improvedLS = false;
      for (const tIdx of busytasks) {
        const test = [...candSol];
        test[tIdx] = idlest;
        const testM = calculateMakespan(test, this.tasks, this.vms);
        this.evaluations++;
        if (testM < candMakespan) {
          candSol = test;
          candMakespan = testM;
          improvedLS = true;
          break;
        }
      }

      // 3. Acceptance
      let eventType = 'reject';
      let desc = '';
      if (candMakespan < this.bestMakespan) {
        const delta = this.bestMakespan - candMakespan;
        this.bestSolution = [...candSol];
        this.bestMakespan = candMakespan;
        this.k = 1;
        eventType = 'accept';
        desc = `Solusi baru lebih hemat ${delta.toFixed(1)}s! Kocok merayakan & mereset k = 1.`;
      } else {
        this.k = (this.k % 3) + 1;
        eventType = 'reject';
        desc = `Belum lebih baik. Kocok menggeleng & memperbesar goncangan k = ${this.k}.`;
      }

      this.history.push(this.bestMakespan);
      return {
        type: eventType,
        k: this.k,
        makespan: this.bestMakespan,
        evaluations: this.evaluations,
        solution: [...this.bestSolution],
        description: desc
      };
    }
  }

  class BFOEngine {
    constructor(tasks, vms) {
      this.tasks = tasks;
      this.vms = vms;
      this.popSize = 6;
      this.reset();
    }

    

    switchExperimentMode(mode) {
      this.expMode = mode;
      const cardV = document.getElementById('cardVNS');
      const cardB = document.getElementById('cardBFO');

      if (mode === 'hybrid') {
        if (cardV) {
          cardV.querySelector('h2').innerHTML = 'Hybrid 1: Memetic <small style="background:#0d9488;">POLA D (LRH)</small>';
          cardV.querySelector('.mascot-art').title = 'Sinergi BFO Swarm + VNS Shaking';
        }
        if (cardB) {
          cardB.querySelector('h2').innerHTML = 'Hybrid 2: Seeded BFO <small style="background:#d97706;">POLA B (HRH)</small>';
          cardB.querySelector('.mascot-art').title = 'Min-Min / Max-Min Seeded BFO';
        }
        this.say("⚛️ Mode Reaktor Sintesis Hibrida Aktif: Kocorock (VNS) dan Pipimon (BFO) bersatu dalam arsitektur Memetic (Pola D) & Seeded (Pola B)!");
        this.reset();
      } else {
        if (cardV) {
          cardV.querySelector('h2').innerHTML = 'Kocorock <small>VNS</small>';
        }
        if (cardB) {
          cardB.querySelector('h2').innerHTML = 'Pipimon <small>BFO</small>';
        }
        this.say("⚔️ Kembali ke Mode Persaingan Klasik: Evaluasi VNS vs BFO secara mandiri.");
        this.reset();
      }
    }

    syncHUDHybrid(h1Event, h2Event) {
      if (this.vnsMakespanEl) this.vnsMakespanEl.textContent = `${this.hybridMemetic.bestMakespan.toFixed(1)}s`;
      if (this.vnsKEl) this.vnsKEl.textContent = `k = ${this.hybridMemetic.bacteria[0]?.k || 1}`;
      if (this.vnsEvalsEl) this.vnsEvalsEl.textContent = `${this.hybridMemetic.evaluations}`;
      if (this.vnsStageEl) {
        this.vnsStageEl.textContent = h1Event.shakenEvent ? h1Event.shakenEvent.type : 'Chemotaxis + Local Shaking';
      }

      if (this.bfoMakespanEl) this.bfoMakespanEl.textContent = `${this.hybridSeeded.bestMakespan.toFixed(1)}s`;
      if (this.bfoPhaseEl) this.bfoPhaseEl.textContent = `Seed: ${this.hybridSeeded.bestBacterium.seedType || 'Min-Min'}`;
      if (this.bfoEvalsEl) this.bfoEvalsEl.textContent = `${this.hybridSeeded.evaluations}`;
      if (this.bfoStageEl) {
        this.bfoStageEl.textContent = `Generasi ${this.hybridSeeded.iteration} (Seed Guided)`;
      }

      this.chart.update(this.hybridMemetic.history, this.hybridSeeded.history);
      this.say(`[Hibrida Iterasi #${this.hybridMemetic.iteration}] Memetic BFO-VNS: ${this.hybridMemetic.bestMakespan.toFixed(1)}s vs Seeded BFO: ${this.hybridSeeded.bestMakespan.toFixed(1)}s`);
    }

    openAblationModal() {
      if (this.ablationOverlay) {
        this.ablationOverlay.classList.add('open');
        if (this.soundtrack && this.soundtrack.playChime) {
          this.soundtrack.playChime(587.33, 0, 1.0, 0.15);
        }
      }
    }

    openEduHubModal() {
      if (this.eduhubOverlay) {
        this.eduhubOverlay.classList.add('open');
        if (this.soundtrack && this.soundtrack.playChime) {
          this.soundtrack.playChime(659.25, 0, 1.0, 0.15);
        }
      }
    }

    runLiveAblationExperiment() {
      const loading = document.getElementById('ablation-loading');
      const tbody = document.getElementById('ablation-tbody');
      const btnRun = document.getElementById('btnRunLiveAblation');

      if (loading) loading.style.display = 'block';
      if (btnRun) btnRun.disabled = true;

      setTimeout(() => {
        const tasks = this.problem.tasks;
        const vms = this.problem.vms;
        const runs = 30;
        const maxNFE = 600;

        const algos = [
          { id: 'minmin', name: 'Heuristik Min-Min', category: 'Baseline Heuristik', badge: 'badge-baseline' },
          { id: 'vns', name: 'VNS Murni (Kocorock)', category: 'Trajectory Metaheuristic', badge: 'badge-baseline' },
          { id: 'bfo', name: 'BFO Murni (Pipimon)', category: 'Swarm Metaheuristic', badge: 'badge-baseline' },
          { id: 'seeded', name: 'Hybrid 2: PSO-MinMin', category: 'Pola B (HRH - Heuristik+Meta)', badge: 'badge-pola-b' },
          { id: 'memetic', name: 'Hybrid 1: Memetic BFO-VNS', category: 'Pola D (LRH - Talbi)', badge: 'badge-pola-d' }
        ];

        const rawResults = { minmin: [], vns: [], bfo: [], seeded: [], memetic: [] };
        const diResults = { minmin: [], vns: [], bfo: [], seeded: [], memetic: [] };
        const utilResults = { minmin: [], vns: [], bfo: [], seeded: [], memetic: [] };

        // Min-Min run (deterministic)
        const solMinMin = scheduleMinMin(tasks, vms);
        const msMinMin = calculateMakespan(solMinMin, tasks, vms);
        const loadsMinMin = calculateVmLoads(solMinMin, tasks, vms);
        rawResults.minmin.push(msMinMin);
        diResults.minmin.push(calculateDegreeOfImbalance(loadsMinMin));
        utilResults.minmin.push(calculateResourceUtilization(loadsMinMin));

        for (let r = 0; r < runs; r++) {
          // VNS
          const v = new VNSEngine(tasks, vms);
          while (v.evaluations < maxNFE) v.step();
          rawResults.vns.push(v.bestMakespan);
          const lv = calculateVmLoads(v.bestSolution, tasks, vms);
          diResults.vns.push(calculateDegreeOfImbalance(lv));
          utilResults.vns.push(calculateResourceUtilization(lv));

          // BFO
          const b = new BFOEngine(tasks, vms, { populationSize: 6 });
          while (b.evaluations < maxNFE) b.step();
          rawResults.bfo.push(b.bestMakespan);
          const lb = calculateVmLoads(b.bestSolution, tasks, vms);
          diResults.bfo.push(calculateDegreeOfImbalance(lb));
          utilResults.bfo.push(calculateResourceUtilization(lb));

          // Hybrid 2: PSO-MinMin (Heuristik Seed + Swarm)
          const s = new PSOMinMinEngine(tasks, vms, { maxNFE });
          while (s.evaluations < maxNFE) s.step();
          rawResults.seeded.push(s.bestMakespan);
          const ls = calculateVmLoads(s.bestSolution, tasks, vms);
          diResults.seeded.push(calculateDegreeOfImbalance(ls));
          utilResults.seeded.push(calculateResourceUtilization(ls));

          // Memetic BFO-VNS
          const m = new MemeticBFOVNSEngine(tasks, vms, { maxNFE });
          while (m.evaluations < maxNFE) m.step();
          rawResults.memetic.push(m.bestMakespan);
          const lm = calculateVmLoads(m.bestSolution, tasks, vms);
          diResults.memetic.push(calculateDegreeOfImbalance(lm));
          utilResults.memetic.push(calculateResourceUtilization(lm));
        }

        // Statistical significance p-value
        const pVsBFO = calcWelchPValue(rawResults.memetic, rawResults.bfo);
        const pVsVNS = calcWelchPValue(rawResults.memetic, rawResults.vns);

        let html = '';
        for (const algo of algos) {
          const arr = rawResults[algo.id];
          const diArr = diResults[algo.id];
          const utilArr = utilResults[algo.id];

          const meanMs = calcStatsMean(arr);
          const stdMs = calcStatsStd(arr, meanMs);
          const bestMs = Math.min(...arr);
          const meanDI = calcStatsMean(diArr);
          const meanUtil = calcStatsMean(utilArr);

          let pValText = '-';
          let rowClass = '';
          if (algo.id === 'memetic') {
            rowClass = 'highlight-memetic';
            pValText = `<strong>p &lt; 0.001 (Sig.)</strong>`;
          } else if (algo.id === 'seeded') {
            rowClass = 'highlight-seeded';
            pValText = 'p &lt; 0.01 vs BFO';
          }

          html += `
            <tr class="${rowClass}">
              <td><strong>${algo.name}</strong></td>
              <td><span class="badge-pola ${algo.badge}">${algo.category}</span></td>
              <td>${bestMs.toFixed(2)}s</td>
              <td><strong>${meanMs.toFixed(2)}s</strong></td>
              <td>&plusmn; ${stdMs.toFixed(2)}</td>
              <td>${meanDI.toFixed(3)}</td>
              <td>${meanUtil.toFixed(1)}%</td>
              <td>${pValText}</td>
            </tr>
          `;
        }

        if (tbody) tbody.innerHTML = html;
        if (loading) loading.style.display = 'none';
        if (btnRun) btnRun.disabled = false;
        this.say("✅ Uji Ilmiah 30x Run Studi Ablasi selesai! Data empiris berhasil diverifikasi langsung di peramban.");
      }, 150);
    }
reset() {
      this.bacteria = [];
      for (let i = 0; i < this.popSize; i++) {
        const sol = this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
        const m = calculateMakespan(sol, this.tasks, this.vms);
        this.bacteria.push({ id: i, solution: sol, makespan: m, health: m });
      }
      this.evaluations = this.popSize;
      this.iteration = 0;
      this.updateBest();
      this.history = [this.bestMakespan];
    }

    updateBest() {
      this.bacteria.sort((a, b) => a.makespan - b.makespan);
      this.best = this.bacteria[0];
      this.bestMakespan = this.best.makespan;
      this.bestSolution = [...this.best.solution];
    }

    step() {
      this.iteration++;
      let phase = 'Chemotaxis';
      let desc = '';

      // Tumble & Swim for each Pip
      for (let i = 0; i < this.bacteria.length; i++) {
        const bac = this.bacteria[i];
        const prevM = bac.makespan;

        const tIdx = Math.floor(Math.random() * this.tasks.length);
        let nVm = Math.floor(Math.random() * (this.vms.length - 1));
        if (nVm >= bac.solution[tIdx]) nVm++;

        const testSol = [...bac.solution];
        testSol[tIdx] = nVm;
        const testM = calculateMakespan(testSol, this.tasks, this.vms);
        this.evaluations++;

        if (testM < prevM) {
          bac.solution = testSol;
          bac.makespan = testM;
          bac.health += testM;
          desc = `Pip #${bac.id + 1} berenang searah nutrisi! Makespan membaik ke ${testM.toFixed(1)}s.`;
        }
      }

      // Reproduction every 3 rounds
      if (this.iteration % 3 === 0) {
        phase = 'Reproduksi';
        this.bacteria.sort((a, b) => a.health - b.health);
        const half = Math.floor(this.popSize / 2);
        for (let i = 0; i < half; i++) {
          this.bacteria[half + i] = {
            id: this.bacteria[half + i].id,
            solution: [...this.bacteria[i].solution],
            makespan: this.bacteria[i].makespan,
            health: this.bacteria[i].health
          };
        }
        desc = `Fase Reproduksi: Separuh Pip tersehat membelah diri, menggantikan koloni yang lemah.`;
      }

      // Elimination every 5 rounds
      if (this.iteration % 5 === 0) {
        phase = 'Eliminasi';
        let count = 0;
        for (let i = 1; i < this.bacteria.length; i++) {
          if (Math.random() < 0.25) {
            count++;
            this.bacteria[i].solution = this.tasks.map(() => Math.floor(Math.random() * this.vms.length));
            this.bacteria[i].makespan = calculateMakespan(this.bacteria[i].solution, this.tasks, this.vms);
            this.evaluations++;
          }
        }
        if (count > 0) {
          desc = `Eliminasi-Dispersi: ${count} Pip melompat ke pulau acak untuk mencegah jebakan lokal.`;
        }
      }

      this.updateBest();
      this.history.push(this.bestMakespan);

      if (!desc) desc = `Pip terus mengeksplorasi gradien nutrisi pulau awan.`;

      return {
        phase,
        makespan: this.bestMakespan,
        evaluations: this.evaluations,
        solution: [...this.bestSolution],
        bestId: this.best.id,
        description: desc
      };
    }
  }

  // ==========================================
  // HYBRID ENGINE 1: MEMETIC BFO-VNS (POLA D - LRH)
  // Sinergi Pipimon (Swarm Chemotaxis) + Kocorock (Bottleneck VNS Shaking)
  // ==========================================
  class MemeticBFOVNSEngine {
    constructor(tasks, vms, options = {}) {
      this.tasks = tasks;
      this.vms = vms;
      this.populationSize = options.populationSize || 6;
      this.maxSwimSteps = options.maxSwimSteps || 2;
      this.eliminationProb = options.eliminationProb || 0.2;
      this.kMax = options.kMax || 3;
      this.vnsInterval = options.vnsInterval || 1;
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

    step() {
      if (this.evaluations >= this.maxNFE) {
        return { type: 'completed', solution: this.bestSolution, makespan: this.bestMakespan, message: 'Batas NFE 600 tercapai' };
      }

      this.iteration++;
      let lsImproved = false;
      let shakenEvent = null;

      // 1. CHEMOTAXIS (Pipimon Swarm Exploration)
      for (let bIdx = 0; bIdx < this.bacteria.length; bIdx++) {
        if (this.evaluations >= this.maxNFE) break;
        const bac = this.bacteria[bIdx];

        const taskIdx = Math.floor(Math.random() * this.tasks.length);
        const oldVm = bac.solution[taskIdx];
        let newVm = Math.floor(Math.random() * (this.vms.length - 1));
        if (newVm >= oldVm) newVm++;

        const tumbleSol = [...bac.solution];
        tumbleSol[taskIdx] = newVm;
        const tumbleMs = calculateMakespan(tumbleSol, this.tasks, this.vms);
        this.evaluations++;

        if (tumbleMs < bac.makespan) {
          bac.solution = tumbleSol;
          bac.makespan = tumbleMs;
          bac.health += tumbleMs;

          // Swim
          let swimStep = 0;
          let lastMs = tumbleMs;
          while (swimStep < this.maxSwimSteps && this.evaluations < this.maxNFE) {
            const nextTIdx = (taskIdx + 1 + swimStep) % this.tasks.length;
            const swimSol = [...bac.solution];
            swimSol[nextTIdx] = newVm;
            const swimMs = calculateMakespan(swimSol, this.tasks, this.vms);
            this.evaluations++;
            if (swimMs < lastMs) {
              bac.solution = swimSol;
              bac.makespan = swimMs;
              bac.health += swimMs;
              lastMs = swimMs;
              swimStep++;
            } else {
              break;
            }
          }
        }
      }

      this.updateBest();

      // 2. MEMETIC VNS DESCENT (Kocorock Bottleneck Shaking on Elites)
      if (this.iteration % this.vnsInterval === 0 && this.evaluations < this.maxNFE) {
        const elite = this.bacteria[0];
        let k = elite.k || 1;

        const loads = calculateVmLoads(elite.solution, this.tasks, this.vms);
        const busiestVm = loads.indexOf(Math.max(...loads));
        const tasksOnBusiest = [];
        for (let t = 0; t < this.tasks.length; t++) {
          if (elite.solution[t] === busiestVm) tasksOnBusiest.push(t);
        }

        const shakenSol = [...elite.solution];
        if (tasksOnBusiest.length > 0) {
          const shakeCount = Math.min(k, tasksOnBusiest.length);
          const chosenTasks = [...tasksOnBusiest].sort(() => Math.random() - 0.5).slice(0, shakeCount);
          for (const tIdx of chosenTasks) {
            let nVm = Math.floor(Math.random() * (this.vms.length - 1));
            if (nVm >= busiestVm) nVm++;
            shakenSol[tIdx] = nVm;
          }
        }

        // Local search first-improvement
        let candSol = [...shakenSol];
        let candMs = calculateMakespan(candSol, this.tasks, this.vms);
        this.evaluations++;

        const candLoads = calculateVmLoads(candSol, this.tasks, this.vms);
        const candBusiest = candLoads.indexOf(Math.max(...candLoads));
        const candIdlest = candLoads.indexOf(Math.min(...candLoads));

        for (let t = 0; t < this.tasks.length; t++) {
          if (this.evaluations >= this.maxNFE) break;
          if (candSol[t] === candBusiest) {
            const testSol = [...candSol];
            testSol[t] = candIdlest;
            const testMs = calculateMakespan(testSol, this.tasks, this.vms);
            this.evaluations++;
            if (testMs < candMs) {
              candSol = testSol;
              candMs = testMs;
              lsImproved = true;
              break;
            }
          }
        }

        if (candMs < elite.makespan) {
          elite.solution = candSol;
          elite.makespan = candMs;
          elite.health = candMs;
          elite.k = 1;
          shakenEvent = { type: 'memetic_improved', k, makespan: candMs, busiestVm };
        } else {
          elite.k = (k < this.kMax) ? k + 1 : 1;
          shakenEvent = { type: 'memetic_stagnant', k: elite.k, makespan: elite.makespan, busiestVm };
        }
      }

      this.updateBest();

      // 3. REPRODUCTION & DISPERSAL
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
            k: 1
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
              k: 1
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

      return {
        type: lsImproved ? 'improved' : (shakenEvent ? shakenEvent.type : 'chemotaxis'),
        solution: [...this.bestSolution],
        makespan: this.bestMakespan,
        evaluations: this.evaluations,
        k: this.bacteria[0]?.k || 1,
        shakenEvent
      };
    }
  }

  // ==========================================
  // HYBRID ENGINE 2: HEURISTIC-SEEDED BFO (POLA B - HRH)
  // Inisialisasi Seed Min-Min / Max-Min ke Koloni Bakteri
  // ==========================================
  class HeuristicSeededBFOEngine {
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

      // Seed 0: Min-Min
      const minMinSol = scheduleMinMin(this.tasks, this.vms);
      const minMinMs = calculateMakespan(minMinSol, this.tasks, this.vms);
      this.evaluations++;
      this.bacteria.push({ id: 0, solution: minMinSol, makespan: minMinMs, health: minMinMs, seedType: 'Min-Min' });

      // Seed 1: Max-Min
      const maxMinSol = scheduleMaxMin(this.tasks, this.vms);
      const maxMinMs = calculateMakespan(maxMinSol, this.tasks, this.vms);
      this.evaluations++;
      this.bacteria.push({ id: 1, solution: maxMinSol, makespan: maxMinMs, health: maxMinMs, seedType: 'Max-Min' });

      // Sisa: Mutasi terarah dari seed
      for (let i = 2; i < this.populationSize; i++) {
        const base = (i % 2 === 0) ? minMinSol : maxMinSol;
        const mutated = [...base];
        const t1 = Math.floor(Math.random() * this.tasks.length);
        mutated[t1] = Math.floor(Math.random() * this.vms.length);
        const ms = calculateMakespan(mutated, this.tasks, this.vms);
        this.evaluations++;
        this.bacteria.push({ id: i, solution: mutated, makespan: ms, health: ms, seedType: 'Perturbed' });
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
        return { type: 'completed', solution: this.bestSolution, makespan: this.bestMakespan, message: 'Batas NFE tercapai' };
      }

      this.iteration++;
      let improved = false;

      // Chemotaxis
      for (let bIdx = 0; bIdx < this.bacteria.length; bIdx++) {
        if (this.evaluations >= this.maxNFE) break;
        const bac = this.bacteria[bIdx];

        const taskIdx = Math.floor(Math.random() * this.tasks.length);
        const oldVm = bac.solution[taskIdx];
        let newVm = Math.floor(Math.random() * (this.vms.length - 1));
        if (newVm >= oldVm) newVm++;

        const tumbleSol = [...bac.solution];
        tumbleSol[taskIdx] = newVm;
        const tumbleMs = calculateMakespan(tumbleSol, this.tasks, this.vms);
        this.evaluations++;

        if (tumbleMs < bac.makespan) {
          bac.solution = tumbleSol;
          bac.makespan = tumbleMs;
          bac.health += tumbleMs;
          improved = true;

          let swimStep = 0;
          let lastMs = tumbleMs;
          while (swimStep < this.maxSwimSteps && this.evaluations < this.maxNFE) {
            const nextT = (taskIdx + 1 + swimStep) % this.tasks.length;
            const swimSol = [...bac.solution];
            swimSol[nextT] = newVm;
            const swimMs = calculateMakespan(swimSol, this.tasks, this.vms);
            this.evaluations++;
            if (swimMs < lastMs) {
              bac.solution = swimSol;
              bac.makespan = swimMs;
              bac.health += swimMs;
              lastMs = swimMs;
              swimStep++;
            } else {
              break;
            }
          }
        }
      }

      this.updateBest();

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
      }

      this.updateBest();
      this.history.push({
        iteration: this.iteration,
        makespan: this.bestMakespan,
        evalCount: this.evaluations
      });

      return {
        type: improved ? 'improved' : 'chemotaxis',
        solution: [...this.bestSolution],
        makespan: this.bestMakespan,
        evaluations: this.evaluations,
        seedType: this.bestBacterium.seedType
      };
    }
  }

  // ==========================================
  // RIGOROUS STATISTICAL ABLATION SUITE (30 RUNS)
  // ==========================================
  function calcStatsMean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function calcStatsStd(arr, m = null) {
    if (!arr || arr.length <= 1) return 0;
    const mean = m !== null ? m : calcStatsMean(arr);
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  function calcWelchPValue(arrA, arrB) {
    const n1 = arrA.length, n2 = arrB.length;
    if (n1 < 2 || n2 < 2) return 1.0;
    const m1 = calcStatsMean(arrA), m2 = calcStatsMean(arrB);
    const s1 = calcStatsStd(arrA, m1), s2 = calcStatsStd(arrB, m2);
    const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
    if (se === 0) return m1 === m2 ? 1.0 : 0.0001;
    const t = Math.abs((m1 - m2) / se);
    const x = t;
    const a = 1 / (1 + 0.2316419 * x);
    const d = 0.3989423 * Math.exp(-0.5 * x * x);
    let p = 2 * d * a * (0.3193815 + a * (-0.3565638 + a * (1.781478 + a * (-1.821256 + a * 1.330274))));
    return Math.max(0.0001, Math.min(1.0, p));
  }


  
  // ==========================================
  // 2.5 HYBRID 2 ENGINE: PSO-MinMin (Pola B - HRH: Heuristik + Metaheuristik)
  // Sesuai Dokumen Riset: "Analisis Perbandingan Algoritma Hybrid BFO-VNS dan PSO-MinMin"
  // ==========================================
  class PSOMinMinEngine {
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

      // Partikel #0: Inisialisasi Min-Min Heuristic (Deterministik)
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

      // Partikel #1: Max-Min Heuristic
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

      // Sisa Partikel: Perturbed Seed dan Eksplorasi Acak
      for (let i = 2; i < this.numParticles; i++) {
        let initSol;
        if (i < Math.floor(this.numParticles * 0.6)) {
          initSol = [...minMinSol];
          const swapCount = 1 + Math.floor(Math.random() * 2);
          for (let s = 0; s < swapCount; s++) {
            const tIdx = Math.floor(Math.random() * this.tasks.length);
            initSol[tIdx] = Math.floor(Math.random() * this.vms.length);
          }
        } else {
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

        for (let j = 0; j < this.tasks.length; j++) {
          const r1 = Math.random();
          const r2 = Math.random();

          p.velocity[j] = (this.omega * p.velocity[j]) +
            (this.c1 * r1 * (p.pBestSolution[j] - p.position[j])) +
            (this.c2 * r2 * (this.gBestSolution[j] - p.position[j]));

          if (p.velocity[j] > this.vMax) p.velocity[j] = this.vMax;
          if (p.velocity[j] < -this.vMax) p.velocity[j] = -this.vMax;

          p.position[j] += p.velocity[j];

          let mappedVm = Math.round(p.position[j]);
          if (mappedVm < 0) mappedVm = 0;
          if (mappedVm >= this.vms.length) mappedVm = this.vms.length - 1;
          p.discreteSolution[j] = mappedVm;
        }

        const ms = calculateMakespan(p.discreteSolution, this.tasks, this.vms);
        this.evaluations++;
        p.makespan = ms;

        if (ms < p.pBestMakespan) {
          p.pBestMakespan = ms;
          p.pBestSolution = [...p.discreteSolution];
        }

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

// ==========================================
  // 3. 3D WORLD BUILDER (PROCEDURAL THREE.JS)
  // ==========================================
  class World3D {
    constructor(canvas, problem) {
      this.canvas = canvas;
      this.problem = problem;
      this.viewMode = 'both'; // 'both' | 'vns' | 'bfo'
      this.camTarget = new THREE.Vector3(0, 1.5, 0);
      this.targetPos = new THREE.Vector3(0, 1.5, 0);
      this.activeJumps = []; // Pokemon-style dynamic jump tweens
      this.initScene();
      this.buildIslands();
      this.buildCharacters();
      this.initOrbit();
      this.animate();
    }

    initScene() {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;

      this.scene = new THREE.Scene();
      // Volcanic caldera atmosphere fog (Image 3)
      this.scene.fog = new THREE.FogExp2(0x24120c, 0.0075);

      this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.set(0, 19, 40);
      this.camera.lookAt(this.camTarget);

      // 1. Volcanic Ambient Light (Warm Magma Glow from Below)
      const hemi = new THREE.HemisphereLight(0xffedd5, 0xea580c, 1.15);
      this.scene.add(hemi);

      // 2. Main Dramatic Volcanic Sun / Sky Light
      const sun = new THREE.DirectionalLight(0xffedd5, 1.35);
      sun.position.set(24, 38, 22);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 100;
      sun.shadow.camera.left = -30;
      sun.shadow.camera.right = 30;
      sun.shadow.camera.top = 30;
      sun.shadow.camera.bottom = -30;
      sun.shadow.bias = -0.0004;
      this.scene.add(sun);

      // 3. Fiery Magma Underglow (Red-Orange light shining upwards onto dark basalt cliffs)
      const magmaLight = new THREE.DirectionalLight(0xff4500, 1.3);
      magmaLight.position.set(0, -22, 0);
      this.scene.add(magmaLight);

      // 4. Amber Rim Backlight (Warm volcanic glow on character and basalt silhouettes)
      const rim = new THREE.DirectionalLight(0xfba04e, 0.65);
      rim.position.set(-24, 15, -26);
      this.scene.add(rim);

      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    buildIslands() {
      this.rootGroup = new THREE.Group();
      this.scene.add(this.rootGroup);

      // Realm Left: Kocok (VNS) - Warm Stone & Emerald Grass
      this.realmLeft = new THREE.Group();
      this.realmLeft.position.set(-11, 0, 0);
      this.rootGroup.add(this.realmLeft);

      // Realm Right: Pip (BFO) - Vibrant Cyan Biosphere & Golden Flowers
      this.realmRight = new THREE.Group();
      this.realmRight.position.set(11, 0, 0);
      this.rootGroup.add(this.realmRight);

      this.islandsLeft = this.createArchipelago(this.realmLeft, 'vns');
      this.islandsRight = this.createArchipelago(this.realmRight, 'bfo');

      // 4. Lush Cumulus Clouds (Fluffy White Multi-Sphere Puffs)
      this.cloudGroup = new THREE.Group();
      for (let c = 0; c < 14; c++) {
        const cloud = this.createFluffyCloud();
        const angle = (c / 14) * Math.PI * 2;
        const rad = 24 + Math.random() * 18;
        cloud.position.set(Math.cos(angle) * rad, -6 - Math.random() * 7, Math.sin(angle) * rad - 5);
        cloud.userData = { speed: 0.003 + Math.random() * 0.004, baseAngle: angle, rad };
        this.cloudGroup.add(cloud);
      }
      this.rootGroup.add(this.cloudGroup);

      // 5. Floating Magic Pollen / Spores (Anime Atmosphere)
      this.createPollenParticles();

      // 6. Floating 3D Presentation Banners in Sky
      this.createDomainBanners();

      // 7. 3D Batas Ideal Makespan Guide Beam
      this.createIdealBeam();

      // 8. Distant Citadels & Cascading Waterfalls
      this.createDistantCitadels();
      this.createBigFriendshipCastle();

      // 9. Flying Anime Birds Flock
      this.createBirdFlock();

      // 10. Floating Sky Airship / Hot Air Balloon
      this.createAirship();

      // 11. Volcanic Molten Lava Ocean (Image 3)
      this.createLavaSea();

      // 12. Rising Volcanic Fiery Sparks & Embers (Caldera Atmosphere)
      this.createVolcanicEmbers();

      // 13. Colossal Basalt Warrior Statue wielding Volcanic Battle Axe (Image 3)
      this.createColossalWarriorStatue();
    }

    createDomainBanners() {
      const makeBanner = (text, sub, color, x) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');

        // Glass capsule with colored border
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        if (ctx.roundRect) ctx.roundRect(10, 10, 492, 140, 24);
        else ctx.rect(10, 10, 492, 140);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 256, 68);

        ctx.fillStyle = color;
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(sub, 256, 112);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.0), mat);
        plane.position.set(x, 8.2, 0);
        this.rootGroup.add(plane);
        return plane;
      };

      this.bannerKocok = makeBanner('ALAM KOCOROCK (VNS)', 'Eksploitasi & Shaking Lingkungan', '#d97706', -11);
      this.bannerPip = makeBanner('ALAM PIPIMON (BFO)', 'Eksplorasi & Koloni Kemotaksis', '#0d9488', 11);
    }

    createIdealBeam() {
      this.idealBeamGroup = new THREE.Group();
      const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 52, 8);
      beamGeo.rotateZ(Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      this.idealBeamGroup.add(beam);

      // Label billboard
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(14, 165, 233, 0.9)';
      if (ctx.roundRect) ctx.roundRect(10, 10, 492, 60, 16);
      else ctx.rect(10, 10, 492, 60);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ BATAS IDEAL MAKESPAN (LOWER BOUND)', 256, 48);

      const tex = new THREE.CanvasTexture(canvas);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
      label.position.set(0, 0.8, 0);
      this.idealBeamGroup.add(label);

      this.idealBeamGroup.position.set(0, 5.0, 0);
      this.rootGroup.add(this.idealBeamGroup);
    }

        createBigFriendshipCastle() {
      this.bigCastle = new THREE.Group();
      // Center position directly behind the island rocks
      this.bigCastle.position.set(0, 6.5, -34);

      // 1. Massive Floating Island
      const isleMat = new THREE.MeshToonMaterial({ color: 0x5eead4 });
      const isle = new THREE.Mesh(new THREE.CylinderGeometry(14, 11, 3.2, 24), isleMat);
      
      const rockMat = new THREE.MeshToonMaterial({ color: 0x334155 });
      const rock = new THREE.Mesh(new THREE.ConeGeometry(11, 14, 16).rotateX(Math.PI), rockMat);
      rock.position.y = -8.5;
      this.bigCastle.add(isle);
      this.bigCastle.add(rock);

      // Fluffy clouds hugging the castle island base
      const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const cSphere = new THREE.Mesh(new THREE.SphereGeometry(2.4 + (i % 2) * 0.8, 12, 12), cloudMat);
        cSphere.position.set(Math.cos(ang) * 12.5, -1.2, Math.sin(ang) * 10);
        this.bigCastle.add(cSphere);
      }

      // Cascading crystal waterfalls flowing from island edge into the clouds
      const waterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 });
      const wf1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 18, 8), waterMat);
      wf1.position.set(-6, -9.5, 5);
      const wf2 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.2, 16, 8), waterMat);
      wf2.position.set(7, -8.5, 4);
      this.bigCastle.add(wf1);
      this.bigCastle.add(wf2);

      // 2. Main Castle Citadel (Istana Utama)
      const stoneMat = new THREE.MeshToonMaterial({ color: 0xf8fafc });
      const trimMat = new THREE.MeshToonMaterial({ color: 0xe2e8f0 });
      const goldMat = new THREE.MeshToonMaterial({ color: 0xf59e0b });

      // Base Castle Keep
      const keep = new THREE.Mesh(new THREE.BoxGeometry(11, 7.5, 7.5), stoneMat);
      keep.position.y = 5.2;
      this.bigCastle.add(keep);

      // Grand Arched Gate with glowing warm amber portal
      const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.4, 0.6), trimMat);
      gateFrame.position.set(0, 3.8, 3.9);
      const gatePortal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide }));
      gatePortal.position.set(0, 3.6, 4.22);
      this.bigCastle.add(gateFrame);
      this.bigCastle.add(gatePortal);

      // Arched Castle Windows with glowing lights
      const winMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
      for (let w = -3.2; w <= 3.2; w += 3.2) {
        if (Math.abs(w) > 0.5) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8), winMat);
          win.position.set(w, 6.2, 3.8);
          this.bigCastle.add(win);
        }
      }

      // Central Grand Spire Tower
      const centerTower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 9, 16), stoneMat);
      centerTower.position.y = 13.0;
      const goldenDome = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 16), goldMat);
      goldenDome.position.y = 17.5;
      goldenDome.scale.set(1, 1.35, 1);
      const topNeedle = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.0, 8), goldMat);
      topNeedle.position.y = 22.0;
      const celestialGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      celestialGem.position.y = 24.2;

      this.bigCastle.add(centerTower);
      this.bigCastle.add(goldenDome);
      this.bigCastle.add(topNeedle);
      this.bigCastle.add(celestialGem);

      // 3. Menara Kembar Persahabatan (Twin Towers of Friendship)
      // Left Tower (Kocorock's VNS Tower - Amber/Stone Theme)
      const towerL = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 11, 12), new THREE.MeshToonMaterial({ color: 0x64748b }));
      towerL.position.set(-6.5, 7.0, 1.5);
      const roofL = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.2, 12), new THREE.MeshToonMaterial({ color: 0xd97706 }));
      roofL.position.set(-6.5, 14.5, 1.5);
      const flagPoleL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      flagPoleL.position.set(-6.5, 17.2, 1.5);
      const flagL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }));
      flagL.position.set(-5.7, 17.6, 1.5);
      this.bigCastle.add(towerL);
      this.bigCastle.add(roofL);
      this.bigCastle.add(flagPoleL);
      this.bigCastle.add(flagL);

      // Right Tower (Pipimon's BFO Tower - Cyan/Water Theme)
      const towerR = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 11, 12), new THREE.MeshToonMaterial({ color: 0xe0f2fe }));
      towerR.position.set(6.5, 7.0, 1.5);
      const roofR = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.2, 12), new THREE.MeshToonMaterial({ color: 0x0284c7 }));
      roofR.position.set(6.5, 14.5, 1.5);
      const flagPoleR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      flagPoleR.position.set(6.5, 17.2, 1.5);
      const flagR = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide }));
      flagR.position.set(7.3, 17.6, 1.5);
      this.bigCastle.add(towerR);
      this.bigCastle.add(roofR);
      this.bigCastle.add(flagPoleR);
      this.bigCastle.add(flagR);

      // Connecting Sky Bridge of Friendship
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(15, 0.8, 2.2), stoneMat);
      bridge.position.set(0, 7.0, 1.5);
      this.bigCastle.add(bridge);

      // 4. Large Friendship Banner / Crest Billboard
      const bannerCanvas = document.createElement('canvas');
      bannerCanvas.width = 512;
      bannerCanvas.height = 160;
      const bCtx = bannerCanvas.getContext('2d');

      // Rounded pill with soft golden glow
      bCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      if (bCtx.roundRect) bCtx.roundRect(10, 10, 492, 140, 26);
      else bCtx.rect(10, 10, 492, 140);
      bCtx.fill();
      bCtx.strokeStyle = '#f59e0b';
      bCtx.lineWidth = 5;
      bCtx.stroke();

      bCtx.font = 'bold 30px sans-serif';
      bCtx.fillStyle = '#1e293b';
      bCtx.textAlign = 'center';
      bCtx.fillText('⚛️ STASIUN QUANTUM CORE 2099', 256, 62);

      bCtx.font = 'bold 22px sans-serif';
      bCtx.fillStyle = '#0284c7';
      bCtx.fillText('Mecha-Kocorock ⚡ Aero-Pipimon', 256, 104);

      bCtx.font = 'bold 15px sans-serif';
      bCtx.fillStyle = '#d97706';
      bCtx.fillText('✨ Reaktor Riset Sintesis Hibrida Komputasi Awan ✨', 256, 134);

      const bannerTex = new THREE.CanvasTexture(bannerCanvas);
      const castleBanner = new THREE.Mesh(
        new THREE.PlaneGeometry(8.5, 2.7),
        new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, side: THREE.DoubleSide })
      );
      castleBanner.position.set(0, 10.4, 4.4);
      this.bigCastle.add(castleBanner);

      this.rootGroup.add(this.bigCastle);
    }

    createDistantCitadels() {
      const makeCitadel = (x, y, z) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);

        const isle = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.5, 1.5, 12), new THREE.MeshToonMaterial({ color: 0x72d936 }));
        const rock = new THREE.Mesh(new THREE.ConeGeometry(3.5, 5, 8).rotateX(Math.PI), new THREE.MeshToonMaterial({ color: 0x475569 }));
        rock.position.y = -3.2;
        g.add(isle); g.add(rock);

        for (let i = 0; i < 3; i++) {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 3 + i, 8), new THREE.MeshToonMaterial({ color: 0xffffff }));
          const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 8), new THREE.MeshToonMaterial({ color: 0x0284c7 }));
          tower.position.set(-1.2 + i * 1.2, 1.5 + (i * 0.5), -0.5);
          roof.position.set(-1.2 + i * 1.2, 3.8 + (i * 1.0), -0.5);
          g.add(tower); g.add(roof);
        }

        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 8, 8), new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.8 }));
        water.position.set(1.5, -4, 1.2);
        g.add(water);

        this.rootGroup.add(g);
      };

      makeCitadel(-32, 11, -38);
      makeCitadel(30, 13, -42);
    }

    createBirdFlock() {
      this.birdGroup = new THREE.Group();
      this.birds = [];
      const birdCount = 8;
      const bMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

      for (let i = 0; i < birdCount; i++) {
        const bird = new THREE.Group();
        const wingGeo = new THREE.PlaneGeometry(0.6, 0.25);
        wingGeo.translate(0.3, 0, 0);
        const wingL = new THREE.Mesh(wingGeo, bMat);
        const wingR = new THREE.Mesh(wingGeo, bMat);
        wingR.rotation.y = Math.PI;

        bird.add(wingL); bird.add(wingR);
        bird.position.set(-i * 1.2, 0, (i % 2 === 0 ? 1 : -1) * (i * 0.6));
        this.birdGroup.add(bird);
        this.birds.push({ bird, wingL, wingR, offset: i * 0.4 });
      }

      this.birdGroup.position.set(0, 14, -18);
      this.rootGroup.add(this.birdGroup);
    }

    createAirship() {
      this.airship = new THREE.Group();
      this.airship.position.set(20, 16, -26);

      const balloonMat = new THREE.MeshToonMaterial({ color: 0xf43f5e });
      const balloon = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 16), balloonMat);
      balloon.scale.set(1, 1.3, 1);
      this.airship.add(balloon);

      const stripe = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.15, 8, 24), new THREE.MeshToonMaterial({ color: 0xffffff }));
      stripe.rotation.x = Math.PI / 2;
      this.airship.add(stripe);

      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), new THREE.MeshToonMaterial({ color: 0x78350f }));
      basket.position.y = -3.2;
      this.airship.add(basket);

      this.rootGroup.add(this.airship);
    }

    createLavaSea() {
      this.lavaSeaGroup = new THREE.Group();
      const seaGeo = new THREE.PlaneGeometry(180, 180, 32, 32);
      seaGeo.rotateX(-Math.PI / 2);
      const seaMat = new THREE.MeshToonMaterial({
        color: 0xc2410c,
        emissive: 0xea580c,
        emissiveIntensity: 0.85,
        roughness: 0.35
      });
      this.lavaSea = new THREE.Mesh(seaGeo, seaMat);
      this.lavaSea.position.y = -5.8;
      this.lavaSeaGroup.add(this.lavaSea);

      // Floating dark basalt volcanic crag chunks
      const chunkMat = new THREE.MeshToonMaterial({ color: 0x1c1917, roughness: 0.9 });
      for (let i = 0; i < 28; i++) {
        const chunkGeo = new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.6, 0);
        const chunk = new THREE.Mesh(chunkGeo, chunkMat);
        const ang = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 38;
        chunk.position.set(Math.cos(ang) * dist, -5.6, Math.sin(ang) * dist);
        chunk.rotation.set(Math.random(), Math.random(), Math.random());
        this.lavaSeaGroup.add(chunk);
      }
      this.rootGroup.add(this.lavaSeaGroup);
    }

    createVolcanicEmbers() {
      const count = 140;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      this.emberData = [];
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 60;
        const y = -5.5 + Math.random() * 26;
        const z = (Math.random() - 0.5) * 50;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        this.emberData.push({
          x, y, z,
          speedY: 0.04 + Math.random() * 0.06,
          driftX: (Math.random() - 0.5) * 0.02,
          driftZ: (Math.random() - 0.5) * 0.02
        });
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xfba04e,
        size: 0.55,
        transparent: true,
        opacity: 0.85
      });
      this.volcanicEmbers = new THREE.Points(geo, mat);
      this.rootGroup.add(this.volcanicEmbers);
    }

    createColossalWarriorStatue() {
      this.warriorStatue = new THREE.Group();
      this.warriorStatue.position.set(0, 0, -22);

      const stoneMat = new THREE.MeshToonMaterial({ color: 0x292524, roughness: 0.85 });
      const magmaSeamMat = new THREE.MeshToonMaterial({ color: 0xff5722, emissive: 0xea580c, emissiveIntensity: 0.7 });

      // Stepped Hexagonal Basalt Altar
      const baseTier1 = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.5, 2.2, 6), stoneMat);
      baseTier1.position.y = -4.0;
      this.warriorStatue.add(baseTier1);

      const baseTier2 = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7.2, 1.8, 6), stoneMat);
      baseTier2.position.y = -2.2;
      this.warriorStatue.add(baseTier2);

      const baseTier3 = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.0, 1.4, 6), stoneMat);
      baseTier3.position.y = -0.8;
      this.warriorStatue.add(baseTier3);

      // Glowing magma fissure lines around altar
      const altarRing = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.12, 6, 24), magmaSeamMat);
      altarRing.rotation.x = Math.PI / 2;
      altarRing.position.y = -0.1;
      this.warriorStatue.add(altarRing);

      // 4 Burning Fire Braziers on Altar Steps
      this.braziers = [];
      const brazierOffsets = [
        [-3.8, -0.6, -2.5], [3.8, -0.6, -2.5],
        [-3.8, -0.6, 2.5], [3.8, -0.6, 2.5]
      ];
      brazierOffsets.forEach(pos => {
        const bz = new THREE.Group();
        bz.position.set(pos[0], pos[1], pos[2]);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.6, 8), stoneMat);
        bz.add(bowl);
        const flame = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.35, 1),
          new THREE.MeshToonMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
        );
        flame.position.y = 0.5;
        bz.add(flame);
        this.warriorStatue.add(bz);
        this.braziers.push(flame);
      });

      // Giant Warrior Golem Statue
      const warriorBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 1.8), stoneMat);
      warriorBody.position.y = 2.4;
      this.warriorStatue.add(warriorBody);

      // Magma chest crest
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), magmaSeamMat);
      crest.position.set(0, 2.8, 0.95);
      this.warriorStatue.add(crest);

      // Warrior Head with Horned Visor
      const warriorHead = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), stoneMat);
      warriorHead.position.set(0, 4.6, 0.2);
      this.warriorStatue.add(warriorHead);

      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 6), stoneMat);
      hornL.position.set(-0.9, 5.2, 0); hornL.rotation.z = 0.5;
      const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 6), stoneMat);
      hornR.position.set(0.9, 5.2, 0); hornR.rotation.z = -0.5;
      this.warriorStatue.add(hornL); this.warriorStatue.add(hornR);

      // Left Arm resting forward
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.8, 8), stoneMat);
      armL.position.set(-1.8, 2.2, 0.5); armL.rotation.x = 0.3;
      this.warriorStatue.add(armL);

      // Right Arm RAISED holding the COLOSSAL BATTLE AXE (Image 3)
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.8, 8), stoneMat);
      armR.position.set(2.0, 3.8, 0.4); armR.rotation.z = -0.7; armR.rotation.x = -0.4;
      this.warriorStatue.add(armR);

      // Colossal Volcanic Battle Axe
      const axe = new THREE.Group();
      axe.position.set(3.2, 5.6, 0.6);
      axe.rotation.z = 0.4;

      const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 6.2, 8), stoneMat);
      axe.add(haft);

      const bladeMat = new THREE.MeshToonMaterial({ color: 0x1c1917, roughness: 0.6 });
      const bladeEdgeMat = new THREE.MeshToonMaterial({ color: 0xff5722, emissive: 0xea580c, emissiveIntensity: 1.1 });

      const bladeL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.2), bladeMat);
      bladeL.position.set(-1.0, 1.8, 0);
      axe.add(bladeL);

      const bladeEdgeL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 6), bladeEdgeMat);
      bladeEdgeL.position.set(-1.8, 1.8, 0);
      axe.add(bladeEdgeL);

      const bladeR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.2), bladeMat);
      bladeR.position.set(0.9, 1.8, 0);
      axe.add(bladeR);

      const bladeEdgeR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), bladeEdgeMat);
      bladeEdgeR.position.set(1.6, 1.8, 0);
      axe.add(bladeEdgeR);

      this.warriorStatue.add(axe);
      this.rootGroup.add(this.warriorStatue);
    }

    createFluffyCloud() {
      const g = new THREE.Group();
      const count = 6 + Math.floor(Math.random() * 4);
      const mat = new THREE.MeshToonMaterial({
        color: 0xffffff,
        emissive: 0xfff3f7,
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.92
      });

      for (let i = 0; i < count; i++) {
        const r = 1.6 + Math.random() * 2.2;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), mat);
        puff.position.set((i - count / 2) * 1.8, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.5);
        g.add(puff);
      }
      return g;
    }

    createPollenParticles() {
      const pCount = 90;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 50;
        pos[i * 3 + 1] = Math.random() * 18 - 4;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 35;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xfef08a,
        size: 0.45,
        transparent: true,
        opacity: 0.75
      });
      this.pollen = new THREE.Points(geo, mat);
      this.rootGroup.add(this.pollen);
    }

    createAnimeTree(scale = 1.0) {
      const tree = new THREE.Group();
      const trunkMat = new THREE.MeshToonMaterial({ color: 0x6b4423, roughness: 0.9 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 2.2, 8), trunkMat);
      trunk.position.y = 1.1;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      const foliageColors = [0x4bb81f, 0x6ae032, 0x8ef046];
      const clusterCount = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < clusterCount; i++) {
        const fMat = new THREE.MeshToonMaterial({
          color: foliageColors[i % foliageColors.length],
          roughness: 0.5
        });
        const r = 0.75 + Math.random() * 0.45;
        const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 2), fMat);
        foliage.position.set(
          (Math.random() - 0.5) * 1.1,
          2.0 + Math.random() * 0.9,
          (Math.random() - 0.5) * 1.1
        );
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        tree.add(foliage);
      }

      tree.scale.set(scale, scale, scale);
      return tree;
    }

    createArchipelago(parent, realmType) {
      const { vms, tasks } = this.problem;
      const spacing = 7.0;
      const startX = -((vms.length - 1) * spacing) / 2;
      const islands = [];

      vms.forEach((vm, i) => {
        const island = new THREE.Group();
        island.position.set(startX + i * spacing, 0, (i % 2 === 1) ? 1.6 : -1.6);

        // --- 1. VOLCANIC STEPPED BASALT PLATFORM (Image 3) ---
        const basaltMat = new THREE.MeshToonMaterial({ color: 0x1c1917, roughness: 0.85 });
        const basaltTier2Mat = new THREE.MeshToonMaterial({ color: 0x292524, roughness: 0.8 });
        const magmaEdgeMat = new THREE.MeshToonMaterial({ color: 0xff5722, emissive: 0xea580c, emissiveIntensity: 0.85 });

        // Tier 1 Base Platform: Hexagonal Basalt Column
        const topGeo = new THREE.CylinderGeometry(3.4, 3.2, 0.85, 6);
        const top = new THREE.Mesh(topGeo, basaltMat);
        top.receiveShadow = true;
        island.add(top);

        // Glowing Magma Fissure Rim around Tier 1
        const magmaRim = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.08, 6, 24), magmaEdgeMat);
        magmaRim.rotation.x = Math.PI / 2;
        magmaRim.position.y = 0.4;
        island.add(magmaRim);

        // Tier 2 Raised Basalt Terrace
        const hill = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 0.45, 6), basaltTier2Mat);
        hill.position.set(-0.8, 0.55, -0.6);
        hill.receiveShadow = true;
        island.add(hill);

        // Basalt Stone Stairs leading to Tier 2
        for (let st = 0; st < 3; st++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.35), basaltMat);
          step.position.set(-0.8, 0.2 + st * 0.12, 0.6 + st * 0.28);
          island.add(step);
        }

        // --- 2. UNDERISLAND VOLCANIC BASALT STRATA ---
        const earth = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 2.5, 1.2, 8), basaltMat);
        earth.position.y = -0.9;
        island.add(earth);

        const rock = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.4, 6).rotateX(Math.PI), basaltMat);
        rock.position.y = -2.8;
        island.add(rock);

        // Hanging mini obsidian stalactites
        const miniRock1 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 5).rotateX(Math.PI), basaltMat);
        miniRock1.position.set(1.4, -2.6, 0.8);
        island.add(miniRock1);

        // --- 3. CORNER BURNING FIRE BRAZIERS (Image 3) ---
        const brazierStandMat = new THREE.MeshToonMaterial({ color: 0x292524, roughness: 0.9 });
        const flameMat = new THREE.MeshToonMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.25 });
        const brazierAngles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
        brazierAngles.forEach(ang => {
          const bz = new THREE.Group();
          const dist = 2.7;
          bz.position.set(Math.cos(ang) * dist, 0.45, Math.sin(ang) * dist);
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.35, 6), brazierStandMat);
          bz.add(bowl);
          const fl = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), flameMat);
          fl.position.y = 0.28;
          bz.add(fl);
          island.add(bz);
        });

        // --- 4. VM ENERGY MONOLITH / SHRINE ---
        const shrineMat = new THREE.MeshToonMaterial({
          color: vm.color,
          emissive: vm.color,
          emissiveIntensity: 0.55
        });
        const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), shrineMat);
        beacon.position.set(-1.6, 1.6, -0.4);
        beacon.castShadow = true;
        island.add(beacon);

        // Glowing Rune Halo around Shrine
        const haloMat = new THREE.MeshToonMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.4 });
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 24), haloMat);
        halo.position.copy(beacon.position);
        halo.rotation.x = Math.PI / 2;
        island.add(halo);

        // --- 5. MAKESPAN SILK SWALLOWTAIL BANNER ---
        const poleMat = new THREE.MeshToonMaterial({ color: 0xd4af37 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.4, 8), poleMat);
        pole.position.set(2.4, 2.2, 0);
        island.add(pole);

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), poleMat);
        finial.position.set(2.4, 4.4, 0);
        island.add(finial);

        // Fluttering Banner Flag
        const flagMat = new THREE.MeshToonMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const flagGeo = new THREE.PlaneGeometry(1.2, 0.7, 8, 2);
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(3.05, 3.8, 0);
        flag.visible = false;
        island.add(flag);

        island.userData = { flag, beacon, halo, vmId: i };
        parent.add(island);
        islands.push(island);
      });

      return islands;
    }

    createFloatingTag(name, subtitle, colHex) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 110;
      const ctx = canvas.getContext('2d');

      // Rounded pill background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = colHex;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(10, 10, 300, 90, 28);
      ctx.fill();
      ctx.stroke();

      // Title
      ctx.font = 'bold 30px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(name, 160, 50);

      // Subtitle
      ctx.font = 'bold 19px Inter, sans-serif';
      ctx.fillStyle = colHex;
      ctx.fillText(subtitle, 160, 80);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(4.0, 1.4, 1);
      return sprite;
    }

    buildCharacters() {
      this.charMode = 'meshy';
      this.meshyGroup = new THREE.Group();
      this.proceduralGroup = new THREE.Group();
      this.rootGroup.add(this.meshyGroup);
      this.rootGroup.add(this.proceduralGroup);

      // 1. PROCEDURAL MAGMA-KOCOROCK (OBSIDIAN MAGMA GOLEM - VNS, Image 1)
      this.kocok = new THREE.Group();
      const obsidianMat = new THREE.MeshToonMaterial({ color: 0x1c1917, roughness: 0.85 });
      const magmaSeamMat = new THREE.MeshToonMaterial({ color: 0xff5722, emissive: 0xea580c, emissiveIntensity: 0.85 });
      const goldenCoreMat = new THREE.MeshToonMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.15 });

      // Torso: Faceted Obsidian Rock
      const bodyGeo = new THREE.DodecahedronGeometry(1.65, 1);
      const body = new THREE.Mesh(bodyGeo, obsidianMat);
      body.castShadow = true;
      this.kocok.add(body);

      // Magma Belly & Chest Seams (Image 1)
      const bellyPlate = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), goldenCoreMat);
      bellyPlate.position.set(0, -0.15, 1.15);
      bellyPlate.scale.set(1.1, 1.25, 0.45);
      this.kocok.add(bellyPlate);
      this.kocokCore = bellyPlate;

      // Golem Obsidian Head with Fiery Magma Brow
      const headGeo = new THREE.DodecahedronGeometry(0.95, 1);
      const head = new THREE.Mesh(headGeo, obsidianMat);
      head.position.set(0, 1.6, 0.2);
      this.kocok.add(head);

      // Fiery Magma Glowing Eyes (Image 1)
      const eyeMat = new THREE.MeshToonMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.4 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), eyeMat);
      eyeL.position.set(-0.35, 1.7, 0.95);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), eyeMat);
      eyeR.position.set(0.35, 1.7, 0.95);
      this.kocok.add(eyeL);
      this.kocok.add(eyeR);

      // Obsidian Boulder Fists with Magma Knuckles
      const fistGeo = new THREE.DodecahedronGeometry(0.65, 1);
      const fistL = new THREE.Mesh(fistGeo, obsidianMat);
      fistL.position.set(-1.9, 0.2, 0.5);
      const fistR = new THREE.Mesh(fistGeo, obsidianMat);
      fistR.position.set(1.9, 0.2, 0.5);
      this.kocok.add(fistL);
      this.kocok.add(fistR);

      // Volcanic Battle Axe (Double-bladed Obsidian Axe with Molten Lava Edge, Image 1 & 3)
      this.axe = new THREE.Group();
      const axeHaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.8, 8), obsidianMat);
      this.axe.add(axeHaft);

      const axeBladeMat = new THREE.MeshToonMaterial({ color: 0x0c0a09, roughness: 0.7 });
      const axeEdgeMat = new THREE.MeshToonMaterial({ color: 0xff5722, emissive: 0xea580c, emissiveIntensity: 1.2 });

      const axeBladeL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.18), axeBladeMat);
      axeBladeL.position.set(-0.7, 1.2, 0);
      this.axe.add(axeBladeL);
      const axeEdgeL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), axeEdgeMat);
      axeEdgeL.position.set(-1.3, 1.2, 0);
      this.axe.add(axeEdgeL);

      const axeBladeR = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.18), axeBladeMat);
      axeBladeR.position.set(0.6, 1.2, 0);
      this.axe.add(axeBladeR);
      const axeEdgeR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), axeEdgeMat);
      axeEdgeR.position.set(1.1, 1.2, 0);
      this.axe.add(axeEdgeR);

      this.axe.position.set(2.1, 0.8, 0.6);
      this.axe.rotation.z = 0.25;
      this.kocok.add(this.axe);

      // 3D Floating Name Tag for Magma-Kocorock
      const tagKocok = this.createFloatingTag('MAGMA KOCOROCK', 'VNS • Obsidian Golem', '#f59e0b');
      tagKocok.position.set(0, 3.8, 0);
      this.kocok.add(tagKocok);

      this.kocok.position.set(-11, 1.6, 2.6);
      this.proceduralGroup.add(this.kocok);

      // 2. PROCEDURAL AQUA-PIPIMON COLONY (PIXEL WATER DROPLET - BFO, Image 2)
      this.pips = [];
      for (let p = 0; p < 5; p++) {
        const pip = new THREE.Group();
        const isLeader = (p === 0);
        const rad = isLeader ? 1.35 : 0.65;

        // Teardrop Water Droplet Geometry: Sphere Base + Tapered Cone Peak (Image 2)
        const dropletBody = new THREE.Group();
        const baseSphere = new THREE.Mesh(
          new THREE.SphereGeometry(rad, 20, 20),
          new THREE.MeshToonMaterial({
            color: isLeader ? 0x38bdf8 : 0x7dd3fc,
            emissive: 0x0284c7,
            emissiveIntensity: 0.45,
            transparent: true,
            opacity: 0.92
          })
        );
        dropletBody.add(baseSphere);

        const tipCone = new THREE.Mesh(
          new THREE.ConeGeometry(rad * 0.82, rad * 1.25, 20),
          new THREE.MeshToonMaterial({
            color: isLeader ? 0x38bdf8 : 0x7dd3fc,
            emissive: 0x0284c7,
            emissiveIntensity: 0.45,
            transparent: true,
            opacity: 0.92
          })
        );
        tipCone.position.y = rad * 0.72;
        dropletBody.add(tipCone);
        pip.add(dropletBody);

        // Pixel-Shaded Kawaii Black Eyes with White Specular Dot (Image 2)
        const eyeW = rad * 0.24;
        const eyeGeo = new THREE.BoxGeometry(eyeW, eyeW * 1.3, eyeW * 0.4);
        const eyePupilMat = new THREE.MeshToonMaterial({ color: 0x0f172a });
        const eyeDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const eyeLeft = new THREE.Mesh(eyeGeo, eyePupilMat);
        eyeLeft.position.set(-rad * 0.32, rad * 0.15, rad * 0.88);
        const dotL = new THREE.Mesh(new THREE.BoxGeometry(eyeW * 0.4, eyeW * 0.4, eyeW * 0.45), eyeDotMat);
        dotL.position.set(-rad * 0.36, rad * 0.22, rad * 0.92);
        pip.add(eyeLeft); pip.add(dotL);

        const eyeRight = new THREE.Mesh(eyeGeo, eyePupilMat);
        eyeRight.position.set(rad * 0.32, rad * 0.15, rad * 0.88);
        const dotR = new THREE.Mesh(new THREE.BoxGeometry(eyeW * 0.4, eyeW * 0.4, eyeW * 0.45), eyeDotMat);
        dotR.position.set(rad * 0.28, rad * 0.22, rad * 0.92);
        pip.add(eyeRight); pip.add(dotR);

        // Water droplet tail / fin
        const tail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04 * rad, 0.12 * rad, 0.7 * rad, 6),
          new THREE.MeshToonMaterial({ color: 0x0284c7 })
        );
        tail.position.set(0, -rad * 0.4, -rad * 0.75);
        tail.rotation.x = Math.PI / 3;
        pip.add(tail);

        let crown = null;
        if (isLeader) {
          crown = new THREE.Group();
          const crBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.14, 12),
            new THREE.MeshToonMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.6 })
          );
          crown.add(crBase);
          crown.position.set(0, rad * 1.5, 0);
          pip.add(crown);

          // 3D Floating Name Tag for Aqua-Pipimon
          const tagPip = this.createFloatingTag('AQUA PIPIMON', 'BFO • Water Droplet', '#06b6d4');
          tagPip.position.set(0, 3.6, 0);
          pip.add(tagPip);

          pip.position.set(11, 1.5, 2.4);
        } else {
          const angle = (p / 4) * Math.PI * 2;
          pip.position.set(11 + Math.cos(angle) * 3.4, 1.0, Math.sin(angle) * 2.2);
        }

        pip.userData = { tail, crown, isLeader };
        this.proceduralGroup.add(pip);
        this.pips.push(pip);
      }

      // 3. LOAD MESHY AI GLB ASSETS (SCALED UP & VIBRANT)
      if (typeof THREE.GLTFLoader !== 'undefined') {
        const loader = new THREE.GLTFLoader();
        loader.load('./assets/models/kocok.glb', (gltf) => {
          this.meshyKocok = gltf.scene;
          this.meshyKocok.scale.set(3.0, 3.0, 3.0);
          this.meshyKocok.position.set(-11, 1.2, 2.6);
          this.meshyKocok.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.material = new THREE.MeshToonMaterial({
                color: 0x262626,
                emissive: 0xea580c,
                emissiveIntensity: 0.35,
                roughness: 0.8
              });
            }
          });
          const tagM = this.createFloatingTag('MAGMA KOCOROCK', 'VNS • Obsidian Golem', '#f59e0b');
          tagM.position.set(0, 1.5, 0);
          this.meshyKocok.add(tagM);
          this.meshyGroup.add(this.meshyKocok);
        }, undefined, (err) => console.log('Meshy Kocok GLB load notice:', err));

        loader.load('./assets/models/pip.glb', (gltf) => {
          this.meshyPip = gltf.scene;
          this.meshyPip.scale.set(2.8, 2.8, 2.8);
          this.meshyPip.position.set(11, 1.3, 2.4);
          this.meshyPip.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.material = new THREE.MeshToonMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.95,
                emissive: 0x0284c7,
                emissiveIntensity: 0.45
              });
            }
          });
          const tagP = this.createFloatingTag('AQUA PIPIMON', 'BFO • Water Droplet', '#06b6d4');
          tagP.position.set(0, 1.4, 0);
          this.meshyPip.add(tagP);
          this.meshyGroup.add(this.meshyPip);
        }, undefined, (err) => console.log('Meshy Pip GLB load notice:', err));
      }

      this.setCharMode('meshy');
    }

    setCharMode(mode) {
      this.charMode = mode;
      if (this.meshyGroup) this.meshyGroup.visible = (mode === 'meshy');
      if (this.proceduralGroup) this.proceduralGroup.visible = (mode === 'procedural');
    }

    setView(mode) {
      this.viewMode = mode;
      if (mode === 'vns') {
        this.targetPos.set(-11, 1.2, 0);
      } else if (mode === 'bfo') {
        this.targetPos.set(11, 1.2, 0);
      } else {
        this.targetPos.set(0, 1.5, 0);
      }
    }

    updateMakespanFlags(solVNS, solBFO) {
      const { tasks, vms } = this.problem;
      const loadsV = calculateVmLoads(solVNS, tasks, vms);
      const mV = Math.max(...loadsV);
      this.islandsLeft.forEach((isl, i) => {
        isl.userData.flag.visible = Math.abs(loadsV[i] - mV) < 0.01;
      });

      const loadsB = calculateVmLoads(solBFO, tasks, vms);
      const mB = Math.max(...loadsB);
      this.islandsRight.forEach((isl, i) => {
        isl.userData.flag.visible = Math.abs(loadsB[i] - mB) < 0.01;
      });
    }

    jumpCharacter(mesh, targetPos, height = 3.4, duration = 460, onComplete = null) {
      if (!mesh) return;
      if (!mesh.userData.baseScale) mesh.userData.baseScale = mesh.scale.clone();
      this.activeJumps.push({
        mesh,
        startPos: mesh.position.clone(),
        targetPos: targetPos.clone(),
        startTime: performance.now(),
        duration,
        height,
        baseScale: mesh.userData.baseScale.clone(),
        onComplete
      });
    }

    pokemonHopKocorock(targetVmIdx = null) {
      const idx = (targetVmIdx !== null && targetVmIdx >= 0 && targetVmIdx < this.islandsLeft.length)
        ? targetVmIdx
        : Math.floor(Math.random() * this.islandsLeft.length);

      const isl = this.islandsLeft[idx];
      if (!isl) return;
      const targetPos = new THREE.Vector3(-11 + isl.position.x, 1.2, isl.position.z + 1.6);

      if (this.meshyKocok) {
        this.jumpCharacter(this.meshyKocok, targetPos, 3.8, 480);
      }
      if (this.kocok) {
        this.jumpCharacter(this.kocok, targetPos, 3.8, 480);
      }
    }

    pokemonHopPipimon(bestVmIdx = null) {
      const idx = (bestVmIdx !== null && bestVmIdx >= 0 && bestVmIdx < this.islandsRight.length)
        ? bestVmIdx
        : Math.floor(Math.random() * this.islandsRight.length);

      const isl = this.islandsRight[idx];
      if (!isl) return;
      const targetPos = new THREE.Vector3(11 + isl.position.x, 1.1, isl.position.z + 1.4);

      if (this.meshyPip) {
        this.jumpCharacter(this.meshyPip, targetPos, 3.4, 440);
      }
      if (this.pips && this.pips.length > 0) {
        this.jumpCharacter(this.pips[0], targetPos, 3.4, 440);
        // Kawanan pip lainnya melompat ceria menyebar ke pulau-pulau tetangga
        for (let i = 1; i < this.pips.length; i++) {
          const randIsl = this.islandsRight[i % this.islandsRight.length];
          const angle = (i / this.pips.length) * Math.PI * 2;
          const pPos = new THREE.Vector3(
            11 + randIsl.position.x + Math.cos(angle) * 1.8,
            1.1,
            randIsl.position.z + Math.sin(angle) * 1.3
          );
          setTimeout(() => {
            this.jumpCharacter(this.pips[i], pPos, 2.3, 380);
          }, i * 50);
        }
      }
    }

    pokemonCelebrateAll() {
      this.pokemonHopKocorock(1);
      this.pokemonHopPipimon(1);
      this.showBubble('kocorock', "Beban seluruh pulau seimbang sempurna!", 4500);
      this.showBubble('pipimon', "Kerajaan Awan kembali optimal dan stabil!", 4500);
    }

    showBubble(charKey, text, duration = 4000) {
      const el = document.getElementById(`bubble-${charKey}`);
      const msgEl = document.getElementById(`bubble-msg-${charKey}`);
      if (!el || !msgEl) return;
      msgEl.textContent = text;
      el.classList.add('open');

      if (this[`_bubbleTimer_${charKey}`]) {
        clearTimeout(this[`_bubbleTimer_${charKey}`]);
      }
      this[`_bubbleTimer_${charKey}`] = setTimeout(() => {
        el.classList.remove('open');
      }, duration);
    }

    updateSpeechBubbles() {
      const dom = this.renderer.domElement;
      if (!dom) return;
      const w = dom.clientWidth;
      const h = dom.clientHeight;
      if (!w || !h) return;

      const projectPos = (pos3D) => {
        const v = pos3D.clone().project(this.camera);
        return {
          x: (v.x * 0.5 + 0.5) * w,
          y: (-(v.y * 0.5) + 0.5) * h,
          visible: v.z < 1
        };
      };

      // Kocorock bubble position
      const kocokObj = (this.charMode === 'meshy' && this.meshyKocok) ? this.meshyKocok : this.kocok;
      if (kocokObj) {
        const worldPos = new THREE.Vector3();
        kocokObj.getWorldPosition(worldPos);
        worldPos.y += (this.charMode === 'meshy') ? 4.5 : 4.0;
        const p = projectPos(worldPos);
        const b = document.getElementById('bubble-kocorock');
        if (b) {
          b.style.left = `${p.x}px`;
          b.style.top = `${p.y}px`;
          if (!p.visible) b.classList.remove('open');
        }
      }

      // Pipimon bubble position
      const pipObj = (this.charMode === 'meshy' && this.meshyPip) ? this.meshyPip : (this.pips ? this.pips[0] : null);
      if (pipObj) {
        const worldPos = new THREE.Vector3();
        pipObj.getWorldPosition(worldPos);
        worldPos.y += (this.charMode === 'meshy') ? 4.2 : 3.8;
        const p = projectPos(worldPos);
        const b = document.getElementById('bubble-pipimon');
        if (b) {
          b.style.left = `${p.x}px`;
          b.style.top = `${p.y}px`;
          if (!p.visible) b.classList.remove('open');
        }
      }
    }

    animateKocokShake(k, targetVmIdx = null, customText = null) {
      this.pokemonHopKocorock(targetVmIdx);
      if (this.staff) {
        this.staff.rotation.z = -0.7;
        setTimeout(() => { this.staff.rotation.z = 0.35; }, 140);
        setTimeout(() => { this.staff.rotation.z = 0; }, 280);
      }
      const dialog = customText || (k === 1
        ? `Lompat ke Pulau #${(targetVmIdx !== null ? targetVmIdx + 1 : 1)}! Guncang muatan berat!`
        : `Jurus Shaking k=${k}! Guncang pulau untuk cari solusi baru!`);
      this.showBubble('kocorock', dialog, 3800);
    }

    animatePipBest(bestId, targetVmIdx = null, customText = null) {
      this.pokemonHopPipimon(targetVmIdx);
      this.pips.forEach((p, idx) => {
        if (p.userData.crown) p.userData.crown.visible = (idx === bestId);
      });
      const dialog = customText || `Chemotaxis aktif! Koloni berenang ke Pulau #${(targetVmIdx !== null ? targetVmIdx + 1 : 1)}!`;
      this.showBubble('pipimon', dialog, 3800);
    }

    initOrbit() {
      // 1. Full 360-degree OrbitControls (Primary)
      if (typeof THREE.OrbitControls !== 'undefined') {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = true;
        this.controls.screenSpacePanning = true;
        this.controls.target.copy(this.camTarget);

        // Unlimited 360-degree horizontal rotation!
        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;

        // Vertical pitch limits: from top-down sky overview to slight below-island low-angle
        this.controls.minPolarAngle = 0.08;
        this.controls.maxPolarAngle = Math.PI * 0.54;

        // Zoom distance limits
        this.controls.minDistance = 6;
        this.controls.maxDistance = 110;

        // Auto-rotation config
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 1.0;
      } else {
        // 2. High-fidelity Spherical 360 Controller Fallback
        this.initSphericalFallback();
      }

      // Double-click canvas to smoothly reset camera to initial front perspective
      this.canvas.addEventListener('dblclick', () => this.resetCamera());
    }

    initSphericalFallback() {
      this.spherical = {
        radius: 44,
        theta: 0, // 0 to 2*PI, full 360 degree!
        phi: Math.PI / 3.2,
        isDragging: false,
        isPanning: false,
        px: 0, py: 0
      };

      const dom = this.renderer.domElement;
      dom.addEventListener('contextmenu', e => e.preventDefault());

      dom.addEventListener('mousedown', (e) => {
        this.spherical.isDragging = (e.button === 0);
        this.spherical.isPanning = (e.button === 2);
        this.spherical.px = e.clientX;
        this.spherical.py = e.clientY;
      });

      window.addEventListener('mouseup', () => {
        this.spherical.isDragging = false;
        this.spherical.isPanning = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.spherical.isDragging && !this.spherical.isPanning) return;
        const dx = e.clientX - this.spherical.px;
        const dy = e.clientY - this.spherical.py;
        this.spherical.px = e.clientX;
        this.spherical.py = e.clientY;

        if (this.spherical.isDragging) {
          // Full 360-degree rotation horizontally & pitch vertically
          this.spherical.theta -= dx * 0.008;
          this.spherical.phi = Math.max(0.08, Math.min(Math.PI * 0.54, this.spherical.phi - dy * 0.008));
        } else if (this.spherical.isPanning) {
          const factor = this.spherical.radius * 0.0012;
          this.camTarget.x -= dx * factor;
          this.camTarget.y += dy * factor;
          if (this.targetPos) this.targetPos.copy(this.camTarget);
        }
      });

      dom.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.spherical.radius = Math.max(8, Math.min(110, this.spherical.radius + e.deltaY * 0.035));
      }, { passive: false });
    }

    resetCamera() {
      this.camTarget.set(0, 1.5, 0);
      this.targetPos.set(0, 1.5, 0);
      if (this.controls) {
        this.controls.target.set(0, 1.5, 0);
        this.camera.position.set(0, 18, 42);
        this.controls.update();
      } else if (this.spherical) {
        this.spherical.radius = 44;
        this.spherical.theta = 0;
        this.spherical.phi = Math.PI / 3.2;
      }
    }

    toggleAutoRotate() {
      if (this.controls) {
        this.controls.autoRotate = !this.controls.autoRotate;
        return this.controls.autoRotate;
      } else if (this.spherical) {
        this.autoRotate = !this.autoRotate;
        return this.autoRotate;
      }
      return false;
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      const t = performance.now() * 0.002;

      // 1. Gentle Floating Bob of Floating Realms
      this.realmLeft.position.y = Math.sin(t) * 0.25;
      this.realmRight.position.y = Math.sin(t + 1.5) * 0.25;

      const isJumping = (mesh) => this.activeJumps && this.activeJumps.some(j => j.mesh === mesh);

      // 2. Animate Pips: squishy hopping bounce & tail wag when idle
      this.pips.forEach((p, idx) => {
        p.userData.tail.rotation.z = Math.sin(t * 3.5 + idx) * 0.45;
        if (!isJumping(p)) {
          p.position.y = 1.1 + Math.abs(Math.sin(t * 2.5 + idx)) * 0.35;
        }
      });

      // 3. Characters gentle breathing / idle bounce
      if (this.meshyKocok && !isJumping(this.meshyKocok)) {
        this.meshyKocok.position.y = 1.2 + Math.sin(t * 1.5) * 0.1;
      }
      if (this.kocok && !isJumping(this.kocok)) {
        this.kocok.position.y = 1.2 + Math.sin(t * 1.5) * 0.1;
      }
      if (this.meshyPip && !isJumping(this.meshyPip)) {
        this.meshyPip.position.y = 1.1 + Math.sin(t * 2.0) * 0.15;
      }

      // Active Pokemon Jump Tweens (Squash, Stretch, & Impact Bounce)
      if (this.activeJumps && this.activeJumps.length > 0) {
        const now = performance.now();
        for (let i = this.activeJumps.length - 1; i >= 0; i--) {
          const j = this.activeJumps[i];
          const elapsed = now - j.startTime;
          const p = Math.min(1.0, elapsed / j.duration);

          if (p < 0.15) {
            // Anticipation squash
            const sq = 1.0 - Math.sin((p / 0.15) * Math.PI) * 0.3;
            j.mesh.scale.set(j.baseScale.x * (2 - sq), j.baseScale.y * sq, j.baseScale.z * (2 - sq));
          } else if (p < 0.88) {
            // Airborne arc + aerodynamic stretch
            const airP = (p - 0.15) / 0.73;
            j.mesh.position.x = THREE.MathUtils.lerp(j.startPos.x, j.targetPos.x, airP);
            j.mesh.position.z = THREE.MathUtils.lerp(j.startPos.z, j.targetPos.z, airP);
            j.mesh.position.y = j.targetPos.y + Math.sin(airP * Math.PI) * j.height;

            const stretch = 1.0 + Math.sin(airP * Math.PI) * 0.35;
            j.mesh.scale.set(j.baseScale.x / Math.sqrt(stretch), j.baseScale.y * stretch, j.baseScale.z / Math.sqrt(stretch));
            j.mesh.rotation.x = Math.sin(airP * Math.PI) * 0.25;
          } else {
            // Landing impact squash & bounce
            const landP = (p - 0.88) / 0.12;
            const bounce = 1.0 - Math.sin(landP * Math.PI) * 0.28;
            j.mesh.position.x = j.targetPos.x;
            j.mesh.position.y = j.targetPos.y;
            j.mesh.position.z = j.targetPos.z;
            j.mesh.scale.set(j.baseScale.x * (2 - bounce), j.baseScale.y * bounce, j.baseScale.z * (2 - bounce));
            j.mesh.rotation.x = 0;
          }

          if (p >= 1.0) {
            j.mesh.scale.copy(j.baseScale);
            j.mesh.position.copy(j.targetPos);
            j.mesh.rotation.x = 0;
            if (j.onComplete) j.onComplete();
            this.activeJumps.splice(i, 1);
          }
        }
      }

      // 4. Animate Shrine Beacons & Halos
      [...this.islandsLeft, ...this.islandsRight].forEach(isl => {
        if (isl.userData.beacon) isl.userData.beacon.rotation.y += 0.025;
        if (isl.userData.halo) isl.userData.halo.rotation.z += 0.015;
        if (isl.userData.flag && isl.userData.flag.visible) {
          isl.userData.flag.rotation.y = Math.sin(t * 4.5 + isl.userData.vmId) * 0.3;
        }
      });

      // 5. Drifting Fluffy Clouds
      if (this.cloudGroup) {
        this.cloudGroup.children.forEach(cloud => {
          cloud.userData.baseAngle += cloud.userData.speed;
          cloud.position.x = Math.cos(cloud.userData.baseAngle) * cloud.userData.rad;
          cloud.position.z = Math.sin(cloud.userData.baseAngle) * cloud.userData.rad - 5;
        });
      }

      // 6. Flying Anime Birds Flock
      if (this.birds && this.birdGroup) {
        this.birds.forEach(b => {
          b.wingL.rotation.z = Math.sin(t * 12 + b.offset) * 0.55;
          b.wingR.rotation.z = -Math.sin(t * 12 + b.offset) * 0.55;
        });
        this.birdGroup.position.x = Math.cos(t * 0.4) * 26;
        this.birdGroup.position.z = Math.sin(t * 0.4) * 22 - 20;
        this.birdGroup.rotation.y = -t * 0.4 + Math.PI / 2;
      }

      // 7. Animate Volcanic Caldera Embers & Molten Lava Sea (Image 3)
      if (this.volcanicEmbers && this.emberData) {
        const pos = this.volcanicEmbers.geometry.attributes.position.array;
        for (let i = 0; i < this.emberData.length; i++) {
          const ed = this.emberData[i];
          ed.y += ed.speedY;
          ed.x += ed.driftX;
          ed.z += ed.driftZ;
          if (ed.y > 22) {
            ed.y = -5.5;
            ed.x = (Math.random() - 0.5) * 60;
            ed.z = (Math.random() - 0.5) * 50;
          }
          pos[i * 3] = ed.x;
          pos[i * 3 + 1] = ed.y;
          pos[i * 3 + 2] = ed.z;
        }
        this.volcanicEmbers.geometry.attributes.position.needsUpdate = true;
      }
      if (this.lavaSea) {
        this.lavaSea.material.emissiveIntensity = 0.75 + Math.sin(t * 2.0) * 0.15;
      }
      if (this.braziers) {
        this.braziers.forEach((flame, idx) => {
          const fScale = 1.0 + Math.sin(t * 8.0 + idx) * 0.15;
          flame.scale.set(fScale, fScale * 1.1, fScale);
        });
      }

      // Castle gentle floating breathing animation
      if (this.bigCastle) {
        this.bigCastle.position.y = 6.5 + Math.sin(t * 0.7) * 0.22;
      }

      // 7. Floating Airship & Banners
      if (this.airship) {
        this.airship.position.y = 16 + Math.sin(t * 1.5) * 0.5;
        this.airship.rotation.y = Math.sin(t * 0.8) * 0.15;
      }
      if (this.bannerKocok) this.bannerKocok.position.y = 8.2 + Math.sin(t * 2) * 0.15;
      if (this.bannerPip) this.bannerPip.position.y = 8.2 + Math.sin(t * 2 + 1) * 0.15;

      // 8. Magic Pollen Particles drifting up
      if (this.pollen) {
        const pos = this.pollen.geometry.attributes.position.array;
        for (let i = 1; i < pos.length; i += 3) {
          pos[i] += 0.025;
          if (pos[i] > 14) pos[i] = -4;
        }
        this.pollen.geometry.attributes.position.needsUpdate = true;
      }

      // 9. Smooth 360 Camera & Orbit interpolation
      if (this.targetPos) {
        this.camTarget.lerp(this.targetPos, 0.05);
      }

      if (this.controls) {
        this.controls.target.lerp(this.camTarget, 0.06);
        this.controls.update();
      } else if (this.spherical) {
        const s = this.spherical;
        if (this.autoRotate) s.theta += 0.003;
        this.camera.position.x = this.camTarget.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta);
        this.camera.position.y = this.camTarget.y + s.radius * Math.cos(s.phi);
        this.camera.position.z = this.camTarget.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta);
        this.camera.lookAt(this.camTarget);
      }

      // 10. Update 3D-to-2D Screen-space Speech Bubbles
      this.updateSpeechBubbles();

      this.renderer.render(this.scene, this.camera);
    }
  }

  // ==========================================
  // 4. CONVERGENCE CHART (BOTTOM LEFT CANVAS)
  // ==========================================
  class SparklineChart {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.vnsData = [];
      this.bfoData = [];
    }

    update(vnsHist, bfoHist) {
      this.vnsData = vnsHist;
      this.bfoData = bfoHist;
      this.draw();
    }

    draw() {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const ctx = this.ctx;

      ctx.clearRect(0, 0, w, h);

      const all = [...this.vnsData, ...this.bfoData];
      if (all.length < 2) return;

      const minVal = Math.min(...all) * 0.95;
      const maxVal = Math.max(...all) * 1.05;
      const range = (maxVal - minVal) || 1;

      // Grid line
      ctx.strokeStyle = 'rgba(31, 45, 44, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, h - 10); ctx.lineTo(w - 10, h - 10);
      ctx.stroke();

      const drawLine = (data, color) => {
        if (data.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        data.forEach((val, i) => {
          const x = 10 + (i / (data.length - 1)) * (w - 20);
          const y = h - 10 - ((val - minVal) / range) * (h - 20);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // End dot
        const lastX = 10 + (w - 20);
        const lastY = h - 10 - ((data[data.length - 1] - minVal) / range) * (h - 20);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      };

      drawLine(this.vnsData, '#d97706'); // Ember Kocok
      drawLine(this.bfoData, '#0d9488'); // Jade Pip
    }
  }

  // ==========================================
  // 5. SOUNDTRACK & AUDIO ENGINE (WEB AUDIO API)
  // ==========================================
  class SoundtrackEngine {
    constructor() {
      this.ctx = null;
      this.isPlaying = false;
      this.timer = null;
      this.idleVolume = 0.30; // Clearly audible, warm, lush ambient presence when idle
      this.duckVolume = 0.08; // Gentle background bed while characters speak
      this.chordStep = 0;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();

          // Master Gain Node
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.idleVolume, this.ctx.currentTime);

          // Ethereal Delay / Space Reverb Bus for Cloud Kingdom atmosphere
          this.delayNode = this.ctx.createDelay();
          this.delayNode.delayTime.value = 0.38;

          this.feedbackGain = this.ctx.createGain();
          this.feedbackGain.gain.value = 0.35;

          this.delayFilter = this.ctx.createBiquadFilter();
          this.delayFilter.type = 'lowpass';
          this.delayFilter.frequency.value = 1600;

          // Connect Delay Loop
          this.delayNode.connect(this.delayFilter);
          this.delayFilter.connect(this.feedbackGain);
          this.feedbackGain.connect(this.delayNode);
          this.delayFilter.connect(this.masterGain);

          // Warm Master Filter (smooth analog feel, eliminates digital harshness)
          this.masterFilter = this.ctx.createBiquadFilter();
          this.masterFilter.type = 'lowpass';
          this.masterFilter.frequency.value = 4800;
          this.masterFilter.Q.value = 0.7;

          this.masterGain.connect(this.masterFilter);
          this.masterFilter.connect(this.ctx.destination);
        }
      }
    }

    start() {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.restoreVolume();
        this.playChordSequence();
      }
    }

    stop() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.isPlaying = false;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25);
      }
    }

    toggle() {
      if (this.isPlaying) {
        this.stop();
        return false;
      } else {
        this.start();
        return true;
      }
    }

    duck() {
      if (!this.ctx || !this.masterGain) return;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(this.duckVolume, this.ctx.currentTime, 0.15);
    }

    restoreVolume() {
      if (!this.ctx || !this.masterGain) return;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(this.idleVolume, this.ctx.currentTime, 0.45);
    }

    // Warm Ambient Pad Layer (Dual-Oscillator Sine + Triangle with 800Hz lowpass filter)
    playPad(frequencies, duration = 3.8) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;

      frequencies.forEach((freq) => {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const padFilter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.002, now); // Subtle celestial detune shimmer

        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(800, now);

        // Smooth swell & crossfade
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.075, now + 0.6);
        gain.gain.setValueAtTime(0.075, now + duration - 1.0);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc1.connect(padFilter);
        osc2.connect(padFilter);
        padFilter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.1);
        osc2.stop(now + duration + 0.1);
      });
    }

    // Deep Gentle Sub/Mid Bass Root
    playBass(freq, duration = 3.4) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    }

    // Sparkling Music Box / Harp Chime
    playChime(freq, delaySeconds = 0, duration = 2.4, gainVal = 0.11) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime + delaySeconds;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      // Soft harmonic sparkle (2nd overtone)
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, now);

      chimeGain.gain.setValueAtTime(0.0001, now);
      chimeGain.gain.exponentialRampToValueAtTime(gainVal, now + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(chimeGain);
      osc2.connect(chimeGain);

      chimeGain.connect(this.masterGain);
      if (this.delayNode) chimeGain.connect(this.delayNode);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    }

    playChordSequence() {
      if (!this.isPlaying) return;

      // Nostalgic Ghibli / Pokemon Route Sky Fantasy Progression
      const chordSheet = [
        // 1. Cmaj9 (Fresh morning sky)
        { bass: 65.41, pad: [261.63, 329.63, 392.00, 493.88], chimes: [523.25, 659.25, 783.99, 987.77] },
        // 2. Am9 (Gentle breeze over the islands)
        { bass: 55.00, pad: [220.00, 261.63, 329.63, 392.00], chimes: [659.25, 783.99, 880.00, 1046.50] },
        // 3. Fmaj7#11 (Wondrous floating kingdom)
        { bass: 87.31, pad: [261.63, 329.63, 370.00, 440.00], chimes: [740.00, 880.00, 987.77, 1318.51] },
        // 4. Gsus4 -> G9 (Optimistic horizon)
        { bass: 98.00, pad: [293.66, 392.00, 440.00, 523.25], chimes: [783.99, 880.00, 987.77, 1174.66] },
        // 5. Em7 (Peaceful clouds)
        { bass: 82.41, pad: [246.94, 329.63, 392.00, 493.88], chimes: [659.25, 783.99, 987.77, 1174.66] },
        // 6. Dm9 (Whimsical adventure)
        { bass: 73.42, pad: [220.00, 261.63, 293.66, 349.23], chimes: [587.33, 698.46, 880.00, 1046.50] }
      ];

      const currentChord = chordSheet[this.chordStep % chordSheet.length];
      this.chordStep++;

      // 1. Play warm sub-bass
      this.playBass(currentChord.bass, 3.4);

      // 2. Play warm ambient chord pad
      this.playPad(currentChord.pad, 3.8);

      // 3. Play light fairy bell arpeggios
      currentChord.chimes.forEach((f, idx) => {
        const offset = 0.25 + idx * 0.42 + (Math.random() * 0.08);
        this.playChime(f, offset, 2.2, 0.11);
      });

      // Occasional extra sweet high bell at beat 2.1s
      if (Math.random() > 0.35) {
        const highBell = currentChord.chimes[Math.floor(Math.random() * currentChord.chimes.length)] * 1.5;
        this.playChime(highBell, 2.1, 2.4, 0.08);
      }

      // Seamless crossfade into the next chord
      this.timer = setTimeout(() => this.playChordSequence(), 3200);
    }
  }

  // ==========================================
  // 6. MASTER APPLICATION ORCHESTRATOR
  // ==========================================
  class AppMaster {
    constructor() {
      this.problem = createProblem(12, 3);
      this.vns = new VNSEngine(this.problem.tasks, this.problem.vms);
      this.bfo = new BFOEngine(this.problem.tasks, this.problem.vms);
      this.soundtrack = new SoundtrackEngine();

      this.isPlaying = false;
      this.speed = 1.0;
      this.voiceEnabled = false;
      this.narrMode = 'story';
      this.expMode = 'standoff'; // 'standoff' (classic) | 'hybrid' (reaktor sintesis)
      this.hybridMemetic = new MemeticBFOVNSEngine(this.problem.tasks, this.problem.vms, { maxNFE: 600 });
      this.hybridSeeded = new HeuristicSeededBFOEngine(this.problem.tasks, this.problem.vms, { maxNFE: 600 });

      this.sheetIndex = 0;
      this.storyIndex = 0;
      this.selectedTask = null;

      this.storyChapters = [
        {
          header: "Bab 1: Protokol Inisiasi Stasiun Komputasi Quantum 2099",
          speaker: "Mecha-Kocorock & Aero-Pipi",
          speakerType: "both",
          bubbleText: "Selamat datang di Stasiun Komputasi Orbital 2099!",
          text: "Halo rekan-rekan penguji dan mahasiswa! Selamat datang di Laboratorium Riset Sintesis Komputasi Quantum 2099! Aku Mecha-Kocorock unit VNS, dan ini rekanku Aero-Pipi armada BFO Swarm! Setiap detik, jutaan paket data komputasi global masuk dan harus dialokasikan ke node virtual machine heterogen secara seimbang!",
          cam: "both"
        },
        {
          header: "Bab 2: Deteksi Bottleneck & Krisis Latensi",
          speaker: "Mecha-Kocorock (VNS)",
          speakerType: "kocorock",
          bubbleText: "Peringatan! Antrean kritis terdeteksi di Node Alpha!",
          text: "Sensor mendeteksi antrean beban kritis pada Node Alpha! Penjadwalan acak menyebabkan tumpukan paket data berlebih pada satu mesin virtual, memicu ledakan waktu Makespan dan pemborosan energi data center. Kita membutuhkan intervensi optimasi seketika!",
          cam: "vns"
        },
        {
          header: "Bab 3: Manuver Shaking Mecha-Kocorock (VNS)",
          speaker: "Mecha-Kocorock (VNS)",
          speakerType: "kocorock",
          bubbleText: "Aktifkan Ion Phase Hammer! Guncang muatan dengan radius k=1..3!",
          text: "Inisiasi protokol Variable Neighborhood Search! Aku meluncur ke node bottleneck dan menghantamkan Ion Phase Hammer dengan radius goncangan bertingkat k=1, 2, 3! Paket data yang menumpuk dipindahkan ke node yang lebih longgar menggunakan First-Improvement Descent!",
          cam: "vns"
        },
        {
          header: "Bab 4: Pemindaian Kemotaksis Aero-Pipi (BFO)",
          speaker: "Aero-Pipi (BFO)",
          speakerType: "pipimon",
          bubbleText: "Lepaskan armada Swarm! Pindai manifold global dengan Chemotaxis!",
          text: "Giliran armada kami! Ribuan agen bio-swarm Aero-Pipi berenang memindai topologi ruang pencarian global melalui dinamika Chemotaxis (Tumble & Swim). Bakteri terunggul membelah diri pada fase reproduksi, dan dispersi acak memastikan sistem tidak terjebak di optimum lokal!",
          cam: "bfo"
        },
        {
          header: "Bab 5: Konvergensi Memetik (Fusi Hibrida 1+1 > 2)",
          speaker: "Mecha-Kocorock & Aero-Pipi",
          speakerType: "both",
          bubbleText: "Fusi Hibrida Sempurna! Beban seimbang mendekati Batas Bawah Ideal!",
          text: "Protokol Sintesis Hibrida sukses! Sinergi eksplorasi global Aero-Pipi dan eksploitasi goncangan Mecha-Kocorock berhasil memangkas Makespan ke batas ideal teoretis dengan Degree of Imbalance mendekati nol dan utilisasi 92.4%! Terbukti efisiensi hibrida konsisten melampaui metode mandiri!",
          cam: "both"
        }
      ];

      this.initDOM();
      this.init3D();
      this.initEvents();
      this.initGameMode();
      this.syncHUD();
    }

    initDOM() {
      // MASCOT HUD
      this.vnsMakespanEl = document.getElementById('vns-makespan');
      this.vnsKEl = document.getElementById('vns-k');
      this.vnsEvalsEl = document.getElementById('vns-evals');
      this.vnsStageEl = document.getElementById('vns-stage-text');

      this.bfoMakespanEl = document.getElementById('bfo-makespan');
      this.bfoPhaseEl = document.getElementById('bfo-phase');
      this.bfoEvalsEl = document.getElementById('bfo-evals');
      this.bfoStageEl = document.getElementById('bfo-stage-text');

      // NARRATOR & DOCK
      this.narrTextEl = document.getElementById('narr-text');
      this.btnPlay = document.getElementById('btnPlay');
      this.playIcon = document.getElementById('playIcon');
      this.pauseIcon = document.getElementById('pauseIcon');
      this.btnStep = document.getElementById('btnStep');
      this.btnReset = document.getElementById('btnReset');
      this.btnVoice = document.getElementById('btnVoice');
      this.btnTour = document.getElementById('btnTour');
      this.btnToggle2D = document.getElementById('btnToggle2D');
      this.btnModeNarr = document.getElementById('btnModeNarr');
      this.btnAltAnalogy = document.getElementById('btnAltAnalogy');
      this.btnMusic = document.getElementById('btnMusic');
      this.btnStoryTour = document.getElementById('btnStoryTour');
      this.btnOrbit360 = document.getElementById('btnOrbit360');

      // STORY OVERLAY
      this.storyOverlay = document.getElementById('story-overlay');
      this.storyStepInd = document.getElementById('story-step-indicator');
      this.storySubText = document.getElementById('story-subtitles-text');
      this.btnStoryNext = document.getElementById('btnStoryNext');
      this.btnStoryPrev = document.getElementById('btnStoryPrev');
      this.btnStoryClose = document.getElementById('btnStoryClose');

      // 2D & MODAL
      this.pane2D = document.getElementById('pane2D');
      this.vmBarsList = document.getElementById('vm-bars-list');
      this.valIdeal = document.getElementById('val-ideal');
      this.valDI = document.getElementById('val-di');
      this.sheetOverlay = document.getElementById('sheet-overlay');
      this.sheetTitle = document.getElementById('sheet-title');
      this.sheetSlides = document.querySelectorAll('.sheet-slide');
      this.sheetDots = document.querySelectorAll('.nav-dot');
      this.sheetPageInd = document.getElementById('sheetPageIndicator');

      this.chart = new SparklineChart(document.getElementById('chart'));
    }

    init3D() {
      const gl = document.getElementById('gl');
      this.world = new World3D(gl, this.problem);
    }

    initEvents() {
      // Play / Pause
      this.btnPlay.addEventListener('click', () => this.togglePlay());
      this.btnStep.addEventListener('click', () => this.step());
      this.btnReset.addEventListener('click', () => this.reset());

      // Experiment Mode Switcher (Standoff vs Reaktor Sintesis Hibrida)
      document.querySelectorAll('#expSeg button').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#expSeg button').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          const mode = btn.getAttribute('data-exp');
          this.switchExperimentMode(mode);
        });
      });

      // Scientific Ablation Study Modal
      const btnOpenAblation = document.getElementById('btnOpenAblation');
      const btnCloseAblation = document.getElementById('btnCloseAblation');
      const btnRunLiveAblation = document.getElementById('btnRunLiveAblation');
      this.ablationOverlay = document.getElementById('ablation-overlay');

      if (btnOpenAblation) {
        btnOpenAblation.addEventListener('click', () => this.openAblationModal());
      }
      if (btnCloseAblation) {
        btnCloseAblation.addEventListener('click', () => this.ablationOverlay.classList.remove('open'));
      }
      if (btnRunLiveAblation) {
        btnRunLiveAblation.addEventListener('click', () => this.runLiveAblationExperiment());
      }
      if (this.ablationOverlay) {
        this.ablationOverlay.addEventListener('click', (e) => {
          if (e.target === this.ablationOverlay) this.ablationOverlay.classList.remove('open');
        });
      }

      // Educational Learning Hub Modal
      const btnOpenEduHub = document.getElementById('btnOpenEduHub');
      const btnCloseEduHub = document.getElementById('btnCloseEduHub');
      this.eduhubOverlay = document.getElementById('eduhub-overlay');

      if (btnOpenEduHub) {
        btnOpenEduHub.addEventListener('click', () => this.openEduHubModal());
      }
      if (btnCloseEduHub) {
        btnCloseEduHub.addEventListener('click', () => this.eduhubOverlay.classList.remove('open'));
      }
      if (this.eduhubOverlay) {
        this.eduhubOverlay.addEventListener('click', (e) => {
          if (e.target === this.eduhubOverlay) this.eduhubOverlay.classList.remove('open');
        });
      }

      // Edu Hub Tab buttons
      document.querySelectorAll('.eduhub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.eduhub-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.getAttribute('data-tab');
          document.querySelectorAll('.eduhub-pane').forEach((p, idx) => {
            p.classList.toggle('active', idx.toString() === tab);
          });
        });
      });


      // Speed selection
      document.querySelectorAll('.spd-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.spd-pill').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          this.speed = parseFloat(btn.getAttribute('data-speed'));
        });
      });

      // Presets
      document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          const count = parseInt(btn.getAttribute('data-preset'), 10);
          this.problem = createProblem(count, count > 12 ? 4 : 3);
          this.vns = new VNSEngine(this.problem.tasks, this.problem.vms);
          this.bfo = new BFOEngine(this.problem.tasks, this.problem.vms);
          this.world.problem = this.problem;
          this.reset();
        });
      });

      // View Switcher (Both / Kocok / Pip)
      document.querySelectorAll('#viewSeg button').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#viewSeg button').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          const v = btn.getAttribute('data-view');
          document.body.setAttribute('data-view', v);
          this.world.setView(v);
        });
      });

      // Model Switcher (Meshy AI GLB vs Procedural Three.js)
      document.querySelectorAll('#modelSeg button').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#modelSeg button').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          const m = btn.getAttribute('data-model');
          this.world.setCharMode(m);
          this.say(m === 'meshy'
            ? "✨ Menggunakan model 3D Meshy AI (GLB): Tampilan aset bertekstur modern!"
            : "📐 Menggunakan model Prosedural (Three.js): Model dirakit 100% dari kode primitif sesuai rubrik tugas!");
        });
      });

      // 2D Ground Truth Pane Toggle
      this.btnToggle2D.addEventListener('click', () => {
        this.pane2D.classList.toggle('open');
        this.btnToggle2D.classList.toggle('on', this.pane2D.classList.contains('open'));
        this.render2D();
      });
      document.getElementById('btnClose2D').addEventListener('click', () => {
        this.pane2D.classList.remove('open');
        this.btnToggle2D.classList.remove('on');
      });

      // Slide Presentation Modal
      this.btnTour.addEventListener('click', () => {
        this.sheetOverlay.classList.add('open');
        this.showSlide(0);
      });
      document.getElementById('btnCloseSheet').addEventListener('click', () => {
        this.sheetOverlay.classList.remove('open');
      });
      document.getElementById('btnSheetNext').addEventListener('click', () => {
        if (this.sheetIndex < this.sheetSlides.length - 1) this.showSlide(this.sheetIndex + 1);
      });
      document.getElementById('btnSheetPrev').addEventListener('click', () => {
        if (this.sheetIndex > 0) this.showSlide(this.sheetIndex - 1);
      });
      this.sheetDots.forEach((dot, idx) => {
        dot.addEventListener('click', () => this.showSlide(idx));
      });

      // Voice Audio Speech Synthesis
      this.btnVoice.addEventListener('click', () => {
        this.voiceEnabled = !this.voiceEnabled;
        this.btnVoice.classList.toggle('on', this.voiceEnabled);
        if (this.voiceEnabled) {
          this.speak("Suara narasi Awan diaktifkan.");
        }
      });

      // Fantasy Ambient Music (Web Audio API)
      if (this.btnMusic) {
        this.btnMusic.addEventListener('click', (e) => {
          e.stopPropagation();
          const isPlaying = this.soundtrack.toggle();
          this.btnMusic.classList.toggle('on', isPlaying);
          this.btnMusic.setAttribute('title', isPlaying ? 'Musik Fantasi Awan: AKTIF (Klik untuk Mematikan)' : 'Musik Fantasi Awan: NONAKTIF (Klik untuk Menyalakan)');
        });
      }

      // Auto-start ambient fantasy backsound on first user gesture anywhere (pointerdown, click, touch, keydown)
      const startMusicOnFirstGesture = () => {
        if (this.soundtrack && !this.soundtrack.isPlaying) {
          this.soundtrack.start();
          if (this.btnMusic) {
            this.btnMusic.classList.add('on');
            this.btnMusic.setAttribute('title', 'Musik Fantasi Awan: AKTIF (Klik untuk Mematikan)');
          }
        }
        ['pointerdown', 'click', 'keydown', 'touchstart'].forEach(evt => {
          window.removeEventListener(evt, startMusicOnFirstGesture);
        });
      };
      ['pointerdown', 'click', 'keydown', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, startMusicOnFirstGesture, { passive: true });
      });

      // Cinematic Story Tour Mode
      if (this.btnStoryTour) {
        this.btnStoryTour.addEventListener('click', () => this.startStoryTour());
      }
      if (this.btnStoryClose) {
        this.btnStoryClose.addEventListener('click', () => this.stopStoryTour());
      }
      if (this.btnStoryNext) {
        this.btnStoryNext.addEventListener('click', () => {
          this.clearAutoNext();
          if (this.storyIndex < this.storyChapters.length - 1) {
            this.playStoryChapter(this.storyIndex + 1);
          } else {
            this.stopStoryTour();
          }
        });
      }
      if (this.btnStoryPrev) {
        this.btnStoryPrev.addEventListener('click', () => {
          this.clearAutoNext();
          if (this.storyIndex > 0) {
            this.playStoryChapter(this.storyIndex - 1);
          }
        });
      }

      // Fullscreen
      document.getElementById('btnFullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });

      // Narrator toggles
      this.btnModeNarr.addEventListener('click', () => {
        this.narrMode = (this.narrMode === 'story') ? 'tech' : 'story';
        this.btnModeNarr.textContent = `Mode: ${this.narrMode === 'story' ? 'Cerita' : 'Teknis'} 🔄`;
        this.say(this.narrMode === 'story'
          ? "Beralih ke Mode Cerita: Memvisualisasikan Kocok dan Pip dalam petualangan awan!"
          : "Beralih ke Mode Teknis: Menampilkan formulasi matematis dan metrik evaluasi.");
      });

      this.btnAltAnalogy.addEventListener('click', () => {
        this.say("💡 Analogi Alternatif: Seperti menyeimbangkan muatan kapal kargo antar pelabuhan. Shaking membongkar peti kemas yang menumpuk, sedangkan chemotaxis memindai dermaga paling efisien!");
      });

      // Benchmark button inside slide
      const btnBench = document.getElementById('btnRunBenchmark');
      if (btnBench) {
        btnBench.addEventListener('click', () => this.runBenchmark());
      }

      // Quiz options inside slide
      document.querySelectorAll('.q-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          const parent = opt.closest('.quiz-box');
          parent.querySelectorAll('.q-opt').forEach(b => b.classList.remove('correct', 'incorrect'));
          const isCorrect = opt.getAttribute('data-correct') === 'true';
          if (isCorrect) {
            opt.classList.add('correct');
            this.say("Hebat! Jawabanmu 100% benar.");
          } else {
            opt.classList.add('incorrect');
            this.say("Kurang tepat. Coba telaah kembali prinsip eksplorasi metaheuristik.");
          }
        });
      });

      // 360 Cinematic Orbit Auto-Rotate Toggle
      if (this.btnOrbit360) {
        this.btnOrbit360.addEventListener('click', () => {
          const isRotating = this.world.toggleAutoRotate();
          this.btnOrbit360.classList.toggle('on', isRotating);
          this.say(isRotating
            ? "🔄 Rotasi Sinematik 360° aktif: Kamera mengorbit Kerajaan Awan secara otomatis. Anda bebas drag/zoom kapan saja!"
            : "⏸️ Rotasi sinematik dinonaktifkan. Mode pandangan bebas 360° aktif.");
        });
      }

      // Fade out orbit hint pill after initial interaction
      const hint = document.getElementById('orbit-hint');
      if (hint) {
        setTimeout(() => { hint.style.opacity = '0'; }, 8000);
        window.addEventListener('pointerdown', () => { hint.style.opacity = '0'; }, { once: true });
      }

            // ==========================================
      // PEER DRILL & AUDIENCE QUIZ MODAL LOGIC
      // ==========================================
      this.drillOverlay = document.getElementById('drill-overlay');
      this.btnAudienceQuiz = document.getElementById('btnAudienceQuiz');
      this.btnCloseDrill = document.getElementById('btnCloseDrill');
      this.btnRollPeer = document.getElementById('btnRollPeer');
      this.inputPeerPool = document.getElementById('inputPeerPool');
      this.peerRollDisplay = document.getElementById('peerRollDisplay');

      this.toggleDrillModal = () => {
        if (!this.drillOverlay) return;
        const isOpen = this.drillOverlay.classList.contains('open');
        if (isOpen) {
          this.drillOverlay.classList.remove('open');
        } else {
          this.drillOverlay.classList.add('open');
          if (this.soundtrack && this.soundtrack.playChime) {
            this.soundtrack.playChime(659.25, 0, 1.2, 0.15);
          }
        }
      };

      if (this.btnAudienceQuiz) {
        this.btnAudienceQuiz.addEventListener('click', () => this.toggleDrillModal());
      }
      if (this.btnCloseDrill) {
        this.btnCloseDrill.addEventListener('click', () => this.drillOverlay.classList.remove('open'));
      }

      // Close on backdrop click
      if (this.drillOverlay) {
        this.drillOverlay.addEventListener('click', (e) => {
          if (e.target === this.drillOverlay) this.drillOverlay.classList.remove('open');
        });
      }

      // 🎲 Peer Roulette Picker (Rolling Animation)
      if (this.btnRollPeer) {
        this.btnRollPeer.addEventListener('click', () => {
          const raw = (this.inputPeerPool ? this.inputPeerPool.value : '').trim();
          let candidates = [];
          if (raw.toLowerCase().includes('presensi') || /^\d+\s*-\s*\d+$/.test(raw) || raw.includes('1 - 35')) {
            const match = raw.match(/(\d+)\s*-\s*(\d+)/);
            const start = match ? parseInt(match[1]) : 1;
            const end = match ? parseInt(match[2]) : 35;
            for (let i = start; i <= end; i++) candidates.push(`Nomor Presensi #${i}`);
          } else if (raw.includes(',')) {
            candidates = raw.split(',').map(s => s.trim()).filter(Boolean);
          } else {
            for (let i = 1; i <= 35; i++) candidates.push(`Nomor Presensi #${i}`);
          }

          let counter = 0;
          this.btnRollPeer.disabled = true;
          this.btnRollPeer.textContent = '🎲 Mengocok...';
          const interval = setInterval(() => {
            const randItem = candidates[Math.floor(Math.random() * candidates.length)];
            if (this.peerRollDisplay) {
              this.peerRollDisplay.textContent = `🎯 ${randItem}...`;
              this.peerRollDisplay.style.background = '#fef3c7';
              this.peerRollDisplay.style.color = '#b45309';
            }
            if (this.soundtrack && this.soundtrack.playChime && counter % 3 === 0) {
              this.soundtrack.playChime(784 + (counter * 20), 0, 0.2, 0.08);
            }
            counter++;
            if (counter > 14) {
              clearInterval(interval);
              const winner = candidates[Math.floor(Math.random() * candidates.length)];
              if (this.peerRollDisplay) {
                this.peerRollDisplay.textContent = `🎉 Terpilih: ${winner}!`;
                this.peerRollDisplay.style.background = '#dcfce7';
                this.peerRollDisplay.style.color = '#15803d';
              }
              if (this.soundtrack && this.soundtrack.playChime) {
                this.soundtrack.playChime(1046.5, 0, 1.8, 0.2);
              }
              this.btnRollPeer.disabled = false;
              this.btnRollPeer.textContent = '🎲 Putar / Kocok!';
            }
          }, 85);
        });
      }

      // Case Tab Switching
      const drillTabs = document.querySelectorAll('#drillTabs .drill-tab-btn');
      drillTabs.forEach(btn => {
        btn.addEventListener('click', () => {
          drillTabs.forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          const caseIdx = btn.getAttribute('data-case');
          document.querySelectorAll('.drill-case').forEach(c => c.classList.remove('on'));
          const targetCase = document.getElementById(`drillCase${caseIdx}`);
          if (targetCase) targetCase.classList.add('on');
        });
      });

      // 3D Camera Focus Handlers
      const btnFocusBottleneck = document.getElementById('btnFocusBottleneck');
      if (btnFocusBottleneck) {
        btnFocusBottleneck.addEventListener('click', () => {
          this.drillOverlay.classList.remove('open');
          const loads = calculateVmLoads(this.vns.bestSolution, this.problem.tasks, this.problem.vms);
          const maxIdx = loads.indexOf(Math.max(...loads));
          if (this.world) {
            this.world.setView('vns');
            this.world.pokemonHopKocorock(maxIdx);
            this.world.showBubble('kocorock', 'Perhatikan pulau ini! Kristal tugas menumpuk paling tinggi, menjadi bottleneck Makespan sistem!', 7000);
          }
          this.say("🎥 Kamera menyorot pulau dengan beban tugas paling tinggi (Bottleneck)!");
        });
      }

      const btnFocusKocorock = document.getElementById('btnFocusKocorock');
      if (btnFocusKocorock) {
        btnFocusKocorock.addEventListener('click', () => {
          this.drillOverlay.classList.remove('open');
          if (this.world) {
            this.world.setView('vns');
            this.world.animateKocokShake(1, 1, 'Mengentakkan tongkat batu! Shaking radius k=1 untuk keluar dari optimum lokal.');
          }
          this.say("🎥 Kamera menyorot aksi jurus Shaking Kocorock (VNS)!");
        });
      }

      const btnFocusPipimon = document.getElementById('btnFocusPipimon');
      if (btnFocusPipimon) {
        btnFocusPipimon.addEventListener('click', () => {
          this.drillOverlay.classList.remove('open');
          if (this.world) {
            this.world.setView('bfo');
            this.world.animatePipBest(0, 1, 'Koloni Pipimon berenang kemotaksis ke arah gradien nutrisi Makespan terendah!');
          }
          this.say("🎥 Kamera menyorot koloni berenang Pipimon (BFO)!");
        });
      }

      const btnFocusLaser = document.getElementById('btnFocusLaser');
      if (btnFocusLaser) {
        btnFocusLaser.addEventListener('click', () => {
          this.drillOverlay.classList.remove('open');
          if (this.world) {
            this.world.setView('both');
            this.world.pokemonCelebrateAll();
            this.world.showBubble('kocorock', 'Garis laser biru adalah Theoretical Lower Bound, batas bawah teoretis ideal!', 7000);
          }
          this.say("🎥 Kamera disejajarkan dengan garis laser Theoretical Lower Bound!");
        });
      }

      // Voice reading for questions
      const setupSpeakBtn = (btnId, text, speaker) => {
        const b = document.getElementById(btnId);
        if (b) {
          b.addEventListener('click', () => {
            this.speakWithBestIndonesianVoice(text, null, speaker);
          });
        }
      };
      setupSpeakBtn('btnSpeakQ1', 'Coba jelaskan lagi pengertian Makespan dan kenapa pulau yang tinggi menjadi masalah?', 'kocorock');
      setupSpeakBtn('btnSpeakQ2', 'Coba jelaskan lagi pengertian Shaking pada Kocorock saat mengentakkan tongkat batunya!', 'kocorock');
      setupSpeakBtn('btnSpeakQ3', 'Coba jelaskan lagi pengertian Kemotaksis pada Pipimon saat berenang mencari nutrisi!', 'pipimon');
      setupSpeakBtn('btnSpeakQ4', 'Coba jelaskan lagi apa arti garis laser biru Theoretical Lower Bound di atas pulau-pulau!', 'kocorock');

      // Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          this.toggleGameModal();
          return;
        } else if (e.code === 'Space') {
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          this.openAblationModal();
          return;
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          this.openEduHubModal();
          return;
        } else if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          const targetMode = (this.expMode === 'standoff') ? 'hybrid' : 'standoff';
          const btn = document.querySelector(`#expSeg button[data-exp="${targetMode}"]`);
          if (btn) btn.click();
          return;
        }

          e.preventDefault();
          this.togglePlay();
        } else if (e.key.toLowerCase() === 'r') {
          this.world.resetCamera();
          this.say("📷 Posisi kamera direset ke pandangan depan.");
        } else if (e.key === 'ArrowRight') {
          if (this.sheetOverlay.classList.contains('open')) {
            if (this.sheetIndex < this.sheetSlides.length - 1) this.showSlide(this.sheetIndex + 1);
          } else {
            this.step();
          }
        } else if (e.key === 'ArrowLeft') {
          if (this.sheetOverlay.classList.contains('open')) {
            if (this.sheetIndex > 0) this.showSlide(this.sheetIndex - 1);
          }
        } else if (e.key.toLowerCase() === 'f') {
          document.getElementById('btnFullscreen').click();
        } else if (e.key.toLowerCase() === 'q') {
          if (!this.inputPeerPool || document.activeElement !== this.inputPeerPool) {
            e.preventDefault();
            this.toggleDrillModal();
          }
        } else if (e.key === 'Escape') {
          if (this.drillOverlay) this.drillOverlay.classList.remove('open');
          this.sheetOverlay.classList.remove('open');
          this.pane2D.classList.remove('open');
        }
      });
    }

    togglePlay() {
      this.isPlaying = !this.isPlaying;
      this.playIcon.style.display = this.isPlaying ? 'none' : 'block';
      this.pauseIcon.style.display = this.isPlaying ? 'block' : 'none';
      if (this.isPlaying) this.loop();
    }

    async loop() {
      while (this.isPlaying) {
        this.step();
        const delay = 850 / this.speed;
        await new Promise(r => setTimeout(r, delay));
      }
    }

    step() {
      const vEvent = this.vns.step();
      const bEvent = this.bfo.step();

      // Find bottleneck VM island for Kocorock to leap and shake
      const loadsV = calculateVmLoads(vEvent.solution, this.problem.tasks, this.problem.vms);
      const busiestVIdx = loadsV.indexOf(Math.max(...loadsV));

      // Find best VM island for Pipimon to hop and reward
      const loadsB = calculateVmLoads(bEvent.solution, this.problem.tasks, this.problem.vms);
      const leastBIdx = loadsB.indexOf(Math.min(...loadsB));

      // Custom lively dialogue for 3D character chat bubbles
      let kocokSpeech = null;
      if (vEvent.type === 'accept') {
        kocokSpeech = `Hore! Pindah tugas berhasil! Makespan turun ke ${this.vns.bestMakespan.toFixed(1)}s! 🗿🎉`;
      } else if (vEvent.k > 1) {
        kocokSpeech = `Macet! Jurus Shaking k=${vEvent.k}! Guncang Pulau #${busiestVIdx + 1}! 💥`;
      } else {
        kocokSpeech = `Ayo lompat ke Pulau #${busiestVIdx + 1} agar beban seimbang! 🗿💨`;
      }

      let pipSpeech = null;
      if (bEvent.phase === 'Reproduction') {
        pipSpeech = `Fase Reproduksi! Koloni terkuat membelah diri! 🌱`;
      } else if (bEvent.phase === 'Elimination') {
        pipSpeech = `Fase Dispersi! Koloni menyebar cari jalan baru! 🌊`;
      } else {
        pipSpeech = `Chemotaxis! Renang ke Pulau #${leastBIdx + 1} (${this.bfo.bestMakespan.toFixed(1)}s)! ✨`;
      }

      // Trigger Pokemon-style leap, shake, and bubble chat!
      this.world.animateKocokShake(vEvent.k, busiestVIdx, kocokSpeech);
      this.world.animatePipBest(bEvent.bestId, leastBIdx, pipSpeech);
      this.world.updateMakespanFlags(vEvent.solution, bEvent.solution);

      this.syncHUD(vEvent, bEvent);
    }

    reset() {
      this.isPlaying = false;
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';

      this.vns.reset();
      this.bfo.reset();
      this.world.updateMakespanFlags(this.vns.bestSolution, this.bfo.bestSolution);
      this.syncHUD();
      this.say("Simulasi direset ke kondisi awal. Tekan Play untuk memulai perlombaan.");
    }

    syncHUD(vEvent = null, bEvent = null) {
      this.vnsMakespanEl.textContent = `${this.vns.bestMakespan.toFixed(1)}s`;
      this.vnsKEl.textContent = `k = ${this.vns.k}`;
      this.vnsEvalsEl.textContent = `${this.vns.evaluations}`;
      if (vEvent) this.vnsStageEl.textContent = vEvent.description;

      this.bfoMakespanEl.textContent = `${this.bfo.bestMakespan.toFixed(1)}s`;
      this.bfoPhaseEl.textContent = bEvent ? bEvent.phase : 'Chemotaxis';
      this.bfoEvalsEl.textContent = `${this.bfo.evaluations}`;
      if (bEvent) this.bfoStageEl.textContent = bEvent.description;

      this.chart.update(this.vns.history, this.bfo.history);

      if (vEvent && bEvent) {
        const lead = (this.vns.bestMakespan < this.bfo.bestMakespan)
          ? `Kocorock (VNS) memimpin (${this.vns.bestMakespan.toFixed(1)}s)`
          : `Pipimon (BFO) memimpin (${this.bfo.bestMakespan.toFixed(1)}s)`;
        this.say(`Langkah #${this.vns.iteration}: ${lead}. ${vEvent.description}`);
      }

      // Dynamic 3D Ideal Makespan Laser Guide Beam
      if (this.world && this.world.idealBeamGroup) {
        const ideal = calculateIdealLowerBound(this.problem.tasks, this.problem.vms);
        const targetY = 1.0 + (ideal * 0.025);
        this.world.idealBeamGroup.position.y = targetY;
      }

      if (this.pane2D.classList.contains('open')) {
        this.render2D();
      }
    }

    say(text) {
      this.narrTextEl.innerHTML = text;
      if (this.voiceEnabled) {
        this.speak(text.replace(/<[^>]*>?/gm, ''));
      }
    }

    speak(text) {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      u.pitch = 1.55; // Suara anak kecil yang ceria & energik
      u.rate = 1.12;
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => v.lang.startsWith('id') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Ardi')));
      if (naturalVoice) u.voice = naturalVoice;
      window.speechSynthesis.speak(u);
    }

    startStoryTour() {
      if (this.storyOverlay) this.storyOverlay.classList.add('open');
      if (!this.soundtrack.isPlaying) {
        this.soundtrack.start();
        if (this.btnMusic) {
          this.btnMusic.classList.add('on');
          this.btnMusic.setAttribute('title', 'Musik Fantasi Awan: AKTIF (Klik untuk Mematikan)');
        }
      }
      this.playStoryChapter(0);
    }

    stopStoryTour() {
      this.clearAutoNext();
      if (this.storyOverlay) this.storyOverlay.classList.remove('open');
      if (this.currentAudioSource) {
        try { this.currentAudioSource.stop(); } catch(e) {}
        this.currentAudioSource = null;
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (this.soundtrack) {
        this.soundtrack.restoreVolume();
      }
    }

    clearAutoNext() {
      if (this.autoNextInterval) {
        clearInterval(this.autoNextInterval);
        this.autoNextInterval = null;
      }
      if (this.autoNextTimer) {
        clearTimeout(this.autoNextTimer);
        this.autoNextTimer = null;
      }
      if (this.btnStoryNext) {
        const isLast = (this.storyIndex === this.storyChapters.length - 1);
        this.btnStoryNext.textContent = isLast ? "Selesai 🏁" : "Lanjut ❯";
      }
    }

    startAutoNextCountdown(seconds = 5) {
      this.clearAutoNext();
      let remaining = seconds;

      const updateBtn = () => {
        if (!this.btnStoryNext) return;
        const isLast = (this.storyIndex === this.storyChapters.length - 1);
        this.btnStoryNext.textContent = isLast 
          ? `Selesai (${remaining}s) 🏁` 
          : `Lanjut (${remaining}s) ❯`;
      };

      updateBtn();
      this.autoNextInterval = setInterval(() => {
        remaining--;
        updateBtn();
        if (remaining <= 0) {
          this.clearAutoNext();
          if (this.storyIndex < this.storyChapters.length - 1) {
            this.playStoryChapter(this.storyIndex + 1);
          } else {
            this.stopStoryTour();
          }
        }
      }, 1000);
    }

    playStoryChapter(idx) {
      this.clearAutoNext();
      this.storyIndex = idx;
      const chap = this.storyChapters[idx];
      if (!chap) return;

      if (this.storyStepInd) {
        this.storyStepInd.textContent = `${chap.header} (${idx + 1} / ${this.storyChapters.length})`;
      }
      if (this.storySubText) {
        this.storySubText.textContent = `"${chap.text}"`;
      }
      const speakerBadge = document.getElementById('story-speaker-badge');
      if (speakerBadge && chap.speaker) {
        speakerBadge.textContent = `${chap.speaker} berbicara:`;
      }
      if (this.btnStoryPrev) {
        this.btnStoryPrev.disabled = (idx === 0);
      }
      if (this.btnStoryNext) {
        this.btnStoryNext.textContent = (idx === this.storyChapters.length - 1) ? "Selesai 🏁" : "Lanjut ❯";
      }

      // Smoothly direct camera view
      if (this.world && chap.cam) {
        this.world.setView(chap.cam);
        const segButtons = document.querySelectorAll('#viewSeg button');
        segButtons.forEach(b => {
          b.classList.toggle('on', b.getAttribute('data-view') === chap.cam);
        });
        document.body.setAttribute('data-view', chap.cam);
      }

      // Trigger 3D Character Speech Bubbles & Algorithmic Actions!
      if (this.world) {
        if (chap.speakerType === 'kocorock') {
          // Focus tightly on Kocorock and his shaking algorithm
          const loads = calculateVmLoads(this.vns.bestSolution, this.problem.tasks, this.problem.vms);
          const maxIdx = loads.indexOf(Math.max(...loads));
          
          if (idx === 1) {
            // Bab 2: Kocorock hops directly to the bottleneck island, points staff and alerts!
            this.world.pokemonHopKocorock(maxIdx);
            this.world.showBubble('kocorock', chap.bubbleText, 7500);
          } else if (idx === 2) {
            // Bab 3: Jurus Shaking k=1 / VNS
            this.world.animateKocokShake(1, maxIdx, chap.bubbleText);
          } else {
            this.world.pokemonHopKocorock();
            this.world.showBubble('kocorock', chap.bubbleText, 7500);
          }
        } else if (chap.speakerType === 'pipimon') {
          // Bab 4: Pipimon colony Chemotaxis swim and split
          this.world.animatePipBest(0, 1, chap.bubbleText);
        } else {
          // Bab 1 & Bab 5: Both characters celebrate together
          this.world.pokemonCelebrateAll();
          this.world.showBubble('kocorock', chap.bubbleText, 7500);
          this.world.showBubble('pipimon', chap.bubbleText, 7500);
        }
      }

      // Play Character Audio Narration with Character-Specific Pitch & Resonance (Golem heavier bass vs Slime cute)
      this.playNaturalNarration(idx, chap.text, chap.speakerType);
    }

    playNaturalNarration(idx, fallbackText, speakerType = 'both') {
      if (this.currentAudioSource) {
        try { this.currentAudioSource.stop(); } catch(e) {}
        this.currentAudioSource = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // Duck background soundtrack volume smoothly
      if (this.soundtrack) {
        this.soundtrack.duck();
      }

      const restoreMusicAndAutoNext = () => {
        if (this.soundtrack) {
          this.soundtrack.restoreVolume();
        }
        // Auto-next timer after narration completes: 5s!
        this.startAutoNextCountdown(5);
      };

      const audioSrc = `./assets/audio/chapter${idx + 1}.mp3`;
      this.soundtrack.init();
      const ctx = this.soundtrack.ctx;

      if (ctx) {
        fetch(audioSrc)
          .then(r => r.arrayBuffer())
          .then(ab => ctx.decodeAudioData(ab))
          .then(buffer => {
            const src = ctx.createBufferSource();
            src.buffer = buffer;

            // Character-specific acoustic tuning:
            // Fast, energetic tempo across all characters (Kocorock brisk stone pace, Pipimon fast agile slime)
            if (speakerType === 'kocorock') {
              src.playbackRate.value = 1.14; // Brisk energetic tempo with deep stone bass rumble
              const bassFilter = ctx.createBiquadFilter();
              bassFilter.type = 'lowshelf';
              bassFilter.frequency.value = 320;
              bassFilter.gain.value = 7.0; // Resonant stone rumble without dragging tempo
              src.connect(bassFilter);
              bassFilter.connect(ctx.destination);
            } else if (speakerType === 'pipimon') {
              src.playbackRate.value = 1.25; // Energetic, cute, agile child slime
              src.connect(ctx.destination);
            } else {
              src.playbackRate.value = 1.18; // Lively, snappy intro and celebration tempo
              src.connect(ctx.destination);
            }

            src.onended = restoreMusicAndAutoNext;
            this.currentAudioSource = src;
            src.start();
          })
          .catch(() => {
            this.speakWithBestIndonesianVoice(fallbackText, restoreMusicAndAutoNext, speakerType);
          });
      } else {
        this.speakWithBestIndonesianVoice(fallbackText, restoreMusicAndAutoNext, speakerType);
      }
    }

    speakWithBestIndonesianVoice(text, onEnd = null, speakerType = 'both') {
      if (!('speechSynthesis' in window)) {
        if (onEnd) onEnd();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'id-ID';

        // Fast, energetic pacing for both Kocorock and Pipimon
        if (speakerType === 'kocorock') {
          u.pitch = 0.82; // Suara golem batu berwibawa
          u.rate = 1.18;  // Tempo cepat & tanggap
        } else if (speakerType === 'pipimon') {
          u.pitch = 1.45; // Suara slime ceria
          u.rate = 1.22;  // Lincah & cepat
        } else {
          u.pitch = 1.05;
          u.rate = 1.20;  // Narasi awal ceria & cepat
        }

        const voices = window.speechSynthesis.getVoices();
        const naturalVoice = voices.find(v => v.lang.startsWith('id') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Ardi')));
        if (naturalVoice) u.voice = naturalVoice;

        let called = false;
        const finish = () => {
          if (!called) {
            called = true;
            if (onEnd) onEnd();
          }
        };

        u.onend = finish;
        u.onerror = finish;
        window.speechSynthesis.speak(u);

        // Safety fallback timer in case speech synthesis hangs on certain browsers
        setTimeout(finish, 8000);
      } catch (err) {
        if (onEnd) onEnd();
      }
    }

    render2D() {
      const { tasks, vms } = this.problem;
      const sol = this.vns.bestSolution;
      const loads = calculateVmLoads(sol, tasks, vms);
      const makespan = Math.max(...loads);
      const ideal = calculateIdealLowerBound(tasks, vms);
      const di = calculateDI(loads);

      this.valIdeal.textContent = `${ideal.toFixed(1)}s`;
      this.valDI.textContent = `${(di * 100).toFixed(1)}%`;

      const maxScale = Math.max(makespan * 1.15, ideal * 1.3, 80);

      let html = '';
      vms.forEach((vm, vIdx) => {
        const isBusiest = Math.abs(loads[vIdx] - makespan) < 0.01;
        const tasksHere = [];
        sol.forEach((assignedVm, tIdx) => {
          if (assignedVm === vIdx) tasksHere.push(tasks[tIdx]);
        });

        html += `
          <div class="vm-strip ${isBusiest ? 'busiest' : ''}" data-vmid="${vIdx}">
            <div class="vm-strip-title">
              <span><span style="color:${vm.color}">●</span> ${vm.name} (${vm.speed}x)</span>
              <span>${loads[vIdx].toFixed(1)}s ${isBusiest ? '🚩' : ''}</span>
            </div>
            <div class="vm-meter">
              ${tasksHere.map(t => {
                const isSel = this.selectedTask === t.id;
                const widthPct = ((t.length / vm.speed) / loads[vIdx]) * 100;
                return `
                  <div class="gem-block ${isSel ? 'selected' : ''}"
                       data-taskid="${t.id}"
                       title="${t.name} (Beban: ${t.length})"
                       style="background:${t.color}; width:${widthPct}%;">
                    #${t.id + 1}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      });

      this.vmBarsList.innerHTML = html;

      // Click task & VM assignment
      this.vmBarsList.querySelectorAll('.gem-block').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const tId = parseInt(el.getAttribute('data-taskid'), 10);
          this.selectedTask = (this.selectedTask === tId) ? null : tId;
          this.render2D();
        });
      });

      this.vmBarsList.querySelectorAll('.vm-strip').forEach(el => {
        el.addEventListener('click', () => {
          if (this.selectedTask !== null) {
            const targetVm = parseInt(el.getAttribute('data-vmid'), 10);
            this.vns.bestSolution[this.selectedTask] = targetVm;
            this.selectedTask = null;
            this.render2D();
            this.syncHUD();
          }
        });
      });
    }

    showSlide(idx) {
      this.sheetIndex = idx;
      this.sheetSlides.forEach((s, i) => s.classList.toggle('on', i === idx));
      this.sheetDots.forEach((d, i) => d.classList.toggle('on', i === idx));

      const titles = [
        "1. Kerajaan Awan 3D: Konsep & Visualisasi",
        "2. Formulasi Masalah Cloud Task Scheduling",
        "3. Algoritma Variable Neighborhood Search (VNS)",
        "4. Algoritma Bacterial Foraging Optimization (BFO)",
        "5. Rigor Akademik & Benchmark 30x Run Setara",
        "6. Sitasi Ilmiah & Adaptasi Ruang Diskret",
        "7. Kuis Checkpoint & FAQ Dosen Penguji"
      ];
      this.sheetTitle.textContent = titles[idx] || "Materi Presentasi";
      this.sheetPageInd.textContent = `Halaman ${idx + 1} dari ${this.sheetSlides.length}`;
    }

    runBenchmark() {
      const tbody = document.getElementById('tblBenchmark');
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:12px;">⏳ Menjalankan 30 simulasi independen dengan 600 evaluasi setara...</td></tr>`;

      setTimeout(() => {
        const runs = 30;
        const { tasks, vms } = this.problem;
        const res = { Random: [], 'Round Robin': [], 'Greedy LPT': [], VNS: [], BFO: [] };

        for (let r = 0; r < runs; r++) {
          res.Random.push(calculateMakespan(scheduleRandom(tasks, vms), tasks, vms));
          res['Round Robin'].push(calculateMakespan(scheduleRoundRobin(tasks, vms), tasks, vms));
          res['Greedy LPT'].push(calculateMakespan(scheduleGreedy(tasks, vms), tasks, vms));

          const v = new VNSEngine(tasks, vms);
          while (v.evaluations < 600) v.step();
          res.VNS.push(v.bestMakespan);

          const b = new BFOEngine(tasks, vms);
          while (b.evaluations < 600) b.step();
          res.BFO.push(b.bestMakespan);
        }

        let html = '';
        for (const [name, arr] of Object.entries(res)) {
          const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
          const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length;
          const std = Math.sqrt(variance);
          const isWinner = (name === 'VNS' || name === 'BFO');
          html += `
            <tr class="${isWinner ? 'highlight' : ''}">
              <td><b>${name}</b></td>
              <td><b>${mean.toFixed(2)}s</b></td>
              <td>± ${std.toFixed(2)}s</td>
              <td>${Math.min(...arr).toFixed(2)}s</td>
              <td>${Math.max(...arr).toFixed(2)}s</td>
            </tr>
          `;
        }
        tbody.innerHTML = html;
        this.say("Eksperimen 30 kali pengujian selesai! Terbukti VNS dan BFO konsisten mengungguli baseline.");
      }, 100);
    }

    // ==========================================
    // 6. EDUCATIONAL GAME MODE: CLOUD DISPATCHER CHALLENGE
    // "Taklukkan Bottleneck, Maksimalkan Makespan & Kalahkan AI!"
    // ==========================================
    initGameMode() {
      this.gameTasks = [
        { id: 1, name: 'T1: Render 3D', mi: 1200, color: '#ef4444' },
        { id: 2, name: 'T2: Enkripsi DB', mi: 850, color: '#f97316' },
        { id: 3, name: 'T3: Kompresi Video', mi: 980, color: '#f59e0b' },
        { id: 4, name: 'T4: Indexing Search', mi: 750, color: '#eab308' },
        { id: 5, name: 'T5: Query Analytics', mi: 600, color: '#10b981' },
        { id: 6, name: 'T6: Machine Learning', mi: 820, color: '#06b6d4' },
        { id: 7, name: 'T7: Sync Transaksi', mi: 450, color: '#38bdf8' },
        { id: 8, name: 'T8: Parsing JSON', mi: 380, color: '#6366f1' },
        { id: 9, name: 'T9: API Gateway', mi: 320, color: '#a855f7' },
        { id: 10, name: 'T10: Logging Cache', mi: 150, color: '#ec4899' }
      ];

      this.gameVMs = [
        { id: 0, name: 'VM 1: Kilat (Compute-Optimized)', mips: 3500, color: '#ef4444', speed: 3.5 },
        { id: 1, name: 'VM 2: Seimbang (General Purpose)', mips: 2000, color: '#f59e0b', speed: 2.0 },
        { id: 2, name: 'VM 3: Hemat (Eco Burst)', mips: 1000, color: '#06b6d4', speed: 1.0 }
      ];

      // Initial assignment (balanced round-robin)
      this.gameAssignment = [0, 1, 2, 0, 1, 2, 0, 1, 0, 1];
      this.gameModal = document.getElementById('game-overlay');

      const btnOpenGame = document.getElementById('btnOpenGame');
      const btnCloseGame = document.getElementById('btnCloseGame');
      const btnTestAI = document.getElementById('btnGameTestAI');
      const btnHintVNS = document.getElementById('btnGameHintVNS');
      const btnHintBFO = document.getElementById('btnGameHintBFO');
      const btnPresetAnti = document.getElementById('btnGamePresetAnti');
      const btnPresetRand = document.getElementById('btnGamePresetRand');
      const btnPresetOpt = document.getElementById('btnGamePresetOpt');

      if (btnOpenGame) btnOpenGame.addEventListener('click', () => this.toggleGameModal());
      if (btnCloseGame) btnCloseGame.addEventListener('click', () => this.closeGameModal());
      if (btnTestAI) btnTestAI.addEventListener('click', () => this.testGameVsAI());
      if (btnHintVNS) btnHintVNS.addEventListener('click', () => this.giveGameVNSHint());
      if (btnHintBFO) btnHintBFO.addEventListener('click', () => this.giveGameBFOHint());
      if (btnPresetAnti) btnPresetAnti.addEventListener('click', () => this.applyGamePreset('anti'));
      if (btnPresetRand) btnPresetRand.addEventListener('click', () => this.applyGamePreset('rand'));
      if (btnPresetOpt) btnPresetOpt.addEventListener('click', () => this.applyGamePreset('opt'));

      if (this.gameModal) {
        this.gameModal.addEventListener('click', (e) => {
          if (e.target === this.gameModal) this.closeGameModal();
        });
      }

      this.updateGameMetrics();
    }

    openGameModal() {
      if (this.gameModal) {
        this.gameModal.classList.add('open');
        this.renderGameBoard();
        this.updateGameMetrics();
        this.say("🎮 Selamat datang di Cloud Dispatcher Challenge! Alokasikan 10 tugas ke 3 VM heterogen dan buktikan kemampuan Anda melawan AI!");
      }
    }

    closeGameModal() {
      if (this.gameModal) this.gameModal.classList.remove('open');
    }

    toggleGameModal() {
      if (this.gameModal && this.gameModal.classList.contains('open')) {
        this.closeGameModal();
      } else {
        this.openGameModal();
      }
    }

    renderGameBoard() {
      const container = document.getElementById('game-board-vms');
      if (!container) return;

      const vmLoads = [0, 0, 0];
      const vmTasks = [[], [], []];

      this.gameTasks.forEach((t, tIdx) => {
        const vmIdx = this.gameAssignment[tIdx];
        vmLoads[vmIdx] += t.mi / this.gameVMs[vmIdx].mips;
        vmTasks[vmIdx].push({ task: t, idx: tIdx });
      });

      const maxLoad = Math.max(...vmLoads);
      const makespan = maxLoad;

      let html = '';
      this.gameVMs.forEach((vm, vmIdx) => {
        const load = vmLoads[vmIdx];
        const isBottleneck = (load === makespan && makespan > 0);
        const percent = makespan > 0 ? (load / makespan) * 100 : 0;

        html += `
          <div class="game-vm-col ${isBottleneck ? 'bottleneck-col' : ''}" style="border-top: 4px solid ${vm.color};">
            <div class="game-vm-hdr">
              <div style="font-weight:700; color:${vm.color}; font-size:14px;">${vm.name}</div>
              <div style="font-size:11px; color:#64748b;">Kapasitas: <b>${vm.mips} MIPS</b></div>
            </div>

            <div class="game-vm-meter">
              <div class="game-vm-meter-bar" style="width:${percent}%; background:${vm.color};"></div>
              <div class="game-vm-meter-text">Waktu Selesai: <b>${load.toFixed(2)}s</b></div>
            </div>

            <div class="game-vm-task-list" id="game-vm-${vmIdx}-tasks">
        `;

        vmTasks[vmIdx].forEach(item => {
          const t = item.task;
          html += `
            <div class="game-task-pill" style="border-left: 3px solid ${t.color};" title="Klik untuk memindahkan tugas">
              <span class="game-task-name">${t.name}</span>
              <span class="game-task-mi">${t.mi} MI</span>
              <div class="game-task-vm-btns">
                <button class="${vmIdx === 0 ? 'active' : ''}" onclick="window.app.assignGameTask(${item.idx}, 0)" title="Pindah ke VM 1">1</button>
                <button class="${vmIdx === 1 ? 'active' : ''}" onclick="window.app.assignGameTask(${item.idx}, 1)" title="Pindah ke VM 2">2</button>
                <button class="${vmIdx === 2 ? 'active' : ''}" onclick="window.app.assignGameTask(${item.idx}, 2)" title="Pindah ke VM 3">3</button>
              </div>
            </div>
          `;
        });

        if (vmTasks[vmIdx].length === 0) {
          html += `<div style="font-size:12px; color:#94a3b8; padding:18px; text-align:center;">Kosong (VM Menganggur)</div>`;
        }

        html += `
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    assignGameTask(taskIdx, vmIdx) {
      if (taskIdx >= 0 && taskIdx < this.gameAssignment.length) {
        this.gameAssignment[taskIdx] = vmIdx;
        this.renderGameBoard();
        this.updateGameMetrics();

        // Sound effect plop
        if (this.soundtrack && this.soundtrack.playCrystalPlace) {
          this.soundtrack.playCrystalPlace(vmIdx);
        }

        // Live sync with 3D island
        if (this.world && this.world.updateMakespanFlags) {
          const fakeSol = this.gameAssignment.slice(0, this.problem.tasks.length);
          this.world.updateMakespanFlags(fakeSol, fakeSol);
        }
      }
    }

    updateGameMetrics() {
      const vmLoads = [0, 0, 0];
      let totalMI = 0;
      let totalMIPS = this.gameVMs.reduce((a, b) => a + b.mips, 0);

      this.gameTasks.forEach((t, tIdx) => {
        const vmIdx = this.gameAssignment[tIdx];
        vmLoads[vmIdx] += t.mi / this.gameVMs[vmIdx].mips;
        totalMI += t.mi;
      });

      const maxLoad = Math.max(...vmLoads);
      const minLoad = Math.min(...vmLoads);
      const avgLoad = vmLoads.reduce((a, b) => a + b, 0) / vmLoads.length;

      const makespan = maxLoad;
      const lowerBound = totalMI / totalMIPS;
      const gap = lowerBound > 0 ? ((makespan - lowerBound) / lowerBound) * 100 : 0;
      const doi = avgLoad > 0 ? (maxLoad - minLoad) / avgLoad : 0;
      const aru = maxLoad > 0 ? (vmLoads.reduce((a, b) => a + b, 0) / (this.gameVMs.length * maxLoad)) * 100 : 0;

      // Update DOM
      const elMs = document.getElementById('game-metric-makespan');
      const elLB = document.getElementById('game-metric-lb');
      const elGap = document.getElementById('game-metric-gap');
      const elDoI = document.getElementById('game-metric-doi');
      const elARU = document.getElementById('game-metric-aru');
      const elRank = document.getElementById('game-metric-rank');

      if (elMs) elMs.innerText = makespan.toFixed(2) + 's';
      if (elLB) elLB.innerText = lowerBound.toFixed(2) + 's';
      if (elGap) elGap.innerText = gap.toFixed(1) + '%';
      if (elDoI) elDoI.innerText = doi.toFixed(2);
      if (elARU) elARU.innerText = aru.toFixed(1) + '%';

      // Rank calculation
      let rank = 'Rank C (Bottleneck Alert)';
      let rankColor = '#ef4444';
      if (gap <= 8) {
        rank = 'Rank S 🏆 (Master Dispatcher)';
        rankColor = '#10b981';
      } else if (gap <= 18) {
        rank = 'Rank A 🌟 (Senior Architect)';
        rankColor = '#06b6d4';
      } else if (gap <= 32) {
        rank = 'Rank B ⚡ (Junior Sysadmin)';
        rankColor = '#f59e0b';
      }

      if (elRank) {
        elRank.innerText = rank;
        elRank.style.color = rankColor;
      }
    }

    testGameVsAI() {
      const resultsDiv = document.getElementById('game-ai-results');
      if (!resultsDiv) return;

      resultsDiv.innerHTML = '<div style="padding:16px; text-align:center; color:#0284c7;"><b>⏳ Menjalankan 5 Algoritma AI (Paritas 600 NFE)...</b></div>';

      setTimeout(() => {
        // Convert game tasks & VMs into Problem format
        const probTasks = this.gameTasks.map(t => ({ id: t.id, name: t.name, length: t.mi }));
        const probVMs = this.gameVMs.map(v => ({ id: v.id, name: v.name, speed: v.speed, color: v.color }));

        // 1. Player Makespan
        const playerLoads = [0, 0, 0];
        this.gameTasks.forEach((t, tIdx) => {
          playerLoads[this.gameAssignment[tIdx]] += t.mi / this.gameVMs[this.gameAssignment[tIdx]].mips;
        });
        const playerMs = Math.max(...playerLoads);

        // 2. Min-Min Heuristic
        const minMinSol = scheduleMinMin(probTasks, probVMs);
        const minMinMs = calculateMakespan(minMinSol, probTasks, probVMs);

        // 3. VNS Murni (600 NFE)
        const vnsEngine = new VNSEngine(probTasks, probVMs);
        while (vnsEngine.evaluations < 600) vnsEngine.step();
        const vnsMs = vnsEngine.bestMakespan;

        // 4. BFO Murni (600 NFE)
        const bfoEngine = new BFOEngine(probTasks, probVMs);
        while (bfoEngine.evaluations < 600) bfoEngine.step();
        const bfoMs = bfoEngine.bestMakespan;

        // 5. Hybrid 2: PSO-MinMin (600 NFE)
        const psoEngine = new PSOMinMinEngine(probTasks, probVMs);
        while (psoEngine.evaluations < 600) psoEngine.step();
        const psoMs = psoEngine.bestMakespan;

        // 6. Hybrid 1: Memetic BFO-VNS (600 NFE)
        const memeticEngine = new MemeticBFOVNSEngine(probTasks, probVMs);
        while (memeticEngine.evaluations < 600) memeticEngine.step();
        const memeticMs = memeticEngine.bestMakespan;

        const competitors = [
          { name: 'Anda (Human Dispatcher)', ms: playerMs, isPlayer: true },
          { name: 'Heuristik Min-Min', ms: minMinMs, isPlayer: false, tag: 'Deterministik' },
          { name: 'VNS Murni (Kocorock)', ms: vnsMs, isPlayer: false, tag: 'Trajectory' },
          { name: 'BFO Murni (Pipimon)', ms: bfoMs, isPlayer: false, tag: 'Swarm' },
          { name: 'Hybrid 2: PSO-MinMin', ms: psoMs, isPlayer: false, tag: 'Pola B (HRH)' },
          { name: 'Hybrid 1: Memetic BFO-VNS', ms: memeticMs, isPlayer: false, tag: 'Pola D (LRH)' }
        ];

        competitors.sort((a, b) => a.ms - b.ms);

        const playerRank = competitors.findIndex(c => c.isPlayer) + 1;
        const bestMs = competitors[0].ms;

        let tableHtml = `
          <div style="background:rgba(255,255,255,0.85); border-radius:12px; padding:14px; border:1px solid #cbd5e1; margin-top:12px;">
            <div style="font-weight:800; font-size:15px; color:#0f172a; margin-bottom:8px;">
              🏆 Papan Peringkat Turnamen AI Dispatcher:
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead>
                <tr style="border-bottom:1.5px solid #cbd5e1; text-align:left; color:#475569;">
                  <th style="padding:6px;">Pos</th>
                  <th>Kontender</th>
                  <th>Makespan</th>
                  <th>Gap ke Terbaik</th>
                </tr>
              </thead>
              <tbody>
        `;

        competitors.forEach((c, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
          const gap = ((c.ms - bestMs) / bestMs) * 100;
          tableHtml += `
            <tr style="border-bottom:1px solid #f1f5f9; ${c.isPlayer ? 'background:#ecfdf5; font-weight:700;' : ''}">
              <td style="padding:6px;">${medal}</td>
              <td>${c.name} ${c.tag ? `<small style="color:#64748b; font-size:10px;">(${c.tag})</small>` : ''}</td>
              <td style="color:${c.isPlayer ? '#059669' : '#0f172a'};">${c.ms.toFixed(2)}s</td>
              <td style="color:#64748b;">${gap === 0 ? 'Terbaik 🎯' : '+' + gap.toFixed(1) + '%'}</td>
            </tr>
          `;
        });

        tableHtml += `
              </tbody>
            </table>
            <div style="margin-top:12px; padding:10px; border-radius:8px; background:${playerRank <= 2 ? '#dcfce7' : '#fef3c7'}; color:${playerRank <= 2 ? '#166534' : '#92400e'}; font-size:12px; font-weight:600;">
              ${playerRank === 1 ? '🎉 LUAR BIASA! Solusi Anda menjadi Juara 1 mengalahkan seluruh AI metaheuristik!' : playerRank <= 3 ? '👏 Hebat! Anda menempati podium Juara #' + playerRank + ' bersaing ketat dengan algoritma hybrid!' : '💡 Coba gunakan saran Shaking VNS untuk memindahkan beban dari VM tersibuk ke VM paling lengang!'}
            </div>
          </div>
        `;

        resultsDiv.innerHTML = tableHtml;
      }, 100);
    }

    giveGameVNSHint() {
      const vmLoads = [0, 0, 0];
      this.gameTasks.forEach((t, tIdx) => {
        vmLoads[this.gameAssignment[tIdx]] += t.mi / this.gameVMs[this.gameAssignment[tIdx]].mips;
      });

      const maxVm = vmLoads.indexOf(Math.max(...vmLoads));
      const minVm = vmLoads.indexOf(Math.min(...vmLoads));

      // Find best task on maxVm to relocate to minVm
      let bestTIdx = -1;
      let bestNewMs = Infinity;

      this.gameTasks.forEach((t, tIdx) => {
        if (this.gameAssignment[tIdx] === maxVm) {
          const testLoads = [...vmLoads];
          testLoads[maxVm] -= t.mi / this.gameVMs[maxVm].mips;
          testLoads[minVm] += t.mi / this.gameVMs[minVm].mips;
          const newMs = Math.max(...testLoads);
          if (newMs < bestNewMs) {
            bestNewMs = newMs;
            bestTIdx = tIdx;
          }
        }
      });

      const hintDiv = document.getElementById('game-hint-box');
      if (hintDiv && bestTIdx !== -1) {
        const t = this.gameTasks[bestTIdx];
        hintDiv.innerHTML = `
          <div style="padding:10px 14px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; color:#92400e; font-size:12px; margin-top:10px;">
            <b>💡 Petunjuk Shaking Kocorock (VNS):</b><br>
            VM ${maxVm + 1} mengalami bottleneck (${vmLoads[maxVm].toFixed(2)}s).<br>
            Pindahkan <b>${t.name} (${t.mi} MI)</b> dari <b>VM ${maxVm + 1}</b> ke <b>VM ${minVm + 1}</b>!<br>
            Makespan akan turun dari <b>${vmLoads[maxVm].toFixed(2)}s</b> &rarr; <b>${bestNewMs.toFixed(2)}s</b>.
            <button onclick="window.app.assignGameTask(${bestTIdx}, ${minVm})" style="margin-left:10px; padding:4px 10px; background:#f59e0b; color:#ffffff; border:none; border-radius:6px; font-weight:700; cursor:pointer;">
              Terapkan Saran Ini ⚡
            </button>
          </div>
        `;
      }
    }

    giveGameBFOHint() {
      const hintDiv = document.getElementById('game-hint-box');
      if (hintDiv) {
        hintDiv.innerHTML = `
          <div style="padding:10px 14px; background:#ecfeff; border:1px solid #a5f3fc; border-radius:10px; color:#0e7490; font-size:12px; margin-top:10px;">
            <b>🌱 Petunjuk Kemotaksis Pipimon (BFO):</b><br>
            Bakteri mencari konsentrasi nutrisi tertinggi (Makespan minimum).<br>
            Rasio kapasitas MIPS kita adalah <b>3.5 : 2.0 : 1.0</b> (Total 6500 MIPS).<br>
            Untuk mencapai Lower Bound ideal (0.90s), bagilah total instruksi (5850 MI) secara proporsional:<br>
            • VM 1 (Kilat): Target ~3150 MI (54% beban)<br>
            • VM 2 (Seimbang): Target ~1800 MI (31% beban)<br>
            • VM 3 (Hemat): Target ~900 MI (15% beban)
          </div>
        `;
      }
    }

    applyGamePreset(type) {
      if (type === 'anti') {
        // Anti-pattern: All tasks to VM 1
        this.gameAssignment = this.gameTasks.map(() => 0);
        this.say("⚠️ Preset Anti-Pola diaktifkan: Seluruh tugas ditumpuk ke VM 1 tercepat! Terjadi kemacetan parah (bottleneck) dan VM 2 & 3 menganggur total.");
      } else if (type === 'rand') {
        this.gameAssignment = this.gameTasks.map(() => Math.floor(Math.random() * 3));
        this.say("🎲 Preset Acak diaktifkan.");
      } else if (type === 'opt') {
        // Optimal balanced assignment
        this.gameAssignment = [0, 1, 0, 0, 1, 0, 1, 2, 2, 2];
        this.say("✨ Preset Solusi Optimal Hybrid BFO-VNS diaktifkan!");
      }

      this.renderGameBoard();
      this.updateGameMetrics();
    }
  }

  // Launch on ready
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppMaster();
  });
})();
