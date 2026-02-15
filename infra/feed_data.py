import boto3, uuid, os, azure.identity, azure.mgmt.storage, azure.mgmt.resource
from dotenv import load_dotenv

load_dotenv()

def create_distributed_dummies(sub_id, base_rg="DummyRG"):
    # 1. AWS: Create 25 Buckets across regions
    aws_regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1']
    for i in range(25):
        name, reg = f"dummy-bucket-{uuid.uuid4().hex[:8]}", aws_regions[i % len(aws_regions)]
        # Create a client specifically for this region to avoid LocationConstraint errors
        s3_reg = boto3.client('s3', region_name=reg)
        
        if reg == 'us-east-1':
            s3_reg.create_bucket(Bucket=name)
        else:
            s3_reg.create_bucket(
                Bucket=name, 
                CreateBucketConfiguration={'LocationConstraint': reg}
            )
        print(f"AWS: {name} in {reg}")

    # 2. Azure Setup
    cred = azure.identity.DefaultAzureCredential()
    rm_client = azure.mgmt.resource.ResourceManagementClient(cred, sub_id)
    st_client = azure.mgmt.storage.StorageManagementClient(cred, sub_id)
    
    az_regions = ['eastus', 'westus', 'northeurope']
    for i in range(3): 
        rm_client.resource_groups.create_or_update(f"{base_rg}-{i}", {'location': az_regions[i]})
    
    for i in range(25):
        rg, loc, name = f"{base_rg}-{i % 3}", az_regions[i % 3], f"dummyacc{uuid.uuid4().hex[:8]}"
        st_client.storage_accounts.begin_create(
            rg, name, 
            {'location': loc, 'sku': {'name': 'Standard_LRS'}, 'kind': 'StorageV2'}
        )
        print(f"Azure: {name} in {rg} ({loc})")

create_distributed_dummies(os.getenv("ARM_SUBSCRIPTION_ID"))