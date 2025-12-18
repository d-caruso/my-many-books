import React from 'react';
import { render, screen } from '@testing-library/react';
import { MenuItem } from '@mui/material';
import { ResponsiveSelect } from '../../../components/UI/ResponsiveSelect';

describe('ResponsiveSelect', () => {
  const defaultOptions = [
    <MenuItem value="" key="empty">Select an option</MenuItem>,
    <MenuItem value="option1" key="option1">Option 1</MenuItem>,
    <MenuItem value="option2" key="option2">Option 2</MenuItem>,
  ];

  test('renders with label', () => {
    render(
      <ResponsiveSelect label="Test Label" id="test-select" defaultValue="">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  test('renders required indicator when isRequired is true', () => {
    render(
      <ResponsiveSelect label="Required Field" isRequired defaultValue="">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('does not render required indicator when isRequired is false', () => {
    render(
      <ResponsiveSelect label="Optional Field" isRequired={false} defaultValue="">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  test('renders error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(
      <ResponsiveSelect error={errorMessage} defaultValue="">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  test('renders helper text when provided and no error', () => {
    const helperText = 'Choose the best option';
    render(
      <ResponsiveSelect helperText={helperText} defaultValue="">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  test('does not render helper text when error is present', () => {
    const helperText = 'Choose the best option';
    const errorMessage = 'This field is required';
    render(
      <ResponsiveSelect helperText={helperText} error={errorMessage} defaultValue="">
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText(helperText)).not.toBeInTheDocument();
  });

  test('passes through additional props to select component', () => {
    render(
      <ResponsiveSelect 
        id="test-select" 
        defaultValue="option1"
        data-testid="custom-select"
        aria-label="Test Select"
      >
        {defaultOptions}
      </ResponsiveSelect>
    );
    
    const select = screen.getByTestId('custom-select');
    expect(select).toHaveAttribute('aria-label', 'Test Select');
    expect(select).toHaveTextContent('Option 1');
  });
});
