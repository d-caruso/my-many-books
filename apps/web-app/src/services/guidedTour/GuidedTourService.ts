import { driver, type Config, type Driver, type Popover } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { TourStep } from '../../pages/HowTo/howToContent';
import {
  TOUR_NAVIGATION_SETTLE_DELAY,
  TOUR_OVERLAY_Z_INDEX,
  TOUR_SELECTOR_TIMEOUT,
} from '../../constants/tour';

type NavigateFn = (path: string) => void;
type TranslateFn = (key: string) => string;
type GetPathFn = () => string;

export class GuidedTourService {
  private driverInstance: Driver | null = null;
  private navigate: NavigateFn | null = null;
  private t: TranslateFn | null = null;
  private getPath: GetPathFn | null = null;
  private steps: TourStep[] = [];
  private currentStepIndex = 0;
  private running = false;

  inject(navigate: NavigateFn, t: TranslateFn, getPath: GetPathFn): void {
    this.navigate = navigate;
    this.t = t;
    this.getPath = getPath;
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(steps: TourStep[]): Promise<void> {
    if (this.running || steps.length === 0) {
      return;
    }

    if (!this.navigate || !this.t || !this.getPath) {
      throw new Error('GuidedTourService not initialized — call inject() first');
    }

    this.steps = steps;
    this.currentStepIndex = 0;
    this.running = true;
    this.driverInstance = driver(this.buildConfig());

    try {
      await this.runStep(this.steps[0]);
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop(): void {
    const instance = this.driverInstance;

    this.resetState();
    instance?.destroy();
  }

  private resetState(): void {
    this.driverInstance = null;
    this.steps = [];
    this.currentStepIndex = 0;
    this.running = false;
  }

  private buildConfig(): Config {
    return {
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.6)',
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'guided-tour-popover',
      allowClose: true,
    };
  }

  private buildPopover(step: TourStep): Popover {
    const isFirstStep = this.currentStepIndex === 0;
    const isLastStep = this.currentStepIndex === this.steps.length - 1;

    return {
      title: this.t!(step.titleKey),
      description: this.t!(step.bodyKey),
      showButtons: ['next', 'previous', 'close'],
      disableButtons: isFirstStep ? ['previous'] : [],
      showProgress: true,
      progressText: `${this.currentStepIndex + 1} / ${this.steps.length}`,
      nextBtnText: isLastStep ? this.t!('tutorial:tour.btn_done') : this.t!('tutorial:tour.btn_next'),
      prevBtnText: this.t!('tutorial:tour.btn_prev'),
      onNextClick: () => this.advance(1),
      onPrevClick: () => this.advance(-1),
      onCloseClick: () => this.stop(),
    };
  }

  private async advance(delta: number): Promise<void> {
    const nextIndex = this.currentStepIndex + delta;

    if (nextIndex < 0 || nextIndex >= this.steps.length) {
      this.stop();
      return;
    }

    this.currentStepIndex = nextIndex;

    try {
      await this.runStep(this.steps[nextIndex]);
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  private async runStep(step: TourStep): Promise<void> {
    const currentPath = this.getPath!();

    if (step.navigateTo && step.navigateTo !== currentPath) {
      this.navigate!(step.navigateTo);
      await this.sleep(TOUR_NAVIGATION_SETTLE_DELAY);
    }

    if (!this.running || !this.driverInstance) {
      return;
    }

    if (step.prerequisiteClicks) {
      for (const selector of step.prerequisiteClicks) {
        const element = document.querySelector(selector);

        if (element instanceof HTMLElement) {
          element.click();
        }
      }
    }

    await this.waitForSelector(step.targetSelector);

    if (!this.running || !this.driverInstance) {
      return;
    }

    this.driverInstance.highlight({
      element: step.targetSelector,
      popover: this.buildPopover(step),
    });

    this.applyOverlayZIndex();
  }

  private applyOverlayZIndex(): void {
    const overlay = document.querySelector('.driver-overlay');
    const popover = document.querySelector('.driver-popover');

    if (overlay instanceof HTMLElement) {
      overlay.style.zIndex = String(TOUR_OVERLAY_Z_INDEX);
    }

    if (popover instanceof HTMLElement) {
      popover.style.zIndex = String(TOUR_OVERLAY_Z_INDEX + 1);
    }
  }

  private waitForSelector(selector: string): Promise<void> {
    const existingElement = document.querySelector(selector);

    if (existingElement) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const start = Date.now();

      const poll = (): void => {
        if (document.querySelector(selector)) {
          resolve();
          return;
        }

        if (Date.now() - start > TOUR_SELECTOR_TIMEOUT) {
          reject(new Error(`Tour target not found: ${selector}`));
          return;
        }

        requestAnimationFrame(poll);
      };

      poll();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
}

export const guidedTourService = new GuidedTourService();
