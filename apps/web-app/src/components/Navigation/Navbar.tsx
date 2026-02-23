import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from '@my-many-books/shared-auth';
import { LanguageSelector } from './LanguageSelector';
import { AboutDialog } from '../About/AboutDialog';

export const Navbar: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [openAboutAfterMenuClose, setOpenAboutAfterMenuClose] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'books', 'accessibility']);
  const appName = t('common:app_name');
  const appShortName = t('common:app_short_name', 'MMB');
  const appLogoAlt = t('common:app_logo', 'My Many Books logo');
  const menuLabel = t('common:menu');
  const userMenuLabel = t('common:user_menu', 'User menu');
  const avatarLabel = t('common:user_avatar', 'User avatar');
  const userInitial = user?.name?.charAt(0)?.toUpperCase()
    ?? user?.surname?.charAt(0)?.toUpperCase()
    ?? user?.email?.charAt(0)?.toUpperCase()
    ?? 'U';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  const blurActiveElement = () => {
    if (typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  const handleOpenAbout = () => {
    setOpenAboutAfterMenuClose(true);
    handleMenuClose();
  };

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar
        sx={{
          px: { xs: 1.5, sm: 2 },
          minHeight: { xs: 72, sm: 76 },
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 0.5, sm: 2 }, flexGrow: 1, minWidth: 0 }}>
          <Box
            component="button"
            onClick={() => navigate('/')}
            aria-label={appName}
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              p: 0
            }}
          >
            <Box
              component="img"
              src="/brand/logo-mark-primary-128.png"
              alt={appLogoAlt}
              sx={{
                width: { xs: 52, sm: 56 },
                height: { xs: 52, sm: 56 },
                mr: 1,
                display: 'block'
              }}
            />
            <Typography
              component="span"
              sx={{
                display: { xs: 'inline', sm: 'none' },
                fontWeight: 700,
                fontSize: '1.05rem',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {appShortName}
            </Typography>
            <Typography
              variant="h6"
              component="span"
              sx={{
                display: { xs: 'none', sm: 'inline' },
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {appName}
            </Typography>
          </Box>
        </Box>

        {/* Navigation Items - Desktop */}
        <Box
          component="nav"
          sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 2 }}
          aria-label={t('accessibility:main_navigation')}
        >
          <Button
            color={location.pathname === '/' ? 'primary' : 'inherit'}
            onClick={() => navigate('/')}
          >
            {t('books:my_books')}
          </Button>
          <Button
            color={location.pathname === '/search' ? 'primary' : 'inherit'}
            onClick={() => navigate('/search')}
          >
            {t('common:search')}
          </Button>
          <Button
            color={location.pathname === '/scanner' ? 'primary' : 'inherit'}
            onClick={() => navigate('/scanner')}
          >
            {t('common:scanner')}
          </Button>
        </Box>

        {/* Language Selector */}
        <LanguageSelector />

        {/* User Menu */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: { xs: 0.25, sm: 0.5 } }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }} aria-label={avatarLabel}>
              {userInitial}
            </Avatar>

            <IconButton
              onClick={handleMenuOpen}
              aria-label={userMenuLabel}
              aria-haspopup="menu"
              aria-expanded={anchorEl ? 'true' : undefined}
              aria-controls={anchorEl ? 'navbar-user-menu' : undefined}
            >
              <MoreVertIcon />
            </IconButton>

            <Menu
              id="navbar-user-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              TransitionProps={{
                onExited: () => {
                  if (openAboutAfterMenuClose) {
                    blurActiveElement();
                    setAboutOpen(true);
                    setOpenAboutAfterMenuClose(false);
                  }
                },
              }}
            >
              {/* Mobile Navigation Items */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <MenuItem onClick={() => handleNavigation('/')}>{t('books:my_books')}</MenuItem>
                <MenuItem onClick={() => handleNavigation('/search')}>{t('common:search')}</MenuItem>
                <MenuItem onClick={() => handleNavigation('/scanner')}>{t('common:scanner')}</MenuItem>
              </Box>

              <MenuItem onClick={handleOpenAbout}>{t('common:about')}</MenuItem>
              <MenuItem onClick={handleLogout}>{t('common:sign_out')}</MenuItem>
            </Menu>

            <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
          </Box>
        )}

        {/* Mobile Menu Icon (when no user) */}
        {!user && (
          <IconButton
            onClick={handleMenuOpen}
            sx={{ display: { xs: 'flex', md: 'none' } }}
            aria-label={menuLabel}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
