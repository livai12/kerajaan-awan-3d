/**
 * Kerajaan Awan 3D - Modul View3D (Three.js Prosedural)
 * - Karakter dibuat murni dengan primitif Three.js (tanpa model 3D unduhan).
 * - Kocok (Golem VNS) dengan tongkat & animasi ketukan tongkat / goncangan.
 * - Pip (Bakteri BFO) agar-agar translusen dengan mata lucu, ekor flagella, dan mahkota emas.
 * - Pulau melayang (VM), kristal bercahaya (Task), dan tiang bendera makespan.
 * - Drag mouse untuk memutar kamera, scroll untuk zoom (kontrol mandiri tanpa library tambahan).
 */

import { calculateVmLoads, calculateMakespan, calculateIdealLowerBound } from './problem.js';

export class View3D {
  constructor(canvasContainer, problem, onTaskReassigned = null) {
    this.container = canvasContainer;
    this.problem = problem;
    this.onTaskReassigned = onTaskReassigned;
    this.currentSolution = problem.tasks.map((_, i) => i % problem.vms.length);

    this.isWebGLSupported = true;
    this.islandMeshes = [];
    this.crystalMeshes = [];
    this.characters = { kocok: null, pips: [] };
    this.selectedTaskId = null;
    this.activeAlgorithm = 'vns'; // 'vns' | 'bfo'

    try {
      this.initThree();
      this.buildWorld();
      this.initInteractions();
      this.animate();
    } catch (e) {
      console.warn('WebGL init failed, falling back to 2D:', e);
      this.isWebGLSupported = false;
      this.container.innerHTML = `
        <div style="padding: 20px; color: #64748b; text-align: center;">
          <p>⚠️ <em>Akselerasi 3D WebGL tidak aktif atau bermasalah di peramban ini.</em></p>
          <p>Sistem otomatis mengalihkan visualisasi ke <strong>Mode 2D Interaktif</strong>.</p>
        </div>
      `;
    }
  }

  initThree() {
    if (typeof THREE === 'undefined') {
      throw new Error('Three.js belum dimuat');
    }

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    this.scene = new THREE.Scene();
    // Background transparan agar menyatu dengan CSS sky gradient
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 14, 28);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    // Pencahayaan Toon / Halus
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 0.9);
    dirLight.position.set(15, 25, 15);
    this.scene.add(dirLight);

    const softFillLight = new THREE.DirectionalLight(0xbae6fd, 0.4);
    softFillLight.position.set(-15, 10, -10);
    this.scene.add(softFillLight);

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  buildWorld() {
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    const { vms, tasks } = this.problem;
    const islandSpacing = 9.0;
    const startX = -((vms.length - 1) * islandSpacing) / 2;

    this.islandMeshes = [];

    // 1. BUAT PULAU MELAYANG (VM)
    vms.forEach((vm, idx) => {
      const islandGroup = new THREE.Group();
      islandGroup.position.set(startX + idx * islandSpacing, 0, 0);

      // Permukaan atas pulau (padang rumput melayang)
      const topGeo = new THREE.CylinderGeometry(3.6, 3.2, 1.0, 16);
      const topMat = new THREE.MeshToonMaterial({ color: 0x86efac }); // pastel grass green
      const topMesh = new THREE.Mesh(topGeo, topMat);
      islandGroup.add(topMesh);

      // Bagian bawah pulau (batu runcing mengapung)
      const bottomGeo = new THREE.ConeGeometry(3.2, 3.5, 16);
      bottomGeo.rotateX(Math.PI);
      const bottomMat = new THREE.MeshToonMaterial({ color: 0x64748b }); // rock slate
      const bottomMesh = new THREE.Mesh(bottomGeo, bottomMat);
      bottomMesh.position.y = -2.2;
      islandGroup.add(bottomMesh);

      // Kristal energi pulau (VM Core indicator)
      const coreGeo = new THREE.OctahedronGeometry(0.7, 0);
      const coreMat = new THREE.MeshToonMaterial({ color: vm.color || 0x38bdf8 });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.set(0, 1.2, -2.2);
      islandGroup.add(coreMesh);

      // Tiang Bendera Makespan
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5, 8);
      const poleMat = new THREE.MeshToonMaterial({ color: 0xd1d5db });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(2.8, 2.5, 0);
      islandGroup.add(pole);

      // Bendera Merah Makespan
      const flagGeo = new THREE.BoxGeometry(0.8, 0.5, 0.05);
      const flagMat = new THREE.MeshToonMaterial({ color: 0xef4444 });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(3.2, 4.5, 0);
      flag.visible = false;
      islandGroup.add(flag);

      islandGroup.userData = { vmId: idx, flag, basePos: islandGroup.position.clone() };
      this.worldGroup.add(islandGroup);
      this.islandMeshes.push(islandGroup);
    });

    // 2. RAKIT KARAKTER KOCOK (Golem VNS)
    this.characters.kocok = this.createKocokMesh();
    this.characters.kocok.position.set(0, 1.5, 3.5);
    this.worldGroup.add(this.characters.kocok);

    // 3. RAKIT KARAKTER PIP (Bakteri BFO koloni)
    this.characters.pips = [];
    for (let i = 0; i < 6; i++) {
      const pip = this.createPipMesh(i === 0); // Pip #0 bermahkota awal
      pip.position.set(-6 + i * 2.4, 1.2, 4.5);
      pip.visible = false; // Muncul saat mode BFO aktif
      this.worldGroup.add(pip);
      this.characters.pips.push(pip);
    }

    // 4. BUAT KRISTAL TASK
    this.crystalMeshes = [];
    tasks.forEach((task, tIdx) => {
      // Tinggi kristal proporsional dengan panjang task
      const height = Math.max(0.7, Math.min(2.2, task.length / 22));
      const crystalGeo = new THREE.ConeGeometry(0.45, height, 6);
      const crystalMat = new THREE.MeshToonMaterial({
        color: task.color,
        emissive: task.color,
        emissiveIntensity: 0.15
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.userData = { taskId: tIdx, length: task.length };
      this.worldGroup.add(crystal);
      this.crystalMeshes.push(crystal);
    });

    this.updateCrystalPositions();
  }

  createKocokMesh() {
    const golemGroup = new THREE.Group();

    // Tubuh batu bulat
    const bodyGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const bodyMat = new THREE.MeshToonMaterial({ color: 0x78716c });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    golemGroup.add(body);

    // Mata tunggal bercahaya ramah
    const eyeGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const eyeMat = new THREE.MeshToonMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.5 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.4, 1.1);
    golemGroup.add(eye);

    // Tangan kiri & kanan batu
    const handGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const handMat = new THREE.MeshToonMaterial({ color: 0x57534e });

    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(-1.4, 0.2, 0.2);
    golemGroup.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.set(1.4, 0.2, 0.2);
    golemGroup.add(rightHand);

    // Tongkat Pengocok VNS
    const staffGroup = new THREE.Group();
    const staffPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8);
    const staffPoleMat = new THREE.MeshToonMaterial({ color: 0xb45309 });
    const staffPole = new THREE.Mesh(staffPoleGeo, staffPoleMat);
    staffGroup.add(staffPole);

    // Batu kristal di ujung tongkat
    const staffGemGeo = new THREE.OctahedronGeometry(0.35, 0);
    const staffGemMat = new THREE.MeshToonMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.4 });
    const staffGem = new THREE.Mesh(staffGemGeo, staffGemMat);
    staffGem.position.y = 1.4;
    staffGroup.add(staffGem);

    staffGroup.position.set(1.5, 0.6, 0.5);
    golemGroup.add(staffGroup);

    golemGroup.userData = { body, eye, leftHand, rightHand, staffGroup };
    return golemGroup;
  }

  createPipMesh(hasCrown = false) {
    const pipGroup = new THREE.Group();

    // Tubuh agar-agar bulat translusen
    const bodyGeo = new THREE.SphereGeometry(0.65, 20, 20);
    const bodyMat = new THREE.MeshToonMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.88
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    pipGroup.add(body);

    // Dua mata bulat kartun
    const eyeWhiteGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x0f172a });

    const leftEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    leftEye.position.set(-0.24, 0.15, 0.55);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.24, 0.15, 0.7);
    pipGroup.add(leftEye);
    pipGroup.add(leftPupil);

    const rightEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    rightEye.position.set(0.24, 0.15, 0.55);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.24, 0.15, 0.7);
    pipGroup.add(rightEye);
    pipGroup.add(rightPupil);

    // Ekor flagella bergoyang
    const tailGroup = new THREE.Group();
    const tailSegGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.6, 6);
    const tailMat = new THREE.MeshToonMaterial({ color: 0x38bdf8 });
    const tailSeg = new THREE.Mesh(tailSegGeo, tailMat);
    tailSeg.position.set(0, -0.4, -0.6);
    tailSeg.rotation.x = Math.PI / 3;
    tailGroup.add(tailSeg);
    pipGroup.add(tailGroup);

    // Mahkota Emas Pemimpin (Elitism)
    const crownGroup = new THREE.Group();
    const crownBaseGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.2, 8);
    const crownMat = new THREE.MeshToonMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.3 });
    const crownBase = new THREE.Mesh(crownBaseGeo, crownMat);
    crownGroup.add(crownBase);

    for (let c = 0; c < 4; c++) {
      const spikeGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
      const spike = new THREE.Mesh(spikeGeo, crownMat);
      const angle = (c * Math.PI) / 2;
      spike.position.set(Math.cos(angle) * 0.25, 0.2, Math.sin(angle) * 0.25);
      crownGroup.add(spike);
    }

    crownGroup.position.set(0, 0.85, 0);
    crownGroup.visible = hasCrown;
    pipGroup.add(crownGroup);

    pipGroup.userData = { body, crownGroup, tailGroup };
    return pipGroup;
  }

  setAlgorithmMode(algo) {
    this.activeAlgorithm = algo;
    if (this.characters.kocok) {
      this.characters.kocok.visible = (algo === 'vns');
    }
    if (this.characters.pips) {
      this.characters.pips.forEach(p => {
        p.visible = (algo === 'bfo');
      });
    }
  }

  setSolution(solution) {
    this.currentSolution = [...solution];
    this.updateCrystalPositions();
    this.updateMakespanFlags();
  }

  updateCrystalPositions() {
    const { vms, tasks } = this.problem;
    const vmCounts = new Array(vms.length).fill(0);

    tasks.forEach((task, tIdx) => {
      const vmId = this.currentSolution[tIdx] ?? 0;
      const crystal = this.crystalMeshes[tIdx];
      if (!crystal) return;

      const island = this.islandMeshes[vmId];
      if (!island) return;

      // Tata kristal melingkar di atas permukaan pulau
      const count = vmCounts[vmId]++;
      const radius = 1.2 + (count % 3) * 0.5;
      const angle = (count * 1.3) + (vmId * 0.5);

      const targetX = island.position.x + Math.cos(angle) * radius;
      const targetZ = island.position.z + Math.sin(angle) * radius;
      const targetY = 0.8 + (crystal.geometry.parameters.height / 2);

      crystal.position.set(targetX, targetY, targetZ);
    });
  }

  updateMakespanFlags() {
    const { vms, tasks } = this.problem;
    const loads = calculateVmLoads(this.currentSolution, tasks, vms);
    const makespan = calculateMakespan(this.currentSolution, tasks, vms);

    vms.forEach((_, vmIdx) => {
      const island = this.islandMeshes[vmIdx];
      if (!island) return;
      const flag = island.userData.flag;
      const isBusiest = Math.abs(loads[vmIdx] - makespan) < 0.01;
      flag.visible = isBusiest;
      if (isBusiest) {
        // Skala tiang bendera mengikuti makespan
        flag.position.y = Math.min(5.5, 2.5 + (makespan / 30));
      }
    });
  }

  /**
   * Pemetaan Event Algoritma ke Gerakan Karakter 3D
   */
  async playAlgorithmEvent(event) {
    if (event.solution) {
      this.setSolution(event.solution);
    }

    if (event.type === 'shake' && this.characters.kocok) {
      // Kocok mengetuk tongkat k kali, kamera sedikit bergetar
      const staff = this.characters.kocok.userData.staffGroup;
      const k = event.k || 1;
      for (let i = 0; i < k; i++) {
        staff.rotation.z = -0.5;
        await new Promise(r => setTimeout(r, 120));
        staff.rotation.z = 0.2;
        await new Promise(r => setTimeout(r, 120));
      }
      staff.rotation.z = 0;
    } else if (event.type === 'accept' && this.characters.kocok) {
      // Kocok mengangkat tangan merayakan
      const leftHand = this.characters.kocok.userData.leftHand;
      const rightHand = this.characters.kocok.userData.rightHand;
      leftHand.position.y = 1.3;
      rightHand.position.y = 1.3;
      await new Promise(r => setTimeout(r, 350));
      leftHand.position.y = 0.2;
      rightHand.position.y = 0.2;
    } else if (event.type === 'reject' && this.characters.kocok) {
      // Kocok menggeleng
      const body = this.characters.kocok.userData.body;
      body.rotation.y = -0.3;
      await new Promise(r => setTimeout(r, 150));
      body.rotation.y = 0.3;
      await new Promise(r => setTimeout(r, 150));
      body.rotation.y = 0;
    } else if (event.type === 'best' && this.characters.pips) {
      // Mahkota berpindah ke Pip terbaik
      const bestIdx = event.bestBacteriumIdx ?? 0;
      this.characters.pips.forEach((pip, pIdx) => {
        pip.userData.crownGroup.visible = (pIdx === bestIdx);
      });
    }
  }

  initInteractions() {
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      if (this.worldGroup) {
        this.worldGroup.rotation.y += deltaX * 0.008;
        this.camera.position.y = Math.max(5, Math.min(25, this.camera.position.y - deltaY * 0.05));
        this.camera.lookAt(0, 0, 0);
      }
    });

    // Zoom mouse wheel
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.02;
      this.camera.position.z = Math.max(12, Math.min(45, this.camera.position.z + zoomFactor));
    }, { passive: false });
  }

  animate() {
    if (!this.isWebGLSupported || !this.renderer) return;

    requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.002;

    // Animasi lembut melayang (floating islands & crystals bobbing)
    this.islandMeshes.forEach((island, idx) => {
      island.position.y = Math.sin(time + idx * 1.5) * 0.15;
    });

    this.crystalMeshes.forEach((crystal, idx) => {
      crystal.rotation.y += 0.015;
    });

    // Goyangan flagella Pip
    if (this.characters.pips) {
      this.characters.pips.forEach((pip, idx) => {
        if (pip.visible) {
          pip.userData.tailGroup.rotation.z = Math.sin(time * 3 + idx) * 0.4;
          pip.position.y = 1.2 + Math.sin(time * 2 + idx) * 0.1;
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
  }
}

