import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { HooksList } from '../../pages/Admin/Hooks/HooksList';

const hooksData = [
  {
    id: 11,
    name: 'Audit Hook',
    eventPattern: 'audit.**',
    actionType: 'log',
    isActive: true,
    priority: 1,
    lastExecution: '2025-12-02T10:00:00Z',
  },
];

describe('HooksList', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('renders toolbar stub', async () => {
    rtlRender(<HooksList hooks={hooksData} />);
    const toolbar = await screen.findByTestId('mock-grid-toolbar');
    expect(toolbar).toBeInTheDocument();
  });
});
