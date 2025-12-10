import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Tooltip,
  Skeleton,
  CircularProgress,
} from '@mui/material';

interface HookStatsCardProps {
  title: string;
  value: string | number;
  helperText?: string;
  icon: React.ReactElement;
  color?: string;
  loading?: boolean;
  tooltip?: string;
}

export const HookStatsCard: React.FC<HookStatsCardProps> = ({
  title,
  value,
  helperText,
  icon,
  color = '#1976d2',
  loading = false,
  tooltip,
}) => {
  const content = (
    <Card variant="outlined" sx={{ minHeight: 140 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" variant="body2" sx={{ textTransform: 'uppercase' }}>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={80} height={48} sx={{ mt: 0.5, mb: 0.5 }} />
            ) : (
              <Typography variant="h4" component="div">
                {value}
              </Typography>
            )}
            {helperText &&
              (loading ? (
                <Skeleton variant="text" width="70%" height={18} />
              ) : (
                <Typography variant="caption" color="textSecondary">
                  {helperText}
                </Typography>
              ))}
          </Box>

          <Box
            sx={{
              backgroundColor: color,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 56,
              minHeight: 56,
            }}
          >
            {loading ? (
              <CircularProgress size={28} sx={{ color: 'white' }} />
            ) : (
              React.cloneElement(icon, {
                sx: { fontSize: 36, color: 'white' },
              } as any)
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip}>
        <Box>{content}</Box>
      </Tooltip>
    );
  }

  return (
    <>{content}</>
  );
};
