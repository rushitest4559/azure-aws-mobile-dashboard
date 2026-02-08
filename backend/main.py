import json
from methods.instance import fetch_all_ec2_parallel

# 1. Routes mapping
ROUTES = {
    "/aws/ec2/list": fetch_all_ec2_parallel,
    # Future paths: "/aws/s3/list": fetch_all_s3_buckets
}

def router(event, context):
    """
    The main entry point for AWS Lambda.
    'event' contains all the data from API Gateway.
    """
    # 2. Extract the path from the API Gateway event
    # For {proxy+}, the path is usually found in event['path']
    path = event.get('path', '')
    
    print(f"Received request for path: {path}")
    
    # 3. Route to the correct function
    func = ROUTES.get(path)
    
    if not func:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": f"Path '{path}' not found"}),
            "headers": {"Content-Type": "application/json"}
        }

    try:
        # 4. Execute your logic
        result = func()
        
        # 5. Return the response in the format API Gateway expects
        return {
            "statusCode": 200,
            "body": json.dumps(result),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" # Useful for frontend later
            }
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error", "details": str(e)}),
            "headers": {"Content-Type": "application/json"}
        }

# Keep this for local testing: python main.py
if __name__ == "__main__":
    # Mock event for local testing
    mock_event = {"path": "/aws/ec2/list"}
    print(router(mock_event, None))