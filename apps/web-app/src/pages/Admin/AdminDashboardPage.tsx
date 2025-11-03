import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import {
  People as PeopleIcon,
  Book as BookIcon,
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from './AdminLayout';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: 2,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {React.cloneElement(icon, {
              sx: { fontSize: 40, color: 'white' }
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          {t('pages:admin.dashboard.title', 'Dashboard')}
        </Typography>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('pages:admin.dashboard.total_users', 'Total Users')}
              value="--"
              icon={<PeopleIcon />}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('pages:admin.dashboard.total_books', 'Total Books')}
              value="--"
              icon={<BookIcon />}
              color="#2e7d32"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('pages:admin.dashboard.active_users', 'Active Users')}
              value="--"
              icon={<TrendingUpIcon />}
              color="#ed6c02"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title={t('pages:admin.dashboard.admin_users', 'Admin Users')}
              value="--"
              icon={<DashboardIcon />}
              color="#9c27b0"
            />
          </Grid>
        </Grid>

        {/* Welcome Message */}
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            {t('pages:admin.dashboard.welcome_title', 'Welcome to the Admin Panel')}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {t(
              'pages:admin.dashboard.welcome_message',
              'This is the foundation for the admin dashboard. Use the sidebar to navigate to different admin sections.'
            )}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="textSecondary">
              {t(
                'pages:admin.dashboard.phase_info',
                'Phase 1: Admin Foundation - Complete ✓'
              )}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t(
                'pages:admin.dashboard.next_phase',
                'Next: Phase 2 will add user management and statistics.'
              )}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </AdminLayout>
  );
};
