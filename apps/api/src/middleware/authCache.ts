import type { UserEntity } from '../domain/entities/User';

interface CachedUser {
  user: UserEntity;
  expiry: number;
}

const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL = 60_000; // 60 seconds

export function getCachedUser(email: string): UserEntity | null {
  const cached = userCache.get(email);
  if (cached && cached.expiry > Date.now()) {
    return cached.user;
  }
  if (cached) {
    userCache.delete(email);
  }
  return null;
}

export function setCachedUser(email: string, user: UserEntity): void {
  userCache.set(email, { user, expiry: Date.now() + USER_CACHE_TTL });
}

export function clearUserCache(email?: string): void {
  if (email) {
    userCache.delete(email);
  } else {
    userCache.clear();
  }
}
