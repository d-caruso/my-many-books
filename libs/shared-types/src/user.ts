/**
 * User-related type definitions powered by Zod
 */

import { z } from 'zod';

export const UserRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  name: z.string().min(1),
  surname: z.string().min(1),
  isActive: z.boolean(),
  role: UserRoleSchema,
  creationDate: z.string(),
  updateDate: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const AuthUserSchema = z.object({
  userId: z.number().int(),
  email: z.string().email(),
  provider: z.string().min(1),
  providerUserId: z.string().optional(),
  isNewUser: z.boolean().optional(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthSessionSchema = z.object({
  user: AuthUserSchema,
  token: z.string().min(1),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const RefreshTokenSchema = z.object({
  token: z.string().min(1),
});

export type RefreshTokenResponse = z.infer<typeof RefreshTokenSchema>;
