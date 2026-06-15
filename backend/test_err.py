import urllib.request
import urllib.error
import json

try:
    req = urllib.request.Request(
        'http://localhost:8000/flashcards',
        data=json.dumps({"markdown": "The mitochondria is the powerhouse of the cell. The cell membrane is semi-permeable."}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    print("Success:", res.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode())
except Exception as e:
    print("Other Error:", e)
