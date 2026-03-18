import {
  emitLifecycleEvent as emitLifecycleHookEvent,
  type HookEventPayload,
  type LifecycleBranch,
  type LifecyclePhase,
} from './lifecycleHooks';

type RequestUserLike = {
  id: string | number;
  role?: string;
} | null | undefined;

class ControlPlaneHookService {
  emitLifecycleEvent(
    branch: LifecycleBranch,
    phase: LifecyclePhase,
    payload: HookEventPayload
  ): void {
    emitLifecycleHookEvent(branch, phase, payload);
  }

  getActorContext(user: RequestUserLike): { id: string | number; role?: string } | null {
    if (!user) {
      return null;
    }

    const actor: { id: string | number; role?: string } = {
      id: user.id,
    };

    if (user.role) {
      actor.role = user.role;
    }

    return actor;
  }
}

export const controlPlaneHookService = new ControlPlaneHookService();
