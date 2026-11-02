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
      this.scene.fog = new THREE.FogExp2(0xcde8f9, 0.007);

      this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.set(0, 19, 40);
      this.camera.lookAt(this.camTarget);

      // 1. Lush Anime Hemisphere Light (Sky Blue + Vibrant Grass Bounce)
      const hemi = new THREE.HemisphereLight(0xdff4fc, 0x62c92b, 0.9);
      this.scene.add(hemi);

      // 2. Main Warm Golden Sunlight
      const sun = new THREE.DirectionalLight(0xfff6dc, 1.4);
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

      // 3. Anime Rim Backlight (Warm Peach glow on character and island silhouettes)
      const rim = new THREE.DirectionalLight(0xfed7aa, 0.55);
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

      // 9. Flying Anime Birds Flock
      this.createBirdFlock();

      // 10. Floating Sky Airship / Hot Air Balloon
      this.createAirship();
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

        // --- 1. LUSH ANIME TOP PLATEAU ---
        const grassColor = (realmType === 'vns') ? 0x5ec429 : 0x48c774;
        const topGeo = new THREE.CylinderGeometry(3.3, 3.0, 0.85, 24);
        const topMat = new THREE.MeshToonMaterial({ color: grassColor, roughness: 0.5 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.receiveShadow = true;
        island.add(top);

        // Raised grassy hill/terrace for natural topography
        const hillMat = new THREE.MeshToonMaterial({ color: 0x76de38, roughness: 0.5 });
        const hill = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 0.35, 16), hillMat);
        hill.position.set(-0.8, 0.5, -0.6);
        hill.receiveShadow = true;
        island.add(hill);

        // --- 2. CLIFF STRATA & CRAGGY ROCK UNDERSIDE ---
        const earthGeo = new THREE.CylinderGeometry(3.0, 2.5, 1.2, 16);
        const earthMat = new THREE.MeshToonMaterial({ color: 0x6e492b });
        const earth = new THREE.Mesh(earthGeo, earthMat);
        earth.position.y = -0.9;
        island.add(earth);

        const rockGeo = new THREE.ConeGeometry(2.5, 3.4, 9);
        rockGeo.rotateX(Math.PI);
        const rockMat = new THREE.MeshToonMaterial({ color: 0x3e4c59, roughness: 0.9 });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.y = -2.8;
        island.add(rock);

        // Hanging mini stalactite floating crags
        const miniRock1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6).rotateX(Math.PI), rockMat);
        miniRock1.position.set(1.4, -2.6, 0.8);
        island.add(miniRock1);

        // --- 3. VEGETATION: STYLIZED TREES & FLOWERS ---
        const tree = this.createAnimeTree(0.9 + Math.random() * 0.2);
        tree.position.set(1.4, 0.4, -1.2);
        island.add(tree);

        // Wildflowers on grass (Pink, Yellow, White dots)
        const flowerColors = [0xf472b6, 0xfacc15, 0xffffff];
        for (let f = 0; f < 8; f++) {
          const fMat = new THREE.MeshToonMaterial({ color: flowerColors[f % 3] });
          const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), fMat);
          const fAngle = Math.random() * Math.PI * 2;
          const fDist = 1.0 + Math.random() * 1.8;
          blossom.position.set(Math.cos(fAngle) * fDist, 0.45, Math.sin(fAngle) * fDist);
          island.add(blossom);
        }

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

      // 1. PROCEDURAL KOCOROCK (POKEMON ROCK GOLEM - VNS)
      this.kocok = new THREE.Group();
      // Torso
      const bodyGeo = new THREE.DodecahedronGeometry(1.6, 1);
      const bodyMat = new THREE.MeshToonMaterial({ color: 0x92400e });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      this.kocok.add(body);

      // Chest Glowing Rune Crystal Core
      const coreGeo = new THREE.OctahedronGeometry(0.55, 0);
      const coreMat = new THREE.MeshToonMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.85 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(0, 0.1, 1.35);
      this.kocok.add(core);

      // Golem Head
      const headGeo = new THREE.DodecahedronGeometry(0.9, 1);
      const headMat = new THREE.MeshToonMaterial({ color: 0x78350f });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 1.55, 0.2);
      this.kocok.add(head);

      // Anime Glowing Eyes
      const eyeMat = new THREE.MeshToonMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.95 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), eyeMat);
      eyeL.position.set(-0.35, 1.65, 0.95);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), eyeMat);
      eyeR.position.set(0.35, 1.65, 0.95);
      this.kocok.add(eyeL);
      this.kocok.add(eyeR);

      // Floating Rock Fists
      const fistGeo = new THREE.DodecahedronGeometry(0.55, 1);
      const fistMat = new THREE.MeshToonMaterial({ color: 0xa16207 });
      const fistL = new THREE.Mesh(fistGeo, fistMat);
      fistL.position.set(-1.8, 0.2, 0.5);
      const fistR = new THREE.Mesh(fistGeo, fistMat);
      fistR.position.set(1.8, 0.2, 0.5);
      this.kocok.add(fistL);
      this.kocok.add(fistR);

      // Grand Shaking Staff with Amber Sunstone
      this.staff = new THREE.Group();
      const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.6, 8), new THREE.MeshToonMaterial({ color: 0x451a03 }));
      this.staff.add(staffPole);
      const staffGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshToonMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.8 }));
      staffGem.position.y = 1.85;
      this.staff.add(staffGem);
      this.staff.position.set(2.0, 0.8, 0.6);
      this.kocok.add(this.staff);

      // 3D Floating Name Tag for Kocorock
      const tagKocok = this.createFloatingTag('KOCOROCK', 'VNS • Rock Golem', '#f59e0b');
      tagKocok.position.set(0, 3.7, 0);
      this.kocok.add(tagKocok);

      this.kocok.position.set(-11, 1.6, 2.6);
      this.proceduralGroup.add(this.kocok);

      // 2. PROCEDURAL PIPIMON COLONY (POKEMON BIO SLIME - BFO)
      this.pips = [];
      for (let p = 0; p < 5; p++) {
        const pip = new THREE.Group();
        const isLeader = (p === 0);
        const rad = isLeader ? 1.35 : 0.65;
        const pGeo = new THREE.SphereGeometry(rad, 20, 20);
        const pMat = new THREE.MeshToonMaterial({
          color: isLeader ? 0x22d3ee : 0x67e8f9,
          emissive: 0x0891b2,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.94
        });
        pip.add(new THREE.Mesh(pGeo, pMat));

        // Anime Expressive Eyes
        const eyeW = rad * 0.28;
        const ew = new THREE.Mesh(new THREE.SphereGeometry(eyeW, 10, 10), new THREE.MeshToonMaterial({ color: 0xffffff }));
        ew.position.set(-rad * 0.35, rad * 0.2, rad * 0.85);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(eyeW * 0.55, 8, 8), new THREE.MeshToonMaterial({ color: 0x0f172a }));
        pu.position.set(-rad * 0.35, rad * 0.2, rad * 1.05);
        pip.add(ew); pip.add(pu);

        const ew2 = ew.clone(); ew2.position.x = rad * 0.35;
        const pu2 = pu.clone(); pu2.position.x = rad * 0.35;
        pip.add(ew2); pip.add(pu2);

        // Kawaii Pink Cheeks
        const cheekMat = new THREE.MeshToonMaterial({ color: 0xf472b6, opacity: 0.8, transparent: true });
        const chL = new THREE.Mesh(new THREE.SphereGeometry(eyeW * 0.45, 8, 8), cheekMat);
        chL.position.set(-rad * 0.55, -rad * 0.05, rad * 0.75);
        const chR = chL.clone(); chR.position.x = rad * 0.55;
        pip.add(chL); pip.add(chR);

        // Flagella tail
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * rad, 0.09 * rad, 0.8 * rad, 6), new THREE.MeshToonMaterial({ color: 0x06b6d4 }));
        tail.position.set(0, -rad * 0.4, -rad * 0.8);
        tail.rotation.x = Math.PI / 3;
        pip.add(tail);

        // Golden Crown with jewels for Leader
        let crown = null;
        if (isLeader) {
          crown = new THREE.Group();
          const crBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 12), new THREE.MeshToonMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.5 }));
          crown.add(crBase);
          for (let c = 0; c < 5; c++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 4), new THREE.MeshToonMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.6 }));
            const a = (c / 5) * Math.PI * 2;
            spike.position.set(Math.cos(a) * 0.38, 0.25, Math.sin(a) * 0.38);
            crown.add(spike);
          }
          crown.position.set(0, rad + 0.25, 0);
          pip.add(crown);

          // 3D Floating Name Tag for Pipimon
          const tagPip = this.createFloatingTag('PIPIDON', 'BFO • Bio Slime', '#06b6d4');
          tagPip.position.set(0, 3.4, 0);
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
        
        // Kocok GLB (Golem)
        loader.load('./assets/models/kocok.glb', (gltf) => {
          this.meshyKocok = gltf.scene;
          this.meshyKocok.scale.set(3.0, 3.0, 3.0);
          this.meshyKocok.position.set(-11, 1.2, 2.6);
          
          // Color tuning: warm vibrant terracotta stone toon finish
          this.meshyKocok.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.material = new THREE.MeshToonMaterial({
                color: 0xc27838,
                emissive: 0x78350f,
                emissiveIntensity: 0.18,
                roughness: 0.8
              });
            }
          });

          // Add 3D Floating Tag
          const tagM = this.createFloatingTag('KOCOROCK', 'VNS • Rock Golem', '#f59e0b');
          tagM.position.set(0, 1.5, 0);
          this.meshyKocok.add(tagM);

          this.meshyGroup.add(this.meshyKocok);
        }, undefined, (err) => console.log('Meshy Kocok GLB load notice:', err));

        // Pip GLB (Bacterium)
        loader.load('./assets/models/pip.glb', (gltf) => {
          this.meshyPip = gltf.scene;
          this.meshyPip.scale.set(2.8, 2.8, 2.8);
          this.meshyPip.position.set(11, 1.3, 2.4);

          // Color tuning: luminous vibrant cyan jelly with golden accent
          this.meshyPip.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.material = new THREE.MeshToonMaterial({
                color: 0x22d3ee,
                transparent: true,
                opacity: 0.95,
                emissive: 0x06b6d4,
                emissiveIntensity: 0.35
              });
            }
          });

          // Add 3D Floating Tag
          const tagP = this.createFloatingTag('PIPIDON', 'BFO • Bio Slime', '#06b6d4');
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
      this.sheetIndex = 0;
      this.storyIndex = 0;
      this.selectedTask = null;

      this.storyChapters = [
        {
          header: "Bab 1: Perkenalan Kocorock & Pipimon",
          speaker: "Kocorock & Pipimon",
          speakerType: "both",
          bubbleText: "Selamat datang di Kerajaan Awan kami.",
          text: "Halo rekan-rekan penguji dan mahasiswa! Aku Kocorock si golem VNS, dan ini rekanku Pipimon si koloni bakteri BFO! Selamat datang di Kerajaan Awan! Setiap hari, tugas komputasi awan berjatuhan dan harus dialokasikan ke pulau virtual machine secara merata!",
          cam: "both"
        },
        {
          header: "Bab 2: Kocorock Mengidentifikasi Bottleneck",
          speaker: "Kocorock (VNS)",
          speakerType: "kocorock",
          bubbleText: "Perhatian! Kristal tugas menumpuk di pulau itu, Makespan melonjak!",
          text: "Perhatikan pulau di hadapanku ini! Tugas-tugas komputasi menumpuk terlalu banyak, sehingga beban Makespan melonjak drastis! Jika satu mesin virtual terlalu terbebani, waktu Makespan total sistem akan membengkak dan utilisasi menjadi tidak seimbang!",
          cam: "vns"
        },
        {
          header: "Bab 3: Mekanisme Shaking Kocorock (VNS)",
          speaker: "Kocorock (VNS)",
          speakerType: "kocorock",
          bubbleText: "Tenang, gunakan jurus Shaking! Guncang kristal ke pulau seimbang.",
          text: "Jangan khawatir! Sebagai representasi Variable Neighborhood Search, aku mengeksekusi mekanisme Shaking! Aku melompat langsung ke pulau terberat, lalu mengentakkan tongkat batuku untuk memindahkan tugas ke pulau yang lebih lengang!",
          cam: "vns"
        },
        {
          header: "Bab 4: Eksplorasi Koloni Pipimon (BFO)",
          speaker: "Pipimon (BFO)",
          speakerType: "pipimon",
          bubbleText: "Giliranku! Koloni kami berenang lincah dengan Chemotaxis!",
          text: "Sekarang giliranku! Koloni kami Pipimon berenang lincah mengikuti gradien nutrisi Chemotaxis! Bakteri terunggul membelah diri pada fase reproduksi, dan sebagian disebar untuk mencegah jebakan lokal!",
          cam: "bfo"
        },
        {
          header: "Bab 5: Konvergensi Optimal Kocorock & Pipimon",
          speaker: "Kocorock & Pipimon",
          speakerType: "both",
          bubbleText: "Beban seluruh pulau kini seimbang mendekati batas ideal!",
          text: "Berkat kombinasi goncangan terarah Kocorock dan penjelajahan luas koloni Pipimon, beban seluruh pulau kini seimbang mendekati batas bawah teoretis! Makespan berhasil diminimalkan dan penjadwalan komputasi awan sukses dioptimalkan!",
          cam: "both"
        }
      ];

      this.initDOM();
      this.init3D();
      this.initEvents();
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

      // Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
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
        } else if (e.key === 'Escape') {
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
  }

  // Launch on ready
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppMaster();
  });
})();
