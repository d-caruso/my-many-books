import React from 'react';
import { AppBar, Box, Container, Skeleton, Toolbar } from '@mui/material';

const BOOK_ROW_COUNT = 6;

export const AppShellSkeleton: React.FC = () => (
  <>
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar
        sx={{
          px: { xs: 1.5, sm: 2 },
          minHeight: { xs: 72, sm: 76 },
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        {/* Logo + title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 0.5, sm: 2 }, flexGrow: 1, minWidth: 0 }}>
          <Skeleton
            variant="circular"
            sx={{ width: { xs: 52, sm: 56 }, height: { xs: 52, sm: 56 }, mr: 1, flexShrink: 0 }}
          />
          <Skeleton variant="text" sx={{ width: { xs: 40, sm: 160 }, height: 28 }} />
        </Box>

        {/* Nav buttons — desktop only */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
          <Skeleton variant="rounded" width={80} height={36} />
          <Skeleton variant="rounded" width={64} height={36} />
        </Box>

        {/* Language selector */}
        <Skeleton variant="rounded" width={36} height={36} />

        {/* Avatar + menu icon */}
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={40} height={40} />
      </Toolbar>
    </AppBar>

    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Filter / action bar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Skeleton variant="rounded" sx={{ flexGrow: 1, minWidth: 180 }} height={40} />
        <Skeleton variant="rounded" width={110} height={40} />
        <Skeleton variant="rounded" width={90} height={40} />
        <Skeleton variant="rounded" width={40} height={40} />
      </Box>

      {/* Book rows */}
      {Array.from({ length: BOOK_ROW_COUNT }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1.5 }} />
      ))}
    </Container>
  </>
);
