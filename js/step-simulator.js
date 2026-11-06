/**
 * MASL - Analizador de Errores Léxicos
 * Motor de Simulación "Paso a Paso"
 */

class StepSimulator {
  constructor(steps = [], onStepChange = null, onComplete = null) {
    this.steps = steps;
    this.currentIndex = -1;
    this.isPlaying = false;
    this.timer = null;
    this.speedMs = 600;
    this.onStepChange = onStepChange;
    this.onComplete = onComplete;
  }

  setSteps(steps) {
    this.stop();
    this.steps = steps || [];
    this.currentIndex = -1;
  }

  setSpeed(speedMs) {
    this.speedMs = speedMs;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  play() {
    if (this.isPlaying) return;
    if (this.steps.length === 0) return;

    if (this.currentIndex >= this.steps.length - 1) {
      this.currentIndex = -1;
    }

    this.isPlaying = true;
    this.tick();
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  stop() {
    this.pause();
    this.currentIndex = -1;
  }

  next() {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++;
      this.notify();
      return true;
    }
    return false;
  }

  previous() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.notify();
      return true;
    }
    return false;
  }

  reset() {
    this.pause();
    this.currentIndex = -1;
    if (this.onStepChange) {
      this.onStepChange(null, -1, this.steps.length);
    }
  }

  tick() {
    if (!this.isPlaying) return;

    const hasMore = this.next();
    if (hasMore) {
      this.timer = setTimeout(() => this.tick(), this.speedMs);
    } else {
      this.isPlaying = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  notify() {
    const currentStep = this.steps[this.currentIndex] || null;
    if (this.onStepChange) {
      this.onStepChange(currentStep, this.currentIndex, this.steps.length);
    }
  }
}

if (typeof window !== 'undefined') {
  window.MASL = window.MASL || {};
  window.MASL.StepSimulator = StepSimulator;
}
