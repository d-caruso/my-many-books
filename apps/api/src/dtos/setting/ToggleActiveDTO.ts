import { plainToInstance } from 'class-transformer';

export interface ToggleActiveInput {
  active: boolean;
}

export class ToggleActiveDTO {
  active?: boolean;

  static from(body: unknown): ToggleActiveDTO {
    return plainToInstance(ToggleActiveDTO, body ?? {});
  }

  toServiceInput(): ToggleActiveInput {
    if (this.active === undefined) {
      throw new Error('Active field is required');
    }

    if (typeof this.active !== 'boolean') {
      throw new Error('Active field must be a boolean');
    }

    return {
      active: this.active,
    };
  }
}
