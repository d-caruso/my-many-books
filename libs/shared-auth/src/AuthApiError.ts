export class AuthApiError extends Error {
  readonly code: string;
  readonly i18nKey: string;

  constructor(code: string, message: string, i18nKey: string) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.i18nKey = i18nKey;
  }
}
