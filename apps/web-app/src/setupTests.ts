// Testing Library DOM matchers
import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// jest-axe for accessibility testing (compatible with vitest)
import { toHaveNoViolations } from 'jest-axe';

// i18n setup for tests (synchronous version for test environment)
import './i18n.testing';

// Browser fetch/stream polyfills needed by MSW
import 'whatwg-fetch';
import { TransformStream } from 'web-streams-polyfill/dist/ponyfill';

import type { SetupServerApi } from 'msw/node';

interface GridRowData extends Record<string, unknown> {
  id?: React.Key;
}

interface GridColumnDef {
  field: string;
  renderCell?: (params: Record<string, unknown>) => React.ReactNode;
  valueGetter?: (params: Record<string, unknown>) => unknown;
}

interface DataGridMockProps {
  rows?: GridRowData[];
  columns?: GridColumnDef[];
  loading?: boolean;
  components?: Record<string, React.ComponentType<Record<string, unknown>> | undefined>;
  componentsProps?: Record<string, Record<string, unknown> | undefined>;
  slots?: Record<string, React.ComponentType<Record<string, unknown>> | undefined>;
  slotProps?: Record<string, Record<string, unknown> | undefined>;
}

function toReactNode(value: unknown): React.ReactNode {
  if (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    React.isValidElement(value)
  ) {
    return value;
  }

  return String(value);
}

vi.mock('@mui/x-data-grid', () => {
  const GridToolbarStub = ({ showQuickFilter: _showQuickFilter, quickFilterProps: _quickFilterProps, ...rest }: Record<string, unknown>) =>
    React.createElement('div', {
      'data-testid': 'mock-grid-toolbar',
      ...rest,
    });

  const DataGridStub = ({
    rows = [],
    columns = [],
    loading = false,
    components = {},
    componentsProps = {},
    slots = {},
    slotProps = {},
  }: DataGridMockProps) => {
    const resolvedToolbar = slots?.toolbar ?? components.Toolbar;
    const toolbarProps = slotProps?.toolbar ?? componentsProps?.toolbar;
    const toolbarElement = resolvedToolbar
      ? React.createElement(resolvedToolbar, toolbarProps ?? {})
      : null;
    const resolvedLoadingOverlay = slots?.loadingOverlay ?? components.LoadingOverlay;
    const resolvedNoRowsOverlay = slots?.noRowsOverlay ?? components.NoRowsOverlay;

    const rowElements = rows.map((row, rowIndex) => {
      const rowKey = row.id ?? `row-${rowIndex}`;

      const cells = columns.map((column) => {
        const rawValue = row[column.field];
        const params = {
          row,
          value: rawValue,
          id: rowKey,
          field: column.field,
        };

        if (column.field === 'actions') {
          const cellContent = toReactNode(column.renderCell ? column.renderCell(params) : null);
          return React.createElement(
            'div',
            { key: `${rowKey}-actions`, 'data-testid': 'mock-row-actions' },
            cellContent
          );
        }

        const value = column.valueGetter ? column.valueGetter(params) : rawValue;
        const renderedCell = column.renderCell ? column.renderCell({ ...params, value }) : value;
        const cellContent = toReactNode(renderedCell);

        return React.createElement(
          'span',
          { key: `${rowKey}-${column.field}`, 'data-testid': `mock-cell-${column.field}` },
          cellContent
        );
      });

      const loadingNode = loading
        ? React.createElement('span', { 'data-testid': 'mock-loading' }, 'Loading')
        : null;

      return React.createElement(
        'div',
        { key: rowKey, 'data-testid': 'mock-row' },
        ...cells,
        loadingNode
      );
    });

    const overlayElement =
      loading && resolvedLoadingOverlay
        ? React.createElement(resolvedLoadingOverlay, slotProps?.loadingOverlay)
        : !loading && rows.length === 0 && resolvedNoRowsOverlay
        ? React.createElement(resolvedNoRowsOverlay, slotProps?.noRowsOverlay)
        : null;

    return React.createElement(
      'div',
      { 'data-testid': 'mock-data-grid' },
      toolbarElement,
      ...rowElements,
      overlayElement
    );
  };

  return {
    DataGrid: DataGridStub,
    GridToolbar: GridToolbarStub,
  };
});

if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = TransformStream as typeof globalThis.TransformStream;
}

// Extend expect with accessibility matchers
expect.extend(toHaveNoViolations);

let serverInstance: SetupServerApi | null = null;

beforeAll(async () => {
  const module = await import('./__tests__/mocks/server');
  serverInstance = module.server;
  serverInstance.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => serverInstance?.resetHandlers());

afterAll(() => serverInstance?.close());

const vitestGlobals = globalThis as typeof globalThis & {
  vi?: typeof vi;
};
const safeVi = vitestGlobals.vi ?? vi;

// Browser API polyfills for jsdom environment
// These are global browser APIs that don't exist in Node/jsdom

// matchMedia API (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: safeVi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: safeVi.fn(),
    removeListener: safeVi.fn(),
    addEventListener: safeVi.fn(),
    removeEventListener: safeVi.fn(),
    dispatchEvent: safeVi.fn(),
  })),
});

// localStorage API (if not already available in jsdom)
if (typeof window.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: safeVi.fn(),
    setItem: safeVi.fn(),
    removeItem: safeVi.fn(),
    clear: safeVi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

// IntersectionObserver API (used by lazy loading, infinite scroll, etc.)
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {
      return null;
    }
    disconnect() {
      return null;
    }
    unobserve() {
      return null;
    }
  } as unknown as typeof IntersectionObserver;
}

// MediaDevices API (used by camera/scanner components)
if (typeof navigator.mediaDevices === 'undefined') {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: safeVi.fn(() => Promise.resolve({
        getTracks: () => [{ stop: safeVi.fn() }]
      } as unknown as MediaStream)),
    },
  });
}
