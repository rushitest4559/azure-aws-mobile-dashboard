import os
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.storage import StorageManagementClient

load_dotenv()
SUBSCRIPTION_ID = os.getenv("ARM_SUBSCRIPTION_ID")
RG_NAME, STG_NAME, CONTAINER, LOCATION = "tf-state-rg", "tfstate" + os.urandom(4).hex(), "tfstate-container", "eastus"

credential = DefaultAzureCredential()
res_client = ResourceManagementClient(credential, SUBSCRIPTION_ID)
stg_client = StorageManagementClient(credential, SUBSCRIPTION_ID)

def manage_storage():
    try:
        if res_client.resource_groups.check_existence(RG_NAME):
            if input(f"RG {RG_NAME} exists. Delete? (y/n): ").lower() == 'y':
                res_client.resource_groups.begin_delete(RG_NAME).result()
                print("Deleted.")
        else:
            if input(f"RG {RG_NAME} not found. Create stack? (y/n): ").lower() == 'y':
                res_client.resource_groups.create_or_update(RG_NAME, {"location": LOCATION})
                stg_client.storage_accounts.begin_create(RG_NAME, STG_NAME, {"location": LOCATION, "sku": {"name": "Standard_LRS"}, "kind": "StorageV2"}).result()
                stg_client.blob_containers.create(RG_NAME, STG_NAME, CONTAINER, {})
                print(f"Created RG: {RG_NAME}, Account: {STG_NAME}, Container: {CONTAINER}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    manage_storage()