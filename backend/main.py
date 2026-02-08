import json
# Import only EC2-related discovery methods based on your folder structure
from methods.ec2.instance import fetch_all_ec2_parallel
from methods.ec2.lb import fetch_all_lbs_parallel
from methods.ec2.asg import fetch_all_asgs_parallel
from methods.ec2.ebs import fetch_all_volumes_parallel
from methods.ec2.snapshots import fetch_all_snapshots_parallel
from methods.ec2.key_pairs import fetch_all_keys_parallel
from methods.ec2.sg import fetch_all_sgs_parallel
from methods.ec2.eni import fetch_all_enis_parallel
from methods.ec2.ami import fetch_all_amis_parallel

# 1. Routes mapping for EC2 Dashboard
ROUTES = {
    "/aws/ec2/instances": fetch_all_ec2_parallel,
    "/aws/ec2/load-balancers": fetch_all_lbs_parallel,
    "/aws/ec2/asg": fetch_all_asgs_parallel,
    "/aws/ec2/volumes": fetch_all_volumes_parallel,
    "/aws/ec2/snapshots": fetch_all_snapshots_parallel,
    "/aws/ec2/key-pairs": fetch_all_keys_parallel,
    "/aws/ec2/security-groups": fetch_all_sgs_parallel,
    "/aws/ec2/enis": fetch_all_enis_parallel,
    "/aws/ec2/amis": fetch_all_amis_parallel,
}

def router(event, context):
    """
    The main entry point for AWS Lambda / API Gateway.
    """
    # 2. Extract path
    path = event.get('path', event.get('rawPath', ''))
    
    print(f"Request: {path}")
    
    # 3. Route to the correct function
    func = ROUTES.get(path)
    
    if not func:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": f"Path '{path}' not found"}),
            "headers": {"Content-Type": "application/json"}
        }

    try:
        # 4. Execute the discovery logic
        result = func()
        
        return {
            "statusCode": 200,
            "body": json.dumps(result, default=str), # default=str handles datetime/timestamps
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" # Required for Mobile/Web frontend
            }
        }
    except Exception as e:
        print(f"Critical Error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error", "details": str(e)}),
            "headers": {"Content-Type": "application/json"}
        }

if __name__ == "__main__":
    # Local Testing Example: Fetching instances
    test_event = {"path": "/aws/ec2/instances"}
    print(json.dumps(router(test_event, None), indent=2))