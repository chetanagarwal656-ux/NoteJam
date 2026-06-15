import requests

url = "http://localhost:8000/podcast"
payload = {
    "markdown": "This is a test lecture note about machine learning.",
    "language": "hindi",
    "scenario": "podcast"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error connecting to server: {e}")
