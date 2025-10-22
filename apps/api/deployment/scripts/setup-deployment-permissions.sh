#!/bin/bash

# ================================================================
# setup-deployment-permissions.sh
# One-time setup script to grant deployment permissions
# ================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
POLICY_FILE="${PROJECT_ROOT}/deployment/iam/serverless-deployment-policy.json"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Serverless Deployment Permissions Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if policy file exists
if [ ! -f "$POLICY_FILE" ]; then
    echo -e "${RED}Error: Policy file not found at ${POLICY_FILE}${NC}"
    exit 1
fi

# Get current AWS identity
echo -e "${YELLOW}Checking AWS credentials...${NC}"
IDENTITY=$(aws sts get-caller-identity 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Unable to get AWS identity. Please configure AWS credentials.${NC}"
    echo -e "${YELLOW}Run: aws configure${NC}"
    exit 1
fi

ACCOUNT_ID=$(echo $IDENTITY | jq -r '.Account')
USER_ARN=$(echo $IDENTITY | jq -r '.Arn')
USER_ID=$(echo $IDENTITY | jq -r '.UserId')

echo -e "${GREEN}✓ AWS Identity verified${NC}"
echo -e "  Account: ${ACCOUNT_ID}"
echo -e "  ARN: ${USER_ARN}"
echo ""

# Extract user name or role name from ARN
if [[ $USER_ARN == *":user/"* ]]; then
    IDENTITY_TYPE="user"
    IDENTITY_NAME=$(echo $USER_ARN | cut -d'/' -f2)
elif [[ $USER_ARN == *":assumed-role/"* ]]; then
    IDENTITY_TYPE="role"
    IDENTITY_NAME=$(echo $USER_ARN | cut -d'/' -f2)
else
    echo -e "${RED}Error: Unable to determine identity type from ARN${NC}"
    exit 1
fi

echo -e "${YELLOW}Identity Type: ${IDENTITY_TYPE}${NC}"
echo -e "${YELLOW}Identity Name: ${IDENTITY_NAME}${NC}"
echo ""

# Generate policy name
POLICY_NAME="MyManyBooksServerlessDeploymentPolicy"

echo -e "${BLUE}Step 1: Creating IAM Policy${NC}"
echo -e "Policy Name: ${POLICY_NAME}"
echo ""

# Check if policy already exists
EXISTING_POLICY_ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='${POLICY_NAME}'].Arn" --output text 2>/dev/null)

if [ -n "$EXISTING_POLICY_ARN" ]; then
    echo -e "${YELLOW}Policy already exists: ${EXISTING_POLICY_ARN}${NC}"
    POLICY_ARN=$EXISTING_POLICY_ARN

    # Update the policy with new version
    echo -e "${YELLOW}Updating policy to latest version...${NC}"
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "file://${POLICY_FILE}" \
        --set-as-default \
        >/dev/null 2>&1

    echo -e "${GREEN}✓ Policy updated successfully${NC}"
else
    # Create new policy
    echo -e "${YELLOW}Creating new policy...${NC}"
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "file://${POLICY_FILE}" \
        --description "Deployment permissions for My Many Books Serverless API" \
        --query 'Policy.Arn' \
        --output text)

    echo -e "${GREEN}✓ Policy created successfully${NC}"
    echo -e "  ARN: ${POLICY_ARN}"
fi

echo ""
echo -e "${BLUE}Step 2: Attaching Policy to ${IDENTITY_TYPE}: ${IDENTITY_NAME}${NC}"
echo ""

if [ "$IDENTITY_TYPE" = "user" ]; then
    # Attach to user
    aws iam attach-user-policy \
        --user-name "$IDENTITY_NAME" \
        --policy-arn "$POLICY_ARN" \
        2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Policy attached to user successfully${NC}"
    else
        echo -e "${YELLOW}Note: Policy may already be attached or you may need admin permissions${NC}"
    fi
elif [ "$IDENTITY_TYPE" = "role" ]; then
    # Attach to role
    aws iam attach-role-policy \
        --role-name "$IDENTITY_NAME" \
        --policy-arn "$POLICY_ARN" \
        2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Policy attached to role successfully${NC}"
    else
        echo -e "${YELLOW}Note: Policy may already be attached or you may need admin permissions${NC}"
    fi
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Wait 10-15 seconds for permissions to propagate"
echo -e "  2. Run: ${YELLOW}npm run deploy:dev${NC}"
echo -e "  3. Or: ${YELLOW}serverless deploy --stage dev --region us-west-2${NC}"
echo ""
echo -e "${BLUE}Policy Details:${NC}"
echo -e "  Name: ${POLICY_NAME}"
echo -e "  ARN: ${POLICY_ARN}"
echo -e "  Attached to: ${IDENTITY_TYPE}/${IDENTITY_NAME}"
echo ""
