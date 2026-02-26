export type ErrorLike = {
  status?: number;
  message?: string;
  response?: {
    status?: number;
    data?: { error?: unknown; message?: unknown };
  };
};

export const extractErrorDetails = (error: unknown): { status?: number; backendError?: string; message?: string } => {
  const err = error as ErrorLike | undefined;
  const status = err?.status ?? err?.response?.status;
  const backendErrorRaw = err?.response?.data?.error;
  const backendMessageRaw = err?.response?.data?.message;
  const backendError = typeof backendErrorRaw === 'string' ? backendErrorRaw : undefined;
  const backendMessage = typeof backendMessageRaw === 'string' ? backendMessageRaw : undefined;
  const message = backendMessage ?? (typeof err?.message === 'string' ? err.message : undefined);

  return { status, backendError, message };
};

export const extractErrorMessage = (error: unknown): string | undefined => {
  const { backendError, message } = extractErrorDetails(error);
  return backendError || message;
};
