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
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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

  const fetchPinnedResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implement API call to fetch pinned results
      setPinnedResults([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pinned results');
    } finally {
      setLoading(false);
    }
  }, [apiService]);

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
    } catch (err: any) {
      setError('Failed to update priority');
      // Revert on error
      fetchPinnedResults();
    }
  };

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('search.pinned.title', 'Search Management')}
        </Typography>

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
                          >
                            <ListItemText
                              primary={`${item.resource_type} #${item.resource_id}`}
                              secondary={`Priority: ${item.priority}`}
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
