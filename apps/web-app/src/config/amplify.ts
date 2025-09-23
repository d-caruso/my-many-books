import { Amplify } from 'aws-amplify';
import { env } from './env';

export const configureAmplify = () => {
  if (!env.COGNITO_USER_POOL_ID || !env.COGNITO_USER_POOL_CLIENT_ID) {
    console.warn('Cognito configuration missing');
    return false;
  }

  try {
    // Use legacy configuration format to avoid v6 OAuth issues
    const amplifyConfig = {
      aws_project_region: env.AWS_REGION || 'us-east-1',
      aws_cognito_region: env.AWS_REGION || 'us-east-1',
      aws_user_pools_id: env.COGNITO_USER_POOL_ID,
      aws_user_pools_web_client_id: env.COGNITO_USER_POOL_CLIENT_ID,
      aws_cognito_signup_attributes: ['EMAIL'],
      aws_cognito_mfa_configuration: 'OFF',
      aws_cognito_verification_mechanisms: ['EMAIL']
    };

    console.log('Configuring Amplify with v6 format:', amplifyConfig);
    
    Amplify.configure(amplifyConfig);

    console.log('Amplify configured successfully');
    return true;
  } catch (error) {
    console.error('Failed to configure Amplify:', error);
    return false;
  }
};