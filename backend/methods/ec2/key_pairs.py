import boto3
from concurrent.futures import ThreadPoolExecutor

def get_keys_in_region(region):
    """Fetches all EC2 Key Pairs for a specific region."""
    try:
        ec2 = boto3.client('ec2', region_name=region)
        # describe_key_pairs does not currently support pagination in Boto3 
        # as most accounts have a small number of keys (limit is usually 5000).
        response = ec2.describe_key_pairs()
        
        keys = []
        for key in response.get('KeyPairs', []):
            keys.append({
                'Region': region,
                'KeyName': key['KeyName'],
                'KeyPairId': key.get('KeyPairId'),
                'KeyType': key.get('KeyType', 'rsa'),  # RSA or ED25519
                'Fingerprint': key.get('KeyFingerprint')
            })
        return keys
    except Exception as e:
        return [f"Error in {region}: {str(e)}"]

def fetch_all_keys_parallel():
    """Fetches all Key Pairs across all regions in parallel."""
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    all_keys = []
    with ThreadPoolExecutor(max_workers=len(regions)) as executor:
        results = executor.map(get_keys_in_region, regions)
    
    for result in results:
        all_keys.extend(result)
        
    return all_keys

if __name__ == "__main__":
    key_pairs = fetch_all_keys_parallel()
    for kp in key_pairs:
        print(kp)