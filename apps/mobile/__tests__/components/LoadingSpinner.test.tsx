import React from 'react';

// Industry standard approach: Use react-test-renderer for React Native components
// when Testing Library has compatibility issues
import renderer from 'react-test-renderer';
import { LoadingSpinner } from '@/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default message', () => {
    const tree = renderer.create(<LoadingSpinner />);
    const instance = tree.getInstance();
    
    expect(tree.toJSON()).toBeTruthy();
    
    // Check for the presence of key elements
    const testInstance = tree.root;
    const textElements = testInstance.findAllByType('RCTText');
    expect(textElements.length).toBeGreaterThan(0);
    
    // Find the text that contains 'Loading...'
    const loadingText = textElements.find(element => 
      element.props.children === 'Loading...'
    );
    expect(loadingText).toBeTruthy();
  });

  it('should render with custom message', () => {
    const customMessage = 'Fetching books...';
    const tree = renderer.create(<LoadingSpinner message={customMessage} />);
    
    expect(tree.toJSON()).toBeTruthy();
    
    const testInstance = tree.root;
    const textElements = testInstance.findAllByType('RCTText');
    
    // Find the text that contains our custom message
    const customText = textElements.find(element => 
      element.props.children === customMessage
    );
    expect(customText).toBeTruthy();
  });

  it('should handle empty message', () => {
    const tree = renderer.create(<LoadingSpinner message="" />);
    
    expect(tree.toJSON()).toBeTruthy();
    
    const testInstance = tree.root;
    const textElements = testInstance.findAllByType('RCTText');
    
    // Find the text that contains empty string
    const emptyText = textElements.find(element => 
      element.props.children === ''
    );
    expect(emptyText).toBeTruthy();
  });

  it('should handle long messages', () => {
    const longMessage = 'This is a very long loading message that should display properly in the loading spinner component';
    const tree = renderer.create(<LoadingSpinner message={longMessage} />);
    
    expect(tree.toJSON()).toBeTruthy();
    
    const testInstance = tree.root;
    const textElements = testInstance.findAllByType('RCTText');
    
    // Find the text that contains our long message
    const longText = textElements.find(element => 
      element.props.children === longMessage
    );
    expect(longText).toBeTruthy();
  });

  it('should render ActivityIndicator component', () => {
    const tree = renderer.create(<LoadingSpinner />);
    
    expect(tree.toJSON()).toBeTruthy();
    
    const testInstance = tree.root;
    
    // Check for ActivityIndicator
    const activityIndicators = testInstance.findAllByType('RCTActivityIndicatorView');
    expect(activityIndicators.length).toBe(1);
    
    // Check for testID
    const activityIndicator = activityIndicators[0];
    expect(activityIndicator.props.testID).toBe('loading');
  });

  it('should have proper container structure', () => {
    const tree = renderer.create(<LoadingSpinner />);
    
    expect(tree.toJSON()).toBeTruthy();
    
    const testInstance = tree.root;
    
    // Check for container View
    const views = testInstance.findAllByType('RCTView');
    expect(views.length).toBeGreaterThan(0);
    
    // Check that we have both ActivityIndicator and Text
    const activityIndicators = testInstance.findAllByType('RCTActivityIndicatorView');
    const textElements = testInstance.findAllByType('RCTText');
    
    expect(activityIndicators.length).toBe(1);
    expect(textElements.length).toBeGreaterThan(0);
  });
});