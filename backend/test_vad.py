import asyncio
import wave
import numpy as np
from scipy import signal
import io
from google import genai
from google.genai import types
from dotenv import load_dotenv
load_dotenv()

def resample_audio(wave_file_path):
    with wave.open(wave_file_path, 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        data = wf.readframes(n_frames)
        
    print(f"Original: {framerate}Hz, {n_channels} channels, {sampwidth} bytes/sample")
    audio = np.frombuffer(data, dtype=np.int16)
    
    if n_channels == 2:
        audio = audio[::2]
        
    if framerate != 16000:
        samples = round(len(audio) * float(16000) / framerate)
        audio = signal.resample(audio, samples).astype(np.int16)
        
    return audio.tobytes()

async def main():
    client = genai.Client()
    raw_pcm = resample_audio('speech.wav')
    print("Resampled length:", len(raw_pcm))
    
    config = types.LiveConnectConfig(response_modalities=['AUDIO'])
    async with client.aio.live.connect(model='gemini-2.5-flash-native-audio-latest', config=config) as s:
        print('Connected to Gemini Live API.')
        
        await s.send_client_content(
            turns=[types.Content(parts=[types.Part.from_text(text="Hello! The student has just connected to the voice session. Please greet them warmly, ask what they would like to study, and keep it brief.")])],
            turn_complete=True
        )
        print('Sent kickstart. Waiting 10s for model to finish greeting...')
        
        async def receive_gemini():
            async for msg in s.receive():
                if msg.server_content and msg.server_content.model_turn:
                    for p in msg.server_content.model_turn.parts:
                        if p.text: print('Model Text:', p.text)
                        if p.inline_data: print('Model Audio:', len(p.inline_data.data))
        
        asyncio.create_task(receive_gemini())
        
        await asyncio.sleep(10)
        
        chunk_size = 4096 * 2
        print('Sending audio...')
        for i in range(0, len(raw_pcm), chunk_size):
            chunk = raw_pcm[i:i+chunk_size]
            await s.send_realtime_input(audio=types.Blob(data=chunk, mime_type='audio/pcm;rate=16000'))
            await asyncio.sleep(0.25)
            
        print('Sending silence to trigger VAD...')
        for _ in range(20):
            await s.send_realtime_input(audio=types.Blob(data=b'\x00' * chunk_size, mime_type='audio/pcm;rate=16000'))
            await asyncio.sleep(0.25)
            
        print('Finished sending silence. Waiting for response...')
        await asyncio.sleep(10)

if __name__ == '__main__':
    asyncio.run(main())
