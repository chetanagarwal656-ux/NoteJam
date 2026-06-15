import asyncio
import websockets
import json
import os
import math
import struct

async def test_ws():
    uri = "ws://localhost:8000/ws/voice"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected.")
            # Send initial config
            await websocket.send(json.dumps({"markdown": "# Test Notes"}))
            print("Sent config.")
            
            # Start a background task to receive from gemini
            async def receive_gemini():
                while True:
                    try:
                        response = await websocket.recv()
                        print(f"Received bytes from Gemini: {len(response)}")
                    except Exception as e:
                        print(f"Receive loop error: {e}")
                        break
            
            asyncio.create_task(receive_gemini())
            
            # Wait for Gemini's greeting to finish
            await asyncio.sleep(5)
            
            print("Sending simulated speech (sine wave)...")
            # Generate 3 seconds of 440Hz sine wave at 16000 sample rate
            sample_rate = 16000
            duration = 3
            frequency = 440.0
            
            for chunk_idx in range(duration * 4): # send 250ms chunks
                chunk = []
                for i in range(int(sample_rate / 4)):
                    t = (chunk_idx * (sample_rate / 4) + i) / sample_rate
                    # sine wave
                    val = int(32767 * math.sin(2 * math.pi * frequency * t))
                    chunk.append(val)
                
                # Pack as 16-bit PCM little-endian
                binary_chunk = struct.pack(f'<{len(chunk)}h', *chunk)
                await websocket.send(binary_chunk)
                await asyncio.sleep(0.25)
            
            print("Finished sending speech. Waiting for response...")
            await asyncio.sleep(10)
            
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test_ws())
