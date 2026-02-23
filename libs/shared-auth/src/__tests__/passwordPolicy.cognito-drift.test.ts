import fs from 'node:fs';
import path from 'node:path';
import { PASSWORD_POLICY } from '../passwordPolicy';

function readCognitoPasswordPolicyBlock(): string {
  const repoRoot = path.resolve(__dirname, '../../../../');
  const filePath = path.join(repoRoot, 'apps/api/deployment/cloudformation/cognito-stack.yml');
  const content = fs.readFileSync(filePath, 'utf8');

  const match = content.match(
    /PasswordPolicy:\s*\n([\s\S]*?)\n\s*EmailConfiguration:/
  );

  if (!match?.[1]) {
    throw new Error('Could not find Cognito PasswordPolicy block in cognito-stack.yml');
  }

  return match[1];
}

function parseBool(block: string, key: string): boolean {
  const match = block.match(new RegExp(`${key}:\\s*(true|false)`, 'i'));
  if (!match?.[1]) {
    throw new Error(`Missing boolean key ${key} in Cognito PasswordPolicy`);
  }
  return match[1].toLowerCase() === 'true';
}

function parseNumber(block: string, key: string): number {
  const match = block.match(new RegExp(`${key}:\\s*(\\d+)`, 'i'));
  if (!match?.[1]) {
    throw new Error(`Missing numeric key ${key} in Cognito PasswordPolicy`);
  }
  return Number(match[1]);
}

describe('PASSWORD_POLICY drift guard against Cognito CloudFormation policy', () => {
  it('matches apps/api/deployment/cloudformation/cognito-stack.yml PasswordPolicy', () => {
    const block = readCognitoPasswordPolicyBlock();

    const cognitoPolicy = {
      minLength: parseNumber(block, 'MinimumLength'),
      requireLowercase: parseBool(block, 'RequireLowercase'),
      requireNumbers: parseBool(block, 'RequireNumbers'),
      requireSymbols: parseBool(block, 'RequireSymbols'),
      requireUppercase: parseBool(block, 'RequireUppercase'),
    };

    expect(PASSWORD_POLICY).toEqual(cognitoPolicy);
  });
});
