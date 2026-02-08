import boto3
from concurrent.futures import ThreadPoolExecutor

def get_lbs_in_region(region):
    """Fetches all ELBv2 load balancers for a specific region."""
    try:
        # Use 'elbv2' for Application, Network, and Gateway Load Balancers
        elbv2 = boto3.client('elbv2', region_name=region)
        paginator = elbv2.get_paginator('describe_load_balancers')
        
        lbs = []
        for page in paginator.paginate():
            for lb in page.get('LoadBalancers', []):
                lbs.append({
                    'Region': region,
                    'Name': lb['LoadBalancerName'],
                    'DNSName': lb['DNSName'],
                    'Type': lb['Type'],
                    'State': lb['State']['Code']
                })
        return lbs
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_lbs_parallel():
    """Fetches all load balancers across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_lbs = []
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = list(executor.map(get_lbs_in_region, regions))
    
    for result in results:
        all_lbs.extend(result)
        
    return all_lbs

# Execute and print
if __name__ == "__main__":
    load_balancers = fetch_all_lbs_parallel()
    for lb in load_balancers:
        print(lb)