import boto3
from concurrent.futures import ThreadPoolExecutor

def get_snapshots_in_region(region):
    """Fetches EBS snapshots owned by this account in a specific region."""
    try:
        ec2 = boto3.client('ec2', region_name=region)
        # Using a paginator because accounts often have hundreds of snapshots
        paginator = ec2.get_paginator('describe_snapshots')
        
        snapshots = []
        # Filter for 'self' to only get your own snapshots
        for page in paginator.paginate(OwnerIds=['self']):
            for snap in page.get('Snapshots', []):
                snapshots.append({
                    'Region': region,
                    'SnapshotId': snap['SnapshotId'],
                    'VolumeId': snap['VolumeId'],
                    'SizeGb': snap['VolumeSize'],
                    'StartTime': snap['StartTime'].strftime("%Y-%m-%d %H:%M:%S"),
                    'State': snap['State'],
                    'Progress': snap['Progress'],
                    'Description': snap.get('Description', '')
                })
        return snapshots
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_snapshots_parallel():
    """Fetches all snapshots across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_snapshots = []
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = executor.map(get_snapshots_in_region, regions)
    
    for result in results:
        all_snapshots.extend(result)
        
    return all_snapshots

if __name__ == "__main__":
    my_snapshots = fetch_all_snapshots_parallel()
    print(f"Total Snapshots found: {len(my_snapshots)}")
    for snap in my_snapshots[:10]: # Print first 10
        print(snap)