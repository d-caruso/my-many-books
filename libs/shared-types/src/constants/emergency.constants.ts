export const EMERGENCY = 'emergency';

export const EMERGENCY_SETTING_KEYS = {
    MOBILE_HOOKS_ENABLED: `${EMERGENCY}.mobile_hooks.enabled`,
    API_HOOKS_ENABLED: `${EMERGENCY}.api_hooks.enabled`,
    GLOBAL_KILL_SWITCH: `${EMERGENCY}.global_kill_switch`,
    LAST_ACTION: `${EMERGENCY}.last_action`,
    ACTIVATED_BY: `${EMERGENCY}.activated_by`,
    ACTIVATED_AT: `${EMERGENCY}.activated_at`,
    REASON: `${EMERGENCY}.reason`,
    CONTACTS: `${EMERGENCY}.contacts`,
} as const;

export const EMERGENCY_ACTIONS = {
    GLOBAL_KILL_SWITCH_ACTIVATED: 'GLOBAL_KILL_SWITCH_ACTIVATED',
    GLOBAL_KILL_SWITCH_DEACTIVATED: 'GLOBAL_KILL_SWITCH_DEACTIVATED',
} as const;

export type EmergencySettingKey = typeof EMERGENCY_SETTING_KEYS[keyof typeof EMERGENCY_SETTING_KEYS];
export type EmergencyAction = typeof EMERGENCY_ACTIONS[keyof typeof EMERGENCY_ACTIONS];