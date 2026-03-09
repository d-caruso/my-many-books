import { extractErrorMessage } from '@my-many-books/shared-utils';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { PushPinOutlined as UnpinIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { RESOURCE_TYPES } from '@my-many-books/shared-types';
import { AdminLayout } from './AdminLayout';
import { useApi } from '../../contexts/ApiContext';

interface PinnedResult {
  id: number;
  resource_type: string;
  resource_id: number;
  priority: number;
  active: boolean;
}

export const SearchManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { apiService } = useApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedResults, setPinnedResults] = useState<PinnedResult[]>([]);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');

  const fetchPinnedResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParam = selectedResourceType !== 'all' ? `?resource_type=${selectedResourceType}` : '';
      const response = await apiService.get(`/admin/search/pinned${queryParam}`);
      setPinnedResults(response.data.results || []);
    } catch (err: unknown) {
      setError(extractErrorMessage(err) ?? 'Failed to fetch pinned results');
    } finally {
      setLoading(false);
    }
  }, [apiService, selectedResourceType]);

  useEffect(() => {
    fetchPinnedResults();
  }, [fetchPinnedResults]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(pinnedResults);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update priorities based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      priority: index,
    }));

    setPinnedResults(updatedItems);

    // Update priority on server
    try {
      await apiService.patch(`/admin/search/pinned/${reorderedItem.id}/priority`, {
        priority: result.destination.index,
      });
    } catch {
      setError('Failed to update priority');
      // Revert on error
      fetchPinnedResults();
    }
  };

  const handleUnpin = async (id: number) => {
    try {
      await apiService.delete(`/admin/search/pinned/${id}`);
      setPinnedResults(pinnedResults.filter(item => item.id !== id));
    } catch {
      setError('Failed to unpin result');
    }
  };

  const _handlePin = async (resourceType: string, resourceId: number) => {
    try {
      const maxPriority = pinnedResults.length > 0
        ? Math.max(...pinnedResults.map(r => r.priority))
        : -1;

      await apiService.post('/admin/search/pinned', {
        resource_type: resourceType,
        resource_id: resourceId,
        priority: maxPriority + 1,
        active: true,
      });

      fetchPinnedResults();
    } catch {
      setError('Failed to pin result');
    }
  };

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('search.pinned.title', 'Search Management')}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="resource-type-label">
              {t('search.pinned.resource_type', 'Resource Type')}
            </InputLabel>
            <Select
              labelId="resource-type-label"
              value={selectedResourceType}
              label={t('search.pinned.resource_type', 'Resource Type')}
              onChange={(e) => setSelectedResourceType(e.target.value)}
            >
              <MenuItem value="all">{t('search.pinned.all', 'All')}</MenuItem>
              <MenuItem value={RESOURCE_TYPES.BOOK}>
                {t('search.pinned.resource_book', 'Books')}
              </MenuItem>
              <MenuItem value={RESOURCE_TYPES.AUTHOR}>
                {t('search.pinned.resource_author', 'Authors')}
              </MenuItem>
              <MenuItem value={RESOURCE_TYPES.CATEGORY}>
                {t('search.pinned.resource_category', 'Categories')}
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : pinnedResults.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography variant="body1">
              {t('search.pinned.empty', 'No pinned results yet')}
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: 3 }}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="pinned-results">
                {(provided) => (
                  <List {...provided.droppableProps} ref={provided.innerRef}>
                    {pinnedResults.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              mb: 1,
                              bgcolor: snapshot.isDragging ? 'action.hover' : 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                            }}
                            secondaryAction={
                              <Tooltip title={t('search.pinned.unpin', 'Unpin')}>
                                <IconButton
                                  edge="end"
                                  aria-label={t('search.pinned.unpin', 'Unpin')}
                                  onClick={() => handleUnpin(item.id)}
                                >
                                  <UnpinIcon />
                                </IconButton>
                              </Tooltip>
                            }
                          >
                            <Chip
                              label={t('search.pinned.priority_badge', `Priority {{priority}}`, {
                                priority: item.priority,
                              })}
                              color="primary"
                              size="small"
                              sx={{ mr: 2 }}
                            />
                            <ListItemText
                              primary={`${item.resource_type} #${item.resource_id}`}
                              secondary={item.active
                                ? t('search.pinned.active', 'Active')
                                : t('search.pinned.inactive', 'Inactive')
                              }
                            />
                          </ListItem>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </List>
                )}
              </Droppable>
            </DragDropContext>
          </Paper>
        )}
      </Box>
    </AdminLayout>
  );
};
