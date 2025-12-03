import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Typography,
} from '@mui/material';
import { ActionConfigEditor } from './ActionConfigEditor';
import { EventPatternInput } from './components/EventPatternInput';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('hooks');
  const merged = useMemo(() => ({ ...defaultData, ...initialData }), [initialData]);
  const [formState, setFormState] = useState<HookFormData>(merged);
  useEffect(() => {
    if (open) {
      setFormState(merged);
      setConfigError(null);
      setTouchedFields({});
    }
  }, [open, merged]);
  const [configError, setConfigError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof HookFormData, boolean>>>(
    {}
  );

  const markTouched = (field: keyof HookFormData) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const handleFieldChange = (field: keyof HookFormData, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleActionConfigChange = (value: string) => {
    setFormState((prev) => ({ ...prev, actionConfig: value }));
    try {
      JSON.parse(value);
      setConfigError(null);
    } catch (err: any) {
      setConfigError(t('form.errors.invalid_json', 'Provide valid JSON'));
    }
  };

  const handleSubmit = useCallback(() => {
    setTouchedFields((prev) => ({
      ...prev,
      name: true,
      eventPattern: true,
      priority: true,
    }));

    const hasNameError = !formState.name.trim();
    const hasPatternError = !formState.eventPattern.trim();
    const hasPriorityError = formState.priority < 0;

    if (configError || hasNameError || hasPatternError || hasPriorityError) {
      return;
    }

    try {
      JSON.parse(formState.actionConfig);
    } catch {
      setConfigError(t('form.errors.invalid_json', 'Provide valid JSON'));
      return;
    }
    onSave(formState);
    onClose();
  }, [configError, formState, onClose, onSave, t]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, handleSubmit]);

  const nameError = touchedFields.name && !formState.name.trim();
  const eventPatternError = touchedFields.eventPattern && !formState.eventPattern.trim();
  const priorityError = touchedFields.priority && formState.priority < 0;
  const isSaveDisabled =
    Boolean(configError) ||
    !formState.name.trim() ||
    !formState.eventPattern.trim() ||
    formState.priority < 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('form.title', 'Create or Edit Hook')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {t(
            'form.description',
            'Hooks listen for events (book.create.before) and execute an action such as sending an email or logging data.'
          )}
        </Typography>
        <Stack spacing={2} mt={1}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label={t('form.fields.name', 'Name')}
              value={formState.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              fullWidth
              autoFocus
              onBlur={() => markTouched('name')}
              helperText={
                nameError
                  ? t('form.errors.required', 'This field is required')
                  : t('form.helpers.name', 'Use a human-friendly label.')
              }
              error={Boolean(nameError)}
            />
            <TextField
              label={t('form.fields.priority', 'Priority')}
              type="number"
              value={formState.priority}
              onChange={(event) => handleFieldChange('priority', Number(event.target.value))}
              fullWidth
              onBlur={() => markTouched('priority')}
              inputProps={{ min: 0 }}
              helperText={
                priorityError
                  ? t('form.errors.priority', 'Priority must be zero or greater')
                  : t('form.helpers.priority', 'Lower numbers execute first when multiple hooks match.')
              }
              error={Boolean(priorityError)}
            />
          </Stack>
          <TextField
            label={t('form.fields.description', 'Description')}
            value={formState.description}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            fullWidth
            multiline
            helperText={t('form.helpers.description', 'Optional context for other admins.')}
            minRows={2}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <FormControl fullWidth>
              <InputLabel id="hook-action-label">
                {t('form.fields.action_type', 'Action Type')}
              </InputLabel>
              <Select
                labelId="hook-action-label"
                value={formState.actionType}
                label={t('form.fields.action_type', 'Action Type')}
                onChange={(event) =>
                  handleFieldChange('actionType', event.target.value as HookActionType)
                }
              >
                <MenuItem value="log">{t('form.action_types.log', 'Log')}</MenuItem>
                <MenuItem value="email">{t('form.action_types.email', 'Email')}</MenuItem>
                <MenuItem value="database">{t('form.action_types.database', 'Database')}</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formState.isActive}
                  onChange={(event) => handleFieldChange('isActive', event.target.checked)}
                />
              }
              label={
                <Stack spacing={0}>
                  <Typography>{t('form.fields.is_active', 'Active')}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {t('form.helpers.is_active', 'Disable hooks without deleting them.')}
                  </Typography>
                </Stack>
              }
            />
          </Stack>
          <EventPatternInput
            value={formState.eventPattern}
            onChange={(value) => handleFieldChange('eventPattern', value)}
            label={t('form.fields.event_pattern', 'Event Pattern')}
            helperText={t('form.helpers.event_pattern', 'Supports Hookey wildcard helpers.')}
            error={Boolean(eventPatternError)}
            errorText={t('form.errors.required', 'This field is required')}
            onBlur={() => markTouched('eventPattern')}
          />
          <ActionConfigEditor
            value={formState.actionConfig}
            error={configError ?? undefined}
            onChange={handleActionConfigChange}
            label={t('form.fields.action_config', 'Action Configuration (JSON)')}
            helperText={t('form.helpers.action_config', 'Provide valid JSON per action requirements.')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('form.actions.cancel', 'Cancel')} (Esc)</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSaveDisabled}>
          {t('form.actions.save', 'Save Hook')} (⌘S / Ctrl+S)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HookForm;
