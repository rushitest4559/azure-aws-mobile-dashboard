import boto3
from concurrent.futures import ThreadPoolExecutor

def get_amis_in_region(region):
    """Fetches AMIs owned by this account in a specific region."""
    try:
        ec2 = boto3.client('ec2', region_name=region)
        # Filters to only include AMIs owned by 'self'
        response = ec2.describe_images(Owners=['self'])
        
        amis = []
        for image in response.get('Images', []):
            amis.append({
                'Region': region,
                'ImageId': image['ImageId'],
                'Name': image.get('Name', 'N/A'),
                'State': image['State'],
                'CreationDate': image['CreationDate'],
                'Public': image['Public'],
                'Architecture': image['Architecture']
            })
        return amis
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_amis_parallel():
    """Fetches all AMIs across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_amis = []
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = executor.map(get_amis_in_region, regions)
    
    for result in results:
        all_amis.extend(result)
        
    return all_amis

if __name__ == "__main__":
    my_amis = fetch_all_amis_parallel()
    print(f"Total AMIs found: {len(my_amis)}")
    for ami in my_amis:
        print(ami)