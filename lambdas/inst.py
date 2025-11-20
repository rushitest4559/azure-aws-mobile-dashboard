import boto3
from datetime import datetime, timezone, timedelta

# Indian Standard Time = UTC + 5:30
IST_OFFSET = timedelta(hours=5, minutes=30)

def lambda_handler(event, context):
    ec2_client = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2_client.describe_regions()['Regions']]
    
    total_instances = 0
    total_running = 0
    total_stopped = 0
    all_instances = []

    for region in regions:
        ec2 = boto3.resource('ec2', region_name=region)
        instances = ec2.instances.all()
        
        for i in instances:
            total_instances += 1
            state = i.state['Name']
            if state == 'running':
                total_running += 1
            elif state == 'stopped':
                total_stopped += 1
                
            all_instances.append({
                'Region': region,
                'InstanceId': i.id,
                'State': state,
                'Type': i.instance_type,
                'LaunchTime': i.launch_time.replace(tzinfo=timezone.utc) \
              .astimezone(timezone(IST_OFFSET)) \
              .strftime('%Y-%m-%d %H:%M:%S IST') if i.launch_time else 'N/A',
                'PublicIp': i.public_ip_address or 'None',
                'PrivateIp': i.private_ip_address or 'None',
                'Tags': {t['Key']: t['Value'] for t in (i.tags or [])}
            })

    summary = {
        'TotalInstances': total_instances,
        'Running': total_running,
        'Stopped': total_stopped,
        'AsOf': datetime.now(timezone(IST_OFFSET)).strftime('%Y-%m-%d %H:%M:%S IST')
    }

    return {
        'Summary': summary,
        'Instances': all_instances
    }

# Deploy tip: Give this Lambda an IAM role with ec2:DescribeRegions and ec2:DescribeInstances (or just AmazonEC2ReadOnlyAccess)
# It'll happily scan your entire empire like a bored sysadmin on coffee.