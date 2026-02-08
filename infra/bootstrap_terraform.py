import boto3
from botocore.exceptions import ClientError

REGION = "ap-south-1"
BUCKET_NAME = "aws-mobile-dashboard-tf-state"
TABLE_NAME = "aws-mobile-dashboard-lock-table"

def bootstrap():
    s3 = boto3.client('s3', region_name=REGION)
    ddb = boto3.client('dynamodb', region_name=REGION)

    # 1. Create S3 Bucket with Mumbai Location Constraint
    try:
        print(f"Creating bucket: {BUCKET_NAME} in {REGION}...")
        s3.create_bucket(
            Bucket=BUCKET_NAME,
            CreateBucketConfiguration={'LocationConstraint': REGION}
        )
        s3.put_bucket_versioning(
            Bucket=BUCKET_NAME,
            VersioningConfiguration={'Status': 'Enabled'}
        )
        print("S3 Bucket created successfully.")
    except ClientError as e:
        print(f"S3 Error: {e.response['Error']['Message']}")

    # 2. Create DynamoDB Table
    try:
        print(f"Creating table: {TABLE_NAME}...")
        ddb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[{'AttributeName': 'LockID', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'LockID', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST' # More cost-effective for small projects
        )
        print("DynamoDB Table created successfully.")
    except ClientError as e:
        print(f"DynamoDB Error: {e.response['Error']['Message']}")

if __name__ == "__main__":
    bootstrap()