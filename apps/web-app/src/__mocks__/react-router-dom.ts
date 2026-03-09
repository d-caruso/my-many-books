import React from 'react';
import { vi } from 'vitest';

export const BrowserRouter = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'router' }, children);

export const Routes = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'routes' }, children);

export const Route = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'route' }, children);

export const Navigate = () => React.createElement('div', { 'data-testid': 'navigate' });

export const Link = ({ children, to, ...props }: { children?: React.ReactNode; to: string; [key: string]: unknown }) =>
  React.createElement('a', { href: to, ...props }, children);

export const useLocation = () => ({ pathname: '/' });

export const useNavigate = () => vi.fn();

export const useParams = () => ({});
