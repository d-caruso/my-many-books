/**
 * Emergency config update schema
 */

import Joi from 'joi';

export const emergencyConfigSchema = Joi.object({
    // Kill switches
    mobileHooksEnabled: Joi.boolean().optional(),
    apiHooksEnabled: Joi.boolean().optional(),
    globalKillSwitch: Joi.boolean().optional(),

    // Metadat
    emergencyContacts: Joi.array()
        .items(Joi.string().email())
        .optional()
        .messages({
        'array.base': 'emergencyContacts must be an array',
        'string.email': 'Each contact must be a valid email address'
    }),
    emergencyReason: Joi.string().max(500).allow(null).optional(),
}).min(1); // At least one field must be provided