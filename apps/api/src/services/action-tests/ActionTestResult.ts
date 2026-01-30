export interface ActionTestResult {
  success: boolean;
  status?: number;
  error?: string;
  responseTimeMs?: number;
}
