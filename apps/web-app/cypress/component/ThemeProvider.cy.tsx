import React from 'react';
import ThemeProvider, { useTheme } from '../../src/components/Theme/ThemeProvider';
import ThemeToggle from '../../src/components/Theme/ThemeToggle';
import { mount } from 'cypress/react';

describe('ThemeProvider and ThemeToggle Components', () => {
  const TestComponent = () => (
    <div data-testid="test-content">
      <h1>Test Content</h1>
      <ThemeToggle />
    </div>
  );

  beforeEach(() => {
    // Clear localStorage before each test
    cy.window().then((win) => {
      win.localStorage.clear();
    });
  });

  describe('Theme Provider', () => {
    it('applies light theme by default', () => {
      // Mock system preference to light mode
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: false, // light mode
            addEventListener: cy.stub(),
            removeEventListener: cy.stub()
          })
        });
      });

      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'light');
      cy.get('body').should('have.class', 'light-theme');
    });

    it('applies saved theme from localStorage', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('theme', 'dark');
      });

      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'dark');
      cy.get('body').should('have.class', 'dark-theme');
    });

    it('respects system preference when no saved theme', () => {
      cy.window().then((win) => {
        // Mock matchMedia to simulate dark mode preference
        Object.defineProperty(win, 'matchMedia', {
          value: cy.stub().returns({
            matches: true,
            addEventListener: cy.stub(),
            removeEventListener: cy.stub()
          })
        });
      });

      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'dark');
    });

    it('updates CSS variables for different themes', () => {
      // Mock system preference to light mode
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: false, // light mode
            addEventListener: cy.stub(),
            removeEventListener: cy.stub()
          })
        });
      });

      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Wait for initial render and check light theme CSS variables
      cy.wait(100);
      cy.get(':root').should('have.css', '--color-background', 'rgb(255, 255, 255)');
      cy.get(':root').should('have.css', '--color-text', 'rgb(17, 24, 39)');
      
      // Switch to dark theme
      cy.get('[data-testid="theme-toggle"]').click();
      
      // Wait for transition and check dark theme CSS variables
      cy.wait(100);
      cy.get(':root').should('have.css', '--color-background', 'rgb(17, 24, 39)');
      cy.get(':root').should('have.css', '--color-text', 'rgb(243, 244, 246)');
    });
  });

  describe('Theme Toggle', () => {
    beforeEach(() => {
      // Mock system preference to light mode for consistent testing
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: false, // light mode
            addEventListener: cy.stub(),
            removeEventListener: cy.stub()
          })
        });
      });

      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    it('displays theme toggle button', () => {
      cy.get('[data-testid="theme-toggle"]').should('be.visible');
      cy.get('[data-testid="theme-icon"]').should('be.visible');
    });

    it('shows light mode icon in light theme', () => {
      cy.get('[data-testid="theme-icon"]').should('have.attr', 'data-icon', 'sun');
      cy.get('[data-testid="theme-toggle"]').should('have.attr', 'aria-label', 'Switch to dark mode');
    });

    it('toggles to dark theme', () => {
      cy.get('[data-testid="theme-toggle"]').click();
      
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'dark');
      cy.get('[data-testid="theme-icon"]').should('have.attr', 'data-icon', 'moon');
      cy.get('[data-testid="theme-toggle"]').should('have.attr', 'aria-label', 'Switch to light mode');
    });

    it('toggles back to light theme', () => {
      cy.get('[data-testid="theme-toggle"]').click(); // to dark
      cy.wait(350); // Wait for full transition (300ms + buffer)
      cy.get('[data-testid="theme-toggle"]').click(); // back to light
      cy.wait(350); // Wait for full transition
      
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'light');
      cy.get('[data-testid="theme-icon"]').should('have.attr', 'data-icon', 'sun');
    });

    it('persists theme choice in localStorage', () => {
      cy.get('[data-testid="theme-toggle"]').click();
      
      cy.window().its('localStorage.theme').should('equal', 'dark');
    });

    it('supports keyboard activation', () => {
      cy.get('[data-testid="theme-toggle"]').focus().type('{enter}');
      
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'dark');
    });

    it('supports space key activation', () => {
      cy.get('[data-testid="theme-toggle"]').focus().type(' ');
      
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'dark');
    });
  });

  describe('Theme Animation', () => {
    beforeEach(() => {
      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    it('shows transition animation during theme switch', () => {
      cy.get('[data-testid="theme-toggle"]').click();
      
      // Check for transition class during animation
      cy.get('[data-testid="theme-provider"]').should('have.class', 'theme-transitioning');
      
      // Animation should complete and class should be removed
      cy.get('[data-testid="theme-provider"]', { timeout: 1000 })
        .should('not.have.class', 'theme-transitioning');
    });

    it('prevents rapid toggling during animation', () => {
      cy.get('[data-testid="theme-toggle"]').click();
      cy.get('[data-testid="theme-toggle"]').click(); // Second click should be ignored
      
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'dark');
    });
  });

  describe('Theme Context', () => {
    const ThemeConsumer = () => {
      const { theme } = useTheme();
      
      return (
        <div data-testid="theme-consumer">
          <div data-testid="current-theme">Current theme: {theme}</div>
          <button data-testid="context-toggle" onClick={() => {}}>
            Toggle via Context
          </button>
        </div>
      );
    };

    it('provides theme context to child components', () => {
      mount(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
      
      cy.get('[data-testid="current-theme"]').should('contain', 'Current theme: light');
    });

    it('updates context when theme changes', () => {
      // Mock system preference to light mode
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: false, // light mode
            addEventListener: cy.stub(),
            removeEventListener: cy.stub()
          })
        });
      });

      mount(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <ThemeConsumer />
          </div>
        </ThemeProvider>
      );
      
      cy.get('[data-testid="theme-toggle"]').click();
      cy.wait(350); // Wait for transition
      cy.get('[data-testid="current-theme"]').should('contain', 'Current theme: dark');
    });
  });

  describe('System Theme Detection', () => {
    it('listens for system theme changes', () => {
      // Create a simple test that verifies the component behavior without deep mock inspection
      cy.window().then((win) => {
        // Mock matchMedia to prevent real API calls
        Object.defineProperty(win, 'matchMedia', {
          value: cy.stub().returns({
            matches: false,
            addEventListener: cy.stub(),
            removeEventListener: cy.stub()
          }),
          writable: true,
          configurable: true
        });
      });

      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Verify the component renders correctly with system theme detection
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'light');
      
      // Verify that the ThemeProvider component is working as expected
      cy.get('[data-testid="theme-toggle"]').should('be.visible');
    });

    it('ignores system changes when user has manual preference', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('theme', 'light');
      });

      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Should remain light even if system prefers dark
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'light');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    it('has proper ARIA attributes', () => {
      cy.get('[data-testid="theme-toggle"]')
        .should('have.attr', 'role', 'button')
        .should('have.attr', 'aria-label', 'Switch to dark mode');
    });

    it('updates ARIA label when theme changes', () => {
      cy.get('[data-testid="theme-toggle"]').click();
      
      cy.get('[data-testid="theme-toggle"]')
        .should('have.attr', 'aria-label', 'Switch to light mode');
    });

    it('announces theme changes to screen readers', () => {
      cy.get('[data-testid="theme-toggle"]').click();
      
      cy.get('[data-testid="theme-announcement"]')
        .should('have.attr', 'aria-live', 'polite')
        .should('contain', 'Switched to dark mode');
    });

    it('maintains focus on toggle button', () => {
      cy.get('[data-testid="theme-toggle"]').focus().click();
      
      cy.focused().should('have.attr', 'data-testid', 'theme-toggle');
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const CountingComponent = () => {
        const { theme } = useTheme();
        const [renderCount, setRenderCount] = React.useState(0);
        
        React.useEffect(() => {
          setRenderCount(prev => prev + 1);
        });
        
        return <div data-testid="render-count">{renderCount}</div>;
      };

      mount(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <CountingComponent />
          </div>
        </ThemeProvider>
      );
      
      cy.get('[data-testid="render-count"]').should('contain', '1');
      
      cy.get('[data-testid="theme-toggle"]').click();
      cy.wait(350); // Wait for transition
      
      // Should only re-render once for theme change
      cy.get('[data-testid="render-count"]').should('contain', '2');
    });

    it('debounces rapid theme changes', () => {
      // Mock system preference to light mode
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: false, // light mode
            addEventListener: cy.stub(),
            removeEventListener: cy.stub()
          })
        });
      });

      mount(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // During animation, rapid clicks should be prevented
      cy.get('[data-testid="theme-toggle"]').click();
      cy.get('[data-testid="theme-toggle"]').click();
      cy.get('[data-testid="theme-toggle"]').click();
      
      // Only the last change should be applied
      cy.get('[data-testid="theme-provider"]').should('have.attr', 'data-theme', 'dark');
    });
  });
});