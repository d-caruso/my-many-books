import React from 'react';
import { TextField } from '@mui/material';

interface ActionConfigEditorProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export const ActionConfigEditor: React.FC<ActionConfigEditorProps> = ({
  value,
  error,
  onChange,
}) => {
  return (
    <TextField
      label="Action Configuration (JSON)"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      multiline
      minRows={6}
      fullWidth
      helperText={error || 'Provide valid JSON per action requirements'}
      error={Boolean(error)}
      variant="outlined"
    />
  );
};

export default ActionConfigEditor;
