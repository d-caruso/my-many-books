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

  test('renders rows and action buttons', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onViewExecutions = vi.fn();

    rtlRender(
      <HooksList
        hooks={hooksData}
        onEdit={onEdit}
        onDelete={onDelete}
        onViewExecutions={onViewExecutions}
      />
    );

    expect(await screen.findByTestId('mock-data-grid')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Audit Hook')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Executions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onEdit).toHaveBeenCalledWith(11);
    expect(onViewExecutions).toHaveBeenCalledWith(11);
    expect(onDelete).toHaveBeenCalledWith(11);
  });

  test('renders toolbar stub', async () => {
    rtlRender(<HooksList hooks={hooksData} />);
    const toolbar = await screen.findByTestId('mock-grid-toolbar');
    expect(toolbar).toBeInTheDocument();
  });
});
