import React from 'react';
import { TextField } from '@mui/material';

interface ActionConfigEditorProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
}

export const ActionConfigEditor: React.FC<ActionConfigEditorProps> = ({
  value,
  error,
  onChange,
  label,
  helperText,
}) => {
  return (
    <TextField
      label={label || 'Action Configuration (JSON)'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      multiline
      minRows={6}
      fullWidth
      helperText={error || helperText || 'Provide valid JSON per action requirements'}
      error={Boolean(error)}
      variant="outlined"
      InputProps={{
        sx: { fontFamily: 'Roboto Mono, monospace', fontSize: 14 },
      }}
    />
  );
};

export default ActionConfigEditor;
