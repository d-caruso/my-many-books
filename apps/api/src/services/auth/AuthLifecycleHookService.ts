import { EVENTS } from '../hooks/events';
import { emitHookEvent } from '../hooks/hookSystem';

type LifecycleBranch = {
  BEFORE: string;
  AFTER: string;
  FAILURE: string;
};

type LifecyclePhase = keyof LifecycleBranch;

class AuthLifecycleHookService {
  private async emitLifecycleEvent(
    branch: LifecycleBranch,
    phase: LifecyclePhase,
    payload: Record<string, unknown>
  ): Promise<void> {
    await emitHookEvent(branch[phase], payload);
  }

  async emitUserLoginBefore(payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.USER.LOGIN, 'BEFORE', payload);
  }

  async emitUserLoginAfter(payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.USER.LOGIN, 'AFTER', payload);
  }

  async emitAuthLoginFailure(payload: Record<string, unknown>): Promise<void> {
    await emitHookEvent(EVENTS.AUTH.LOGIN.FAILURE, payload);
  }

  async emitUserRegister(phase: LifecyclePhase, payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.USER.REGISTER, phase, payload);
  }

  async emitUserLogout(phase: LifecyclePhase, payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.USER.LOGOUT, phase, payload);
  }

  async emitRefresh(phase: LifecyclePhase, payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.AUTH.REFRESH, phase, payload);
  }

  async emitVerifyEmail(phase: LifecyclePhase, payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.AUTH.VERIFY_EMAIL, phase, payload);
  }

  async emitResendCode(phase: LifecyclePhase, payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.AUTH.RESEND_CODE, phase, payload);
  }

  async emitForgotPassword(phase: LifecyclePhase, payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.AUTH.FORGOT_PASSWORD, phase, payload);
  }

  async emitResetPassword(phase: LifecyclePhase, payload: Record<string, unknown>): Promise<void> {
    await this.emitLifecycleEvent(EVENTS.AUTH.RESET_PASSWORD, phase, payload);
  }
}

export const authLifecycleHookService = new AuthLifecycleHookService();
