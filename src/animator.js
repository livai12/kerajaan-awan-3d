/**
 * Kerajaan Awan 3D - Modul Animator
 * Mengatur antrean event, pemutaran animasi (Play, Step, Pause, Reset), dan kontrol kecepatan (0.5x - 3x).
 */

export class Animator {
  constructor() {
    this.eventQueue = [];
    this.isPlaying = false;
    this.isProcessing = false;
    this.speed = 1.0; // 0.5x s/d 3.0x
    this.listeners = [];
    this.baseDelay = 800; // ms
  }

  onEvent(callback) {
    this.listeners.push(callback);
  }

  setSpeed(val) {
    this.speed = Math.max(0.2, Math.min(val, 5.0));
  }

  queueEvents(events) {
    this.eventQueue.push(...events);
    if (this.isPlaying && !this.isProcessing) {
      this.processQueue();
    }
  }

  async play() {
    this.isPlaying = true;
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  pause() {
    this.isPlaying = false;
  }

  async stepOnce() {
    if (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      await this.dispatch(event);
      return true;
    }
    return false;
  }

  clear() {
    this.eventQueue = [];
    this.isPlaying = false;
  }

  async processQueue() {
    this.isProcessing = true;
    while (this.isPlaying && this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      await this.dispatch(event);
      const delay = this.baseDelay / this.speed;
      await new Promise(r => setTimeout(r, delay));
    }
    this.isProcessing = false;
  }

  async dispatch(event) {
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch (err) {
        console.error('Error dispatching event:', err, event);
      }
    }
  }
}

