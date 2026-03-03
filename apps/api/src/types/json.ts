export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = { [key: string]: JsonValue };

export const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(item => isJsonValue(item));
  }

  if (typeof value === 'object') {
    return Object.values(value).every(item => isJsonValue(item));
  }

  return false;
};

export const isJsonObject = (value: unknown): value is JsonObject => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(item => isJsonValue(item));
};
