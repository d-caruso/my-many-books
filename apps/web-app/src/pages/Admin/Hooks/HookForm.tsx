import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Stack,
} from '@mui/material';
import { ActionConfigEditor } from './ActionConfigEditor';
import { EventPatternInput } from './components/EventPatternInput';

export type HookActionType = 'log' | 'email' | 'database';

export interface HookFormData {
  name: string;
  description: string;
  eventPattern: string;
  actionType: HookActionType;
  priority: number;
  isActive: boolean;
  actionConfig: string;
}

export interface HookFormProps {
  open: boolean;
  initialData?: Partial<HookFormData>;
  onClose: () => void;
  onSave: (data: HookFormData) => void;
}

const defaultData: HookFormData = {
  name: '',
  description: '',
  eventPattern: '',
  actionType: 'log',
  priority: 0,
  isActive: true,
  actionConfig: '{\n  "message": "Sample payload"\n}',
};

export const HookForm: React.FC<HookFormProps> = ({
  open,
  initialData,
  onClose,
  onSave,
}) => {
  const merged = useMemo(() => ({ ...defaultData, ...initialData }), [initialData]);
  const [formState, setFormState] = useState<HookFormData>(merged);
  useEffect(() => {
    if (open) {
      setFormState(merged);
      setConfigError(null);
    }
  }, [open, merged]);
  const [configError, setConfigError] = useState<string | null>(null);

  const handleFieldChange = (field: keyof HookFormData, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleActionConfigChange = (value: string) => {
    setFormState((prev) => ({ ...prev, actionConfig: value }));
    try {
      JSON.parse(value);
      setConfigError(null);
    } catch (err: any) {
      setConfigError(err.message);
    }
  };

  const handleSubmit = () => {
    if (configError) return;
    try {
      JSON.parse(formState.actionConfig);
    } catch {
      setConfigError('Invalid JSON');
      return;
    }
    onSave(formState);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create / Edit Hook</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Name"
              value={formState.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              fullWidth
            />
            <TextField
              label="Priority"
              type="number"
              value={formState.priority}
              onChange={(event) => handleFieldChange('priority', Number(event.target.value))}
              fullWidth
            />
          </Stack>
          <TextField
            label="Description"
            value={formState.description}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            fullWidth
            multiline
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <FormControl fullWidth>
              <InputLabel id="hook-action-label">Action Type</InputLabel>
              <Select
                labelId="hook-action-label"
                value={formState.actionType}
                label="Action Type"
                onChange={(event) =>
                  handleFieldChange('actionType', event.target.value as HookActionType)
                }
              >
                <MenuItem value="log">Log</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="database">Database</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formState.isActive}
                  onChange={(event) => handleFieldChange('isActive', event.target.checked)}
                />
              }
              label="Active"
            />
          </Stack>
          <EventPatternInput
            value={formState.eventPattern}
            onChange={(value) => handleFieldChange('eventPattern', value)}
          />
          <ActionConfigEditor
            value={formState.actionConfig}
            error={configError ?? undefined}
            onChange={handleActionConfigChange}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={Boolean(configError)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HookForm;
