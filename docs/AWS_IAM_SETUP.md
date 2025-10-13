# AWS IAM Setup for CI/CD Pipeline

This document describes the required IAM permissions for the `my-many-books-lambda-developer` user used by the GitHub Actions CI/CD pipeline.

## Required IAM Policies

The following AWS managed policies must be attached to the IAM user:

### Infrastructure Management
1. **AWSCloudFormationFullAccess**
   - Required for: Creating and managing CloudFormation stacks
   - Resources: Infrastructure stack deployment

2. **AmazonEC2FullAccess**
   - Required for: VPC, subnets, security groups, NAT gateways, internet gateways
   - Resources: Network infrastructure

3. **AmazonRDSFullAccess**
   - Required for: RDS database instance creation and management
   - Resources: MySQL database, parameter groups, subnet groups

4. **SecretsManagerReadWrite**
   - Required for: Database credentials management
   - Resources: RDS master password storage

### Application Deployment
5. **IAMFullAccess**
   - Required for: Creating Lambda execution roles and policies
   - Resources: Lambda IAM roles, RDS monitoring role

6. **AmazonAPIGatewayAdministrator**
   - Required for: API Gateway management via Serverless Framework
   - Resources: API endpoints, stages, deployments

7. **AmazonS3FullAccess**
   - Required for: Deployment artifacts and web app hosting
   - Resources: Lambda code bundles, static web assets, deployment bucket

8. **CloudWatchLogsFullAccess**
   - Required for: Application logging
   - Resources: Lambda logs, RDS logs, API Gateway logs

### Custom Policies
9. **S3BucketWebsiteAndPolicyManagement** (Custom)
    - Required for: S3 static website configuration
    - Resources: Web app bucket configuration

## Setup Commands

To attach these policies to the IAM user:

```bash
# Infrastructure policies
aws iam attach-user-policy --user-name my-many-books-lambda-developer \
  --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess

aws iam attach-user-policy --user-name my-many-books-lambda-developer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-user-policy --user-name my-many-books-lambda-developer \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

aws iam attach-user-policy --user-name my-many-books-lambda-developer \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# Application deployment policies
aws iam attach-user-policy --user-name my-many-books-lambda-developer \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess

aws iam attach-user-policy --user-name my-many-books-lambda-developer \
  --policy-arn arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator

aws iam attach-user-policy --user-name my-many-books-lambda-developer \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy --user-name my-many-books-lambda-developer \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

## Verification

To verify all policies are attached:

```bash
aws iam list-attached-user-policies --user-name my-many-books-lambda-developer
```

## Security Notes

- These are broad permissions suitable for a development/staging environment
- For production, consider using more restrictive policies with specific resource ARNs
- The IAM user credentials are stored as GitHub Secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- Rotate access keys periodically for security

## CloudFormation Resources Created

The infrastructure stack creates:
- VPC with public and private subnets (2 AZs)
- Internet Gateway (no NAT Gateway - cost optimization)
- RDS MySQL database (db.t3.micro, publicly accessible with security group)
- Security groups for RDS
- S3 bucket for deployment artifacts
- CloudWatch log groups
- Secrets Manager secret for database credentials
- SSM parameters for database endpoints

**Cost Optimization**: Lambda functions run outside VPC to eliminate NAT Gateway costs (~$32/month savings). RDS is publicly accessible but protected by security group restrictions.
