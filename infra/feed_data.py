import boto3, os
from dotenv import load_dotenv
import azure.identity, azure.mgmt.storage, azure.mgmt.resource

load_dotenv()

def delete_distributed_dummies(sub_id, base_rg="DummyRG"):
    cred = azure.identity.DefaultAzureCredential()
    rm_client = azure.mgmt.resource.ResourceManagementClient(cred, sub_id)
    st_client = azure.mgmt.storage.StorageManagementClient(cred, sub_id)
    
    # 1. Azure: Delete Storage Accounts (25 across 3 RGs)
    az_regions = ['eastus', 'westus', 'northeurope']
    for i in range(3):
        rg_name = f"{base_rg}-{i}"
        try:
            # List all storage accounts in RG matching dummyacc pattern
            accounts = st_client.storage_accounts.list_by_resource_group(rg_name)
            for acc in accounts:
                if acc.name.startswith('dummyacc'):
                    st_client.storage_accounts.begin_delete(rg_name, acc.name)
                    print(f"Azure: Deleting {acc.name} in {rg_name}")
            
            # Delete RG after accounts (handles any leftovers)
            rm_client.resource_groups.begin_delete(rg_name)
            print(f"Azure: Deleting RG {rg_name}")
        except:
            print(f"Azure: RG {rg_name} already gone or access denied")
    
    # 2. AWS: Delete Buckets (25 across 4 regions)  
    aws_regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1']
    s3 = boto3.client('s3')
    
    # List all buckets and delete dummy-bucket-* ones
    buckets = s3.list_buckets()['Buckets']
    for bucket in buckets:
        name = bucket['Name']
        if name.startswith('dummy-bucket-'):
            # Empty bucket first
            try:
                bucket_obj = s3.get_bucket_location(Bucket=name)
                region = bucket_obj['LocationConstraint'] or 'us-east-1'
                s3_reg = boto3.client('s3', region_name=region)
                
                # Delete all objects
                paginator = s3_reg.get_paginator('list_object_versions')
                for page in paginator.paginate(Bucket=name):
                    for obj in page.get('Versions', []):
                        s3_reg.delete_object(Bucket=name, Key=obj['Key'], VersionId=obj['VersionId'])
                    for obj in page.get('DeleteMarkers', []):
                        s3_reg.delete_object(Bucket=name, Key=obj['Key'], VersionId=obj['VersionId'])
                
                s3_reg.delete_bucket(Bucket=name)
                print(f"AWS: Deleted {name} in {region}")
            except Exception as e:
                print(f"AWS: Failed to delete {name}: {e}")

# Run cleanup
delete_distributed_dummies(os.getenv("ARM_SUBSCRIPTION_ID"))
