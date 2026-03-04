import { z } from 'zod';
import { UserRoleSchema } from './user';

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
