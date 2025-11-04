import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  AppBar,
  IconButton,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Book as BookIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminErrorBoundary } from '../../components/ErrorBoundary';

const drawerWidth = 240;

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  label: string;
  icon: React.ReactElement;
  path: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems: MenuItem[] = [
    {
      label: t('pages:admin.menu.dashboard', 'Dashboard'),
      icon: <DashboardIcon />,
      path: '/admin'
    },
    {
      label: t('pages:admin.menu.users', 'Users'),
      icon: <PeopleIcon />,
      path: '/admin/users'
    },
    {
      label: t('pages:admin.menu.books', 'Books'),
      icon: <BookIcon />,
      path: '/admin/books'
    },
    {
      label: t('pages:admin.menu.settings', 'Settings'),
      icon: <SettingsIcon />,
      path: '/admin/settings'
    }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
            aria-label={t('pages:admin.back_to_app', 'Back to application')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {t('pages:admin.title', 'Admin Panel')}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {t('pages:admin.sidebar_title', 'Administration')}
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          minHeight: '100vh'
        }}
      >
        <Toolbar /> {/* Spacing for AppBar */}
        <AdminErrorBoundary>
          {children}
        </AdminErrorBoundary>
      </Box>
    </Box>
  );
};
