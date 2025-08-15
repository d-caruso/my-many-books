import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveSelect } from '../../../components/UI/ResponsiveSelect';

describe('ResponsiveSelect', () => {
  const defaultOptions = (
    <>
      <option value="">Select an option</option>
      <option value="option1">Option 1</option>
      <option value="option2">Option 2</option>
    </>
  );

  test('renders select element with children', () => {
    render(
      <ResponsiveSelect>
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Select an option')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  test('renders with label', () => {
    render(
      <ResponsiveSelect label="Test Label" id="test-select">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  test('renders required indicator when isRequired is true', () => {
    render(
      <ResponsiveSelect label="Required Field" isRequired>
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('does not render required indicator when isRequired is false', () => {
    render(
      <ResponsiveSelect label="Optional Field" isRequired={false}>
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  test('renders error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(
      <ResponsiveSelect error={errorMessage}>
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('renders helper text when provided and no error', () => {
    const helperText = 'Choose the best option';
    render(
      <ResponsiveSelect helperText={helperText}>
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  test('does not render helper text when error is present', () => {
    const helperText = 'Choose the best option';
    const errorMessage = 'This field is required';
    render(
      <ResponsiveSelect helperText={helperText} error={errorMessage}>
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText(helperText)).not.toBeInTheDocument();
  });

  test('applies error styles when error prop is provided', () => {
    render(
      <ResponsiveSelect error="Error message">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-semantic-error', 'bg-red-50');
  });

  test('applies normal styles when no error', () => {
    render(
      <ResponsiveSelect>
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-secondary-300');
  });

  test('passes through additional props to select element', () => {
    render(
      <ResponsiveSelect 
        id="test-select" 
        name="testName" 
        defaultValue="option1"
        data-testid="custom-select"
      >
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('id', 'test-select');
    expect(select).toHaveAttribute('name', 'testName');
    expect(select).toHaveAttribute('data-testid', 'custom-select');
    expect(select).toHaveValue('option1');
  });

  test('applies custom className along with base classes', () => {
    render(
      <ResponsiveSelect className="custom-class">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-class');
    expect(select).toHaveClass('w-full'); // base class
  });

  test('renders dropdown arrow icon', () => {
    render(
      <ResponsiveSelect>
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  test('associates label with select element when id is provided', () => {
    render(
      <ResponsiveSelect id="test-select" label="Test Label">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    const label = screen.getByText('Test Label');
    const select = screen.getByRole('combobox');
    
    expect(label).toHaveAttribute('for', 'test-select');
    expect(select).toHaveAttribute('id', 'test-select');
  });
});