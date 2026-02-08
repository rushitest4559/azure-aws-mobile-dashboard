import boto3
from concurrent.futures import ThreadPoolExecutor

def get_instances_in_region(region):
    """Fetches instances for a specific region."""
    try:
        ec2 = boto3.client('ec2', region_name=region)
        # describe_instances is an I/O bound operation
        response = ec2.describe_instances()
        instances = []
        for reservation in response.get('Reservations', []):
            for instance in reservation.get('Instances', []):
                instances.append({
                    'Region': region,
                    'InstanceId': instance['InstanceId'],
                    'State': instance['State']['Name'],
                    'Type': instance['InstanceType']
                })
        return instances
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_ec2_parallel():
    """Fetches all EC2 instances across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    # Get all available regions
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_instances = []
    
    # Use ThreadPoolExecutor for parallel network requests
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = executor.map(get_instances_in_region, regions)
    
    for result in results:
        all_instances.extend(result)
        
    return all_instances
