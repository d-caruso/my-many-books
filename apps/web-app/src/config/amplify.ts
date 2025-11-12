import { env } from './env';

// Amplify v6 configuration interface
interface AmplifyV6Config {
  Auth: {
    Cognito: {
      userPoolId: string;
      userPoolClientId: string;
      identityPoolId?: string;
      region: string;
      signUpVerificationMethod: 'code' | 'link';
      loginWith?: {
        oauth?: {
          domain?: string;
          scopes?: string[];
          redirectSignIn?: string[];
          redirectSignOut?: string[];
          responseType?: 'code' | 'token';
        };
        username?: boolean;
        email?: boolean;
        phone?: boolean;
      };
    };
  };
}

export const configureAmplify = async (): Promise<boolean> => {
  // Dynamically import Amplify to defer heavy crypto/AWS SDK loading
  const { Amplify } = await import('aws-amplify');
  // Validate required environment variables
  const requiredVars = {
    userPoolId: env.COGNITO_USER_POOL_ID,
    userPoolClientId: env.COGNITO_USER_POOL_CLIENT_ID,
    region: env.AWS_REGION
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('Missing required Cognito configuration:', missingVars);
    return false;
  }

  try {
    // Amplify v6 configuration format
    const amplifyConfig: AmplifyV6Config = {
      Auth: {
        Cognito: {
          userPoolId: requiredVars.userPoolId,
          userPoolClientId: requiredVars.userPoolClientId,
          identityPoolId: env.COGNITO_IDENTITY_POOL_ID,
          region: requiredVars.region,
          signUpVerificationMethod: 'link',
          loginWith: {
            email: true,
            username: false,
            phone: false
          }
        }
      }
    };

    Amplify.configure(amplifyConfig);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to configure Amplify:', error);
    return false;
  }
};