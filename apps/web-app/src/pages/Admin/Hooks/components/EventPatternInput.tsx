import React from 'react';
import { TextField, Box, Chip, Stack } from '@mui/material';

const suggestions = ['book.create', 'book.update', 'user.*', 'audit.**', 'category.create'];

interface EventPatternInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const EventPatternInput: React.FC<EventPatternInputProps> = ({ value, onChange }) => {
  return (
    <Box data-testid="hook-form-event-pattern">
      <TextField
        label="Event Pattern"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        variant="outlined"
        helperText="Supports wildcards such as *, **, and ?"
        inputProps={{ 'data-testid': 'hook-form-event-pattern-input' }}
      />
      <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
        {suggestions.map((suggestion) => (
          <Chip
            key={suggestion}
            label={suggestion}
            onClick={() => onChange(suggestion)}
            size="small"
            variant={value === suggestion ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default EventPatternInput;
