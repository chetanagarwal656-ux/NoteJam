import asyncio
import json
import os
import uuid

import edge_tts
from google import genai
from google.genai import types

from dotenv import load_dotenv
load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

async def test_podcast():
    try:
        scenario_desc = "A deep-dive podcast touching all topics from different angles."
        markdown = "The derivative is the rate of change of a function."
        language = "hindi"

        prompt = f"""
You are a master scriptwriter. Create an engaging educational audio script based on the following lecture notes.
Language: {language} (If Hindi, use natural conversational Hindi written in Devanagari script).
Scenario: {scenario_desc}

Host 1: Chetan (Curious, insightful, drives the conversation, asks great questions)
Host 2: Anamika (Knowledgeable Indian college girl, connects dots, provides deep intuitions and context)

The script MUST be returned as a raw JSON array of objects, with NO markdown formatting, NO ```json blocks. Just the raw JSON array.
Example:
[
  {{"speaker": "Chetan", "text": "Hi Anamika, today we are looking at..."}},
  {{"speaker": "Anamika", "text": "Yes Chetan, and the most fascinating part is..."}}
]

Lecture Notes:
{markdown}
"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt]
        )
        
        raw_text = response.text.strip()
        with open("raw_text_dump.txt", "w", encoding="utf-8") as f:
            f.write(raw_text)
        
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        start_idx = raw_text.find('[')
        end_idx = raw_text.rfind(']')
        if start_idx != -1 and end_idx != -1:
            raw_text = raw_text[start_idx:end_idx+1]
        
        script = json.loads(raw_text.strip())
        print("Parsed JSON successfully!")
        
        final_audio = b""
        
        for line in script:
            speaker = line.get("speaker", "Chetan")
            text = line.get("text", "")
            if not text: continue
            
            if language.lower() == "english":
                voice = "en-IN-PrabhatNeural" if "Chetan" in speaker else "en-IN-NeerjaNeural"
            else:
                voice = "hi-IN-MadhurNeural" if "Chetan" in speaker else "hi-IN-SwaraNeural"
                
            communicate = edge_tts.Communicate(text, voice)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    final_audio += chunk["data"]
            
        print("Generated audio successfully! Size:", len(final_audio))
        
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test_podcast())
