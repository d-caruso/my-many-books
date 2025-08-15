import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { 
  MenuBook as MenuBookIcon, 
  Menu as MenuIcon, 
  ExpandMore as ExpandMoreIcon 
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
          <MenuBookIcon sx={{ mr: 1, fontSize: 32 }} color="primary" />
          <Typography 
            variant="h6" 
            component="button"
            onClick={() => navigate('/')}
            sx={{ 
              textDecoration: 'none', 
              color: 'inherit',
              fontWeight: 'bold',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            My Many Books
          </Typography>
        </Box>

        {/* Navigation Items - Desktop */}
        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 2 }}>
          <Button 
            color={location.pathname === '/' ? 'primary' : 'inherit'}
            onClick={() => navigate('/')}
          >
            My Books
          </Button>
          <Button 
            color={location.pathname === '/search' ? 'primary' : 'inherit'}
            onClick={() => navigate('/search')}
          >
            Search
          </Button>
          <Button 
            color={location.pathname === '/scanner' ? 'primary' : 'inherit'}
            onClick={() => navigate('/scanner')}
          >
            Scanner
          </Button>
        </Box>

        {/* User Menu */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              onClick={handleMenuOpen}
              startIcon={
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {user.name?.charAt(0).toUpperCase()}
                </Avatar>
              }
              endIcon={<ExpandMoreIcon />}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              {user.name} {user.surname}
            </Button>
            
            {/* Mobile User Icon */}
            <IconButton
              onClick={handleMenuOpen}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              {/* Mobile Navigation Items */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <MenuItem onClick={() => handleNavigation('/')}>My Books</MenuItem>
                <MenuItem onClick={() => handleNavigation('/search')}>Search</MenuItem>
                <MenuItem onClick={() => handleNavigation('/scanner')}>Scanner</MenuItem>
              </Box>
              
              <MenuItem onClick={handleLogout}>Sign out</MenuItem>
            </Menu>
          </Box>
        )}

        {/* Mobile Menu Icon (when no user) */}
        {!user && (
          <IconButton
            onClick={handleMenuOpen}
            sx={{ display: { xs: 'flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};