import { plainToInstance } from 'class-transformer';

export interface UpdateSettingInput {
  value: unknown;
}

export class UpdateSettingDTO {
  value?: unknown;

  static from(body: unknown): UpdateSettingDTO {
    return plainToInstance(UpdateSettingDTO, body ?? {});
  }

  toServiceInput(): UpdateSettingInput {
    if (this.value === undefined) {
      throw new Error('Value is required for updating a setting');
    }

    return {
      value: this.value,
    };
  }
}
