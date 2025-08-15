import React, { useState, useEffect } from 'react';
import { Book, Author, Category } from '../../types';
import { useCategories } from '../../hooks/useCategories';
import { AuthorAutocomplete } from '../Search/AuthorAutocomplete';
import { ResponsiveInput } from '../UI/ResponsiveInput';
import { ResponsiveSelect } from '../UI/ResponsiveSelect';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface BookFormProps {
  book?: Book | null;
  onSubmit: (bookData: BookFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
}

export interface BookFormData {
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: Book['status'];
  notes?: string;
  selectedAuthors: Author[];
  selectedCategories: number[];
}

export const BookForm: React.FC<BookFormProps> = ({
  book,
  onSubmit,
  onCancel,
  loading = false,
  title = book ? 'Edit Book' : 'Add New Book'
}) => {
  const { categories, loading: categoriesLoading } = useCategories();
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    isbnCode: '',
    editionNumber: undefined,
    editionDate: '',
    status: undefined,
    notes: '',
    selectedAuthors: [],
    selectedCategories: []
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormData, string>>>({});

  // Initialize form with book data
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        isbnCode: book.isbnCode,
        editionNumber: book.editionNumber,
        editionDate: book.editionDate ? book.editionDate.split('T')[0] : '',
        status: book.status,
        notes: book.notes || '',
        selectedAuthors: book.authors || [],
        selectedCategories: book.categories?.map(cat => cat.id) || []
      });
    }
  }, [book]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BookFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.isbnCode.trim()) {
      newErrors.isbnCode = 'ISBN is required';
    } else if (!/^[\d\-X]{10,17}$/.test(formData.isbnCode.replace(/\s/g, ''))) {
      newErrors.isbnCode = 'Invalid ISBN format';
    }

    if (formData.editionNumber !== undefined && formData.editionNumber < 1) {
      newErrors.editionNumber = 'Edition number must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: keyof BookFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAuthorAdd = (author: Author | null) => {
    if (author && !formData.selectedAuthors.find(a => a.id === author.id)) {
      handleInputChange('selectedAuthors', [...formData.selectedAuthors, author]);
    }
  };

  const handleAuthorRemove = (authorId: number) => {
    handleInputChange('selectedAuthors', 
      formData.selectedAuthors.filter(a => a.id !== authorId)
    );
  };

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (checked) {
      handleInputChange('selectedCategories', [...formData.selectedCategories, categoryId]);
    } else {
      handleInputChange('selectedCategories', 
        formData.selectedCategories.filter(id => id !== categoryId)
      );
    }
  };

  return (
    <div className="bg-surface rounded-lg shadow-lg border border-secondary-200 overflow-hidden">
      <div className="px-6 py-4 bg-primary-50 border-b border-secondary-200">
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Title */}
        <ResponsiveInput
          type="text"
          id="title"
          label="Title"
          isRequired
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Enter book title"
          disabled={loading}
          error={errors.title}
        />

        {/* ISBN */}
        <ResponsiveInput
          type="text"
          id="isbnCode"
          label="ISBN"
          isRequired
          value={formData.isbnCode}
          onChange={(e) => handleInputChange('isbnCode', e.target.value)}
          placeholder="e.g., 978-0-123-45678-9"
          disabled={loading}
          error={errors.isbnCode}
          className="font-mono"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Edition Number */}
          <ResponsiveInput
            type="number"
            id="editionNumber"
            label="Edition Number"
            value={formData.editionNumber || ''}
            onChange={(e) => handleInputChange('editionNumber', 
              e.target.value ? parseInt(e.target.value) : undefined
            )}
            placeholder="e.g., 1"
            min="1"
            disabled={loading}
            error={errors.editionNumber}
          />

          {/* Edition Date */}
          <ResponsiveInput
            type="date"
            id="editionDate"
            label="Edition Date"
            value={formData.editionDate}
            onChange={(e) => handleInputChange('editionDate', e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Status */}
        <ResponsiveSelect
          id="status"
          label="Reading Status"
          value={formData.status || ''}
          onChange={(e) => handleInputChange('status', e.target.value as Book['status'] || undefined)}
          disabled={loading}
        >
          <option value="">No Status</option>
          <option value="in progress">In Progress</option>
          <option value="paused">Paused</option>
          <option value="finished">Finished</option>
        </ResponsiveSelect>

        {/* Authors */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Authors
          </label>
          
          <div className="mb-3">
            <AuthorAutocomplete
              value={null}
              onChange={handleAuthorAdd}
              placeholder="Search and add authors..."
              disabled={loading}
            />
          </div>

          {formData.selectedAuthors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.selectedAuthors.map((author) => (
                <span
                  key={author.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700"
                >
                  {author.name} {author.surname}
                  <button
                    type="button"
                    onClick={() => handleAuthorRemove(author.id)}
                    className="ml-2 text-primary-500 hover:text-primary-700"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Categories
          </label>
          
          {categoriesLoading ? (
            <div className="text-text-muted">Loading categories...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-secondary-200 rounded-lg p-3">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.selectedCategories.includes(category.id)}
                    onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                    className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    disabled={loading}
                  />
                  <span className="text-text-primary">{category.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label htmlFor="notes" className="block text-sm font-medium text-text-secondary">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={4}
            className="w-full px-3 py-3 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base sm:text-sm min-h-[44px] touch-manipulation transition-colors duration-200 bg-background text-text-primary hover:border-secondary-400 resize-vertical"
            placeholder="Add any notes about this book..."
            disabled={loading}
          />
        </div>

        {/* Form Actions */}
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-end space-y-3 xs:space-y-0 xs:space-x-4 pt-6 border-t border-secondary-200">
          <ResponsiveButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </ResponsiveButton>
          
          <ResponsiveButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            loading={loading}
          >
            {book ? 'Update Book' : 'Add Book'}
          </ResponsiveButton>
        </div>
      </form>
    </div>
  );
};