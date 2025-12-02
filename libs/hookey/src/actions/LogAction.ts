import { HookAction, HookActionContext } from '../types';

export class LogAction implements HookAction {
  constructor(private readonly prefix: string = 'hook') {}

  async execute(context: HookActionContext): Promise<void> {
    const payload = context.payload ?? {};
    console.log(`[${this.prefix}] event=${context.eventName}`, payload);
  }
}
