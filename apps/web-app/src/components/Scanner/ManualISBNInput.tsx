import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Stack
} from '@mui/material';
import { ScanResult } from '../../types';

interface ManualISBNInputProps {
  onSubmit: (result: ScanResult) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const ManualISBNInput: React.FC<ManualISBNInputProps> = ({
  onSubmit,
  onCancel,
  isOpen
}) => {
  const [isbn, setIsbn] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Validate ISBN format
  const validateISBN = (code: string): boolean => {
    const cleanCode = code.replace(/[^0-9X]/gi, '');
    
    if (cleanCode.length === 10) {
      return validateISBN10(cleanCode);
    } else if (cleanCode.length === 13) {
      return validateISBN13(cleanCode);
    }
    
    return false;
  };

  const validateISBN10 = (isbn: string): boolean => {
    if (isbn.length !== 10) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (10 - i);
    }
    
    const lastChar = isbn[9];
    const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
    if (isNaN(checkDigit) && lastChar !== 'X') return false;
    
    sum += checkDigit;
    return sum % 11 === 0;
  };

  const validateISBN13 = (isbn: string): boolean => {
    if (isbn.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = parseInt(isbn[12]);
    if (isNaN(checkDigit)) return false;
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    
    if (!cleanIsbn) {
      setError('Please enter an ISBN');
      return;
    }
    
    if (!validateISBN(cleanIsbn)) {
      setError('Invalid ISBN format. Please enter a valid 10 or 13 digit ISBN.');
      return;
    }
    
    setError(null);
    onSubmit({
      isbn: cleanIsbn,
      success: true
    });
    
    // Reset form
    setIsbn('');
  };

  const handleCancel = () => {
    setIsbn('');
    setError(null);
    onCancel();
  };

  // Helper function for future ISBN formatting (currently unused)
  // const formatISBN = (value: string) => {
  //   const cleaned = value.replace(/[^0-9X]/gi, '');
  //   
  //   if (cleaned.length <= 10) {
  //     return cleaned.replace(/(\d{1})(\d{3})(\d{5})(\d{1})/, '$1-$2-$3-$4');
  //   } else if (cleaned.length <= 13) {
  //     return cleaned.replace(/(\d{3})(\d{1})(\d{3})(\d{5})(\d{1})/, '$1-$2-$3-$4-$5');
  //   }
  //   
  //   return cleaned;
  // };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsbn(value);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Box mb={3}>
        <Typography variant="h5" fontWeight="600" gutterBottom>
          Enter ISBN Manually
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter the 10 or 13 digit ISBN code from your book
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            id="isbn"
            label="ISBN (10 or 13 digits)"
            value={isbn}
            onChange={handleInputChange}
            placeholder="e.g., 978-0-123-45678-9"
            error={!!error}
            helperText={error}
            inputProps={{ maxLength: 17 }}
            autoComplete="off"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ISBN can be found on the back cover of most books, usually above or below the barcode.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Examples:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                ISBN-10: 0123456789
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                ISBN-13: 9780123456789
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isbn.trim()}
              variant="contained"
              fullWidth
            >
              Add Book
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
};