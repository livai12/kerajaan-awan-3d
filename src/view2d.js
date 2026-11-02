/**
 * Kerajaan Awan 3D - Modul View2D
 * Tampilan 2D Bar & Kristal sebagai sumber kebenaran (Ground Truth) dan Fallback otomatis.
 */

import { calculateVmLoads, calculateMakespan, calculateIdealLowerBound, calculateDegreeOfImbalance } from './problem.js';

export class View2D {
  constructor(containerElement, problem, onTaskReassigned = null) {
    this.container = containerElement;
    this.problem = problem;
    this.onTaskReassigned = onTaskReassigned;
    this.selectedTaskId = null;
    this.currentSolution = problem.tasks.map((_, i) => i % problem.vms.length);

    this.initDOM();
    this.render();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="view2d-root">
        <div class="metrics-bar">
          <div class="metric-item">
            <span class="metric-label">Makespan (Waktu Selesai Terakhir)</span>
            <span class="metric-value makespan-val">0.0s</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Batas Ideal (Lower Bound)</span>
            <span class="metric-value ideal-val">0.0s</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Derajat Ketidakseimbangan (DI)</span>
            <span class="metric-value di-val">0.0%</span>
          </div>
        </div>

        <div class="bars-container">
          <!-- Bars rendered dynamically -->
        </div>

        <div class="legend-note">
          <small>💡 <em>Klik kristal untuk memilih, lalu klik pulau VM lain untuk memindahkan alokasi secara interaktif.</em></small>
        </div>
      </div>
    `;

    this.barsContainer = this.container.querySelector('.bars-container');
    this.makespanValEl = this.container.querySelector('.makespan-val');
    this.idealValEl = this.container.querySelector('.ideal-val');
    this.diValEl = this.container.querySelector('.di-val');
  }

  setSolution(solution) {
    this.currentSolution = [...solution];
    this.render();
  }

  render() {
    const { tasks, vms } = this.problem;
    const loads = calculateVmLoads(this.currentSolution, tasks, vms);
    const makespan = calculateMakespan(this.currentSolution, tasks, vms);
    const ideal = calculateIdealLowerBound(tasks, vms);
    const di = calculateDegreeOfImbalance(loads);

    this.makespanValEl.textContent = `${makespan.toFixed(1)}s`;
    this.idealValEl.textContent = `${ideal.toFixed(1)}s`;
    this.diValEl.textContent = `${(di * 100).toFixed(1)}%`;

    const maxScale = Math.max(makespan * 1.15, ideal * 1.3, 100);

    let html = '';
    vms.forEach((vm, vmIdx) => {
      const isBusiest = Math.abs(loads[vmIdx] - makespan) < 0.01;
      const tasksOnVm = [];
      this.currentSolution.forEach((vId, tIdx) => {
        if (vId === vmIdx) tasksOnVm.push(tasks[tIdx]);
      });

      const loadPct = (loads[vmIdx] / maxScale) * 100;

      html += `
        <div class="vm-row ${isBusiest ? 'vm-busiest' : ''}" data-vmid="${vmIdx}">
          <div class="vm-header">
            <div class="vm-title">
              <span class="vm-badge" style="background:${vm.color}"></span>
              <strong>${vm.name}</strong>
              <span class="vm-speed">(Speed: ${vm.speed.toFixed(1)}x)</span>
            </div>
            <div class="vm-load-text">${loads[vmIdx].toFixed(1)}s ${isBusiest ? '🚩 [Makespan]' : ''}</div>
          </div>
          <div class="vm-track" data-vmid="${vmIdx}">
            <div class="vm-fill" style="width: ${Math.min(100, loadPct)}%;">
              ${tasksOnVm.map(t => {
                const isSelected = this.selectedTaskId === t.id;
                const taskWidthPct = ((t.length / vm.speed) / loads[vmIdx]) * 100;
                return `
                  <div class="task-gem ${isSelected ? 'task-selected' : ''}" 
                       data-taskid="${t.id}"
                       title="${t.name} (Panjang: ${t.length}, Durasi: ${(t.length / vm.speed).toFixed(1)}s)"
                       style="background: ${t.color}; width: ${taskWidthPct}%;">
                    <span class="task-label">#${t.id + 1}</span>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="ideal-line" style="left: ${(ideal / maxScale) * 100}%;" title="Batas Ideal Teoritis"></div>
          </div>
        </div>
      `;
    });

    this.barsContainer.innerHTML = html;

    // Tambah event listener klik kristal & klik row
    this.barsContainer.querySelectorAll('.task-gem').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = parseInt(el.getAttribute('data-taskid'), 10);
        if (this.selectedTaskId === taskId) {
          this.selectedTaskId = null; // deselect
        } else {
          this.selectedTaskId = taskId;
        }
        this.render();
      });
    });

    this.barsContainer.querySelectorAll('.vm-track, .vm-row').forEach(el => {
      el.addEventListener('click', () => {
        const targetVmId = parseInt(el.getAttribute('data-vmid'), 10);
        if (this.selectedTaskId !== null && !isNaN(targetVmId)) {
          if (this.currentSolution[this.selectedTaskId] !== targetVmId) {
            this.currentSolution[this.selectedTaskId] = targetVmId;
            const tId = this.selectedTaskId;
            this.selectedTaskId = null;
            this.render();
            if (this.onTaskReassigned) {
              this.onTaskReassigned(tId, targetVmId, [...this.currentSolution]);
            }
          }
        }
      });
    });
  }

  handleEvent(event) {
    if (event.solution) {
      this.setSolution(event.solution);
    }
  }
}

