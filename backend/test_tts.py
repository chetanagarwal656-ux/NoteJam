import asyncio
import edge_tts

async def test():
    text = "नमस्ते चेतन, आज हम गणित के कुछ दिलचस्प विषयों पर बात करेंगे।"
    voice = "hi-IN-SwaraNeural"
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            
    with open("test_podcast.mp3", "wb") as f:
        f.write(audio_data)
    print("Done! Size:", len(audio_data))

asyncio.run(test())
