/**
 * Kerajaan Awan 3D - Modul Problem
 * Mendefinisikan model Cloud Task Scheduling (Task, VM, Makespan, Fitness, dan Baseline)
 */

export const GEM_PALETTE = [
  '#38bdf8', // Sky Blue
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ef4444', // Red / Ruby
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#a855f7', // Purple
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#6366f1'  // Indigo
];

export function createDefaultProblem(taskCount = 12, vmCount = 3) {
  // VM heterogen (kecepatan berbeda: MIPS relatif 1.0, 1.5, 2.0)
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

  // Task acak terstandarisasi dengan panjang (workload) bervariasi
  const baseLengths = [12, 28, 45, 18, 35, 60, 22, 50, 15, 40, 55, 30, 25, 48, 38, 16];
  const tasks = [];
  for (let i = 0; i < taskCount; i++) {
    const len = baseLengths[i % baseLengths.length] + ((i * 7) % 11);
    tasks.push({
      id: i,
      name: `Kristal-${i + 1}`,
      length: len,
      color: GEM_PALETTE[i % GEM_PALETTE.length]
    });
  }

  return { vms: vms.slice(0, vmCount), tasks };
}

/**
 * Menghitung waktu eksekusi setiap VM untuk solusi penempatan task
 * solution: array di mana solution[i] adalah id VM untuk task ke-i
 */
export function calculateVmLoads(solution, tasks, vms) {
  const loads = new Array(vms.length).fill(0);
  for (let i = 0; i < tasks.length; i++) {
    const vmId = solution[i];
    if (vmId !== undefined && vmId >= 0 && vmId < vms.length) {
      loads[vmId] += tasks[i].length / vms[vmId].speed;
    }
  }
  return loads;
}

/**
 * Makespan = waktu selesai VM tersibuk (beban maksimum)
 */
export function calculateMakespan(solution, tasks, vms) {
  const loads = calculateVmLoads(solution, tasks, vms);
  return Math.max(...loads);
}

/**
 * Batas ideal teoritis (Lower Bound) jika beban terbagi sempurna sesuai kecepatan VM
 */
export function calculateIdealLowerBound(tasks, vms) {
  const totalWorkload = tasks.reduce((acc, t) => acc + t.length, 0);
  const totalSpeed = vms.reduce((acc, v) => acc + v.speed, 0);
  return totalWorkload / totalSpeed;
}

/**
 * Derajat ketidakseimbangan beban (Degree of Imbalance - DI)
 */
export function calculateDegreeOfImbalance(vmLoads) {
  const max = Math.max(...vmLoads);
  const min = Math.min(...vmLoads);
  const avg = vmLoads.reduce((a, b) => a + b, 0) / vmLoads.length;
  if (avg === 0) return 0;
  return (max - min) / avg;
}

// ==================== BASELINES ====================

export function scheduleRandom(tasks, vms) {
  return tasks.map(() => Math.floor(Math.random() * vms.length));
}

export function scheduleRoundRobin(tasks, vms) {
  return tasks.map((_, i) => i % vms.length);
}

/**
 * Greedy LPT (Longest Processing Time first ke VM yang selesai tercepat)
 */
export function scheduleGreedy(tasks, vms) {
  const sortedTaskIndices = tasks
    .map((t, idx) => ({ idx, length: t.length }))
    .sort((a, b) => b.length - a.length);

  const solution = new Array(tasks.length).fill(0);
  const vmLoads = new Array(vms.length).fill(0);

  for (const item of sortedTaskIndices) {
    let bestVm = 0;
    let minFinishTime = Infinity;

    for (let v = 0; v < vms.length; v++) {
      const finishTime = vmLoads[v] + (item.length / vms[v].speed);
      if (finishTime < minFinishTime) {
        minFinishTime = finishTime;
        bestVm = v;
      }
    }

    solution[item.idx] = bestVm;
    vmLoads[bestVm] += (item.length / vms[bestVm].speed);
  }

  return solution;
}

