import { emitHookEvent } from './hookSystem';

export type LifecycleBranch = {
  BEFORE: string;
  AFTER: string;
  FAILURE: string;
};

export type LifecyclePhase = keyof LifecycleBranch;

type RequestUserLike = {
  id: string | number;
  role?: string;
} | null | undefined;

class ControlPlaneHookService {
  async emitLifecycleEvent(
    branch: LifecycleBranch,
    phase: LifecyclePhase,
    payload: Record<string, unknown>
  ): Promise<void> {
    await emitHookEvent(branch[phase], payload);
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
