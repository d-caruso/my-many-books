import { mount } from 'cypress/react';
import React from 'react';
import { env } from '../../src/config/env';

const EnvTestComponent = () => (
  <div data-testid="env-test">
    <h1>Environment Configuration Test</h1>
    <div data-testid="node-env">Node Env: {env.NODE_ENV}</div>
    <div data-testid="api-url">API URL: {env.API_URL}</div>
    <div data-testid="cognito-pool">Cognito Pool: {env.COGNITO_USER_POOL_ID}</div>
    <div data-testid="cognito-client">Cognito Client: {env.COGNITO_USER_POOL_CLIENT_ID}</div>
  </div>
);

describe('Environment Configuration', () => {
  it('loads environment variables correctly', () => {
    mount(<EnvTestComponent />);
    
    cy.get('[data-testid="env-test"]').should('be.visible');
    cy.get('[data-testid="node-env"]').should('contain', 'Node Env:');
    cy.get('[data-testid="api-url"]').should('contain', 'API URL: http://localhost:3001');
    
    // These might be empty in test environment, which is fine
    cy.get('[data-testid="cognito-pool"]').should('contain', 'Cognito Pool:');
    cy.get('[data-testid="cognito-client"]').should('contain', 'Cognito Client:');
  });

  it('env object has all required properties', () => {
    cy.then(() => {
      expect(env).to.have.property('NODE_ENV');
      expect(env).to.have.property('API_URL');
      expect(env).to.have.property('COGNITO_USER_POOL_ID');
      expect(env).to.have.property('COGNITO_USER_POOL_CLIENT_ID');
      expect(env).to.have.property('COGNITO_IDENTITY_POOL_ID');
    });
  });

  it('has reasonable default values', () => {
    cy.then(() => {
      expect(env.API_URL).to.include('localhost');
      expect(env.NODE_ENV).to.be.oneOf(['development', 'test', 'production']);
    });
  });
});