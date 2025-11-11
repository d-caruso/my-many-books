import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import BookIcon from '@mui/icons-material/Book';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from './AdminLayout';
import { useApi } from '../../contexts/ApiContext';

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

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalBooks: number;
  timestamp?: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { apiService } = useApi();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching admin stats...');
        const data = await apiService.getAdminStats();
        setStats(data);
      } catch (err: any) {
        console.error('Failed to fetch admin stats:', err);
        console.error('Error details:', err.response?.data);
        console.error('Error status:', err.response?.status);

        const errorMessage = err.response?.data?.error
          || err.response?.data?.message
          || err.message
          || 'Failed to load dashboard statistics';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [apiService]);

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          {t('pages:admin.dashboard.title', 'Dashboard')}
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        )}

        {/* Stats Grid */}
        {!loading && stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={t('pages:admin.dashboard.total_users', 'Total Users')}
                value={stats.totalUsers}
                icon={<PeopleIcon />}
                color="#1976d2"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={t('pages:admin.dashboard.total_books', 'Total Books')}
                value={stats.totalBooks}
                icon={<BookIcon />}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={t('pages:admin.dashboard.active_users', 'Active Users')}
                value={stats.activeUsers}
                icon={<TrendingUpIcon />}
                color="#ed6c02"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title={t('pages:admin.dashboard.admin_users', 'Admin Users')}
                value={stats.adminUsers}
                icon={<DashboardIcon />}
                color="#9c27b0"
              />
            </Grid>
          </Grid>
        )}

        {/* Welcome Message */}
        {!loading && (
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
              {stats?.timestamp && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                  Last updated: {new Date(stats.timestamp).toLocaleString()}
                </Typography>
              )}
            </Box>
          </Paper>
        )}
      </Box>
    </AdminLayout>
  );
};
