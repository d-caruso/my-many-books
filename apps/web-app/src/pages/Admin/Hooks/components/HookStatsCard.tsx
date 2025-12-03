import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

interface HookStatsCardProps {
  title: string;
  value: string | number;
  helperText?: string;
  icon: React.ReactElement;
  color?: string;
}

export const HookStatsCard: React.FC<HookStatsCardProps> = ({
  title,
  value,
  helperText,
  icon,
  color = '#1976d2',
}) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {helperText && (
              <Typography variant="caption" color="textSecondary">
                {helperText}
              </Typography>
            )}
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
            {React.cloneElement(icon, {
              sx: { fontSize: 36, color: 'white' },
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
