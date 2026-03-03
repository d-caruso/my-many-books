import crypto from 'crypto';
import { decode, verify, JwtHeader, JwtPayload } from 'jsonwebtoken';

interface CognitoJwksResponse {
  keys?: Array<{
    kid?: string;
    kty?: string;
    n?: string;
    e?: string;
  }>;
}

interface CachedCognitoPublicKey {
  keyObject: crypto.KeyObject;
  cachedAt: number;
}

interface DecodedJwtToken {
  header: JwtHeader;
  payload: JwtPayload | string;
}

export interface VerifiedCognitoIdentity {
  providerName?: string;
  providerType?: string;
  userId?: string;
}

export interface VerifiedCognitoIdTokenClaims {
  sub: string;
  email: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
  identities?: VerifiedCognitoIdentity[];
}

export class CognitoJwtVerifier {
  private static readonly JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
  private static readonly jwksCache = new Map<string, CachedCognitoPublicKey>();

  private readonly issuer: string;
  private readonly jwksUri: string;

  constructor(
    region: string,
    private readonly userPoolId: string,
    private readonly clientId: string
  ) {
    if (!region || !userPoolId || !clientId) {
      throw new Error('Cognito region, user pool id, and client id are required');
    }

    this.issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    this.jwksUri = `${this.issuer}/.well-known/jwks.json`;
  }

  async verifyIdToken(token: string): Promise<VerifiedCognitoIdTokenClaims> {
    const decoded = decode(token, { complete: true }) as DecodedJwtToken | null;
    const keyId = decoded?.header?.kid;
    if (!keyId) {
      throw new Error('Token verification failed');
    }

    const publicKey = await this.getPublicKey(keyId);
    const verifiedPayload = verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: this.issuer,
      audience: this.clientId,
    }) as JwtPayload;

    const claims = verifiedPayload as Record<string, unknown>;
    const email = claims['email'];
    const tokenUse = claims['token_use'];

    if (tokenUse !== undefined && tokenUse !== 'id') {
      throw new Error('Token verification failed');
    }

    if (typeof verifiedPayload.sub !== 'string' || typeof email !== 'string') {
      throw new Error('Token verification failed');
    }

    const emailVerifiedClaim = claims['email_verified'];
    const identities = this.parseIdentities(claims['identities']);

    return {
      sub: verifiedPayload.sub,
      email,
      email_verified:
        emailVerifiedClaim === true || emailVerifiedClaim === false
          ? emailVerifiedClaim
          : typeof emailVerifiedClaim === 'string'
            ? emailVerifiedClaim
            : undefined,
      given_name: typeof claims['given_name'] === 'string' ? claims['given_name'] : undefined,
      family_name: typeof claims['family_name'] === 'string' ? claims['family_name'] : undefined,
      name: typeof claims['name'] === 'string' ? claims['name'] : undefined,
      identities,
    };
  }

  private parseIdentities(raw: unknown): VerifiedCognitoIdentity[] | undefined {
    if (!raw) {
      return undefined;
    }

    const source = this.normalizeIdentitySource(raw);
    if (!source) {
      return undefined;
    }

    const identities = source
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((entry) => ({
        providerName:
          typeof entry['providerName'] === 'string' ? entry['providerName'] : undefined,
        providerType:
          typeof entry['providerType'] === 'string' ? entry['providerType'] : undefined,
        userId: typeof entry['userId'] === 'string' ? entry['userId'] : undefined,
      }))
      .filter((entry) => entry.providerName || entry.providerType || entry.userId);

    return identities.length > 0 ? identities : undefined;
  }

  private normalizeIdentitySource(raw: unknown): unknown[] | null {
    if (Array.isArray(raw)) {
      return raw as unknown[];
    }

    if (typeof raw !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as unknown[]) : null;
    } catch {
      return null;
    }
  }

  private async getPublicKey(keyId: string): Promise<crypto.KeyObject> {
    const cacheKey = `${this.userPoolId}:${keyId}`;
    const cached = CognitoJwtVerifier.jwksCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CognitoJwtVerifier.JWKS_CACHE_TTL_MS) {
      return cached.keyObject;
    }

    const response = await fetch(this.jwksUri);
    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    const jwks = (await response.json()) as CognitoJwksResponse;
    const jwk = jwks.keys?.find((key) => key.kid === keyId && key.kty === 'RSA');
    if (!jwk || !jwk.n || !jwk.e) {
      throw new Error('Token verification failed');
    }

    const keyObject = crypto.createPublicKey({
      format: 'jwk',
      key: {
        kty: 'RSA',
        n: jwk.n,
        e: jwk.e,
      },
    });

    CognitoJwtVerifier.jwksCache.set(cacheKey, {
      keyObject,
      cachedAt: Date.now(),
    });

    return keyObject;
  }
}
