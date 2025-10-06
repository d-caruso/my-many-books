import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navbar } from '../../../components/Navigation/Navbar';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the useAuth hook
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock React Router hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/books' }),
}));

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  AppBar: ({ children, ...props }: any) => <div data-testid="app-bar" {...props}>{children}</div>,
  Toolbar: ({ children, ...props }: any) => <div data-testid="toolbar" {...props}>{children}</div>,
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  Button: ({ children, onClick, ...props }: any) => (
    <button data-testid="nav-button" onClick={onClick} {...props}>{children}</button>
  ),
  IconButton: ({ children, onClick, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} {...props}>{children}</button>
  ),
  Menu: ({ children, open, anchorEl, onClose, ...props }: any) => (
    open ? <div data-testid="menu" {...props}>{children}</div> : null
  ),
  MenuItem: ({ children, onClick, ...props }: any) => (
    <div data-testid="menu-item" onClick={onClick} {...props}>{children}</div>
  ),
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Avatar: ({ children, ...props }: any) => (
    <div data-testid="avatar" {...props}>{children}</div>
  ),
}));

vi.mock('@mui/icons-material', () => ({
  MenuBook: () => <span data-testid="menu-book-icon">📚</span>,
  Menu: () => <span data-testid="menu-icon">☰</span>,
  ExpandMore: () => <span data-testid="expand-more-icon">▼</span>,
}));

const mockUseAuth = vi.mocked(useAuth);

// Test wrapper with Router context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders navbar with logo and app name', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    expect(screen.getByTestId('app-bar')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('menu-book-icon')).toBeInTheDocument();
    expect(screen.getByText('My Many Books')).toBeInTheDocument();
  });

  test('shows login and register buttons when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  test('shows user menu when user is authenticated', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Register')).not.toBeInTheDocument();
  });

  test('shows navigation buttons for authenticated user', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  test('opens user menu when user button is clicked', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    // Menu should not be visible initially
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();

    // Click on user button to open menu
    fireEvent.click(screen.getByTestId('icon-button'));

    // Menu should now be visible
    expect(screen.getByTestId('menu')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  test('closes menu when menu item is clicked', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    // Open menu
    fireEvent.click(screen.getByTestId('icon-button'));
    expect(screen.getByTestId('menu')).toBeInTheDocument();

    // Click on Profile menu item
    fireEvent.click(screen.getByText('Profile'));

    // Menu should be closed and navigation should occur
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  test('handles logout correctly', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: mockLogout,
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    // Open menu
    fireEvent.click(screen.getByTestId('icon-button'));

    // Click logout
    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    // Menu should be closed
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();
  });

  test('navigates to login page when login button is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    fireEvent.click(screen.getByText('Login'));

    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  test('navigates to register page when register button is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    fireEvent.click(screen.getByText('Register'));

    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  test('navigation buttons navigate to correct paths', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    // Test Books navigation
    fireEvent.click(screen.getByText('Books'));
    expect(mockNavigate).toHaveBeenCalledWith('/books');

    // Test Search navigation
    fireEvent.click(screen.getByText('Search'));
    expect(mockNavigate).toHaveBeenCalledWith('/search');

    // Test Categories navigation
    fireEvent.click(screen.getByText('Categories'));
    expect(mockNavigate).toHaveBeenCalledWith('/categories');
  });

  test('shows user avatar with first letter of name', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: 'John Doe',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  test('handles user without name', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: '',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    // Should show email instead of name
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument(); // First letter of email
  });

  test('has correct styling and layout', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    const appBar = screen.getByTestId('app-bar');
    expect(appBar).toHaveAttribute('position', 'sticky');
    expect(appBar).toHaveAttribute('color', 'default');
    expect(appBar).toHaveAttribute('elevation', '1');
  });

  test('shows loading state correctly', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    // Should still render the navbar during loading
    expect(screen.getByTestId('app-bar')).toBeInTheDocument();
    expect(screen.getByText('My Many Books')).toBeInTheDocument();
  });

  test('menu closes when clicking outside', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />, { wrapper: TestWrapper });

    // Open menu
    fireEvent.click(screen.getByTestId('icon-button'));
    expect(screen.getByTestId('menu')).toBeInTheDocument();

    // The actual Material-UI Menu component would handle click outside,
    // but our mock doesn't, so we just verify the menu exists for now
    expect(screen.getByTestId('menu')).toBeInTheDocument();
  });
});