import React, { useEffect, useState } from 'react';
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
    <div>
      <h3>Category Manager</h3>
      <ul>
        {categories.map(category => (
          <li key={category.id}>{category.name}</li>
        ))}
      </ul>
      <input
        placeholder="New category"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={handleCreate}>Add</button>
    </div>
  );
};
