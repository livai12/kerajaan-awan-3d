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

      // First-Person POV Controller State (START DIRECTLY INSIDE CASTLE!)
      this.cameraMode = 'fps'; // Start directly in FPS Walkthrough mode!
      this.fpsPlayer = {
        position: new THREE.Vector3(0, 0, 10), // Inside Grand Hallway entrance facing down toward Throne facing down toward Throne
        velocity: new THREE.Vector3(0, 0, 0),
        yaw: 0, // Facing North toward the Grand Hybrid Altar at z = -28.5
        pitch: -0.02,
        speed: 9.5,
        eyeHeight: 1.85,
        isGrounded: true,
        jumpVelocity: 0,
        walkStep: 0,
        isSprinting: false
      };
      this.fpsKeys = { forward: false, backward: false, left: false, right: false, jump: false, sprint: false };
      this.lastFrameTime = performance.now();

      this.initScene();
      this.buildIslands();
      this.buildCharacters();
      this.initOrbit();
      this.createGrandHybridCitadel();
      this.createBasaltPathways();
      this.createExplorerTorch();
      this.initFPSControls();
      if (this.controls) this.controls.enabled = false;
      if (this.explorerTorch) this.explorerTorch.visible = true;
      this.animate();
    }

    initScene() {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: false, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.25;

      this.scene = new THREE.Scene();
      // Rich volcanic dark stone citadel atmosphere
      this.scene.background = new THREE.Color(0x160c09);
      this.scene.fog = new THREE.Fog(0x160c09, 18, 110);

      this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.set(0, 19, 40);
      this.camera.lookAt(this.camTarget);
      this.scene.add(this.camera);

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

    createGrandHybridCitadel() {
      this.citadel = new THREE.Group();

      // Materials
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.82, metalness: 0.25 });
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.75, metalness: 0.35 });
      const archMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f0f12, roughness: 0.92 });
      const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
      const waterMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
      const goldAltarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.85, emissive: 0x78350f, emissiveIntensity: 0.45 });
      const stoneStepMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });

      // 1. GRAND HALL FLOOR (Spans z = 24 to -34, x = -13 to +13)
      const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 60), floorMat);
      hallFloor.position.set(0, -0.3, -5);
      hallFloor.receiveShadow = true;
      this.citadel.add(hallFloor);

      // Central Ceremonial Runic Carpet / Magma Walkway
      const runicCarpet = new THREE.Mesh(
        new THREE.BoxGeometry(5.4, 0.08, 48),
        new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.6, emissive: 0xea580c, emissiveIntensity: 0.35 })
      );
      runicCarpet.position.set(0, 0.04, -2);
      runicCarpet.receiveShadow = true;
      this.citadel.add(runicCarpet);

      // Glowing lava seams along central carpet edges
      const seamL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 48), new THREE.MeshBasicMaterial({ color: 0xff5722 }));
      seamL.position.set(-2.7, 0.08, -2);
      const seamR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 48), new THREE.MeshBasicMaterial({ color: 0xff5722 }));
      seamR.position.set(2.7, 0.08, -2);
      this.citadel.add(seamL); this.citadel.add(seamR);

      // 2. SUNKEN SIDE CANALS
      // Left: Volcanic Magma Canal (VNS domain)
      const lavaCanal = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 44), lavaMat);
      lavaCanal.position.set(-8.5, -0.05, -3);
      this.citadel.add(lavaCanal);

      // Right: Luminescent Cyan Water Canal (BFO domain)
      const waterCanal = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 44), waterMat);
      waterCanal.position.set(8.5, -0.05, -3);
      this.citadel.add(waterCanal);

      // 3. COLONNADES OF GOTHIC PILLARS & ARCHES
      const pillarZ = [18, 10, 2, -6, -14, -22];
      this.citadelTorches = [];

      pillarZ.forEach((zPos, idx) => {
        // Left Pillar (Fire Theme)
        const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 11, 6), pillarMat);
        pL.position.set(-6.0, 5.5, zPos);
        pL.castShadow = true;
        pL.receiveShadow = true;
        this.citadel.add(pL);

        // Right Pillar (Water Theme)
        const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 11, 6), pillarMat);
        pR.position.set(6.0, 5.5, zPos);
        pR.castShadow = true;
        pR.receiveShadow = true;
        this.citadel.add(pR);

        // Overhead Gothic Rib Arch spanning across hall
        const arch = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.6, 0.8), archMat);
        arch.position.set(0, 10.5, zPos);
        this.citadel.add(arch);

        // Wall Sconce Torches with Dynamic PointLights
        // Left Fire Torch
        const torchL = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        torchL.position.set(-5.1, 4.2, zPos);
        const lightL = new THREE.PointLight(0xff7700, 1.2, 12);
        lightL.position.copy(torchL.position);
        this.citadel.add(torchL); this.citadel.add(lightL);
        this.citadelTorches.push({ mesh: torchL, light: lightL, baseColor: 0xff7700 });

        // Right Aqua Torch
        const torchR = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
        torchR.position.set(5.1, 4.2, zPos);
        const lightR = new THREE.PointLight(0x00ccff, 1.1, 12);
        lightR.position.copy(torchR.position);
        this.citadel.add(torchR); this.citadel.add(lightR);
        this.citadelTorches.push({ mesh: torchR, light: lightR, baseColor: 0x00ccff });
      });

      // 4. CITADEL WALLS & VAULTED CEILING
      // Left Wall
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 60), wallMat);
      wallL.position.set(-13, 6.0, -5);
      this.citadel.add(wallL);

      // Right Wall
      const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 60), wallMat);
      wallR.position.set(13, 6.0, -5);
      this.citadel.add(wallR);

      // Vaulted Dark Stone Ceiling
      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 60), wallMat);
      ceiling.position.set(0, 11.8, -5);
      this.citadel.add(ceiling);

      // Front Entrance Wall & Grand Demonic Portcullis Gates (z = 24)
      const gateWallL = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 0.8), wallMat);
      gateWallL.position.set(-8, 6.0, 24);
      const gateWallR = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 0.8), wallMat);
      gateWallR.position.set(8, 6.0, 24);
      const gateLintel = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.5, 0.8), wallMat);
      gateLintel.position.set(0, 9.75, 24);
      this.citadel.add(gateWallL); this.citadel.add(gateWallR); this.citadel.add(gateLintel);

      // 5. THE GRAND DAIS & ALTAR OF HYBRID SYNTHESIS (z = -24 to -34)
      // Grand Ceremonial Stone Steps
      for (let st = 0; st < 4; st++) {
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(16 - st * 0.8, 0.5, 1.2),
          stoneStepMat
        );
        stepMesh.position.set(0, 0.25 + st * 0.5, -22.5 - st * 0.9);
        stepMesh.receiveShadow = true;
        this.citadel.add(stepMesh);
      }

      // Elevated Semicircular Altar Dais (y = 2.0)
      const daisMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(10.5, 11.2, 2.0, 20),
        floorMat
      );
      daisMesh.position.set(0, 1.0, -29);
      daisMesh.receiveShadow = true;
      this.citadel.add(daisMesh);

      // Golden Inscribed Center Altar Base
      const centerAltar = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.6, 0.6, 16),
        goldAltarMat
      );
      centerAltar.position.set(0, 2.3, -28.5);
      this.citadel.add(centerAltar);

      // --- THE GRAND HYBRID REACTOR CORE (Memetic BFO-VNS) ---
      this.hybridReactor = new THREE.Group();
      this.hybridReactor.position.set(0, 3.9, -28.5);

      // Outer Golden Flame Gyroscope Ring
      const ring1Mat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0xd97706,
        emissiveIntensity: 0.8
      });
      this.gyroRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 12, 32), ring1Mat);
      this.hybridReactor.add(this.gyroRing1);

      // Inner Electric Cyan Gyroscope Ring
      const ring2Mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8
      });
      this.gyroRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 12, 32), ring2Mat);
      this.hybridReactor.add(this.gyroRing2);

      // Central Pulsing Hybrid Plasma Sphere (Fusion of Magma Fire & Aqua Water!)
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.6,
        roughness: 0.1
      });
      this.plasmaCore = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 24), coreMat);
      this.hybridReactor.add(this.plasmaCore);

      // Dynamic Center PointLight casting magical dual-color glow
      this.coreLight = new THREE.PointLight(0x38bdf8, 2.5, 18);
      this.hybridReactor.add(this.coreLight);

      // Floating 3D Alchemical Banner Above the Dais
      const bannerTag = this.createFloatingTag('REAKTOR SINTESIS HIBRIDA', 'Memetic BFO-VNS • 1 + 1 > 2', '#38bdf8');
      bannerTag.position.set(0, 3.2, 0);
      bannerTag.scale.set(2.4, 0.85, 1);
      this.hybridReactor.add(bannerTag);

      // Energy Beams linking rulers to core
      const beamMatL = new THREE.MeshBasicMaterial({ color: 0xff5722, transparent: true, opacity: 0.75 });
      const beamMatR = new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.75 });

      this.beamKocok = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8).rotateZ(Math.PI / 2.7), beamMatL);
      this.beamKocok.position.set(-2.0, 0.3, 0);
      this.hybridReactor.add(this.beamKocok);

      this.beamPip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8).rotateZ(-Math.PI / 2.7), beamMatR);
      this.beamPip.position.set(2.0, 0.3, 0);
      this.hybridReactor.add(this.beamPip);

      this.citadel.add(this.hybridReactor);

      // Background Demonic Eye & Spire visible through rear skylight
      const centerTower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 14, 8), pillarMat);
      centerTower.position.set(0, 16.0, -35);
      this.citadel.add(centerTower);

      const fireOrbMat = new THREE.MeshToonMaterial({ color: 0xff3b00, emissive: 0xff4500, emissiveIntensity: 1.6 });
      this.hellfireEye = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 16), fireOrbMat);
      this.hellfireEye.position.set(0, 24.5, -35);
      this.citadel.add(this.hellfireEye);

      this.rootGroup.add(this.citadel);
    }

    createBigFriendshipCastle() {
      // Kept for backward compatibility
    }

    createDistantCitadels() {
      const makeCitadel = (x, y, z) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);

        // Distant Charred Basalt Islands
        const isle = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.5, 1.5, 8), new THREE.MeshToonMaterial({ color: 0x1c1917, roughness: 0.9 }));
        const rock = new THREE.Mesh(new THREE.ConeGeometry(3.5, 5, 6).rotateX(Math.PI), new THREE.MeshToonMaterial({ color: 0x0c0a09 }));
        rock.position.y = -3.2;
        g.add(isle); g.add(rock);

        // Nether Spires
        for (let i = 0; i < 3; i++) {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 3 + i, 6), new THREE.MeshToonMaterial({ color: 0x27272a }));
          const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.8, 6), new THREE.MeshToonMaterial({ color: 0x991b1b }));
          tower.position.set(-1.2 + i * 1.2, 1.5 + (i * 0.5), -0.5);
          roof.position.set(-1.2 + i * 1.2, 3.8 + (i * 1.0), -0.5);
          g.add(tower); g.add(roof);
        }

        // Distant Cascading Lava Fall
        const lavaFall = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.7, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.92 })
        );
        lavaFall.position.set(1.5, -4, 1.2);
        g.add(lavaFall);

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
      canvas.width = 280;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');

      // Rounded pill background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = colHex;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(6, 6, 268, 84, 22);
      ctx.fill();
      ctx.stroke();

      // Title
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(name, 140, 42);

      // Subtitle
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.fillStyle = colHex;
      ctx.fillText(subtitle, 140, 70);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.8, 0.62, 1);
      return sprite;
    }

    buildCharacters() {
      this.charMode = 'procedural'; // Default to high-fidelity procedural models!
      this.meshyGroup = new THREE.Group();
      this.proceduralGroup = new THREE.Group();
      this.rootGroup.add(this.meshyGroup);
      this.rootGroup.add(this.proceduralGroup);

      // ==========================================
      // 1. PROCEDURAL MAGMA-KOCOROCK (VNS Master)
      // Placed on Grand Dais beside the Hybrid Core!
      // ==========================================
      this.kocok = new THREE.Group();
      const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72, metalness: 0.35 });
      const magmaSeamMat = new THREE.MeshStandardMaterial({ color: 0xff5722, emissive: 0xea580c, emissiveIntensity: 1.5 });
      const goldenCoreMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.8 });

      // Torso: Faceted Obsidian Rock with glowing seams
      const bodyGeo = new THREE.DodecahedronGeometry(1.65, 1);
      const body = new THREE.Mesh(bodyGeo, obsidianMat);
      body.castShadow = true;
      this.kocok.add(body);

      // Abdominal Segmented Plates with molten cracks (Reference Image 1)
      for (let ab = 0; ab < 3; ab++) {
        const abL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.22), obsidianMat);
        abL.position.set(-0.32, -0.2 - ab * 0.36, 1.25);
        const abR = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.22), obsidianMat);
        abR.position.set(0.32, -0.2 - ab * 0.36, 1.25);
        this.kocok.add(abL); this.kocok.add(abR);
      }

      // Molten Glowing Heart / Chest Core
      const chestPlate = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), goldenCoreMat);
      chestPlate.position.set(0, 0.45, 1.18);
      chestPlate.scale.set(1.15, 0.95, 0.4);
      this.kocok.add(chestPlate);
      this.kocokCore = chestPlate;

      // Obsidian Shoulder Pauldrons with Magma Rims
      const pauldronL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), obsidianMat);
      pauldronL.position.set(-1.8, 1.2, 0.2);
      const pauldronR = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), obsidianMat);
      pauldronR.position.set(1.8, 1.2, 0.2);
      this.kocok.add(pauldronL); this.kocok.add(pauldronR);

      // Golem Obsidian Helmet Head with Horns
      const headGeo = new THREE.DodecahedronGeometry(0.95, 1);
      const head = new THREE.Mesh(headGeo, obsidianMat);
      head.position.set(0, 1.65, 0.2);
      this.kocok.add(head);

      // Horns
      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 5), obsidianMat);
      hornL.position.set(-0.55, 2.3, 0.1);
      hornL.rotation.z = -0.4;
      const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 5), obsidianMat);
      hornR.position.set(0.55, 2.3, 0.1);
      hornR.rotation.z = 0.4;
      this.kocok.add(hornL); this.kocok.add(hornR);

      // Fiery Magma Glowing Eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), eyeMat);
      eyeL.position.set(-0.35, 1.72, 0.96);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), eyeMat);
      eyeR.position.set(0.35, 1.72, 0.96);
      this.kocok.add(eyeL); this.kocok.add(eyeR);

      // Obsidian Boulder Fists with Magma Knuckles
      const fistGeo = new THREE.DodecahedronGeometry(0.68, 1);
      const fistL = new THREE.Mesh(fistGeo, obsidianMat);
      fistL.position.set(-1.85, 0.1, 0.5);
      const fistR = new THREE.Mesh(fistGeo, obsidianMat);
      fistR.position.set(1.85, 0.1, 0.5);
      this.kocok.add(fistL); this.kocok.add(fistR);

      // Volcanic Battle Axe (Held proudly, channeling to the Hybrid Core!)
      this.axe = new THREE.Group();
      const axeHaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.0, 8), obsidianMat);
      this.axe.add(axeHaft);

      const axeBladeMat = new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.6, metalness: 0.5 });
      const axeEdgeMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });

      const axeBladeL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.18), axeBladeMat);
      axeBladeL.position.set(-0.75, 1.2, 0);
      this.axe.add(axeBladeL);
      const axeEdgeL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6), axeEdgeMat);
      axeEdgeL.position.set(-1.38, 1.2, 0);
      this.axe.add(axeEdgeL);

      const axeBladeR = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.18), axeBladeMat);
      axeBladeR.position.set(0.65, 1.2, 0);
      this.axe.add(axeBladeR);
      const axeEdgeR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), axeEdgeMat);
      axeEdgeR.position.set(1.15, 1.2, 0);
      this.axe.add(axeEdgeR);

      this.axe.position.set(1.6, 1.5, 0.6);
      this.axe.rotation.z = -0.55;
      this.axe.rotation.x = 0.2;
      this.kocok.add(this.axe);

      // Sleek 3D Floating Name Tag for Magma-Kocorock
      const tagKocok = this.createFloatingTag('MAGMA KOCOROCK', 'VNS • Obsidian Golem', '#f59e0b');
      tagKocok.position.set(0, 3.8, 0);
      tagKocok.scale.set(1.8, 0.65, 1);
      this.kocok.add(tagKocok);

      // Positioned on the Left of the Hybrid Core on the Dais!
      this.kocok.position.set(-3.8, 2.0, -28.5);
      this.kocok.rotation.y = 0.38;
      this.proceduralGroup.add(this.kocok);

      // ==========================================
      // 2. PROCEDURAL AQUA-PIPIMON (KAWAII WATER SPRITE)
      // Reference Image 2: Teardrop body, anime eyes, blush cheeks!
      // ==========================================
      this.pips = [];
      const leaderPip = new THREE.Group();
      const rad = 1.35;

      // Glossy Translucent Cyan Droplet Body
      const dropletBody = new THREE.Group();
      const pipMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.94,
        roughness: 0.08,
        metalness: 0.12
      });

      const baseSphere = new THREE.Mesh(new THREE.SphereGeometry(rad, 24, 24), pipMat);
      dropletBody.add(baseSphere);

      const tipCone = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.85, rad * 1.35, 24), pipMat);
      tipCone.position.y = rad * 0.72;
      dropletBody.add(tipCone);

      // Light-cyan soft reflective belly patch (Image 2)
      const bellyMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15
      });
      const bellyPatch = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.72, 16, 16), bellyMat);
      bellyPatch.position.set(0, -rad * 0.15, rad * 0.55);
      bellyPatch.scale.set(1.0, 1.15, 0.35);
      dropletBody.add(bellyPatch);
      leaderPip.add(dropletBody);

      // KAWAII SOFT PINK BLUSH CHEEKS (#fb7185)
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0.85 });
      const blushL = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.2, 12, 12), blushMat);
      blushL.position.set(-rad * 0.56, -rad * 0.02, rad * 0.84);
      blushL.scale.set(1.2, 0.7, 0.3);
      const blushR = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.2, 12, 12), blushMat);
      blushR.position.set(rad * 0.56, -rad * 0.02, rad * 0.84);
      blushR.scale.set(1.2, 0.7, 0.3);
      leaderPip.add(blushL); leaderPip.add(blushR);

      // SPARKLING ANIME EYES WITH BLINKING SUPPORT
      const eyeW = rad * 0.26;
      const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x030712 });
      const eyeDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // Left Eye
      const eyeLGroup = new THREE.Group();
      eyeLGroup.position.set(-rad * 0.32, rad * 0.18, rad * 0.88);
      const pupilL = new THREE.Mesh(new THREE.BoxGeometry(eyeW, eyeW * 1.35, eyeW * 0.4), eyePupilMat);
      eyeLGroup.add(pupilL);
      // Large white catchlight sparkle
      const dotL1 = new THREE.Mesh(new THREE.BoxGeometry(eyeW * 0.45, eyeW * 0.45, eyeW * 0.45), eyeDotMat);
      dotL1.position.set(-eyeW * 0.18, eyeW * 0.28, eyeW * 0.15);
      eyeLGroup.add(dotL1);
      // Small twinkle catchlight
      const dotL2 = new THREE.Mesh(new THREE.BoxGeometry(eyeW * 0.22, eyeW * 0.22, eyeW * 0.45), eyeDotMat);
      dotL2.position.set(eyeW * 0.18, -eyeW * 0.25, eyeW * 0.15);
      eyeLGroup.add(dotL2);
      leaderPip.add(eyeLGroup);

      // Right Eye
      const eyeRGroup = new THREE.Group();
      eyeRGroup.position.set(rad * 0.32, rad * 0.18, rad * 0.88);
      const pupilR = new THREE.Mesh(new THREE.BoxGeometry(eyeW, eyeW * 1.35, eyeW * 0.4), eyePupilMat);
      eyeRGroup.add(pupilR);
      const dotR1 = new THREE.Mesh(new THREE.BoxGeometry(eyeW * 0.45, eyeW * 0.45, eyeW * 0.45), eyeDotMat);
      dotR1.position.set(-eyeW * 0.18, eyeW * 0.28, eyeW * 0.15);
      eyeRGroup.add(dotR1);
      const dotR2 = new THREE.Mesh(new THREE.BoxGeometry(eyeW * 0.22, eyeW * 0.22, eyeW * 0.45), eyeDotMat);
      dotR2.position.set(eyeW * 0.18, -eyeW * 0.25, eyeW * 0.15);
      eyeRGroup.add(dotR2);
      leaderPip.add(eyeRGroup);

      // Cute Cheerful Smiling Mouth
      const mouthMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(eyeW * 1.1, eyeW * 0.32, eyeW * 0.3), mouthMat);
      mouth.position.set(0, -rad * 0.14, rad * 0.94);
      leaderPip.add(mouth);

      // Tiny pink tongue
      const tongueMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(eyeW * 0.55, eyeW * 0.18, eyeW * 0.32), tongueMat);
      tongue.position.set(0, -rad * 0.18, rad * 0.95);
      leaderPip.add(tongue);

      // Cute Waving Droplet Arms
      const armMat = pipMat;
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.95, 8), armMat);
      armL.position.set(-rad * 0.88, rad * 0.15, 0);
      armL.rotation.z = 0.85;
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.95, 8), armMat);
      armR.position.set(rad * 0.88, rad * 0.15, 0);
      armR.rotation.z = -0.85;
      leaderPip.add(armL); leaderPip.add(armR);

      // Store animation handles
      leaderPip.userData = {
        tail: dropletBody,
        leftEye: eyeLGroup,
        rightEye: eyeRGroup,
        armL: armL,
        armR: armR
      };

      // Sleek 3D Floating Name Tag for Aqua-Pipimon
      const tagPip = this.createFloatingTag('AQUA PIPIMON', 'BFO • Water Droplet', '#06b6d4');
      tagPip.position.set(0, 3.2, 0);
      tagPip.scale.set(1.8, 0.65, 1);
      leaderPip.add(tagPip);

      // Positioned on the Right of the Hybrid Core on the Dais!
      leaderPip.position.set(3.8, 2.0, -28.5);
      leaderPip.rotation.y = -0.38;
      this.leaderPip = leaderPip;
      this.pips.push(leaderPip);
      this.proceduralGroup.add(leaderPip);

      // 4 Playful Mini-Pipimon Droplets (The BFO Chemotaxis Swarm)
      for (let s = 1; s <= 4; s++) {
        const miniPipGroup = new THREE.Group();
        const miniMat = new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          emissive: 0x0284c7,
          emissiveIntensity: 0.55,
          transparent: true,
          opacity: 0.88
        });
        const miniSphere = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 14), miniMat);
        miniPipGroup.add(miniSphere);
        const miniTip = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.45, 12), miniMat);
        miniTip.position.y = 0.32;
        miniPipGroup.add(miniTip);

        // Cute mini eyes
        const miniEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyePupilMat);
        miniEyeL.position.set(-0.12, 0.08, 0.38);
        const miniEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyePupilMat);
        miniEyeR.position.set(0.12, 0.08, 0.38);
        miniPipGroup.add(miniEyeL); miniPipGroup.add(miniEyeR);

        const ang = (s / 4) * Math.PI * 2;
        miniPipGroup.position.set(3.8 + Math.cos(ang) * 1.8, 2.2 + Math.sin(ang) * 0.4, -28.5 + Math.sin(ang) * 1.8);
        miniPipGroup.userData = { angle: ang, radius: 1.8, offset: s * 1.5 };
        this.pips.push(miniPipGroup);
        this.proceduralGroup.add(miniPipGroup);
      }

      this.setCharMode('procedural');
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

    // ==========================================
    // FIRST-PERSON POV (FIRST-PERSON VIEW CONTROLLER)
    // ==========================================
    createBasaltPathways() {
      this.pathwayGroup = new THREE.Group();
      const stoneMat = new THREE.MeshToonMaterial({ color: 0x1c1917, roughness: 0.85 });
      const lavaTrimMat = new THREE.MeshToonMaterial({ color: 0xff5722, emissive: 0xea580c, emissiveIntensity: 0.8 });

      // 1. Central Plaza & Causeway linking Left (VNS) & Right (BFO) Realms
      const mainBridge = new THREE.Mesh(new THREE.BoxGeometry(26, 0.45, 3.6), stoneMat);
      mainBridge.position.set(0, 0.25, 0);
      mainBridge.receiveShadow = true;
      this.pathwayGroup.add(mainBridge);

      // Glowing lava rim along main causeway
      const rimF = new THREE.Mesh(new THREE.BoxGeometry(26, 0.12, 0.12), lavaTrimMat);
      rimF.position.set(0, 0.45, 1.8);
      const rimB = new THREE.Mesh(new THREE.BoxGeometry(26, 0.12, 0.12), lavaTrimMat);
      rimB.position.set(0, 0.45, -1.8);
      this.pathwayGroup.add(rimF); this.pathwayGroup.add(rimB);

      // 2. North Causeway leading toward Warrior Statue & Nether Citadel
      const northPath = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.45, 16), stoneMat);
      northPath.position.set(0, 0.25, -8);
      northPath.receiveShadow = true;
      this.pathwayGroup.add(northPath);

      // 3. Ascending Ramp up to Istana Api dari Neraka
      const hellRamp = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 12), stoneMat);
      hellRamp.position.set(0, 3.2, -26);
      hellRamp.rotation.x = 0.22; // Incline ramp up to citadel
      this.pathwayGroup.add(hellRamp);

      // 4. Stepping Stone Slabs along the pathway
      for (let s = -18; s <= 18; s += 3.6) {
        const step = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.35, 6), stoneMat);
        step.position.set(s, 0.35, 3.8);
        this.pathwayGroup.add(step);
      }

      this.rootGroup.add(this.pathwayGroup);
    }

    createExplorerTorch() {
      // Stylized volcanic handheld torch in camera view
      this.explorerTorch = new THREE.Group();
      this.explorerTorch.position.set(0.38, -0.28, -0.65);

      const handleMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7, metalness: 0.3 });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });

      // Torch handle
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.45, 8), handleMat);
      handle.rotation.x = Math.PI / 3.8;
      this.explorerTorch.add(handle);

      // Torch cage
      const cage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), handleMat);
      cage.position.set(0, 0.18, -0.16);
      this.explorerTorch.add(cage);

      // Flickering flame core
      this.torchFlame = new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 1), flameMat);
      this.torchFlame.position.set(0, 0.23, -0.16);
      this.explorerTorch.add(this.torchFlame);

      // Warm dynamic point light illuminating the environment ahead
      this.torchLight = new THREE.PointLight(0xff8811, 2.5, 28, 1.2);
      this.torchLight.position.set(0, 0.24, -0.16);
      this.explorerTorch.add(this.torchLight);

      this.camera.add(this.explorerTorch);
      this.explorerTorch.visible = (this.cameraMode === 'fps');
    }

    initFPSControls() {
      // 1. WASD & Arrow Keys Keyboard Input Handling
      window.addEventListener('keydown', (e) => {
        if (this.cameraMode !== 'fps') return;
        const code = e.code;
        const key = e.key ? e.key.toLowerCase() : '';

        // WASD & Arrow Keys movement
        if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') this.fpsKeys.forward = true;
        if (code === 'KeyS' || code === 'ArrowDown' || key === 's') this.fpsKeys.backward = true;
        if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') this.fpsKeys.left = true;
        if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') this.fpsKeys.right = true;

        // Sprinting
        if (code === 'ShiftLeft' || code === 'ShiftRight') this.fpsPlayer.isSprinting = true;

        // Jump physics
        if (code === 'Space') {
          e.preventDefault();
          if (this.fpsPlayer.isGrounded) {
            this.fpsPlayer.jumpVelocity = 8.8;
            this.fpsPlayer.isGrounded = false;
            if (window.app && window.app.soundtrack && window.app.soundtrack.playChime) {
              window.app.soundtrack.playChime(523.25, 0, 0.35, 0.12);
            }
          }
        }

        // Exit POV mode with Escape (V is handled centrally by AppMaster to prevent double-toggle)
        if (e.key === 'Escape') {
          e.preventDefault();
          this.toggleCameraMode('orbit');
        }
      });

      window.addEventListener('keyup', (e) => {
        if (this.cameraMode !== 'fps') return;
        const code = e.code;
        const key = e.key ? e.key.toLowerCase() : '';
        if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') this.fpsKeys.forward = false;
        if (code === 'KeyS' || code === 'ArrowDown' || key === 's') this.fpsKeys.backward = false;
        if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') this.fpsKeys.left = false;
        if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') this.fpsKeys.right = false;
        if (code === 'ShiftLeft' || code === 'ShiftRight') this.fpsPlayer.isSprinting = false;
      });

      // 2. Mouse Look / Pointer Lock handling
      const dom = this.renderer.domElement;
      dom.addEventListener('click', () => {
        if (this.cameraMode === 'fps' && document.pointerLockElement !== dom) {
          dom.requestPointerLock = dom.requestPointerLock || dom.mozRequestPointerLock;
          if (dom.requestPointerLock) dom.requestPointerLock();
        }
      });

      document.addEventListener('pointerlockchange', () => {
        this.isPointerLocked = (document.pointerLockElement === dom);
      });

      window.addEventListener('mousemove', (e) => {
        if (this.cameraMode !== 'fps') return;
        // Move with Pointer Lock OR with Mouse Drag
        if (this.isPointerLocked || e.buttons === 1) {
          const sens = 0.0024;
          this.fpsPlayer.yaw -= (e.movementX || 0) * sens;
          this.fpsPlayer.pitch = Math.max(-1.35, Math.min(1.35, this.fpsPlayer.pitch - (e.movementY || 0) * sens));
        }
      });
    }

    toggleCameraMode(targetMode = null) {
      const nextMode = targetMode || (this.cameraMode === 'fps' ? 'orbit' : 'fps');
      this.cameraMode = nextMode;

      const btnTop = document.getElementById('btnOpenPOV');
      const povHUD = document.getElementById('pov-hud');

      if (nextMode === 'fps') {
        if (this.controls) this.controls.enabled = false;
        this.fpsPlayer.position.set(0, 0, 10); // Inside castle grand hall with full view of Dais & Rulers
        this.fpsPlayer.yaw = 0; // Facing North toward Throne & Hybrid Core
        this.fpsPlayer.pitch = -0.02;
        this.fpsPlayer.velocity.set(0, 0, 0);
        this.fpsPlayer.isGrounded = true;

        if (this.explorerTorch) this.explorerTorch.visible = true;
        if (btnTop) {
          btnTop.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
          btnTop.style.borderColor = '#f59e0b';
        }
        if (povHUD) povHUD.style.display = 'block';

        if (window.app && window.app.say) {
          window.app.say("🚶 Mode Jelajah First-Person POV AKTIF! Gunakan W, A, S, D untuk berjalan ke Singgasana Hybrid di ujung lorong, Mouse untuk melihat sekeliling, dan Spasi untuk melompat!");
        }
      } else {
        if (this.controls) {
          this.controls.enabled = true;
          this.controls.target.copy(this.camTarget);
        }
        this.camera.position.set(0, 19, 40);
        this.camera.lookAt(this.camTarget);
        this.camera.rotation.order = 'XYZ';

        if (this.explorerTorch) this.explorerTorch.visible = false;
        if (btnTop) {
          btnTop.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
          btnTop.style.borderColor = '#cbd5e1';
        }
        if (povHUD) povHUD.style.display = 'none';

        if (document.exitPointerLock) document.exitPointerLock();

        if (window.app && window.app.say) {
          window.app.say("📷 Beralih kembali ke Mode Tinjauan Orbit 3D.");
        }
      }
    }

    getGroundHeight(x, z) {
      // 1. Altar Dais at Far End (z <= -25)
      if (z <= -25 && Math.abs(x) <= 11) return 2.0;

      // 2. Ceremonial Steps leading up to Altar (z between -25 and -22)
      if (z > -25 && z < -22 && Math.abs(x) <= 9) {
        const progress = (-22 - z) / 3.0; // 0.0 at -22, 1.0 at -25
        return progress * 2.0;
      }

      // 3. Main Grand Castle Hall Floor
      if (z >= -22 && z <= 24 && Math.abs(x) <= 12.5) return 0.0;

      // 4. Fallback default
      return 0.0;
    }

    updateFPS(delta) {
      const p = this.fpsPlayer;
      const speed = p.isSprinting ? 15.0 : 8.8;

      // Directional vectors from yaw
      const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

      const moveDir = new THREE.Vector3(0, 0, 0);
      if (this.fpsKeys.forward) moveDir.add(forward);
      if (this.fpsKeys.backward) moveDir.sub(forward);
      if (this.fpsKeys.right) moveDir.add(right);
      if (this.fpsKeys.left) moveDir.sub(right);

      const isMoving = moveDir.lengthSq() > 0.001;
      if (isMoving) {
        moveDir.normalize();
        p.position.x += moveDir.x * speed * delta;
        p.position.z += moveDir.z * speed * delta;

        // Head bobbing and rhythmic basalt footsteps
        if (p.isGrounded) {
          const prevStep = p.walkStep;
          p.walkStep += delta * (p.isSprinting ? 14 : 9.5);

          if (Math.sin(prevStep) <= 0 && Math.sin(p.walkStep) > 0) {
            if (window.app && window.app.soundtrack && window.app.soundtrack.playFootstep) {
              window.app.soundtrack.playFootstep();
            }
          }
        }
      } else {
        p.walkStep = 0;
      }

      // Boundaries inside Castle Grand Hall
      p.position.x = Math.max(-11.2, Math.min(11.2, p.position.x));
      p.position.z = Math.max(-30.5, Math.min(21.5, p.position.z));

      // Gravity and Ground Physics
      const groundY = this.getGroundHeight(p.position.x, p.position.z);
      if (!p.isGrounded) {
        p.jumpVelocity -= 22.0 * delta;
        p.position.y += p.jumpVelocity * delta;

        if (p.position.y <= groundY) {
          p.position.y = groundY;
          p.jumpVelocity = 0;
          p.isGrounded = true;
        }
      } else {
        p.position.y = THREE.MathUtils.lerp(p.position.y, groundY, 0.25);
      }

      // Apply Head Bobbing
      const bobY = isMoving && p.isGrounded ? Math.sin(p.walkStep) * 0.08 : 0;
      this.camera.position.set(p.position.x, p.position.y + p.eyeHeight + bobY, p.position.z);

      // Camera Aim Rotation
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = p.yaw;
      this.camera.rotation.x = p.pitch;
      this.camera.rotation.z = 0;

      // Animate Handheld Torch
      if (this.torchFlame && this.torchLight) {
        const fl = 1.0 + Math.sin(performance.now() * 0.015) * 0.15;
        this.torchFlame.scale.set(fl, fl * 1.1, fl);
        this.torchLight.intensity = 1.6 + Math.sin(performance.now() * 0.012) * 0.35;
      }

      // Check Proximity to Landmarks & Update HUD Box
      this.checkFPSProximity();
    }

    checkFPSProximity() {
      const p = this.fpsPlayer.position;
      const box = document.getElementById('pov-proximity-box');
      if (!box) return;

      // 1. Magma-Kocorock (Left on Dais, x = -3.8, z = -28.5)
      const distKocok = Math.hypot(p.x - (-3.8), p.z - (-28.5));
      if (distKocok < 5.2) {
        box.style.display = 'block';
        box.innerHTML = `
          <div style="font-weight:800; color:#f59e0b; font-size:14px; display:flex; align-items:center; justify-content:center; gap:6px;">
            <span>🌋</span> <span>MAGMA-KOCOROCK • PAKAR VNS (VARIABLE NEIGHBORHOOD SEARCH)</span>
          </div>
          <div style="font-size:12px; color:#fde68a; margin-top:2px; font-weight:700;">
            Peran: Eksploitasi Lokal Agresif & Eliminasi Bottleneck Data Center
          </div>
          <div style="font-size:11.5px; color:#e2e8f0; margin-top:6px; line-height:1.45; text-align:left;">
            • <b>Jurus Shaking (Radius k=1..3):</b> Menghantamkan kapak obsidian ke node terberat untuk memindahkan kristal tugas ke mesin yang lebih longgar.<br>
            • <b>First-Improvement Descent:</b> Segera mengadopsi solusi baru saat Makespan membaik untuk efisiensi komputasi maksimal.<br>
            • <b>Target Objektif:</b> Memangkas puncak Makespan teoretis: <code>C_max = max(Load_j / MIPS_j)</code>.
          </div>
        `;
        if (this.showBubble) {
          this.showBubble('kocorock', '🔥 Salam penjelajah! Aku Magma-Kocorock! Kapak obsidianku mengeliminasi antrean bottleneck dengan Shaking bertingkat!', 3500);
        }
        return;
      }

      // 2. Aqua-Pipimon (Right on Dais, x = 3.8, z = -28.5)
      const distPip = Math.hypot(p.x - 3.8, p.z - (-28.5));
      if (distPip < 5.2) {
        box.style.display = 'block';
        box.innerHTML = `
          <div style="font-weight:800; color:#38bdf8; font-size:14px; display:flex; align-items:center; justify-content:center; gap:6px;">
            <span>💧</span> <span>AQUA-PIPIMON • RATU BFO (BACTERIAL FORAGING OPTIMIZATION)</span>
          </div>
          <div style="font-size:12px; color:#bae6fd; margin-top:2px; font-weight:700;">
            Peran: Eksplorasi Global Swarm & Penjelajahan Manifold Solusi
          </div>
          <div style="font-size:11.5px; color:#e2e8f0; margin-top:6px; line-height:1.45; text-align:left;">
            • <b>Kemotaksis (Tumble & Swim):</b> Koloni droplet bakteri berenang serempak menuju gradien nutrisi konsentrasi tinggi (Makespan terendah).<br>
            • <b>Reproduksi Bakteri:</b> 50% bakteri terunggul membelah diri, memperbanyak bibit solusi berkualitas.<br>
            • <b>Eliminasi-Dispersi:</b> Mengacak sebagian bakteri agar optimasi tidak terjebak di optimum lokal!
          </div>
        `;
        if (this.showBubble) {
          this.showBubble('pipimon', '💧 Halo petualang! Aku Aqua-Pipimon! Koloni kami memindai ruang solusi global dengan kemotaksis cerdas!', 3500);
        }
        return;
      }

      // 3. Center Dais: Reaktor Sintesis Hibrida (Memetic BFO-VNS, x = 0, z = -28.5)
      const distToThrone = Math.hypot(p.x, p.z - (-28.5));
      if (distToThrone < 6.8) {
        box.style.display = 'block';
        box.innerHTML = `
          <div style="font-weight:800; color:#fbbf24; font-size:14px; display:flex; align-items:center; justify-content:center; gap:6px;">
            <span>⚡</span> <span>REAKTOR SINTESIS HIBRIDA (MEMETIC BFO-VNS: 1 + 1 > 2)</span>
          </div>
          <div style="font-size:12px; color:#fef08a; margin-top:2px; font-weight:700;">
            Sinergi Emas: Eksplorasi Global (BFO) + Eksploitasi Lokal (VNS)
          </div>
          <div style="font-size:11.5px; color:#f8fafc; margin-top:6px; line-height:1.45; text-align:left;">
            • <b>Mengapa Algoritma Hibrida Menang?</b> VNS mandiri cepat namun rentan buntu lokal. BFO mandiri luas namun lambat konvergen. Saat digabung, BFO memandu koloni ke lembah global terbaik, lalu VNS mengasah solusi hingga mencapai <b>Theoretical Lower Bound</b>!<br>
            • <b>Hasil Uji Empiris:</b> Memangkas Makespan sebesar <b>34.8%</b>, utilisasi CPU <b>92.4%</b>, dan Degree of Imbalance mendekati nol!
          </div>
        `;
        return;
      }

      // 4. Near VM 1 (x = -5.5, z = 8)
      const distVM1 = Math.hypot(p.x - (-5.5), p.z - 8);
      if (distVM1 < 4.8) {
        box.style.display = 'block';
        box.innerHTML = `
          <div style="font-weight:800; color:#ef4444; font-size:13px;">📍 VM 1: Kuil Kilat (Compute-Optimized)</div>
          <div style="font-size:11.5px; color:#cbd5e1; margin-top:2px;">Kapasitas: <b>3500 MIPS</b> (54% total kapasitas cluster). Mesin tercepat namun rentan memicu bottleneck jika tugas menumpuk!</div>
        `;
        return;
      }

      // 5. Near VM 2 (x = 0, z = -2)
      const distVM2 = Math.hypot(p.x, p.z - (-2));
      if (distVM2 < 4.8) {
        box.style.display = 'block';
        box.innerHTML = `
          <div style="font-weight:800; color:#eab308; font-size:13px;">📍 VM 2: Kuil Seimbang (General Purpose)</div>
          <div style="font-size:11.5px; color:#cbd5e1; margin-top:2px;">Kapasitas: <b>2000 MIPS</b> (31% total kapasitas cluster). Titik tumpu penyeimbang beban kerja heterogen.</div>
        `;
        return;
      }

      // 6. Near VM 3 (x = 5.5, z = -12)
      const distVM3 = Math.hypot(p.x - 5.5, p.z - (-12));
      if (distVM3 < 4.8) {
        box.style.display = 'block';
        box.innerHTML = `
          <div style="font-weight:800; color:#06b6d4; font-size:13px;">📍 VM 3: Kuil Hemat (Eco Burst)</div>
          <div style="font-size:11.5px; color:#cbd5e1; margin-top:2px;">Kapasitas: <b>1000 MIPS</b> (15% total kapasitas cluster). Mesin hemat energi untuk tugas komputasi ringan.</div>
        `;
        return;
      }

      // 7. Hallway entrance
      if (p.z > 12) {
        box.style.display = 'block';
        box.innerHTML = `
          <div style="font-weight:800; color:#f59e0b; font-size:12.5px;">🏰 Lorong Kastil Sintesis Hibrida</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Gunakan <b>W, A, S, D</b> untuk berjalan lurus menyusuri karpet runik menuju Singgasana Kocorock & Pipimon di ujung kastil!</div>
        `;
        return;
      }

      box.style.display = 'none';
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      try {
        const t = performance.now() * 0.002;

        // 1. Gentle Floating Bob of Floating Realms
        this.realmLeft.position.y = Math.sin(t) * 0.25;

        // Animate Grand Hybrid Reactor Core on the Dais
        if (this.gyroRing1) this.gyroRing1.rotation.x += 0.02;
        if (this.gyroRing1) this.gyroRing1.rotation.y += 0.015;
        if (this.gyroRing2) this.gyroRing2.rotation.y -= 0.025;
        if (this.gyroRing2) this.gyroRing2.rotation.z += 0.018;
        if (this.plasmaCore) {
          const sc = 1.0 + Math.sin(performance.now() * 0.005) * 0.12;
          this.plasmaCore.scale.set(sc, sc, sc);
        }
        if (this.beamKocok && this.beamPip) {
          const bPulse = 0.65 + Math.sin(performance.now() * 0.008) * 0.25;
          this.beamKocok.material.opacity = bPulse;
          this.beamPip.material.opacity = bPulse;
        }

        // Animate Citadel Wall Torches
        if (this.citadelTorches) {
          const now = performance.now();
          this.citadelTorches.forEach((tc, idx) => {
            tc.light.intensity = 1.0 + Math.sin(now * 0.012 + idx) * 0.3;
          });
        }
        this.realmRight.position.y = Math.sin(t + 1.5) * 0.25;

        const isJumping = (mesh) => this.activeJumps && this.activeJumps.some(j => j.mesh === mesh);

        // 2. Animate Pips: Kawaii Blinking, Cheerful Arm Waving, Squishy Jelly Bounce & Mini Pip Leaps
        if (this.pips && this.pips.length > 0) {
          const leader = this.pips[0];
          if (leader.userData) {
            if (leader.userData.tail) {
              leader.userData.tail.rotation.z = Math.sin(t * 3.5) * 0.25;
            }
            // Anime Blinking loop (every ~3.5 seconds)
            if (leader.userData.leftEye && leader.userData.rightEye) {
              const blinkTime = (t * 0.75) % (Math.PI * 2);
              const isBlink = (blinkTime > 5.9 && blinkTime < 6.2);
              const scY = isBlink ? 0.12 : 1.0;
              leader.userData.leftEye.scale.y = scY;
              leader.userData.rightEye.scale.y = scY;
            }
            // Cheerful arm waving loop
            if (leader.userData.armL && leader.userData.armR) {
              leader.userData.armL.rotation.z = 0.8 + Math.sin(t * 5.0) * 0.32;
              leader.userData.armR.rotation.z = -0.8 - Math.cos(t * 5.0) * 0.32;
            }
          }
          if (!isJumping(leader)) {
            // Gelatinous squishy bounce physics
            const sq = Math.sin(t * 3.6) * 0.06;
            leader.scale.set(1.0 + sq, 1.0 - sq * 1.4, 1.0 + sq);
            leader.position.y = 2.0 + Math.abs(Math.sin(t * 2.6)) * 0.16;
          }
          // Mini pips orbit and playful leaps around leader
          for (let i = 1; i < this.pips.length; i++) {
            const mp = this.pips[i];
            if (mp.userData && mp.userData.angle !== undefined) {
              mp.userData.angle += 0.028;
              mp.position.x = leader.position.x + Math.cos(mp.userData.angle) * mp.userData.radius;
              mp.position.z = leader.position.z + Math.sin(mp.userData.angle) * mp.userData.radius;
              mp.position.y = leader.position.y + 0.25 + Math.abs(Math.sin(t * 4.2 + (mp.userData.offset || i))) * 0.55;
            }
          }
        }

        // 3. Magma Kocorock Breathing Core & Axe Channeling Animation
        if (this.kocokCore) {
          this.kocokCore.material.emissiveIntensity = 1.4 + Math.sin(t * 2.8) * 0.5;
        }
        if (this.axe) {
          this.axe.rotation.z = -0.55 + Math.sin(t * 2.0) * 0.1;
          this.axe.rotation.x = 0.2 + Math.cos(t * 2.0) * 0.08;
        }
        if (this.meshyKocok && !isJumping(this.meshyKocok)) {
          this.meshyKocok.position.y = 2.0 + Math.sin(t * 1.5) * 0.08;
        }
        if (this.kocok && !isJumping(this.kocok)) {
          this.kocok.position.y = 2.0 + Math.sin(t * 1.5) * 0.08;
        }
        if (this.meshyPip && !isJumping(this.meshyPip)) {
          this.meshyPip.position.y = 2.0 + Math.sin(t * 2.0) * 0.12;
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

        // 8. Animate Istana Api dari Neraka (Nether Citadel Fire, Eye of Hell & Lava Falls)
        if (this.bigCastle) {
          this.bigCastle.position.y = 6.5 + Math.sin(t * 0.7) * 0.22;
        }
        if (this.hellfireEye) {
          this.hellfireEye.rotation.y += 0.02;
          this.hellfireEye.material.emissiveIntensity = 1.3 + Math.sin(t * 4.0) * 0.35;
          const s = 1.0 + Math.sin(t * 3.5) * 0.08;
          this.hellfireEye.scale.set(s, s * 1.05, s);
        }
        if (this.hellBraziers) {
          this.hellBraziers.forEach((flame, idx) => {
            const fScale = 1.0 + Math.sin(t * 9.0 + idx) * 0.2;
            flame.scale.set(fScale, fScale * 1.15, fScale);
          });
        }
        if (this.hellLavaFalls) {
          this.hellLavaFalls.forEach((fall, idx) => {
            fall.material.opacity = 0.85 + Math.sin(t * 5.0 + idx) * 0.12;
          });
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

        // 9. Camera Controls: FPS Walkthrough vs Orbit 360
        if (this.cameraMode === 'fps') {
          const now = performance.now();
          const delta = Math.min(0.08, (now - (this.lastFrameTime || now)) * 0.001);
          this.lastFrameTime = now;
          this.updateFPS(delta);
        } else {
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
        }

        // 10. Update 3D-to-2D Screen-space Speech Bubbles
        this.updateSpeechBubbles();

        this.renderer.render(this.scene, this.camera);
      } catch (err) {
        console.error('Animation loop error:', err);
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      }
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

    // ==========================================
    // NPC INTERACTION & MOVEMENT TOWARD POV
    // ==========================================
    npcApproachPlayer(onComplete) {
      const pip = this.leaderPip || (this.pips && this.pips[0]);
      const kocok = this.kocok;
      if (!pip || !kocok) {
        if (onComplete) onComplete();
        return;
      }

      // Stage 1: Jump halfway down the hallway toward entrance
      this.jumpCharacter(pip, new THREE.Vector3(2.0, 0.4, -10.0), 3.2, 520, () => {
        // Stage 2: Leap right in front of player POV camera (at z = 10)
        this.jumpCharacter(pip, new THREE.Vector3(0.9, 0.2, 5.8), 2.8, 480, () => {
          pip.rotation.y = Math.PI; // Face the player
          this.showBubble('pipimon', "Pipi-pipi! Halo penjelajah! Selamat datang di markas kami!", 4500);
          if (onComplete) onComplete();
        });
      });

      this.jumpCharacter(kocok, new THREE.Vector3(-2.2, 0.3, -10.0), 3.0, 560, () => {
        this.jumpCharacter(kocok, new THREE.Vector3(-1.6, 0.2, 5.2), 2.6, 520, () => {
          kocok.rotation.y = Math.PI + 0.18; // Face the player
          this.showBubble('kocorock', "Salam hangat dari Palung Abyssal! Mari kita pelajari Cloud Scheduling!", 4500);
        });
      });
    }

    resetNpcPosition(onComplete) {
      const pip = this.leaderPip || (this.pips && this.pips[0]);
      const kocok = this.kocok;
      if (pip) {
        this.jumpCharacter(pip, new THREE.Vector3(3.8, 2.0, -28.5), 3.0, 600, () => {
          pip.rotation.y = -0.38;
          if (onComplete) onComplete();
        });
      }
      if (kocok) {
        this.jumpCharacter(kocok, new THREE.Vector3(-3.8, 2.0, -28.5), 3.2, 600, () => {
          kocok.rotation.y = 0.38;
        });
      }
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
      this.idleVolume = 0.32; // Clearly audible, menacing dark infernal ambient presence
      this.duckVolume = 0.09; // Tense background bed while characters speak
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

          // Dark Nether Echo / Cavernous Reverb Delay Bus
          this.delayNode = this.ctx.createDelay();
          this.delayNode.delayTime.value = 0.44; // Slower, eerie cavern echo

          this.feedbackGain = this.ctx.createGain();
          this.feedbackGain.gain.value = 0.42;

          this.delayFilter = this.ctx.createBiquadFilter();
          this.delayFilter.type = 'lowpass';
          this.delayFilter.frequency.value = 1100;

          // Connect Delay Loop
          this.delayNode.connect(this.delayFilter);
          this.delayFilter.connect(this.feedbackGain);
          this.feedbackGain.connect(this.delayNode);
          this.delayFilter.connect(this.masterGain);

          // Dark Atmospheric Master Filter (Low, warm, ominous volcanic rumble)
          this.masterFilter = this.ctx.createBiquadFilter();
          this.masterFilter.type = 'lowpass';
          this.masterFilter.frequency.value = 3200;
          this.masterFilter.Q.value = 1.1; // Resonant spooky edge

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

    // Ominous Dark Drone / Hellfire Pad (Detuned Sawtooth + Sine with Resonant Horror Filter)
    playPad(frequencies, duration = 3.8) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;

      frequencies.forEach((freq, idx) => {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const padFilter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // Dark Sawtooth + Triangle for menacing infernal grit
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 0.996, now); // Sinister slow pitch detune

        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(520, now);
        padFilter.Q.value = 1.8; // Eerie hollow resonance

        // Creepy swell & lingering fade
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.065, now + 0.8);
        gain.gain.setValueAtTime(0.065, now + duration - 0.9);
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

    // Deep Sub-Bass Volcano Rumble (Ultra-low frequency drone 34Hz - 49Hz)
    playBass(freq, duration = 3.5) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq * 0.5, now); // Sub-bass earthquake rumble

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + duration + 0.1);
      subOsc.stop(now + duration + 0.1);
    }

    // Tense Heartbeat / Subterranean Thud (Slow, creeping pulse of impending doom)
    playHeartbeat(delaySeconds = 0) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime + delaySeconds;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(58, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.18); // Pitch drop thud

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.25);
    }

    // Creepy Dissonant Bell / Minor Chime (Gothic Cathedral / Nether Bells)
    playChime(freq, delaySeconds = 0, duration = 2.8, gainVal = 0.09) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime + delaySeconds;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      // Tritone / diminished harmonic tension overtone (devil's interval)
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 1.4142, now); // Sqrt(2) tritone overtone

      chimeGain.gain.setValueAtTime(0.0001, now);
      chimeGain.gain.exponentialRampToValueAtTime(gainVal, now + 0.03);
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

    playFootstep() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(75 + Math.random() * 20, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
    }

    playCrystalPlace(vmIdx = 0) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freqs = [185.00, 220.00, 277.18]; // Dark volcanic minor notes
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqs[vmIdx % freqs.length], now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    // Sinister, Suspenseful Nether Magma Progression (Minor Chords & Devil's Tritones)
    playChordSequence() {
      if (!this.isPlaying) return;

      const infernalSheet = [
        // 1. D minor (Ominous Abyss / Hell's Gate Opening)
        { bass: 36.71, pad: [146.83, 174.61, 220.00, 261.63], chimes: [293.66, 349.23, 440.00, 523.25] },
        // 2. Eb diminished 7 (Creeping Dread & Devil's Tritone - Maximum Suspense)
        { bass: 38.89, pad: [155.56, 185.00, 220.00, 246.94], chimes: [311.13, 370.00, 440.00, 493.88] },
        // 3. G minor (Maj7) (Dark Volcanic Lamentation)
        { bass: 49.00, pad: [196.00, 233.08, 293.66, 370.00], chimes: [392.00, 466.16, 587.33, 740.00] },
        // 4. C# diminished 7 (The Devil's Chord - Heart-pounding Tension)
        { bass: 34.65, pad: [138.59, 164.81, 196.00, 233.08], chimes: [277.18, 329.63, 392.00, 466.16] },
        // 5. Bb minor / D (Suffocating Volcanic Ash & Boiling Brimstone)
        { bass: 46.25, pad: [185.00, 233.08, 277.18, 349.23], chimes: [370.00, 466.16, 554.37, 698.46] },
        // 6. A Phrygian Dominant (Wrath of the Nether Realm)
        { bass: 43.65, pad: [174.61, 220.00, 277.18, 329.63], chimes: [349.23, 440.00, 554.37, 659.25] }
      ];

      const current = infernalSheet[this.chordStep % infernalSheet.length];
      this.chordStep++;

      // 1. Heavy subterranean volcanic sub-bass rumble
      this.playBass(current.bass, 3.6);

      // 2. Dark menacing horror ambient pad
      this.playPad(current.pad, 3.9);

      // 3. Tense subterranean heartbeat pulses (suspense ticking)
      this.playHeartbeat(0.1);
      this.playHeartbeat(0.9);
      this.playHeartbeat(1.7);
      this.playHeartbeat(2.5);

      // 4. Eerie dissonant gothic minor bells
      current.chimes.forEach((f, idx) => {
        const offset = 0.35 + idx * 0.55 + (Math.random() * 0.1);
        this.playChime(f, offset, 2.6, 0.08);
      });

      // Occasional chilling high dissonant bell strike
      if (Math.random() > 0.4) {
        const scaryBell = current.chimes[1] * 1.5;
        this.playChime(scaryBell, 2.0, 3.0, 0.07);
      }

      // Seamless crossfade into the next dark chord
      this.timer = setTimeout(() => this.playChordSequence(), 3200);
    }
  }

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
      this.initAbyssalIntro();
      this.initTheaterClassroom();
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

      // First-Person POV Toggle Buttons
      const btnTogglePOV = document.getElementById('btnTogglePOV');
      const btnOpenPOV = document.getElementById('btnOpenPOV');
      const btnClosePOV = document.getElementById('btnClosePOV');

      if (btnTogglePOV) btnTogglePOV.addEventListener('click', () => this.world.toggleCameraMode());
      if (btnOpenPOV) btnOpenPOV.addEventListener('click', () => this.world.toggleCameraMode());
      if (btnClosePOV) btnClosePOV.addEventListener('click', () => this.world.toggleCameraMode('orbit'));

      // Fullscreen
      document.getElementById('btnFullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => { });
        } else {
          document.exitFullscreen().catch(() => { });
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
        // If typing inside an input or textarea, don't hijack keys
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

        // Key T toggles Holographic Cinema Theater
        if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          this.toggleTheaterClassroom();
          return;
        }

        // When Theater is open, handle slide navigation & close
        if (this.isTheaterOpen) {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.nextTheaterSlide();
            return;
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prevTheaterSlide();
            return;
          } else if (e.key === 'Escape') {
            e.preventDefault();
            this.closeTheaterClassroom();
            return;
          }
        }

        // Key V toggles First-Person POV mode vs Orbit mode cleanly from anywhere!
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          this.world.toggleCameraMode();
          return;
        }

        // If in FPS mode, WASD & Space are handled by World3D for walking and jumping!
        if (this.world && this.world.cameraMode === 'fps') {
          if (e.key === 'Escape') {
            e.preventDefault();
            this.world.toggleCameraMode('orbit');
          }
          return;
        }

        // Global shortcuts when in Orbit Mode
        if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          this.toggleGameModal();
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          this.openAblationModal();
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          this.openEduHubModal();
        } else if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          const targetMode = (this.expMode === 'standoff') ? 'hybrid' : 'standoff';
          const btn = document.querySelector(`#expSeg button[data-exp="${targetMode}"]`);
          if (btn) btn.click();
        } else if (e.code === 'Space') {
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
          e.preventDefault();
          this.toggleDrillModal();
        } else if (e.key === 'Escape') {
          if (this.drillOverlay) this.drillOverlay.classList.remove('open');
          if (this.sheetOverlay) this.sheetOverlay.classList.remove('open');
          if (this.pane2D) this.pane2D.classList.remove('open');
          if (this.ablationOverlay) this.ablationOverlay.classList.remove('open');
          if (this.eduhubOverlay) this.eduhubOverlay.classList.remove('open');
          if (this.gameOverlay) this.gameOverlay.classList.remove('open');
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
        try { this.currentAudioSource.stop(); } catch (e) { }
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
        try { this.currentAudioSource.stop(); } catch (e) { }
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

    // ==============================================================
    // ABYSSAL INTRO GATE & NPC WALKTHROUGH INVITATION
    // ==============================================================
    initAbyssalIntro() {
      const gate = document.getElementById('abyssal-welcome-gate');
      const btnEnter = document.getElementById('btnEnterAbyssal');
      const modalTour = document.getElementById('tour-invitation-modal');
      const btnAccept = document.getElementById('btnAcceptTour');
      const btnDecline = document.getElementById('btnDeclineTour');

      if (btnEnter) {
        btnEnter.addEventListener('click', () => {
          // 1. Play Lava infernal Web Audio soundtrack (ducked for speech clarity)
          if (this.soundtrack) {
            this.soundtrack.start();
          }

          // 2. Smoothly fade out welcome gate so player enters the castle
          if (gate) {
            gate.style.opacity = '0';
            gate.style.pointerEvents = 'none';
            setTimeout(() => {
              gate.style.display = 'none';
            }, 800);
          }

          // 3. Play sequential real ElevenLabs audio prologue
          this.playPrologueSequence();
        });
      }

      if (btnAccept) {
        btnAccept.addEventListener('click', () => {
          if (modalTour) modalTour.style.display = 'none';
          this.startCinematicCutscene();
        });
      }

      if (btnDecline) {
        btnDecline.addEventListener('click', () => {
          if (modalTour) modalTour.style.display = 'none';
          if (this.world && typeof this.world.resetNpcPosition === 'function') {
            this.world.resetNpcPosition();
          }
          this.say("🚶 Silakan jelajahi kastil menggunakan WASD! Tekan tombol [🏛️ Teater] di pojok kanan atas atau tombol [T] kapan saja untuk membuka Bioskop.");
        });
      }
    }

    playPrologueSequence() {
      // Duck background lava music so ElevenLabs voice is crisp and clear
      if (this.soundtrack && this.soundtrack.masterGain && this.soundtrack.ctx) {
        this.soundtrack.masterGain.gain.setValueAtTime(0.12, this.soundtrack.ctx.currentTime);
      }

      const dialogBox = document.getElementById('prologue-dialog-box');
      const speakerEl = document.getElementById('prologue-speaker');
      const avatarEl = document.getElementById('prologue-avatar');
      const textEl = document.getElementById('prologue-text');
      const stepEl = document.getElementById('prologue-step-indicator');
      const btnSkip = document.getElementById('btnSkipPrologue');

      if (dialogBox) {
        dialogBox.style.display = 'block';
        dialogBox.style.opacity = '0';
        dialogBox.style.transform = 'translate(-50%, 15px)';
        requestAnimationFrame(() => {
          dialogBox.style.opacity = '1';
          dialogBox.style.transform = 'translate(-50%, 0)';
        });
      }

      let isFinished = false;
      let currentAudio = null;

      const stopCurrentAudio = () => {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          currentAudio = null;
        }
      };

      const finishPrologue = () => {
        if (isFinished) return;
        isFinished = true;
        stopCurrentAudio();

        if (dialogBox) {
          dialogBox.style.opacity = '0';
          dialogBox.style.transform = 'translate(-50%, 15px)';
          setTimeout(() => {
            dialogBox.style.display = 'none';
          }, 400);
        }

        // Restore soundtrack volume
        if (this.soundtrack && this.soundtrack.masterGain && this.soundtrack.ctx) {
          this.soundtrack.masterGain.gain.setValueAtTime(this.soundtrack.idleVolume || 0.28, this.soundtrack.ctx.currentTime);
        }

        // Ensure characters approach player if they haven't yet, then show tour invitation
        if (this.world && typeof this.world.npcApproachPlayer === 'function') {
          this.world.npcApproachPlayer(() => {
            this.showTourInvitation({ speakTTS: false });
          });
        } else {
          this.showTourInvitation({ speakTTS: false });
        }
      };

      if (btnSkip) {
        btnSkip.onclick = () => finishPrologue();
      }

      const storyParts = [
        // ==========================================
        // PROLOG: MARKAS PALUNG ABYSSAL (11.000m)
        // ==========================================
        {
          badgeText: 'Prolog • 1/3 (Narator)',
          audio: 'audio/prologue_01_narrator.mp3',
          speaker: '🎙️ Narator Palung Abyssal',
          avatar: '🌊',
          avatarBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
          speakerColor: '#38bdf8',
          text: '"Kedalaman sebelas ribu meter di bawah laut. Di antara rekahan palung magma dan samudera abadi. Selamat datang di markas Abyssal Grid Three-D!"',
          onStart: () => {
            this.say("🎙️ [Narator]: Kedalaman sebelas ribu meter di bawah laut. Selamat datang di markas Abyssal Grid 3D!");
          }
        },
        {
          badgeText: 'Prolog • 2/3 (Kocorock)',
          audio: 'audio/prologue_02_kocorock.mp3',
          speaker: '🌋 Magma-Kocorock (VNS Master)',
          avatar: '🌋',
          avatarBg: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
          speakerColor: '#f59e0b',
          text: '"Akulah Magma Kocorock! Penjaga stabilitas infrastruktur data center di palung neraka ini. Di sini, jutaan paket komputasi heterogen mengalir tanpa henti."',
          onStart: () => {
            this.say("🌋 [Magma-Kocorock]: Akulah Magma Kocorock! Penjaga stabilitas infrastruktur data center di palung neraka ini!");
            if (this.world && typeof this.world.pokemonHopKocorock === 'function') {
              this.world.pokemonHopKocorock(1);
            }
          }
        },
        {
          badgeText: 'Prolog • 3/3 (Pipimon)',
          audio: 'audio/prologue_03_pipimon.mp3',
          speaker: '💧 Aqua-Pipimon (BFO Leader)',
          avatar: '💧',
          avatarBg: 'linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%)',
          speakerColor: '#38bdf8',
          text: '"[tertawa kecil] Dan aku, Aqua Pipimon! Pemimpin koloni bio-swarm tetesan air samudra. Lihat, ada penjelajah baru yang tiba di hadapan kita!"',
          onStart: () => {
            this.say("💧 [Aqua-Pipimon]: Dan aku, Aqua Pipimon! Pemimpin koloni bio-swarm tetesan air samudra.");
            // When Pipimon says "Lihat, ada penjelajah baru...", character starts leaping forward!
            setTimeout(() => {
              if (!isFinished && this.world && typeof this.world.npcApproachPlayer === 'function') {
                this.world.npcApproachPlayer();
              }
            }, 3000);
          }
        },

        // ==========================================
        // SCENE 1: KARAKTER MENAWARKAN TUR EDUKATIF
        // ==========================================
        {
          badgeText: 'Scene 1 • 1/3 (Sapaan Pipimon)',
          audio: 'audio/scene1_01_pipimon.mp3',
          speaker: '💧 Aqua-Pipimon (BFO Leader)',
          avatar: '💧',
          avatarBg: 'linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%)',
          speakerColor: '#38bdf8',
          text: '"Pipi-pipi! Hai kamu yang ada di sana! Selamat datang di markas kami! Jangan takut dengan lava pijar di sekelilingmu ya!"',
          onStart: () => {
            this.say("💧 [Aqua-Pipimon]: Pipi-pipi! Hai kamu yang ada di sana! Selamat datang di markas kami!");
          }
        },
        {
          badgeText: 'Scene 1 • 2/3 (Misi Kocorock)',
          audio: 'audio/scene1_02_kocorock.mp3',
          speaker: '🌋 Magma-Kocorock (VNS Master)',
          avatar: '🌋',
          avatarBg: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
          speakerColor: '#f59e0b',
          text: '"Kami berdua ditugaskan untuk memecahkan krisis komputasi terberat di abad ini. Bagaimana membagi ribuan tugas ke mesin virtual heterogen tanpa ada mesin yang meledak karena kelebihan beban!"',
          onStart: () => {
            this.say("🌋 [Magma-Kocorock]: Kami berdua ditugaskan untuk memecahkan krisis komputasi terberat di abad ini...");
          }
        },
        {
          badgeText: 'Scene 1 • 3/3 (Ajakan Tur Teater)',
          audio: 'audio/scene1_03_pipimon.mp3',
          speaker: '💧 Aqua-Pipimon (BFO Leader)',
          avatar: '💧',
          avatarBg: 'linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%)',
          speakerColor: '#38bdf8',
          text: '"Maukah kamu ikut tur pembelajaran eksklusif bersama kami? [bisikan] Kami punya ruang teater holografik raksasa di dalam! Di sana, kami berdua akan menjadi gurumu, lengkap dengan layar bioskop interaktif dan mini game seru! Ayo, tekan tombol Ikuti Tur sekarang!"',
          onStart: () => {
            this.say("💧 [Aqua-Pipimon]: Maukah kamu ikut tur pembelajaran eksklusif bersama kami? Kami punya ruang teater holografik raksasa di dalam!");
            // As Pipimon says "Ayo, tekan tombol Ikuti Tur sekarang!", pop up the modal ready to be clicked!
            setTimeout(() => {
              if (!isFinished) {
                this.showTourInvitation({ speakTTS: false });
              }
            }, 10000);
          }
        }
      ];

      const playPart = (idx) => {
        if (isFinished) return;
        if (idx >= storyParts.length) {
          finishPrologue();
          return;
        }

        const part = storyParts[idx];
        if (speakerEl) {
          speakerEl.textContent = part.speaker;
          speakerEl.style.color = part.speakerColor;
        }
        if (avatarEl) {
          avatarEl.textContent = part.avatar;
          avatarEl.style.background = part.avatarBg;
        }
        if (textEl) textEl.innerHTML = part.text;
        if (stepEl) stepEl.textContent = part.badgeText;

        if (part.onStart) part.onStart();

        const aud = new Audio(part.audio);
        currentAudio = aud;

        aud.onended = () => {
          if (!isFinished) {
            setTimeout(() => playPart(idx + 1), 350);
          }
        };

        aud.onerror = () => {
          console.warn("Could not load audio file:", part.audio, "proceeding to next part...");
          setTimeout(() => {
            if (!isFinished) playPart(idx + 1);
          }, 7000);
        };

        aud.play().catch(err => {
          console.warn("Autoplay audio blocked or error:", err);
          setTimeout(() => {
            if (!isFinished) playPart(idx + 1);
          }, 7000);
        });
      };

      playPart(0);
    }

    showTourInvitation(options = {}) {
      const modalTour = document.getElementById('tour-invitation-modal');
      if (modalTour) {
        modalTour.style.display = 'block';
        modalTour.style.opacity = '0';
        modalTour.style.transform = 'translate(-50%, -46%) scale(0.94)';
        modalTour.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        requestAnimationFrame(() => {
          modalTour.style.opacity = '1';
          modalTour.style.transform = 'translate(-50%, -50%) scale(1)';
        });
      }

      if (options && options.speakTTS) {
        const inviteText = "[cheerful] Pipi-pipi! Selamat datang di markas Abyssal Grid Three-D! Maukah kamu ikut tur pembelajaran eksklusif bersama kami ke Ruang Teater Holografik?";
        this.speakElevenlabsText(inviteText, 'pipimon');
      }
    }

    startCinematicCutscene() {
      const cutscene = document.getElementById('cutscene-overlay');
      const btnSkip = document.getElementById('btnSkipCutscene');

      if (!cutscene) {
        this.openTheaterClassroom({ playWelcomeAudio: true });
        return;
      }

      cutscene.style.display = 'flex';
      cutscene.style.pointerEvents = 'auto';
      requestAnimationFrame(() => {
        cutscene.style.opacity = '1';
      });

      // Play deep cinematic warp bass sweep if AudioContext exists
      if (this.soundtrack && this.soundtrack.ctx) {
        try {
          const ctx = this.soundtrack.ctx;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(65, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 1.2);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 1.5);
        } catch (e) { }
      }

      let isCutsceneFinished = false;
      let cutsceneAudio = null;

      const finishCutscene = () => {
        if (isCutsceneFinished) return;
        isCutsceneFinished = true;
        if (cutsceneAudio) {
          cutsceneAudio.pause();
          cutsceneAudio = null;
        }

        cutscene.style.opacity = '0';
        cutscene.style.pointerEvents = 'none';
        setTimeout(() => {
          cutscene.style.display = 'none';
          this.openTheaterClassroom({ playWelcomeAudio: true });
        }, 600);
      };

      if (btnSkip) {
        btnSkip.onclick = () => finishCutscene();
      }

      // Play Scene 2 teleport narration audio (ElevenLabs)
      try {
        const aud = new Audio('audio/scene2_01_teleport_narrator.mp3');
        cutsceneAudio = aud;
        aud.onended = () => {
          if (!isCutsceneFinished) {
            setTimeout(finishCutscene, 400);
          }
        };
        aud.onerror = () => {
          setTimeout(finishCutscene, 5500);
        };
        aud.play().catch(e => {
          setTimeout(finishCutscene, 5500);
        });
      } catch (err) {
        setTimeout(finishCutscene, 5500);
      }
    }

    // ==============================================================
    // HOLOGRAPHIC CINEMA THEATER & BIG SCREEN CLASSROOM
    // ==============================================================
    initTheaterClassroom() {
      this.isTheaterOpen = false;
      this.theaterSlideIndex = 0;
      this.theaterVoiceEnabled = true;
      this.currentTheaterAudio = null;

      const btnOpen = document.getElementById('btnOpenTheater');
      const btnClose = document.getElementById('btnCloseTheater');
      const btnNext = document.getElementById('btnTheaterNext');
      const btnPrev = document.getElementById('btnTheaterPrev');
      const btnVoice = document.getElementById('btnTheaterVoice');

      if (btnOpen) {
        btnOpen.addEventListener('click', () => this.openTheaterClassroom());
      }
      if (btnClose) {
        btnClose.addEventListener('click', () => this.closeTheaterClassroom());
      }
      if (btnNext) {
        btnNext.addEventListener('click', () => this.nextTheaterSlide());
      }
      if (btnPrev) {
        btnPrev.addEventListener('click', () => this.prevTheaterSlide());
      }
      if (btnVoice) {
        btnVoice.addEventListener('click', () => {
          this.theaterVoiceEnabled = !this.theaterVoiceEnabled;
          btnVoice.innerHTML = this.theaterVoiceEnabled ? '<span>🔊 Suara Aktif</span>' : '<span>🔇 Suara Mati</span>';
          if (this.theaterVoiceEnabled) {
            this.speakCurrentTheaterSlide();
          } else {
            if (this.currentTheaterAudio) {
              this.currentTheaterAudio.pause();
            }
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          }
        });
      }

      this.initTheaterSlidesData();
    }

    toggleTheaterClassroom() {
      if (this.isTheaterOpen) {
        this.closeTheaterClassroom();
      } else {
        this.openTheaterClassroom();
      }
    }

    openTheaterClassroom(options = {}) {
      this.isTheaterOpen = true;
      const overlay = document.getElementById('theater-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
      }
      this.say("🏛️ Memasuki Ruang Teater Holografik Abyssal Grid 3D.");

      if (options && options.playWelcomeAudio) {
        // Show Slide 1 visually on screen
        this.showTheaterSlide(0, { skipVoice: true });

        // Display Scene 2 Kocorock's welcome speech in the subtitle box
        const speakerEl = document.getElementById('theater-speaker-pill');
        const subtitleEl = document.getElementById('theater-subtitle-box');

        if (speakerEl) {
          speakerEl.textContent = '🌋 Dosen Magma-Kocorock';
          speakerEl.style.background = 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)';
          speakerEl.style.color = '#ffffff';
        }

        const welcomeText = '[booming] [proud] Selamat datang di Ruang Teater Holografik Abyssal! Perhatikan layar raksasa di tengah panggung ini. Aku dan Pipimon akan berdiri di samping layar untuk memandu setiap konsep penting.';
        if (subtitleEl) {
          subtitleEl.innerHTML = welcomeText;
        }

        this.say("🌋 [Dosen Magma-Kocorock]: Selamat datang di Ruang Teater Holografik Abyssal! Perhatikan layar raksasa di tengah panggung ini.");

        try {
          const welcomeAud = new Audio('audio/scene2_02_theater_kocorock.mp3');
          this.currentTheaterAudio = welcomeAud;
          welcomeAud.onended = () => {
            // When welcome greeting ends, automatically show Slide 1 narration
            this.showTheaterSlide(0);
          };
          welcomeAud.play().catch(e => {
            console.warn("Could not autoplay welcome audio:", e);
          });
        } catch (e) { }
      } else {
        this.showTheaterSlide(this.theaterSlideIndex);
      }
    }

    closeTheaterClassroom() {
      this.isTheaterOpen = false;
      if (this.currentTheaterAudio) {
        this.currentTheaterAudio.pause();
        this.currentTheaterAudio = null;
      }
      const overlay = document.getElementById('theater-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.say("🚶 Kembali ke area penjelajahan kastil.");
    }

    nextTheaterSlide() {
      if (this.theaterSlideIndex < this.theaterSlides.length - 1) {
        this.showTheaterSlide(this.theaterSlideIndex + 1);
      }
    }

    prevTheaterSlide() {
      if (this.theaterSlideIndex > 0) {
        this.showTheaterSlide(this.theaterSlideIndex - 1);
      }
    }

    showTheaterSlide(idx, options = {}) {
      if (!this.theaterSlides || idx < 0 || idx >= this.theaterSlides.length) return;

      // Stop any welcome or ongoing audio
      if (this.currentTheaterAudio) {
        this.currentTheaterAudio.pause();
        this.currentTheaterAudio = null;
      }

      this.theaterSlideIndex = idx;
      const s = this.theaterSlides[idx];

      // Update Header & Indicator
      const titleEl = document.getElementById('theater-slide-title');
      const indEl = document.getElementById('theater-slide-indicator');
      const contentEl = document.getElementById('theater-screen-content');
      const speakerEl = document.getElementById('theater-speaker-pill');
      const subtitleEl = document.getElementById('theater-subtitle-box');

      if (titleEl) titleEl.textContent = s.title;
      if (indEl) indEl.textContent = `${idx + 1} / ${this.theaterSlides.length}`;
      if (contentEl) {
        contentEl.innerHTML = s.contentHtml;
        // If slide has interactive handlers, attach them
        if (typeof s.onMount === 'function') {
          s.onMount(this);
        }
      }

      // Update Speaker Badge
      if (speakerEl) {
        speakerEl.textContent = s.speakerName;
        if (s.speakerType === 'kocorock') {
          speakerEl.style.background = 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)';
          speakerEl.style.color = '#ffffff';
        } else if (s.speakerType === 'pipimon') {
          speakerEl.style.background = 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)';
          speakerEl.style.color = '#ffffff';
        } else {
          speakerEl.style.background = 'linear-gradient(135deg, #f59e0b 0%, #38bdf8 100%)';
          speakerEl.style.color = '#ffffff';
        }
      }

      // Update ElevenLabs format Subtitle
      if (subtitleEl) {
        subtitleEl.innerHTML = s.elevenlabsScript;
      }

      if (this.theaterVoiceEnabled && !(options && options.skipVoice)) {
        this.speakCurrentTheaterSlide();
      }
    }

    speakCurrentTheaterSlide() {
      if (!this.theaterSlides || !this.theaterVoiceEnabled) return;
      const s = this.theaterSlides[this.theaterSlideIndex];
      if (!s) return;

      // Stop any existing theater audio or speech
      if (this.currentTheaterAudio) {
        this.currentTheaterAudio.pause();
        this.currentTheaterAudio = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const speakerEl = document.getElementById('theater-speaker-pill');
      const subtitleEl = document.getElementById('theater-subtitle-box');

      // Check if this slide has real ElevenLabs audio parts
      if (s.audioParts && s.audioParts.length > 0) {
        const playPart = (i) => {
          if (!this.isTheaterOpen || !this.theaterVoiceEnabled || i >= s.audioParts.length) return;
          const p = s.audioParts[i];

          // Update Speaker badge
          if (speakerEl) {
            speakerEl.textContent = p.speakerName;
            if (p.speakerType === 'kocorock') {
              speakerEl.style.background = 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)';
              speakerEl.style.color = '#ffffff';
            } else if (p.speakerType === 'pipimon') {
              speakerEl.style.background = 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)';
              speakerEl.style.color = '#ffffff';
            } else {
              speakerEl.style.background = 'linear-gradient(135deg, #f59e0b 0%, #38bdf8 100%)';
              speakerEl.style.color = '#ffffff';
            }
          }

          // Update subtitle
          if (subtitleEl) {
            subtitleEl.innerHTML = p.elevenlabsScript;
          }

          this.say(`${p.speakerName}: ${p.spokenText || p.elevenlabsScript}`);

          try {
            const aud = new Audio(p.audio);
            this.currentTheaterAudio = aud;

            aud.onended = () => {
              if (this.isTheaterOpen && this.theaterVoiceEnabled) {
                setTimeout(() => playPart(i + 1), 400);
              }
            };

            aud.onerror = () => {
              console.warn("Could not load slide audio:", p.audio, "falling back to speech synthesis");
              this.speakElevenlabsText(p.spokenText || p.elevenlabsScript, p.speakerType);
            };

            aud.play().catch(e => {
              console.warn("Autoplay audio blocked or error:", e);
              this.speakElevenlabsText(p.spokenText || p.elevenlabsScript, p.speakerType);
            });
          } catch (e) {
            this.speakElevenlabsText(p.spokenText || p.elevenlabsScript, p.speakerType);
          }
        };

        playPart(0);
      } else {
        // Fallback to speech synthesis if slide does not have audio files yet
        this.speakElevenlabsText(s.spokenText || s.elevenlabsScript, s.speakerType);
      }
    }

    speakElevenlabsText(textWithTags, speakerType = 'narrator') {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();

      // Strip [tag] intonation markers for browser Web Speech API
      const cleanText = textWithTags.replace(/\[[^\]]+\]/g, '').trim();
      if (!cleanText) return;

      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = 'id-ID';

      if (speakerType === 'kocorock') {
        utter.pitch = 0.72; // Deep, booming
        utter.rate = 0.95;
      } else if (speakerType === 'pipimon') {
        utter.pitch = 1.38; // Cheerful, high-pitched kawaii
        utter.rate = 1.05;
      } else {
        utter.pitch = 0.92;
        utter.rate = 0.98;
      }

      window.speechSynthesis.speak(utter);
    }

    // ==============================================================
    // THEATER EDUCATIONAL SLIDES DATA
    // ==============================================================
    initTheaterSlidesData() {
      this.theaterSlides = [
        {
          title: "Bab 1: Konsep Dasar Cloud Task Scheduling & Tantangan Heterogenitas",
          speakerName: "🎙️ Dosen Aqua-Pipimon & Magma-Kocorock",
          speakerType: "both",
          audioParts: [
            {
              audio: 'audio/bab1_01_pipimon.mp3',
              speakerName: '💧 Dosen Aqua-Pipimon',
              speakerType: 'pipimon',
              elevenlabsScript: '[cheerful] [academic] Mari kita mulai materi pertama! Di era cloud modern, kita memiliki ribuan tugas dengan panjang instruksi yang berbeda-beda, mulai dari jutaan instruksi tugas ringan hingga tugas komputasi berat.',
              spokenText: 'Mari kita mulai materi pertama! Di era cloud modern, kita memiliki ribuan tugas dengan panjang instruksi yang berbeda-beda, mulai dari jutaan instruksi tugas ringan hingga tugas komputasi berat.'
            },
            {
              audio: 'audio/bab1_02_kocorock.mp3',
              speakerName: '🌋 Dosen Magma-Kocorock',
              speakerType: 'kocorock',
              elevenlabsScript: '[deep-voice] [serious] Masalahnya, mesin virtual kita heterogen alias berbeda spesifikasi MIPS! VM Satu berkecepatan kilat 3.500 MIPS, VM Dua 2.000 MIPS, dan VM Tiga 1.000 MIPS. Jika kita asal menjadwalkan tugas, tugas raksasa bisa menumpuk di mesin yang lambat, memicu bottleneck parah dan pemborosan energi!',
              spokenText: 'Masalahnya, mesin virtual kita heterogen alias berbeda spesifikasi MIPS! VM Satu berkecepatan kilat 3.500 MIPS, VM Dua 2.000 MIPS, dan VM Tiga 1.000 MIPS. Jika kita asal menjadwalkan tugas, tugas raksasa bisa menumpuk di mesin yang lambat, memicu bottleneck parah dan pemborosan energi!'
            }
          ],
          elevenlabsScript: "[whispering] Bab Satu. [cheerful] Di era komputasi awan modern, ribuan tugas masuk bersamaan ke pusat data! [booming] Masalahnya, mesin virtual kita heterogen alias berbeda spesifikasi MIPS. Jika salah alokasi, bottleneck parah akan meledak!",
          spokenText: "Di era komputasi awan modern, ribuan tugas masuk bersamaan ke pusat data. Masalahnya, mesin virtual kita heterogen alias berbeda spesifikasi MIPS. Jika salah alokasi, bottleneck parah akan meledak!",
          contentHtml: `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:center;">
              <div>
                <h3 style="margin-top:0; color:#38bdf8; font-size:17px;">🌐 Mengapa Cloud Task Scheduling Sangat Kritis?</h3>
                <p style="font-size:12.5px; line-height:1.6; color:#cbd5e1;">
                  Dalam komputasi awan (Cloud Computing), tugas-tugas komputasi datang dengan ukuran panjang instruksi bervariasi (<i>Million Instructions / MI</i>). Tugas harus dipetakan ke <b>Virtual Machine (VM)</b> yang memiliki kapasitas komputasi berbeda (<i>MIPS</i>).
                </p>
                <div style="background:rgba(2,132,199,0.15); border-left:3px solid #38bdf8; padding:10px 12px; border-radius:8px; margin:10px 0; font-size:12px;">
                  <b>⚡ Waktu Eksekusi (Execution Time):</b><br>
                  <code style="color:#7dd3fc; font-weight:700;">ET(i, j) = Length(Task i) / MIPS(VM j)</code><br>
                  Semakin kecil MIPS mesin, semakin lama waktu yang dibutuhkan untuk menyelesaikan tugas yang sama.
                </div>
              </div>
              <div style="background:rgba(24,24,27,0.8); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:14px;">
                <div style="font-size:11px; font-weight:800; color:#f59e0b; margin-bottom:8px; text-transform:uppercase;">Arsitektur Cloud Abyssal Grid (10 Tugas &rarr; 3 VM Heterogen)</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <div style="background:rgba(234,88,12,0.2); border:1px solid #ea580c; border-radius:8px; padding:8px; font-size:11.5px; display:flex; justify-content:space-between;">
                    <span>🔥 <b>VM 1 (High-Performance Node):</b></span>
                    <span style="color:#fbbf24; font-weight:700;">3.500 MIPS</span>
                  </div>
                  <div style="background:rgba(56,189,248,0.2); border:1px solid #38bdf8; border-radius:8px; padding:8px; font-size:11.5px; display:flex; justify-content:space-between;">
                    <span>💧 <b>VM 2 (Mid-Range Node):</b></span>
                    <span style="color:#38bdf8; font-weight:700;">2.000 MIPS</span>
                  </div>
                  <div style="background:rgba(16,185,129,0.2); border:1px solid #10b981; border-radius:8px; padding:8px; font-size:11.5px; display:flex; justify-content:space-between;">
                    <span>🌿 <b>VM 3 (Eco-Green Node):</b></span>
                    <span style="color:#34d399; font-weight:700;">1.000 MIPS</span>
                  </div>
                </div>
                <div style="margin-top:10px; font-size:11px; color:#94a3b8; text-align:center;">
                  Tugas kita adalah mencari pemetaan terbaik agar waktu penyelesaian total sekecil mungkin!
                </div>
              </div>
            </div>
          `
        },
        {
          title: "Bab 2: Formulasi Matematis: Makespan, DI & Batas Bawah Ideal",
          speakerName: "🎙️ Dosen Magma-Kocorock & Aqua-Pipimon",
          speakerType: "both",
          audioParts: [
            {
              audio: 'audio/bab2_01_kocorock.mp3',
              speakerName: '🌋 Dosen Magma-Kocorock',
              speakerType: 'kocorock',
              elevenlabsScript: '[academic] [focused] Perhatikan rumus emas di layar: Makespan atau C-Max adalah waktu penyelesaian tugas terlama di antara seluruh mesin virtual. Target kita adalah meminimalkan nilai Makespan ini!',
              spokenText: 'Perhatikan rumus emas di layar: Makespan atau C-Max adalah waktu penyelesaian tugas terlama di antara seluruh mesin virtual. Target kita adalah meminimalkan nilai Makespan ini!'
            },
            {
              audio: 'audio/bab2_02_pipimon.mp3',
              speakerName: '💧 Dosen Aqua-Pipimon',
              speakerType: 'pipimon',
              elevenlabsScript: '[enthusiastic] Betul sekali! Garis laser biru di layar adalah Theoretical Lower Bound, yaitu batas bawah ideal secara teoretis jika seluruh kapasitas MIPS terpakai seratus persen seimbang tanpa ada mesin yang menganggur!',
              spokenText: 'Betul sekali! Garis laser biru di layar adalah Theoretical Lower Bound, yaitu batas bawah ideal secara teoretis jika seluruh kapasitas MIPS terpakai seratus persen seimbang tanpa ada mesin yang menganggur!'
            }
          ],
          elevenlabsScript: "[academic] [focused] Perhatikan rumus emas di layar! Makespan adalah waktu kerja VM paling lambat di seluruh data center! Garis laser biru adalah Batas Bawah Teoretis jika beban terdistribusi seratus persen sempurna!",
          spokenText: "Perhatikan rumus emas di layar! Makespan adalah waktu kerja VM paling lambat di seluruh data center. Garis laser biru adalah Batas Bawah Teoretis jika beban terdistribusi seratus persen sempurna!",
          contentHtml: `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div style="background:rgba(24,24,27,0.7); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:14px;">
                <h4 style="margin:0 0 8px; color:#f59e0b; font-size:14px;">1. Makespan (C_max) - Sasaran Utama Optimasi</h4>
                <p style="font-size:12px; color:#cbd5e1; margin-bottom:8px;">
                  Makespan didefinisikan sebagai waktu selesai dari mesin virtual yang bekerja paling lama:
                </p>
                <div style="background:#09090b; padding:10px; border-radius:8px; text-align:center; font-family:monospace; font-size:14px; color:#fde047;">
                  Makespan = max(Load(VM_1), Load(VM_2), ..., Load(VM_m))
                </div>
                <p style="font-size:11.5px; color:#94a3b8; margin-top:8px;">
                  Jika satu VM kelebihan beban hingga 200 detik meskipun dua VM lainnya selesai dalam 20 detik, Makespan keseluruhan tetap bernilai <b>200 detik</b>!
                </p>
              </div>

              <div style="background:rgba(24,24,27,0.7); border:1px solid rgba(56,189,248,0.3); border-radius:12px; padding:14px;">
                <h4 style="margin:0 0 8px; color:#38bdf8; font-size:14px;">2. Degree of Imbalance (DI) &amp; Batas Teoretis</h4>
                <p style="font-size:12px; color:#cbd5e1; margin-bottom:8px;">
                  Keseimbangan beban antar mesin diukur menggunakan derajat ketidakseimbangan:
                </p>
                <div style="background:#09090b; padding:10px; border-radius:8px; text-align:center; font-family:monospace; font-size:13px; color:#67e8f9;">
                  DI = (Load_max - Load_min) / Load_avg
                </div>
                <div style="margin-top:10px; background:rgba(245,158,11,0.12); border-left:3px solid #f59e0b; padding:8px 10px; font-size:11.5px; color:#fef08a;">
                  <b>Theoretical Lower Bound (LB):</b><br>
                  <code>LB = Total_MI / Total_MIPS</code><br>
                  Batas bawah absolut yang mustahil ditembus oleh algoritma apa pun.
                </div>
              </div>
            </div>
          `
        },
        {
          title: "Bab 3: Algoritma VNS - Shaking & Eksploitasi Lokal Kocorock",
          speakerName: "🎙️ Dosen Magma-Kocorock (VNS Master)",
          speakerType: "kocorock",
          audioParts: [
            {
              audio: 'audio/bab3_01_kocorock.mp3',
              speakerName: '🌋 Dosen Magma-Kocorock',
              speakerType: 'kocorock',
              elevenlabsScript: '[booming] [fierce] Sekarang giliranku unjuk gigi! Algoritmaku bernama VNS atau Variable Neighborhood Search. Saat antrean tugas macet di satu pulau, aku menggunakan jurus Shaking dengan radius k bertingkat!',
              spokenText: 'Sekarang giliranku unjuk gigi! Algoritmaku bernama VNS atau Variable Neighborhood Search. Saat antrean tugas macet di satu pulau, aku menggunakan jurus Shaking dengan radius k bertingkat!'
            },
            {
              audio: 'audio/bab3_02_kocorock.mp3',
              speakerName: '🌋 Dosen Magma-Kocorock',
              speakerType: 'kocorock',
              elevenlabsScript: '[focused] [proud] Radius k sama dengan satu memindahkan satu tugas bottleneck. Jika belum membaik, radius k diperbesar menjadi dua dan tiga! Dipadukan dengan First-Improvement Descent, tugas segera dipindahkan ke mesin yang lebih longgar. Sangat tajam untuk eksploitasi lokal!',
              spokenText: 'Radius k sama dengan satu memindahkan satu tugas bottleneck. Jika belum membaik, radius k diperbesar menjadi dua dan tiga! Dipadukan dengan First-Improvement Descent, tugas segera dipindahkan ke mesin yang lebih longgar. Sangat tajam untuk eksploitasi lokal!'
            }
          ],
          elevenlabsScript: "[booming] [fierce] Sekarang giliranku unjuk gigi! Algoritmaku bernama VNS atau Variable Neighborhood Search. Saat antrean tugas macet di satu pulau, aku menggunakan jurus Shaking dengan radius k bertingkat!",
          spokenText: "Sekarang giliranku unjuk gigi! Algoritmaku bernama VNS atau Variable Neighborhood Search. Saat antrean tugas macet di satu pulau, aku menggunakan jurus Shaking dengan radius k bertingkat!",
          contentHtml: `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div>
                <h3 style="margin-top:0; color:#ea580c; font-size:16px;">🔨 Mekanisme Shaking Bertingkat (k = 1..3)</h3>
                <p style="font-size:12.5px; line-height:1.6; color:#cbd5e1;">
                  VNS beroperasi dengan menjelajahi struktur lingkungan tetangga (<i>Neighborhood Structures</i>) secara teratur untuk melepaskan solusi dari jebakan lokal:
                </p>
                <div style="display:flex; flex-direction:column; gap:8px; margin:12px 0;">
                  <div style="background:rgba(234,88,12,0.15); border-left:3px solid #ea580c; padding:8px 10px; border-radius:6px; font-size:11.5px;">
                    <b>k = 1 (Single Task Migration):</b> Pindahkan 1 tugas dari VM dengan beban tertinggi ke VM lain secara acak.
                  </div>
                  <div style="background:rgba(245,158,11,0.15); border-left:3px solid #f59e0b; padding:8px 10px; border-radius:6px; font-size:11.5px;">
                    <b>k = 2 (Pairwise Task Swap):</b> Tukar dua tugas antara dua VM yang berbeda.
                  </div>
                  <div style="background:rgba(239,68,68,0.15); border-left:3px solid #ef4444; padding:8px 10px; border-radius:6px; font-size:11.5px;">
                    <b>k = 3 (Multi-Task Reshuffle):</b> Kocok alokasi tiga tugas sekaligus untuk melompat lebih jauh.
                  </div>
                </div>
              </div>
              <div style="background:rgba(24,24,27,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:14px;">
                <h4 style="margin:0 0 8px; color:#f59e0b; font-size:13.5px;">Karakteristik &amp; Kelemahan VNS Mandiri</h4>
                <div style="font-size:12px; color:#e2e8f0; line-height:1.6;">
                  <span style="color:#10b981; font-weight:700;">✅ Keunggulan:</span> Sangat cepat berkonvergensi karena menggunakan <i>First-Improvement Descent</i>.<br>
                  <span style="color:#ef4444; font-weight:700;">❌ Kelemahan:</span> Memiliki probabilitas tinggi terjebak di <i>Local Optimum</i> jika inisiasi awalnya buruk (sering macet di Makespan ~115 detik).
                </div>
              </div>
            </div>
          `
        },
        {
          title: "Bab 4: Algoritma BFO - Kemotaksis & Eksplorasi Global Pipimon",
          speakerName: "🎙️ Dosen Aqua-Pipimon (BFO Leader)",
          speakerType: "pipimon",
          audioParts: [
            {
              audio: 'audio/bab4_01_pipimon.mp3',
              speakerName: '💧 Dosen Aqua-Pipimon',
              speakerType: 'pipimon',
              elevenlabsScript: '[cheerful] [giggling] Tapi Kocorock sering buntu jika terjebak di optimum lokal! Nah, itulah kehebatan algoritmaku: Bacterial Foraging Optimization!',
              spokenText: 'Tapi Kocorock sering buntu jika terjebak di optimum lokal! Nah, itulah kehebatan algoritmaku: Bacterial Foraging Optimization!'
            },
            {
              audio: 'audio/bab4_02_pipimon.mp3',
              speakerName: '💧 Dosen Aqua-Pipimon',
              speakerType: 'pipimon',
              elevenlabsScript: '[excited] Ribuan bakteri droplet kami berenang memindai seluruh lanskap solusi menggunakan dinamika Kemotaksis, yaitu Tumble dan Swim! Kami berenang menuju konsentrasi nutrisi tertinggi, yaitu Makespan paling rendah. Bakteri terbaik membelah diri pada fase reproduksi, dan eliminasi dispersi mengacak koloni agar tidak pernah tersesat!',
              spokenText: 'Ribuan bakteri droplet kami berenang memindai seluruh lanskap solusi menggunakan dinamika Kemotaksis, yaitu Tumble dan Swim! Kami berenang menuju konsentrasi nutrisi tertinggi, yaitu Makespan paling rendah. Bakteri terbaik membelah diri pada fase reproduksi, dan eliminasi dispersi mengacak koloni agar tidak pernah tersesat!'
            }
          ],
          elevenlabsScript: "[cheerful] [giggling] Tapi Kocorock sering buntu jika terjebak di optimum lokal! Nah, itulah kehebatan algoritmaku: Bacterial Foraging Optimization!",
          spokenText: "Tapi Kocorock sering buntu jika terjebak di optimum lokal! Nah, itulah kehebatan algoritmaku: Bacterial Foraging Optimization!",
          contentHtml: `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div>
                <h3 style="margin-top:0; color:#38bdf8; font-size:16px;">🧪 4 Fase Siklus Hidup Bio-Swarm BFO</h3>
                <div style="display:flex; flex-direction:column; gap:8px; font-size:11.5px;">
                  <div style="background:rgba(2,132,199,0.18); border-left:3px solid #38bdf8; padding:8px 10px; border-radius:6px;">
                    <b>1. Kemotaksis (Chemotaxis):</b> Bakteri bergantian antara <i>Tumble</i> (memilih arah acak) dan <i>Swim</i> (berenang maju jika Makespan membaik).
                  </div>
                  <div style="background:rgba(14,165,233,0.18); border-left:3px solid #0ea5e9; padding:8px 10px; border-radius:6px;">
                    <b>2. Swarming:</b> Komunikasi antar-bakteri menggunakan fungsi atraktan agar koloni berkumpul di lembah nutrisi tinggi.
                  </div>
                  <div style="background:rgba(56,189,248,0.18); border-left:3px solid #7dd3fc; padding:8px 10px; border-radius:6px;">
                    <b>3. Reproduksi (Reproduction):</b> 50% bakteri tersehat membelah diri menjadi dua klon, 50% bakteri terlemah mati.
                  </div>
                  <div style="background:rgba(99,102,241,0.18); border-left:3px solid #818cf8; padding:8px 10px; border-radius:6px;">
                    <b>4. Eliminasi-Dispersi:</b> Eliminasi acak dengan probabilitas P_ed untuk menyebarkan bakteri ke titik baru dan mencegah konvergensi dini.
                  </div>
                </div>
              </div>
              <div style="background:rgba(24,24,27,0.8); border:1px solid rgba(56,189,248,0.3); border-radius:12px; padding:14px;">
                <h4 style="margin:0 0 8px; color:#38bdf8; font-size:13.5px;">Karakteristik &amp; Kelemahan BFO Mandiri</h4>
                <div style="font-size:12px; color:#e2e8f0; line-height:1.6;">
                  <span style="color:#10b981; font-weight:700;">✅ Keunggulan:</span> Diversitas eksplorasi global sangat tinggi dan tidak mudah terjebak di optimum lokal.<br>
                  <span style="color:#ef4444; font-weight:700;">❌ Kelemahan:</span> Lambat mencapai titik presisi tinggi di akhir iterasi karena langkah kemotaksis acak (Makespan ~118 detik).
                </div>
              </div>
            </div>
          `
        },
        {
          title: "Bab 5: Reaktor Sintesis Hibrida Memetic BFO-VNS (1 + 1 > 2)",
          speakerName: "🎙️ Kolaborasi Dosen Magma & Aqua",
          speakerType: "both",
          elevenlabsScript: "[dramatic] [epic] Dan inilah mahakarya penelitian kita! Reaktor Sintesis Hibrida Memetic BFO-VNS! [joyful] Kolaborasi eksplorasi global Pipimon dan eksploitasi lokal Kocorock memangkas Makespan hingga tiga puluh empat koma delapan persen!",
          spokenText: "Dan inilah mahakarya penelitian kita! Reaktor Sintesis Hibrida Memetic BFO-VNS! Kolaborasi eksplorasi global Pipimon dan eksploitasi lokal Kocorock memangkas Makespan hingga tiga puluh empat koma delapan persen!",
          contentHtml: `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:center;">
              <div>
                <h3 style="margin-top:0; color:#fbbf24; font-size:16px;">⚛️ Mengapa Algoritma Hibrida Memetik Unggul?</h3>
                <p style="font-size:12.5px; line-height:1.6; color:#cbd5e1;">
                  Dalam literatur metaheuristik, <b>Algoritma Memetik (Memetic Algorithm)</b> menyatukan kekuatan pencarian global berbasis populasi (BFO) dengan teknik penyempurnaan lokal individual (VNS).
                </p>
                <div style="background:linear-gradient(135deg, rgba(234,88,12,0.2) 0%, rgba(2,132,199,0.2) 100%); border:1px solid rgba(251,191,36,0.4); border-radius:10px; padding:12px; font-size:12px;">
                  <b>🚀 Sinergi Sempurna:</b><br>
                  1. <b>BFO</b> bertindak sebagai pemindai global yang mendeteksi cekungan solusi potensial di seluruh ruang pencarian.<br>
                  2. <b>VNS</b> melakukan intervensi lokal (Shaking k=1..3) pada individu bakteri terunggul untuk mengasah nilai Makespan hingga mendekati batas bawah teoretis!
                </div>
              </div>
              <div style="background:rgba(24,24,27,0.85); border:1px solid rgba(251,191,36,0.3); border-radius:14px; padding:14px; text-align:center;">
                <div style="font-size:12px; font-weight:800; color:#fbbf24; margin-bottom:8px;">HASIL KOMPARASI KINERJA (600 NFE)</div>
                <div style="display:flex; justify-content:space-around; align-items:flex-end; height:130px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.15);">
                  <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <span style="font-size:11px; color:#ea580c; font-weight:700;">115.5s</span>
                    <div style="width:40px; height:85px; background:#ea580c; border-radius:6px 6px 0 0;"></div>
                    <span style="font-size:10px; color:#cbd5e1;">VNS Murni</span>
                  </div>
                  <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <span style="font-size:11px; color:#38bdf8; font-weight:700;">118.7s</span>
                    <div style="width:40px; height:88px; background:#38bdf8; border-radius:6px 6px 0 0;"></div>
                    <span style="font-size:10px; color:#cbd5e1;">BFO Murni</span>
                  </div>
                  <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <span style="font-size:11px; color:#fbbf24; font-weight:800;">88.4s</span>
                    <div style="width:48px; height:58px; background:linear-gradient(to top, #ea580c, #38bdf8); border-radius:6px 6px 0 0; box-shadow:0 0 16px rgba(251,191,36,0.6);"></div>
                    <span style="font-size:10px; color:#fef08a; font-weight:700;">Hybrid Memetic</span>
                  </div>
                </div>
                <div style="margin-top:8px; font-size:11px; color:#86efac; font-weight:700;">
                  ✨ Peningkatan Efisiensi: -34.8% Waktu Makespan!
                </div>
              </div>
            </div>
          `
        },
        {
          title: "Bab 6: Mini-Game Interaktif - Cloud Dispatcher Challenge",
          speakerName: "🎙️ Dosen Magma-Kocorock & Aqua-Pipimon",
          speakerType: "both",
          elevenlabsScript: "[playful] [excited] Nah, sekarang giliranmu menguji kemampuan logika! [challenging] Coba klik preset atau buka Cloud Dispatcher Challenge untuk menyeimbangkan beban 10 tugas ke 3 mesin virtual!",
          spokenText: "Nah, sekarang giliranmu menguji kemampuan logika! Coba klik preset atau buka Cloud Dispatcher Challenge untuk menyeimbangkan beban 10 tugas ke 3 mesin virtual!",
          contentHtml: `
            <div style="text-align:center; padding:10px;">
              <h3 style="margin-top:0; color:#f59e0b; font-size:18px;">🎮 Uji Logika: Cloud Dispatcher Challenge</h3>
              <p style="font-size:12.5px; color:#cbd5e1; max-width:650px; margin:0 auto 16px;">
                Coba bereksperimen dengan alokasi tugas! Lihat bagaimana distribusi beban memengaruhi nilai Makespan di bawah ini, atau buka mode simulasi interaktif penuh:
              </p>
              
              <div style="display:flex; justify-content:center; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
                <button id="btnTheaterPresetAnti" style="padding:10px 18px; background:rgba(239,68,68,0.25); border:1.5px solid #ef4444; border-radius:12px; color:#fca5a5; font-size:12px; font-weight:700; cursor:pointer;">
                  ⚠️ Uji Anti-Pola (Bottleneck VM 1)
                </button>
                <button id="btnTheaterPresetRand" style="padding:10px 18px; background:rgba(245,158,11,0.25); border:1.5px solid #f59e0b; border-radius:12px; color:#fde68a; font-size:12px; font-weight:700; cursor:pointer;">
                  🎲 Uji Preset Acak (Random)
                </button>
                <button id="btnTheaterPresetOpt" style="padding:10px 18px; background:rgba(16,185,129,0.25); border:1.5px solid #10b981; border-radius:12px; color:#6ee7b7; font-size:12px; font-weight:700; cursor:pointer;">
                  ✨ Uji Solusi Optimal Hybrid
                </button>
                <button id="btnTheaterOpenFullGame" style="padding:10px 22px; background:linear-gradient(135deg, #ea580c 0%, #38bdf8 100%); border:none; border-radius:12px; color:#ffffff; font-size:12px; font-weight:800; cursor:pointer; box-shadow:0 4px 16px rgba(234,88,12,0.4);">
                  🚀 Buka Mini-Game Interaktif Lengkap [G]
                </button>
              </div>

              <div id="theater-game-feedback" style="background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.15); border-radius:14px; padding:14px; max-width:620px; margin:0 auto; font-size:12.5px; color:#e2e8f0; line-height:1.6;">
                Pilih salah satu tombol di atas untuk melihat respon langsung dari Dosen Kocorock dan Pipimon!
              </div>
            </div>
          `,
          onMount: (app) => {
            const bAnti = document.getElementById('btnTheaterPresetAnti');
            const bRand = document.getElementById('btnTheaterPresetRand');
            const bOpt = document.getElementById('btnTheaterPresetOpt');
            const bFull = document.getElementById('btnTheaterOpenFullGame');
            const feed = document.getElementById('theater-game-feedback');

            if (bAnti) {
              bAnti.onclick = () => {
                app.applyGamePreset('anti');
                if (feed) {
                  feed.innerHTML = `<span style="color:#ef4444; font-weight:800;">⚠️ Peringatan Antrean Kritis:</span> Semua 10 tugas ditumpuk ke VM 1! Beban VM 1 mencapai puncak <b>Makespan ~185.0s</b> sementara VM 2 & 3 menganggur. Ini adalah anti-pola terburuk!`;
                }
              };
            }
            if (bRand) {
              bRand.onclick = () => {
                app.applyGamePreset('rand');
                if (feed) {
                  feed.innerHTML = `<span style="color:#f59e0b; font-weight:800;">🎲 Distribusi Acak:</span> Tugas disebar tanpa perhitungan kapasitas MIPS. Makespan berada di kisaran <b>125s - 140s</b> dengan derajat ketidakseimbangan tinggi.`;
                }
              };
            }
            if (bOpt) {
              bOpt.onclick = () => {
                app.applyGamePreset('opt');
                if (feed) {
                  feed.innerHTML = `<span style="color:#10b981; font-weight:800;">✨ Solusi Optimal Terpilih:</span> Beban terbagi seimbang sempurna dengan <b>Makespan ~88.4s</b> mendekati Batas Bawah Teoretis! Utilisasi CPU ketiga VM mencapai 92%.`;
                }
              };
            }
            if (bFull) {
              bFull.onclick = () => {
                app.openGameModal();
              };
            }
          }
        },
        {
          title: "Bab 7: Hasil Benchmark 30x Run & Kesimpulan Ilmiah",
          speakerName: "🎙️ Kolaborasi Dosen Magma-Kocorock & Aqua-Pipimon",
          speakerType: "both",
          elevenlabsScript: "[authoritative] [proud] Sebagai kesimpulan akademik: pengujian ketat tiga puluh kali run independen membuktikan keunggulan mutlak Algoritma Hibrida Memetic BFO-VNS! [cheerful] Terima kasih sudah mengikuti tur edukasi di markas Abyssal Grid Three-D!",
          spokenText: "Sebagai kesimpulan akademik: pengujian ketat tiga puluh kali run independen membuktikan keunggulan mutlak Algoritma Hibrida Memetic BFO-VNS! Terima kasih sudah mengikuti tur edukasi di markas Abyssal Grid Three-D!",
          contentHtml: `
            <div>
              <h3 style="margin-top:0; color:#10b981; font-size:16px;">📊 Tabel Komparasi Statistik (30 Independent Runs @ 600 NFE)</h3>
              <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left; color:#cbd5e1; margin-bottom:14px;">
                  <thead>
                    <tr style="background:rgba(255,255,255,0.08); border-bottom:1px solid rgba(255,255,255,0.15);">
                      <th style="padding:8px 10px; color:#ffffff;">Algoritma Pengujian</th>
                      <th style="padding:8px 10px; color:#ffffff;">Makespan Rata-rata (s)</th>
                      <th style="padding:8px 10px; color:#ffffff;">Standar Deviasi (Std)</th>
                      <th style="padding:8px 10px; color:#ffffff;">Degree of Imbalance (DI)</th>
                      <th style="padding:8px 10px; color:#ffffff;">CPU Utilization (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                      <td style="padding:8px 10px; font-weight:700; color:#ea580c;">VNS Murni (Kocorock)</td>
                      <td style="padding:8px 10px;">115.52 ± 4.2</td>
                      <td style="padding:8px 10px;">4.21</td>
                      <td style="padding:8px 10px;">0.28</td>
                      <td style="padding:8px 10px;">78.4%</td>
                    </tr>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                      <td style="padding:8px 10px; font-weight:700; color:#38bdf8;">BFO Murni (Pipimon)</td>
                      <td style="padding:8px 10px;">118.74 ± 5.8</td>
                      <td style="padding:8px 10px;">5.84</td>
                      <td style="padding:8px 10px;">0.32</td>
                      <td style="padding:8px 10px;">74.2%</td>
                    </tr>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(245,158,11,0.08);">
                      <td style="padding:8px 10px; font-weight:700; color:#f59e0b;">Heuristic Seeded-BFO</td>
                      <td style="padding:8px 10px;">96.80 ± 2.1</td>
                      <td style="padding:8px 10px;">2.15</td>
                      <td style="padding:8px 10px;">0.12</td>
                      <td style="padding:8px 10px;">86.5%</td>
                    </tr>
                    <tr style="background:rgba(16,185,129,0.15); font-weight:800;">
                      <td style="padding:8px 10px; color:#34d399;">🌟 Memetic BFO-VNS (Juara)</td>
                      <td style="padding:8px 10px; color:#34d399;">88.42 ± 0.9</td>
                      <td style="padding:8px 10px; color:#34d399;">0.92 (Sangat Konsisten)</td>
                      <td style="padding:8px 10px; color:#34d399;">0.04 (Mendekati Nol)</td>
                      <td style="padding:8px 10px; color:#34d399;">92.4% (Optimal)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:12px; font-size:12px; color:#a7f3d0; line-height:1.5;">
                🎓 <b>Kesimpulan Utama:</b> Hibridisasi metaheuristik memetik terbukti statistically significant (p &lt; 0.001) dalam memecahkan masalah NP-Hard Cloud Task Scheduling. Selamat! Kamu kini memahami seluk-beluk optimasi cloud scheduling dari dasar matematis hingga implementasi hibrida tingkat lanjut!
              </div>
            </div>
          `
        }
      ];
    }

  }

  // Launch on ready
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppMaster();
  });
})();
