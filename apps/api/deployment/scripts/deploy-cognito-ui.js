#!/usr/bin/env node

/**
 * Deploy Cognito UI Customization Script
 * This script updates the Cognito UI customization using AWS SDK
 * Integrates with Serverless Framework deployment
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  stage: process.env.STAGE || 'dev',
  serviceName: 'my-many-books-api',
  cssFile: path.join(__dirname, '../cognito/cognito-ui-custom.css')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ERROR: ${message}`, colors.red);
}

function logSuccess(message) {
  log(`✅ SUCCESS: ${message}`, colors.green);
}

function logInfo(message) {
  log(`ℹ️  INFO: ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  WARNING: ${message}`, colors.yellow);
}

/**
 * Get CloudFormation stack outputs from Serverless deployment
 */
async function getStackOutputs() {
  const cloudformation = new AWS.CloudFormation({ region: CONFIG.region });
  const stackName = `${CONFIG.serviceName}-${CONFIG.stage}`;
  
  try {
    logInfo(`Getting outputs from stack: ${stackName}`);
    const result = await cloudformation.describeStacks({
      StackName: stackName
    }).promise();
    
    const outputs = {};
    if (result.Stacks[0] && result.Stacks[0].Outputs) {
      result.Stacks[0].Outputs.forEach(output => {
        outputs[output.OutputKey] = output.OutputValue;
      });
    }
    
    return outputs;
  } catch (error) {
    logError(`Failed to get stack outputs: ${error.message}`);
    logError(`Make sure the Serverless stack '${stackName}' is deployed first.`);
    process.exit(1);
  }
}

/**
 * Read CSS file content
 */
function readCSSFile() {
  try {
    if (!fs.existsSync(CONFIG.cssFile)) {
      logError(`CSS file not found: ${CONFIG.cssFile}`);
      process.exit(1);
    }
    
    const cssContent = fs.readFileSync(CONFIG.cssFile, 'utf8');
    logInfo(`CSS file loaded: ${CONFIG.cssFile}`);
    return cssContent;
  } catch (error) {
    logError(`Failed to read CSS file: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Create Cognito domain if it doesn't exist
 */
async function ensureCognitoDomain(userPoolId) {
  const cognito = new AWS.CognitoIdentityServiceProvider({ region: CONFIG.region });
  const domainName = `${CONFIG.serviceName.replace('_', '-')}-${CONFIG.stage}`;
  
  try {
    // Check if domain already exists
    await cognito.describeUserPoolDomain({
      Domain: domainName
    }).promise();
    
    logInfo(`Cognito domain already exists: ${domainName}`);
    return domainName;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      // Domain doesn't exist, create it
      try {
        logInfo(`Creating Cognito domain: ${domainName}`);
        await cognito.createUserPoolDomain({
          Domain: domainName,
          UserPoolId: userPoolId
        }).promise();
        
        logSuccess(`Cognito domain created: ${domainName}`);
        return domainName;
      } catch (createError) {
        logError(`Failed to create Cognito domain: ${createError.message}`);
        process.exit(1);
      }
    } else {
      logError(`Failed to check Cognito domain: ${error.message}`);
      process.exit(1);
    }
  }
}

/**
 * Update Cognito UI customization
 */
async function updateCognitoUI(userPoolId, clientId, cssContent) {
  const cognito = new AWS.CognitoIdentityServiceProvider({ region: CONFIG.region });
  
  try {
    logInfo('Updating Cognito UI customization...');
    
    const params = {
      UserPoolId: userPoolId,
      ClientId: clientId,
      CSS: cssContent
    };
    
    await cognito.setUICustomization(params).promise();
    logSuccess('Cognito UI customization updated successfully');
    
    // Get the hosted UI URL
    const domain = await ensureCognitoDomain(userPoolId);
    const hostedUIUrl = `https://${domain}.auth.${CONFIG.region}.amazoncognito.com/login?client_id=${clientId}&response_type=code&scope=email+openid+profile&redirect_uri=http://localhost:5173`;
    
    logSuccess(`Cognito Hosted UI URL: ${hostedUIUrl}`);
    
    return hostedUIUrl;
  } catch (error) {
    logError(`Failed to update Cognito UI: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main deployment function
 */
async function deployUI() {
  try {
    logInfo('Starting Cognito UI deployment...');
    logInfo(`Environment: ${CONFIG.stage}`);
    logInfo(`Region: ${CONFIG.region}`);
    
    // Configure AWS SDK
    AWS.config.update({ region: CONFIG.region });
    
    // Get stack outputs
    const outputs = await getStackOutputs();
    
    const userPoolId = outputs.CognitoUserPoolId;
    const clientId = outputs.CognitoUserPoolClientId;
    
    if (!userPoolId || !clientId) {
      logError('Missing required Cognito resources from CloudFormation outputs');
      logError('Required outputs: CognitoUserPoolId, CognitoUserPoolClientId');
      logError('Available outputs:', Object.keys(outputs));
      process.exit(1);
    }
    
    logInfo(`User Pool ID: ${userPoolId}`);
    logInfo(`Client ID: ${clientId}`);
    
    // Read CSS content
    const cssContent = readCSSFile();
    
    // Ensure domain exists and update UI
    await updateCognitoUI(userPoolId, clientId, cssContent);
    
    logSuccess('🎉 Cognito UI deployment completed successfully!');
    
  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node deploy-cognito-ui.js [options]

Options:
  --stage, -s <stage>     Deployment stage (default: dev)
  --region, -r <region>   AWS region (default: us-east-1)
  --help, -h              Show help

Environment Variables:
  STAGE                   Deployment stage
  AWS_REGION             AWS region
  AWS_PROFILE            AWS profile to use

Examples:
  node deploy-cognito-ui.js
  node deploy-cognito-ui.js --stage prod --region us-west-2
  STAGE=staging AWS_REGION=eu-west-1 node deploy-cognito-ui.js
`);
  process.exit(0);
}

// Parse stage and region from args
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--stage' || args[i] === '-s') && args[i + 1]) {
    CONFIG.stage = args[i + 1];
    i++;
  } else if ((args[i] === '--region' || args[i] === '-r') && args[i + 1]) {
    CONFIG.region = args[i + 1];
    i++;
  }
}

// Run deployment
if (require.main === module) {
  deployUI().catch(error => {
    logError(`Unhandled error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { deployUI, getStackOutputs };