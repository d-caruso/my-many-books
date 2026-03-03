import { UserService } from '../../middleware/auth';
import {
  isGoogleEmailVerified,
  DecodedIdToken,
  OAuthTokenResponse,
  verifyCognitoIdToken,
} from './googleOAuth';

export interface AuthSessionResponse {
  accessToken: string;
  idToken: string;
  expiresIn: number;
  user: {
    id: number;
    email: string;
    name: string;
    surname: string;
    role: string;
    isActive: boolean;
  };
}

const toAuthSessionResponse = (
  tokenData: OAuthTokenResponse,
  user: Awaited<ReturnType<typeof UserService.findOrCreateUser>>['user']
): AuthSessionResponse => ({
  accessToken: tokenData.access_token,
  idToken: tokenData.id_token,
  expiresIn: tokenData.expires_in,
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    role: user.role,
    isActive: user.isActive,
  },
});

const resolveProviderUserId = (decoded: DecodedIdToken, provider: string): string => {
  const normalizedProvider = provider.trim().toLowerCase();
  const identityMatch = decoded.identities?.find((identity) => {
    const providerName = identity.providerName?.trim().toLowerCase();
    const providerType = identity.providerType?.trim().toLowerCase();
    return (
      (providerName && providerName === normalizedProvider) ||
      (providerType && providerType === normalizedProvider)
    );
  });

  return identityMatch?.userId || decoded.sub;
};

export const completeGoogleLogin = async (
  tokenData: OAuthTokenResponse,
  provider: string
): Promise<AuthSessionResponse> => {
  const decoded = await verifyCognitoIdToken(tokenData.id_token);

  if (!isGoogleEmailVerified(decoded.email_verified)) {
    throw new Error('Google account email must be verified');
  }

  const [nameFromFullName, ...surnameParts] = (decoded.name || '').trim().split(/\s+/);
  const fallbackName = nameFromFullName || undefined;
  const fallbackSurname = surnameParts.join(' ') || undefined;
  const providerUserId = resolveProviderUserId(decoded, provider);

  const { user } = await UserService.findOrCreateUser(
    {
      id: decoded.sub,
      providerUserId,
      email: decoded.email,
      name: decoded.given_name || fallbackName,
      surname: decoded.family_name || fallbackSurname,
    },
    provider
  );

  return toAuthSessionResponse(tokenData, user);
};
