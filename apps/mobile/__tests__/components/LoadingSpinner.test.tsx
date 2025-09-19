import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingSpinner } from '@/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default message', () => {
    const { getByText, getByTestId } = render(<LoadingSpinner />);

    expect(getByTestId('loading')).toBeTruthy();
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should render with custom message', () => {
    const customMessage = 'Fetching books...';
    const { getByText, getByTestId } = render(
      <LoadingSpinner message={customMessage} />
    );

    expect(getByTestId('loading')).toBeTruthy();
    expect(getByText(customMessage)).toBeTruthy();
  });

  it('should handle empty message', () => {
    const { getByText, getByTestId } = render(
      <LoadingSpinner message="" />
    );

    expect(getByTestId('loading')).toBeTruthy();
    expect(getByText('')).toBeTruthy();
  });

  it('should handle long messages', () => {
    const longMessage = 'This is a very long loading message that should display properly in the loading spinner component';
    const { getByText } = render(
      <LoadingSpinner message={longMessage} />
    );

    expect(getByText(longMessage)).toBeTruthy();
  });
});