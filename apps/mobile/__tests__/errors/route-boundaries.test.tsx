import React from 'react';
import { act } from 'react-test-renderer';
import renderer from 'react-test-renderer';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';

jest.mock('@/services/errors/ErrorTrackingService', () => ({
  errorTrackingService: {
    trackError: jest.fn(),
    recordUserAction: jest.fn(),
    trackErrorRecovery: jest.fn(),
  },
}));

function ThrowingComponent(): React.ReactElement {
  throw new Error('Test render error');
}

describe('Route-level error boundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders a fallback when the wrapped screen throws', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <PageErrorBoundary screenName="TestScreen">
          <ThrowingComponent />
        </PageErrorBoundary>,
      );
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('does not propagate the error outside the boundary', () => {
    expect(() => {
      act(() => {
        renderer.create(
          <PageErrorBoundary screenName="TestScreen">
            <ThrowingComponent />
          </PageErrorBoundary>,
        );
      });
    }).not.toThrow();
  });
});
