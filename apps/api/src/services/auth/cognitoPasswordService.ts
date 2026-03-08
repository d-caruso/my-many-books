import {
  AdminUserGlobalSignOutCommand,
  AuthFlowType,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  type AuthenticationResultType,
} from '@aws-sdk/client-cognito-identity-provider';
import { validatePasswordStrength } from '@my-many-books/shared-validation';
import { COGNITO_ERRORS } from '../../constants/cognito';

export interface CognitoClientLike {
  send<TOutput>(command: unknown): Promise<TOutput>;
}

export interface PasswordChangeSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface ChangePasswordInput {
  email: string;
  currentPassword: string;
  newPassword: string;
  locale?: string;
}

interface ForgotPasswordInput {
  email: string;
}

interface ConfirmForgotPasswordInput {
  email: string;
  code: string;
  newPassword: string;
  locale?: string;
}

const INVALID_PASSWORD_POLICY_ERROR_NAME = 'InvalidPasswordPolicyError';
const COGNITO_CONFIG_ERROR_NAME = 'CognitoConfigurationError';

const createCognitoConfigError = (message: string): Error => {
  const error = new Error(message);
  error.name = COGNITO_CONFIG_ERROR_NAME;
  return error;
};

const createPasswordPolicyError = (message: string, details?: Record<string, unknown>): Error => {
  const error = new Error(message);
  error.name = INVALID_PASSWORD_POLICY_ERROR_NAME;
  if (details) {
    (error as Error & { details?: Record<string, unknown> }).details = details;
  }
  return error;
};

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw createCognitoConfigError(`${name} is required`);
  }

  return value;
};

export class CognitoPasswordService {
  constructor(
    private readonly cognitoClient: CognitoClientLike = new CognitoIdentityProviderClient({
      region: process.env['AWS_REGION'] || 'us-east-1',
    })
  ) {}

  private validateNewPassword(newPassword: string): void {
    const result = validatePasswordStrength(newPassword);
    if (!result.isValid) {
      throw createPasswordPolicyError(result.error || 'Password does not meet requirements', {
        failedRules: result.metadata?.failedRules || [],
      });
    }
  }

  private async authenticateWithPassword(
    email: string,
    password: string
  ): Promise<AuthenticationResultType> {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: getRequiredEnv('COGNITO_USER_POOL_CLIENT_ID'),
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await this.cognitoClient.send<{ AuthenticationResult?: AuthenticationResultType }>(command);
    const authResult = response.AuthenticationResult;
    if (!authResult?.AccessToken || !authResult.IdToken || !authResult.ExpiresIn) {
      throw new Error('Authentication result is missing required tokens');
    }

    return authResult;
  }

  async changePassword(input: ChangePasswordInput): Promise<PasswordChangeSession> {
    const normalizedEmail = input.email.trim().toLowerCase();
    this.validateNewPassword(input.newPassword);

    const currentAuth = await this.authenticateWithPassword(normalizedEmail, input.currentPassword);
    const currentAccessToken = currentAuth.AccessToken;
    if (!currentAccessToken) {
      throw new Error('Current access token is missing');
    }

    await this.cognitoClient.send(new ChangePasswordCommand({
      AccessToken: currentAccessToken,
      PreviousPassword: input.currentPassword,
      ProposedPassword: input.newPassword,
    }));

    await this.cognitoClient.send(new GlobalSignOutCommand({
      AccessToken: currentAccessToken,
    }));

    const refreshedAuth = await this.authenticateWithPassword(normalizedEmail, input.newPassword);
    const accessToken = refreshedAuth.AccessToken;
    const idToken = refreshedAuth.IdToken;
    const refreshToken = refreshedAuth.RefreshToken;
    const expiresIn = refreshedAuth.ExpiresIn;
    if (!accessToken || !idToken || !refreshToken || typeof expiresIn !== 'number') {
      throw new Error('Authentication result is missing required tokens');
    }

    return {
      accessToken,
      idToken,
      refreshToken,
      expiresIn,
    };
  }

  async requestForgotPassword(input: ForgotPasswordInput): Promise<void> {
    const normalizedEmail = input.email.trim().toLowerCase();

    try {
      await this.cognitoClient.send(new ForgotPasswordCommand({
        ClientId: getRequiredEnv('COGNITO_USER_POOL_CLIENT_ID'),
        Username: normalizedEmail,
      }));
    } catch (error: unknown) {
      const errorName = (error as { name?: string })?.name;
      if (errorName === COGNITO_ERRORS.USER_NOT_FOUND) {
        // Prevent account enumeration.
        return;
      }

      throw error;
    }
  }

  async confirmForgotPassword(input: ConfirmForgotPasswordInput): Promise<void> {
    const normalizedEmail = input.email.trim().toLowerCase();
    this.validateNewPassword(input.newPassword);

    await this.cognitoClient.send(new ConfirmForgotPasswordCommand({
      ClientId: getRequiredEnv('COGNITO_USER_POOL_CLIENT_ID'),
      Username: normalizedEmail,
      ConfirmationCode: input.code.trim(),
      Password: input.newPassword,
    }));

    await this.cognitoClient.send(new AdminUserGlobalSignOutCommand({
      UserPoolId: getRequiredEnv('COGNITO_USER_POOL_ID'),
      Username: normalizedEmail,
    }));
    // Post-reset notification is handled by the Cognito PostConfirmation Lambda trigger
    // (PostConfirmation_ConfirmForgotPassword) defined in cognito-stack.yml.
  }
}

export const cognitoPasswordService = new CognitoPasswordService();
export const COGNITO_PASSWORD_ERRORS = Object.freeze({
  INVALID_PASSWORD_POLICY_ERROR_NAME,
  COGNITO_CONFIG_ERROR_NAME,
});
