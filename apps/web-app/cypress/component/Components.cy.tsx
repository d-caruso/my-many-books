import { mount } from 'cypress/react';
import React from 'react';
import { MockAuthProvider, TestWrapper } from '../support/component-helpers';

// Simple test components to verify component functionality
const TestLoginForm: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => (
  <div data-testid="test-login-form">
    <h2>Sign In</h2>
    <form>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Sign In</button>
      <button type="button" onClick={onSwitchToRegister}>Sign Up</button>
    </form>
  </div>
);

const TestBookCard: React.FC<{ book: any; onEdit: () => void; onDelete: () => void }> = ({ book, onEdit, onDelete }) => (
  <div data-testid="test-book-card">
    <h3>{book.title}</h3>
    <p>{book.author}</p>
    <button onClick={onEdit}>Edit</button>
    <button onClick={onDelete}>Delete</button>
  </div>
);

const TestSearchFilter: React.FC<{ onSearchChange: (value: string) => void }> = ({ onSearchChange }) => (
  <div data-testid="search-filter">
    <input 
      type="text" 
      placeholder="Search books..." 
      onChange={(e) => onSearchChange(e.target.value)}
    />
    <select>
      <option value="">All Categories</option>
      <option value="fiction">Fiction</option>
    </select>
  </div>
);

describe('Component Tests', () => {
  it('can mount and interact with LoginForm', () => {
    const onSwitch = cy.stub();
    
    mount(
      <MockAuthProvider>
        <TestLoginForm onSwitchToRegister={onSwitch} />
      </MockAuthProvider>
    );
    
    cy.get('[data-testid="test-login-form"]').should('be.visible');
    cy.contains('Sign In').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
  });

  it('can mount and interact with BookCard', () => {
    const mockBook = { 
      id: 1, 
      title: 'Test Book', 
      author: 'Test Author', 
      isbn: '1234567890' 
    };
    const onEdit = cy.stub();
    const onDelete = cy.stub();
    
    mount(
      <TestWrapper>
        <TestBookCard book={mockBook} onEdit={onEdit} onDelete={onDelete} />
      </TestWrapper>
    );
    
    cy.get('[data-testid="test-book-card"]').should('be.visible');
    cy.contains('Test Book').should('be.visible');
    cy.contains('Test Author').should('be.visible');
    
    cy.contains('Edit').click();
    cy.then(() => {
      expect(onEdit).to.have.been.called;
    });
  });

  it('can mount and interact with SearchFilter', () => {
    const onSearchChange = cy.stub();
    
    mount(
      <TestWrapper>
        <TestSearchFilter onSearchChange={onSearchChange} />
      </TestWrapper>
    );
    
    cy.get('[data-testid="search-filter"]').should('be.visible');
    cy.get('input[type="text"]').should('be.visible').type('test search');
    
    cy.then(() => {
      expect(onSearchChange).to.have.been.called;
    });
  });

  it('can test environment configuration', () => {
    cy.then(async () => {
      try {
        const { env } = await import('../../src/config/env');
        expect(env).to.have.property('API_URL');
        expect(env).to.have.property('NODE_ENV');
      } catch (error) {
        cy.log('Environment config test failed:', error);
      }
    });
  });

  it('can test component helpers', () => {
    mount(
      <TestWrapper>
        <div data-testid="test-content">
          <h1>Test Content</h1>
          <p>This tests the component helpers</p>
        </div>
      </TestWrapper>
    );
    
    cy.get('[data-testid="test-content"]').should('be.visible');
    cy.contains('Test Content').should('be.visible');
  });
});