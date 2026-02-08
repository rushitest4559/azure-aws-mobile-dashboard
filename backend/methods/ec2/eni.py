import boto3
from concurrent.futures import ThreadPoolExecutor

def get_enis_in_region(region):
    """Fetches all Network Interfaces and their IPs for a specific region."""
    try:
        ec2 = boto3.client('ec2', region_name=region)
        paginator = ec2.get_paginator('describe_network_interfaces')
        
        enis = []
        for page in paginator.paginate():
            for eni in page.get('NetworkInterfaces', []):
                # Extracting Association for Public IPs (Elastic IPs)
                assoc = eni.get('Association', {})
                
                enis.append({
                    'Region': region,
                    'NetworkInterfaceId': eni['NetworkInterfaceId'],
                    'Status': eni['Status'],
                    'PrivateIp': eni.get('PrivateIpAddress'),
                    'PublicIp': assoc.get('PublicIp', 'None'),
                    'Description': eni.get('Description', ''),
                    'InterfaceType': eni.get('InterfaceType'),
                    # Shows what is using this ENI (e.g., EKS, ELB, or an InstanceId)
                    'Attachment': eni.get('Attachment', {}).get('InstanceId', 'Service Managed')
                })
        return enis
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_enis_parallel():
    """Fetches all ENIs across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_enis = []
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = executor.map(get_enis_in_region, regions)
    
    for result in results:
        all_enis.extend(result)
        
    return all_enis

if __name__ == "__main__":
    network_interfaces = fetch_all_enis_parallel()
    print(f"Total ENIs found: {len(network_interfaces)}")
    for eni in network_interfaces[:10]: # Print sample
        print(eni)