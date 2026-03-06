/**
 * AWS Cognito SDK error names returned in error.name
 * Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_Operations.html
 */
export const COGNITO_ERRORS = Object.freeze({
  NOT_AUTHORIZED: 'NotAuthorizedException',
  USER_NOT_FOUND: 'UserNotFoundException',
  USERNAME_EXISTS: 'UsernameExistsException',
  INVALID_PASSWORD: 'InvalidPasswordException',
  CODE_MISMATCH: 'CodeMismatchException',
  EXPIRED_CODE: 'ExpiredCodeException',
  LIMIT_EXCEEDED: 'LimitExceededException',
  CODE_DELIVERY_FAILURE: 'CodeDeliveryFailureException',
  TOO_MANY_REQUESTS: 'TooManyRequestsException',
});
