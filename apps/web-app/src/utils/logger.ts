/* eslint-disable no-console */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    if (isDev) console.warn(message, ...args);
  },
  debug(message: string, ...args: unknown[]): void {
    if (isDev) console.debug(message, ...args);
  },
  log(message: string, ...args: unknown[]): void {
    if (isDev) console.log(message, ...args);
  },
};
