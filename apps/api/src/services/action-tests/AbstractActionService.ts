import axios from 'axios';
import { getLogger, type AppLogger } from '@my-many-books/shared-logging';

export abstract class AbstractActionService {
  protected readonly httpClient: import('axios').AxiosInstance;
  protected readonly allowedHosts: string[];
  protected readonly logger: AppLogger = getLogger();

  constructor(timeoutMs: number, allowlist: string | undefined) {
    this.allowedHosts = (allowlist ?? '')
      .split(',')
      .map(host => host.trim())
      .filter(Boolean);

    this.httpClient = axios.create({
      timeout: timeoutMs,
      validateStatus: () => true,
    });
  }

  protected isHostAllowed(url: string): boolean {
    if (this.allowedHosts.length === 0) {
      return true;
    }

    try {
      const parsed = new URL(url);
      return this.allowedHosts.includes(parsed.hostname);
    } catch (error) {
      this.logger.warn({ url, err: error }, 'Action test endpoint invalid');
      return false;
    }
  }
}
