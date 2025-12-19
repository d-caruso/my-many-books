import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, TextField, Button, Stack } from '@mui/material';
import { CategoriesAPI, useCategories } from '../useCategories';

interface CategoryManagerExampleProps {
  api: CategoriesAPI;
}

export const CategoryManagerExample: React.FC<CategoryManagerExampleProps> = ({ api }) => {
  const { categories, loadCategories, createCategory } = useCategories(api, {
    autoLoad: false,
    sortComparator: (a, b) => a.name.localeCompare(b.name),
  });
  const [name, setName] = useState('');

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCategory(name);
    setName('');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Category Manager
      </Typography>
      <List>
        {categories.map(category => (
          <ListItem key={category.id}>{category.name}</ListItem>
        ))}
      </List>
      <Stack direction="row" spacing={2} mt={2}>
        <TextField
          placeholder="New category"
          value={name}
          onChange={e => setName(e.target.value)}
          size="small"
        />
        <Button variant="contained" onClick={() => void handleCreate()}>
          Add
        </Button>
      </Stack>
    </Box>
  );
};
