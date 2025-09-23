#!/bin/bash

# Setup Cognito Permissions for Deployment User
# This script attaches the required Cognito permissions to the deployment IAM user

set -e

# Configuration
IAM_USER_NAME="${IAM_USER_NAME:-my-many-books-lambda-developer}"
POLICY_NAME="my-many-books-cognito-deployment-policy"
POLICY_FILE="$(dirname "$0")/../iam/cognito-deployment-policy.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -u, --user USER_NAME      IAM user name [default: my-many-books-lambda-developer]"
    echo "  -p, --policy POLICY_NAME  Policy name [default: my-many-books-cognito-deployment-policy]"
    echo "  -f, --file POLICY_FILE    Policy file path"
    echo "  -h, --help                Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--user)
            IAM_USER_NAME="$2"
            shift 2
            ;;
        -p|--policy)
            POLICY_NAME="$2"
            shift 2
            ;;
        -f|--file)
            POLICY_FILE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

print_status "Setting up Cognito permissions..."
print_status "IAM User: $IAM_USER_NAME"
print_status "Policy Name: $POLICY_NAME"
print_status "Policy File: $POLICY_FILE"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if policy file exists
if [[ ! -f "$POLICY_FILE" ]]; then
    print_error "Policy file not found: $POLICY_FILE"
    exit 1
fi

# Check if IAM user exists
print_status "Checking if IAM user exists..."
if ! aws iam get-user --user-name "$IAM_USER_NAME" &> /dev/null; then
    print_error "IAM user '$IAM_USER_NAME' does not exist."
    print_error "Please create the user first or specify the correct user name."
    exit 1
fi

print_status "IAM user '$IAM_USER_NAME' found."

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

print_status "AWS Account ID: $ACCOUNT_ID"
print_status "Policy ARN: $POLICY_ARN"

# Check if policy already exists
print_status "Checking if policy exists..."
if aws iam get-policy --policy-arn "$POLICY_ARN" &> /dev/null; then
    print_warning "Policy '$POLICY_NAME' already exists. Updating..."
    
    # Create a new policy version
    print_status "Creating new policy version..."
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "file://$POLICY_FILE" \
        --set-as-default
    
    print_status "Policy updated successfully."
else
    print_status "Creating new policy..."
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "file://$POLICY_FILE" \
        --description "Cognito deployment permissions for My Many Books project"
    
    print_status "Policy created successfully."
fi

# Check if policy is already attached to user
print_status "Checking if policy is attached to user..."
if aws iam list-attached-user-policies --user-name "$IAM_USER_NAME" --query "AttachedPolicies[?PolicyArn=='$POLICY_ARN']" --output text | grep -q "$POLICY_ARN"; then
    print_status "Policy is already attached to user."
else
    print_status "Attaching policy to user..."
    aws iam attach-user-policy \
        --user-name "$IAM_USER_NAME" \
        --policy-arn "$POLICY_ARN"
    
    print_status "Policy attached successfully."
fi

# List current user policies for verification
print_status "Current policies attached to user '$IAM_USER_NAME':"
aws iam list-attached-user-policies --user-name "$IAM_USER_NAME" --query "AttachedPolicies[*].[PolicyName,PolicyArn]" --output table

print_status "✅ Cognito permissions setup completed successfully!"
print_status "The user '$IAM_USER_NAME' now has the required permissions to deploy Cognito resources."
print_status ""
print_status "You can now run:"
print_status "  npm run deploy:dev"
print_status "  npm run deploy:cognito-ui:dev"