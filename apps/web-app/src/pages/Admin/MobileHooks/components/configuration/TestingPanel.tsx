import { extractErrorMessage } from '@my-many-books/shared-utils';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../../../../contexts/ApiContext';
import type {
  AdminMobileHooksActionsConfigTestResponse,
  AdminMobileHooksActionTypeTestResponse,
  AdminMobileHooksActionTypesResponse,
} from '../../../../../services/api';

export const TestingPanel: React.FC = () => {
  const { apiService } = useApi();
  const { t } = useTranslation('pages');

  const safeJsonParse = (
    value: string
  ): { ok: true; data: any } | { ok: false; error: string } => {
    try {
      const parsed = value ? JSON.parse(value) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: t('admin.mobile_hooks.errors.validation.json_object') };
      }
      return { ok: true, data: parsed };
    } catch {
      return { ok: false, error: t('admin.mobile_hooks.errors.validation.invalid_json') };
    }
  };

  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [actionTypes, setActionTypes] = useState<AdminMobileHooksActionTypesResponse | null>(null);

  const [eventType, setEventType] = useState('error.unhandled');
  const [eventPayloadJson, setEventPayloadJson] = useState('{\n  "test": true\n}');
  const [configTestLoading, setConfigTestLoading] = useState(false);
  const [configTestError, setConfigTestError] = useState<string | null>(null);
  const [configTestResult, setConfigTestResult] = useState<AdminMobileHooksActionsConfigTestResponse | null>(null);

  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [dryRun, setDryRun] = useState(true);
  const [testDataJson, setTestDataJson] = useState('{\n  "test": true\n}');
  const [actionTestLoading, setActionTestLoading] = useState(false);
  const [actionTestError, setActionTestError] = useState<string | null>(null);
  const [actionTestResult, setActionTestResult] = useState<AdminMobileHooksActionTypeTestResponse | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingTypes(true);
        setTypesError(null);

        const payload = await apiService.getAdminMobileHooksActionTypes();
        setActionTypes(payload);
        const first = Object.keys(payload.actions)[0] ?? '';
        setSelectedActionType(first);
      } catch (err: unknown) {
        setTypesError(t('admin.mobile_hooks.errors.action_types.load'));
      } finally {
        setLoadingTypes(false);
      }
    };

    void run();
  }, [apiService, t]);

  const actionTypeOptions = useMemo(() => {
    if (!actionTypes) return [];
    return Object.keys(actionTypes.actions).sort();
  }, [actionTypes]);

  const runConfigTest = async () => {
    setConfigTestLoading(true);
    setConfigTestError(null);
    setConfigTestResult(null);

    const payloadParse = safeJsonParse(eventPayloadJson);
    if (!payloadParse.ok) {
      setConfigTestError(payloadParse.error);
      setConfigTestLoading(false);
      return;
    }

    try {
      const result = await apiService.testAdminMobileHooksActionsConfig({
        eventType: eventType || undefined,
        payload: payloadParse.data,
      });
      setConfigTestResult(result);
    } catch (err: unknown) {
      setConfigTestError(t('admin.mobile_hooks.errors.testing.config_test'));
    } finally {
      setConfigTestLoading(false);
    }
  };

  const runActionTest = async () => {
    if (!selectedActionType) return;
    setActionTestLoading(true);
    setActionTestError(null);
    setActionTestResult(null);

    const dataParse = safeJsonParse(testDataJson);
    if (!dataParse.ok) {
      setActionTestError(dataParse.error);
      setActionTestLoading(false);
      return;
    }

    try {
      const result = await apiService.testAdminMobileHooksActionType(selectedActionType, {
        dryRun,
        testData: dataParse.data,
      });
      setActionTestResult(result);
    } catch (err: unknown) {
      setActionTestError(t('admin.mobile_hooks.errors.testing.action_test'));
    } finally {
      setActionTestLoading(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{t('admin.mobile_hooks.testing.configuration_test.title')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('admin.mobile_hooks.testing.configuration_test.description')}
        </Typography>

        {configTestError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {configTestError}
          </Alert>
        ) : null}

        <Box sx={{ mt: 2 }} display="flex" gap={2} flexWrap="wrap">
          <TextField
            label={t('admin.mobile_hooks.columns.event_type')}
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            sx={{ minWidth: 320 }}
          />
          <Button
            variant="contained"
            onClick={() => void runConfigTest()}
            disabled={configTestLoading}
          >
            {configTestLoading ? <CircularProgress size={16} /> : t('admin.mobile_hooks.actions.run_test')}
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <TextField
            label={t('admin.mobile_hooks.testing.payload_json')}
            value={eventPayloadJson}
            onChange={(e) => setEventPayloadJson(e.target.value)}
            fullWidth
            multiline
            minRows={6}
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
        </Box>

        {configTestResult ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{t('admin.mobile_hooks.testing.result')}</Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(configTestResult, null, 2)}
              </pre>
            </Paper>
          </Box>
        ) : null}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{t('admin.mobile_hooks.testing.action_type_test.title')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('admin.mobile_hooks.testing.action_type_test.description')}
        </Typography>

        {typesError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {typesError}
          </Alert>
        ) : null}

        {actionTestError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {actionTestError}
          </Alert>
        ) : null}

        <Box sx={{ mt: 2 }} display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel id="test-action-type-label">{t('admin.mobile_hooks.columns.action_type')}</InputLabel>
            <Select
              labelId="test-action-type-label"
              label={t('admin.mobile_hooks.columns.action_type')}
              value={selectedActionType}
              disabled={loadingTypes}
              onChange={(e) => setSelectedActionType(e.target.value)}
            >
              {actionTypeOptions.map((actionType) => (
                <MenuItem key={actionType} value={actionType}>
                  {actionType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Switch checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />}
            label={t('admin.mobile_hooks.testing.dry_run')}
          />

          <Button
            variant="contained"
            onClick={() => void runActionTest()}
            disabled={actionTestLoading || !selectedActionType}
          >
            {actionTestLoading ? <CircularProgress size={16} /> : t('admin.mobile_hooks.actions.run_test')}
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <TextField
            label={t('admin.mobile_hooks.testing.test_data_json')}
            value={testDataJson}
            onChange={(e) => setTestDataJson(e.target.value)}
            fullWidth
            multiline
            minRows={6}
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
        </Box>

        {actionTestResult ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{t('admin.mobile_hooks.testing.result')}</Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(actionTestResult, null, 2)}
              </pre>
            </Paper>
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
};
