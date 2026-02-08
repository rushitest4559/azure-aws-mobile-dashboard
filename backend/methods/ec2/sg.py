import boto3
from concurrent.futures import ThreadPoolExecutor

def get_sgs_in_region(region):
    """Fetches all Security Groups for a specific region."""
    try:
        ec2 = boto3.client('ec2', region_name=region)
        paginator = ec2.get_paginator('describe_security_groups')
        
        sgs = []
        for page in paginator.paginate():
            for sg in page.get('SecurityGroups', []):
                sgs.append({
                    'Region': region,
                    'GroupName': sg['GroupName'],
                    'GroupId': sg['GroupId'],
                    'VpcId': sg.get('VpcId', 'N/A'),
                    'Description': sg.get('Description', ''),
                    # Count rules to show 'complexity' in your dashboard
                    'InboundRulesCount': len(sg.get('IpPermissions', [])),
                    'OutboundRulesCount': len(sg.get('IpPermissionsEgress', []))
                })
        return sgs
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_sgs_parallel():
    """Fetches all Security Groups across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_sgs = []
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = executor.map(get_sgs_in_region, regions)
    
    for result in results:
        all_sgs.extend(result)
        
    return all_sgs

if __name__ == "__main__":
    security_groups = fetch_all_sgs_parallel()
    print(f"Total Security Groups found: {len(security_groups)}")
    # Example: print first 5
    for sg in security_groups[:5]:
        print(sg)