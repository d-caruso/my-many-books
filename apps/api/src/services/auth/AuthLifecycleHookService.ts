import { EVENTS } from '../hooks/events';
import {
  emitEvent,
  emitLifecycleEvent,
  type HookEventPayload,
  type LifecyclePhase,
} from '../hooks/lifecycleHooks';

class AuthLifecycleHookService {
  emitUserLoginBefore(payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.USER.LOGIN, 'BEFORE', payload);
  }

  emitUserLoginAfter(payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.USER.LOGIN, 'AFTER', payload);
  }

  emitAuthLoginFailure(payload: HookEventPayload): void {
    emitEvent(EVENTS.AUTH.LOGIN.FAILURE, payload);
  }

  emitUserRegister(phase: LifecyclePhase, payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.USER.REGISTER, phase, payload);
  }

  emitUserLogout(phase: LifecyclePhase, payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.USER.LOGOUT, phase, payload);
  }

  emitRefresh(phase: LifecyclePhase, payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.AUTH.REFRESH, phase, payload);
  }

  emitVerifyEmail(phase: LifecyclePhase, payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.AUTH.VERIFY_EMAIL, phase, payload);
  }

  emitResendCode(phase: LifecyclePhase, payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.AUTH.RESEND_CODE, phase, payload);
  }

  emitForgotPassword(phase: LifecyclePhase, payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.AUTH.FORGOT_PASSWORD, phase, payload);
  }

  emitResetPassword(phase: LifecyclePhase, payload: HookEventPayload): void {
    emitLifecycleEvent(EVENTS.AUTH.RESET_PASSWORD, phase, payload);
  }
}

export const authLifecycleHookService = new AuthLifecycleHookService();
