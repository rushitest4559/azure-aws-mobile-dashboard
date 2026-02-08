import boto3
from concurrent.futures import ThreadPoolExecutor

def get_volumes_in_region(region):
    """Fetches all EBS volumes for a specific region."""
    try:
        ec2 = boto3.client('ec2', region_name=region)
        paginator = ec2.get_paginator('describe_volumes')
        
        volumes = []
        for page in paginator.paginate():
            for vol in page.get('Volumes', []):
                volumes.append({
                    'Region': region,
                    'VolumeId': vol['VolumeId'],
                    'Size': vol['Size'],
                    'Type': vol['VolumeType'],
                    'State': vol['State'],
                    'InstanceId': vol['Attachments'][0]['InstanceId'] if vol['Attachments'] else 'Unattached'
                })
        return volumes
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_volumes_parallel():
    """Fetches all EBS volumes across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_volumes = []
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = executor.map(get_volumes_in_region, regions)
    
    for result in results:
        all_volumes.extend(result)
        
    return all_volumes

if __name__ == "__main__":
    volumes = fetch_all_volumes_parallel()
    for vol in volumes:
        print(vol)