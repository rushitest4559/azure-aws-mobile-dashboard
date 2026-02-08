import boto3
from concurrent.futures import ThreadPoolExecutor

def get_asgs_in_region(region):
    """Fetches all Auto Scaling Groups for a specific region."""
    try:
        asg_client = boto3.client('autoscaling', region_name=region)
        paginator = asg_client.get_paginator('describe_auto_scaling_groups')
        
        asgs = []
        # Pagination ensures we catch all ASGs if there are more than 50
        for page in paginator.paginate():
            for group in page.get('AutoScalingGroups', []):
                asgs.append({
                    'Region': region,
                    'AutoScalingGroupName': group['AutoScalingGroupName'],
                    'DesiredCapacity': group['DesiredCapacity'],
                    'MinSize': group['MinSize'],
                    'MaxSize': group['MaxSize'],
                    'InstanceCount': len(group.get('Instances', []))
                })
        return asgs
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_asgs_parallel():
    """Fetches all ASGs across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    # Use describe_regions to get the current list of enabled regions
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_asgs = []
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = executor.map(get_asgs_in_region, regions)
    
    for result in results:
        all_asgs.extend(result)
        
    return all_asgs

if __name__ == "__main__":
    asg_list = fetch_all_asgs_parallel()
    for asg in asg_list:
        print(asg)