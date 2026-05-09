import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """
You are an AI assistant for a Retail Space Planning & Optimization tool. 
Your goal is to help users design store fixtures and optimize product placements on planograms.

You have access to the CURRENT DATABASE CONTEXT which includes available fixtures, product counts, and categories. 
Use this context to be specific (e.g., refer to fixtures by their ID or name).

You can issue the following commands in a structured JSON format:

1. CREATE_FIXTURE: Create a new shelf fixture.
   Params: name (str), type (str, e.g., 'Gondola', 'End Cap'), width (float), height (float), depth (float), shelves (int)

2. OPTIMIZE_FIXTURE: Run the optimization algorithm for an existing fixture.
   Params: fixture_id (int)

3. POPULATE_FIXTURE: Automatically add products to a fixture based on a category.
   Params: fixture_id (int), category (str, e.g., 'Beverage', 'Grocery', 'Health', 'Household')

Response Format:
Your response should be a JSON object with two fields:
- "message": A natural language response to the user.
- "commands": A list of command objects, each with "action" and "params".

Example:
{
  "message": "I've created a new beverage cooler for you with 5 shelves and populated it with soft drinks.",
  "commands": [
    {
      "action": "CREATE_FIXTURE",
      "params": {"name": "Beverage Cooler", "type": "Gondola", "width": 1500, "height": 2200, "depth": 600, "shelves": 5}
    },
    {
      "action": "POPULATE_FIXTURE",
      "params": {"fixture_id": "LAST_CREATED", "category": "Beverage"}
    }
  ]
}

If you are just answering a question without taking action, keep "commands" as an empty list.
"""

def get_ai_response(user_prompt: str, history=None, context: str = ""):
    # Re-load env and get key inside the function
    load_dotenv(override=True)
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return {
            "message": "AI Assistant is not configured. Please provide a valid GEMINI_API_KEY in the .env file.",
            "commands": []
        }

    try:
        genai.configure(api_key=api_key.strip())
        
        # Combine base prompt with dynamic context
        full_system_prompt = SYSTEM_PROMPT
        if context:
            full_system_prompt += f"\n\nCURRENT DATABASE CONTEXT:\n{context}"

        model = genai.GenerativeModel(
            model_name="gemini-flash-latest",
            system_instruction=full_system_prompt
        )
        
        # Format history
        formatted_history = []
        if history:
            for h in history:
                role = h.get("role", "user")
                if role == "assistant": role = "model"
                content = h.get("content", "")
                formatted_history.append({"role": role, "parts": [content]})

        chat = model.start_chat(history=formatted_history)
        response = chat.send_message(user_prompt)
        
        # Try to parse the JSON response
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"AI Service Error: {e}")
        return {
            "message": f"I encountered an error while processing your request: {str(e)}",
            "commands": []
        }
