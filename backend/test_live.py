import asyncio
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client()

async def find_live_model():
    sys_prompt = "Hello"
    live_config = types.LiveConnectConfig(
        system_instruction=types.Content(parts=[types.Part.from_text(text=sys_prompt)]),
        response_modalities=["AUDIO"],
    )
    
    models = client.models.list()
    model_names = [m.name.replace('models/', '') for m in models]
    model_names.append("gemini-2.0-flash-exp")
    
    for model_name in model_names:
        try:
            print(f"Trying {model_name}...")
            async with client.aio.live.connect(model=model_name, config=live_config) as session:
                await session.send(input="Hello", end_of_turn=True)
                async for message in session.receive():
                    print(f"\nSUCCESS! {model_name} supports Live API!")
                    return model_name
        except Exception as e:
            print(f"Failed {model_name}: {e}")
    print("None supported.")

asyncio.run(find_live_model())
