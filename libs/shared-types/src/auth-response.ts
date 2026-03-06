import { z } from 'zod';
import { UserRoleSchema } from './user';
import { USER_ACCOUNT_PATCH_ACTIONS } from './constants/auth.constants';

export const AuthSessionUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  surname: z.string(),
  role: UserRoleSchema,
  isActive: z.boolean(),
});
export type AuthSessionUser = z.infer<typeof AuthSessionUserSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  idToken: z.string(),
  expiresIn: z.number(),
  user: AuthSessionUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RegisterResponseSchema = z.object({
  requiresVerification: z.boolean(),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
  locale: z.string().trim().min(2).max(5).optional(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ForgotPasswordResponseSchema = z.object({
  accepted: z.boolean(),
  expiresInMinutes: z.number().int().positive(),
});
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;

export const ConfirmForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(1).max(64),
  newPassword: z.string().min(1).max(128),
  locale: z.string().trim().min(2).max(5).optional(),
});
export type ConfirmForgotPasswordRequest = z.infer<typeof ConfirmForgotPasswordRequestSchema>;

export const ConfirmForgotPasswordResponseSchema = z.object({
  reset: z.boolean(),
  signInRequired: z.boolean(),
});
export type ConfirmForgotPasswordResponse = z.infer<typeof ConfirmForgotPasswordResponseSchema>;

export const ChangePasswordRequestSchema = z.object({
  action: z.literal(USER_ACCOUNT_PATCH_ACTIONS.CHANGE_PASSWORD),
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export const ChangePasswordResponseSchema = z.object({
  changed: z.boolean(),
  accessToken: z.string(),
  idToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: AuthSessionUserSchema,
});
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  idToken: z.string(),
  expiresIn: z.number(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const GoogleOAuthUrlSchema = z.object({
  authorizeUrl: z.string(),
  state: z.string(),
});
export type GoogleOAuthUrl = z.infer<typeof GoogleOAuthUrlSchema>;

export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  version: z.string(),
  environment: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
