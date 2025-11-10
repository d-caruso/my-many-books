import React from 'react';
import renderer from 'react-test-renderer';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Mock React Native Paper components
jest.mock('react-native-paper', () => {
  const RN = jest.requireActual('react-native');
  return {
    ActivityIndicator: RN.ActivityIndicator,
    Text: RN.Text,
  };
});

// Mock the translation function to return actual translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'loading': 'Loading...',
      };
      return translations[key] || key;
    },
  }),
}));

describe('LoadingSpinner', () => {
  it('should render with default message', () => {
    const tree = renderer.create(<LoadingSpinner />);
    const testInstance = tree.root;

    const textElement = testInstance.findByType(require('react-native').Text);
    expect(textElement.props.children).toBe('Loading...');

    const activityIndicator = testInstance.findByProps({ testID: 'loading' });
    expect(activityIndicator).toBeTruthy();
  });

  it('should render with custom message', () => {
    const customMessage = 'Fetching books...';
    const tree = renderer.create(<LoadingSpinner message={customMessage} />);
    const testInstance = tree.root;

    const textElement = testInstance.findByType(require('react-native').Text);
    expect(textElement.props.children).toBe(customMessage);
  });

  it('should handle empty message', () => {
    const tree = renderer.create(<LoadingSpinner message="" />);
    const testInstance = tree.root;

    const textElement = testInstance.findByType(require('react-native').Text);
    expect(textElement.props.children).toBe('');
  });

  it('should handle long messages', () => {
    const longMessage = 'This is a very long loading message that should display properly in the loading spinner component';
    const tree = renderer.create(<LoadingSpinner message={longMessage} />);
    const testInstance = tree.root;

    const textElement = testInstance.findByType(require('react-native').Text);
    expect(textElement.props.children).toBe(longMessage);
  });

  it('should render ActivityIndicator component', () => {
    const tree = renderer.create(<LoadingSpinner />);
    const testInstance = tree.root;

    const activityIndicator = testInstance.findByProps({ testID: 'loading' });
    expect(activityIndicator).toBeTruthy();
  });

  it('should have proper container structure', () => {
    const tree = renderer.create(<LoadingSpinner />);
    const testInstance = tree.root;

    // Check for container View
    const containerView = testInstance.findByType(require('react-native').View);
    expect(containerView).toBeTruthy();

    // Check if the loading indicator is there
    const activityIndicator = testInstance.findByProps({ testID: 'loading' });
    expect(activityIndicator).toBeTruthy();
  });
});
