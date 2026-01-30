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
  Divider,
  Collapse
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BookIcon from '@mui/icons-material/Book';
import WebhookIcon from '@mui/icons-material/Webhook';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminErrorBoundary } from '../../components/ErrorBoundary';

const drawerWidth = 240;

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuChildItem {
  label: string;
  path: string;
}

interface MenuItem {
  label: string;
  icon: React.ReactElement;
  path: string;
  children?: MenuChildItem[];
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
      label: t('pages:admin.menu.hooks', 'Hooks'),
      icon: <WebhookIcon />,
      path: '/admin/hooks'
    },
    {
      label: t('pages:admin.menu.mobile_hooks', 'Mobile Hooks'),
      icon: <PhoneIphoneIcon />,
      path: '/admin/mobile-hooks',
      children: [
        {
          label: t('pages:admin.menu.mobile_hooks_dashboard', 'Dashboard'),
          path: '/admin/mobile-hooks/dashboard',
        },
        {
          label: t('pages:admin.menu.mobile_hooks_configuration', 'Configuration'),
          path: '/admin/mobile-hooks/configuration',
        },
        {
          label: t('pages:admin.menu.mobile_hooks_analytics', 'Analytics'),
          path: '/admin/mobile-hooks/analytics',
        },
        {
          label: t('pages:admin.menu.mobile_hooks_testing', 'Testing'),
          path: '/admin/mobile-hooks/testing',
        },
      ],
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
        <Box component="nav" aria-label="Admin navigation">
          <List>
            {menuItems.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              const parentSelected = hasChildren
                ? location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                : location.pathname === item.path;

              if (!hasChildren) {
                return (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={parentSelected}
                      onClick={() => navigate(item.path)}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                );
              }

              const open = parentSelected;

              return (
                <React.Fragment key={item.path}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={parentSelected}
                      onClick={() => {
                        navigate(item.path);
                      }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} />
                      {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </ListItemButton>
                  </ListItem>
                  <Collapse
                    in={open}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding>
                      {(item.children ?? []).map((child) => (
                        <ListItem key={child.path} disablePadding>
                          <ListItemButton
                            selected={location.pathname === child.path}
                            onClick={() => navigate(child.path)}
                            sx={{ pl: 4 }}
                          >
                            <ListItemText primary={child.label} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              );
            })}
          </List>
        </Box>
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
