import React from 'react';
import renderer from 'react-test-renderer';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Mock React Native first
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

// Mock React Native Paper components
jest.mock('react-native-paper', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Text: 'Text',
}));

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
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<LoadingSpinner />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    const textElement = testInstance.findByType(require('react-native').Text);
    expect(textElement.props.children).toBe('Loading...');

    const activityIndicator = testInstance.findByProps({ testID: 'loading' });
    expect(activityIndicator).toBeTruthy();
  });

  it('should render with custom message', () => {
    const customMessage = 'Fetching books...';
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<LoadingSpinner message={customMessage} />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    const textElement = testInstance.findByType(require('react-native').Text);
    expect(textElement.props.children).toBe(customMessage);
  });

  it('should handle empty message', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<LoadingSpinner message="" />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    // Empty string falls back to default 'Loading...' translation
    const textElement = testInstance.findByType(require('react-native').Text);
    expect(textElement.props.children).toBe('Loading...');
  });

  it('should handle long messages', () => {
    const longMessage = 'This is a very long loading message that should display properly in the loading spinner component';
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<LoadingSpinner message={longMessage} />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    const textElement = testInstance.findByType(require('react-native').Text);
    expect(textElement.props.children).toBe(longMessage);
  });

  it('should render ActivityIndicator component', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<LoadingSpinner />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    const activityIndicator = testInstance.findByProps({ testID: 'loading' });
    expect(activityIndicator).toBeTruthy();
  });

  it('should have proper container structure', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<LoadingSpinner />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    // Check for container View
    const containerView = testInstance.findByType(require('react-native').View);
    expect(containerView).toBeTruthy();

    // Check if the loading indicator is there
    const activityIndicator = testInstance.findByProps({ testID: 'loading' });
    expect(activityIndicator).toBeTruthy();
  });
});
