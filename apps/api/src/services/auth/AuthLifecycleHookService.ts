import { EVENTS } from '../hooks/events';
import { emitHookEvent } from '../hooks/hookSystem';

type LifecycleBranch = {
  BEFORE: string;
  AFTER: string;
  FAILURE: string;
};

type LifecyclePhase = keyof LifecycleBranch;

class AuthLifecycleHookService {
  private emitLifecycleEvent(
    branch: LifecycleBranch,
    phase: LifecyclePhase,
    payload: Record<string, unknown>
  ): void {
    void emitHookEvent(branch[phase], payload);
  }

  emitUserLoginBefore(payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.USER.LOGIN, 'BEFORE', payload);
  }

  emitUserLoginAfter(payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.USER.LOGIN, 'AFTER', payload);
  }

  emitAuthLoginFailure(payload: Record<string, unknown>): void {
    void emitHookEvent(EVENTS.AUTH.LOGIN.FAILURE, payload);
  }

  emitUserRegister(phase: LifecyclePhase, payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.USER.REGISTER, phase, payload);
  }

  emitUserLogout(phase: LifecyclePhase, payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.USER.LOGOUT, phase, payload);
  }

  emitRefresh(phase: LifecyclePhase, payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.AUTH.REFRESH, phase, payload);
  }

  emitVerifyEmail(phase: LifecyclePhase, payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.AUTH.VERIFY_EMAIL, phase, payload);
  }

  emitResendCode(phase: LifecyclePhase, payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.AUTH.RESEND_CODE, phase, payload);
  }

  emitForgotPassword(phase: LifecyclePhase, payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.AUTH.FORGOT_PASSWORD, phase, payload);
  }

  emitResetPassword(phase: LifecyclePhase, payload: Record<string, unknown>): void {
    this.emitLifecycleEvent(EVENTS.AUTH.RESET_PASSWORD, phase, payload);
  }
}

export const authLifecycleHookService = new AuthLifecycleHookService();
