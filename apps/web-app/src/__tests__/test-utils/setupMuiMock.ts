import { vi } from 'vitest';

export const setupMuiMock = () => {
  vi.mock('@mui/material', async () => {
    const module = await import('./mockMui');
    return module.createMuiMock();
  });
};
