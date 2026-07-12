"""
Learning Agent for LifeOS.

Features:
  - English / Nepali language learning (vocabulary, phrases, quick practice)
  - Daily quotes
  - Music recommendations / simple "play" actions

Modes:
  - AI mode: uses NVIDIA NIM / OpenAI-compatible LLM when OPENAI_API_KEY is set
  - Demo mode: returns curated local mock data when no API key is configured
"""
from __future__ import annotations

import json
import logging
import os
import random
import re
from typing import Any

logger = logging.getLogger("lifeos-learning")


# ─── English / Nepali vocabulary demo data ─────────────────

_ENGLISH_NEPALI_VOCABULARY = [
    {"english": "Apple", "nepali": "स्याउ (Sya-u)", "pronunciation": "Sya-u", "category": "food"},
    {"english": "Water", "nepali": "पानी (Pa-nee)", "pronunciation": "Pa-nee", "category": "food"},
    {"english": "Friend", "nepali": "साथी (Sa-thee)", "pronunciation": "Sa-thee", "category": "people"},
    {"english": "Book", "nepali": "किताब (Kee-taab)", "pronunciation": "Kee-taab", "category": "objects"},
    {"english": "Sun", "nepali": "सूरज (Soo-raz)", "pronunciation": "Soo-raz", "category": "nature"},
    {"english": "Moon", "nepali": "चन्द्रमा (Chan-dra-ma)", "pronunciation": "Chan-dra-ma", "category": "nature"},
    {"english": "Thank you", "nepali": "धन्यबाद (Dhan-ya-baad)", "pronunciation": "Dhan-ya-baad", "category": "phrases"},
    {"english": "Hello", "nepali": "नमस्ते (Na-mas-te)", "pronunciation": "Na-mas-te", "category": "phrases"},
    {"english": "Beautiful", "nepali": "सुन्दर (Soon-dar)", "pronunciation": "Soon-dar", "category": "adjectives"},
    {"english": "Love", "nepali": "माया (Ma-ya)", "pronunciation": "Ma-ya", "category": "feelings"},
    {"english": "Home", "nepali": "घर (Ghar)", "pronunciation": "Ghar", "category": "places"},
    {"english": "Mountain", "nepali": "पहाड (Pa-haad)", "pronunciation": "Pa-haad", "category": "nature"},
    {"english": "Peace", "nepali": "शान्ति (Shan-ti)", "pronunciation": "Shan-ti", "category": "feelings"},
    {"english": "Happy", "nepali": "खुशी (Khu-shee)", "pronunciation": "Khu-shee", "category": "feelings"},
    {"english": "Market", "nepali": "बजार (Ba-jaar)", "pronunciation": "Ba-jaar", "category": "places"},
    {"english": "Delicious", "nepali": "स्वादिष्ट (Swa-disht)", "pronunciation": "Swa-disht", "category": "food"},
]

_DAILY_QUOTES = [
    {"text": "The only way to do great work is to love what you do.", "author": "Steve Jobs", "language": "english"},
    {"text": "Success is not final, failure is not fatal: it is the courage to continue that counts.", "author": "Winston Churchill", "language": "english"},
    {"text": "The best time to plant a tree was 20 years ago. The second best time is now.", "author": "Chinese Proverb", "language": "english"},
    {"text": "जो जातो छ, त्यो भाग्यमा हो।", "author": "नेपाली भान्सा", "language": "nepali"},
    {"text": "सफलता तेस्तो मौसम हो, जब मानिसहरू आफ्नो सपना पूरा गर्छन्।", "author": "नेपाली कविता", "language": "nepali"},
    {"text": "अहिले नै सुरु गर्नुहोस्, कलि पनि हुने छैन।", "author": "नेपाली कहानी", "language": "nepali"},
    {"text": "Every expert was once a beginner.", "author": "Helen Hayes", "language": "english"},
    {"text": "The journey of a thousand miles begins with a single step.", "author": "Lao Tzu", "language": "english"},
    {"text": "जीवनको सफर माथि बस्तो छ, जब पनि सानो कदम लगाउन सकिन्छ।", "author": "नेपाली सोही", "language": "nepali"},
    {"text": "Dream big and dare to fail.", "author": "Unknown", "language": "english"},
]

_MUSIC_RECOMMENDATIONS = [
    {"title": "Resham Firiri", "artist": "Nepali Folk", "genre": "folk", "mood": "uplifting", "duration": "4:32"},
    {"title": "Kaligandaki", "artist": "Narayan Gopal", "genre": "classical", "mood": "peaceful", "duration": "5:15"},
    {"title": "Paanch ko Bato", "artist": "1974 AD", "genre": "rock", "mood": "energetic", "duration": "4:08"},
    {"title": "Maya", "artist": "Sabin Rai", "genre": "pop", "mood": "romantic", "duration": "3:45"},
    {"title": "Himchuli", "artist": "Khem Raj Gurung", "genre": "folk", "mood": "peaceful", "duration": "4:22"},
    {"title": "Timi Bina", "artist": "Sanjeev Singh", "genre": "pop", "mood": "uplifting", "duration": "3:58"},
    {"title": "Kohinoor", "artist": "1974 AD", "genre": "rock", "mood": "energetic", "duration": "4:15"},
    {"title": "Jharana", "artist": "Rohit John", "genre": "acoustic", "mood": "peaceful", "duration": "3:30"},
    {"title": "Phool ko Aankhama", "artist": "Ani Choying Drolma", "genre": "spiritual", "mood": "peaceful", "duration": "5:00"},
    {"title": "Yo Maya", "artist": "Om Bikram Bista", "genre": "pop", "mood": "romantic", "duration": "4:10"},
]

_LEARNING_MOCK_RESPONSES = {
    "greeting_learning": "📚 Welcome to the **Learning Hub**! I can help you with:\n\n"
                         "🗣️ **Vocabulary** — Learn English-Nepali words\n"
                         "💬 **Quotes** — Daily inspiration in English & Nepali\n"
                         "🎵 **Music** — Discover Nepali & English songs\n\n"
                         "Try saying: *\"Teach me Nepali vocabulary\"*, *\"Give me a daily quote\"*, or *\"Play me some music\"*",

    "vocabulary": None,  # filled dynamically
    "quote": None,  # filled dynamically
    "music": None,  # filled dynamically
}


def _get_daily_quote() -> dict:
    return random.choice(_DAILY_QUOTES)


def _get_daily_vocabulary(count: int = 5) -> list[dict]:
    return random.sample(_ENGLISH_NEPALI_VOCABULARY, min(count, len(_ENGLISH_NEPALI_VOCABULARY)))


def _get_music_recommendations(mood: str | None = None, count: int = 4) -> list[dict]:
    pool = _MUSIC_RECOMMENDATIONS
    if mood:
        pool = [m for m in pool if m.get("mood") == mood]
        if not pool:
            pool = _MUSIC_RECOMMENDATIONS
    return random.sample(pool, min(count, len(pool)))


def _get_llm():
    """Initialize and return the LLM client for OpenAI-compatible APIs.

    Returns None if no API key is configured.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from langchain_openai import ChatOpenAI

        base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.3,
        )
    except Exception as e:
        logger.warning("Failed to initialize learning LLM: %s", e)
        return None


def _classify_learning_intent(message: str) -> dict[str, Any]:
    """Classify learning-related intents using rule-based keywords."""
    lower = message.lower()

    if any(kw in lower for kw in ["vocabulary", "vocab", "learn nepali", "learn english", "word", "phrase", "dictionary", "शब्द", "शब्दावली", "food", "animal", "animals", "greeting", "greetings", "body", "numbers", "color", "colors", "family", "travel", "खाना", "जनावर", "नमस्ते", "परिवार", "रंग"]):
        return {"intent": "vocabulary"}
    if any(kw in lower for kw in ["quote", "quotes", "inspiration", "motivation", "उद्धरण", "प्रेरणा"]):
        return {"intent": "quote"}
    if any(kw in lower for kw in ["music", "song", "play", "songs", "recommend", "संगीत", "गीत", "play music"]):
        return {"intent": "music"}

    return {"intent": "learning_general"}


def _generate_learning_reply_ai(message: str) -> dict[str, Any]:
    """Generate a learning-related response using the LLM.

    Expected JSON format:
    {
      "intent": "vocabulary | quote | music | learning_general",
      "reply": "human-friendly reply",
      "data": { ... optional structured data ... }
    }
    """
    llm = _get_llm()
    if llm is None:
        return {}

    prompt = (
        "You are a friendly learning assistant for a daily assistant app called LifeOS.\n"
        "You help with:\n"
        "1. Vocabulary learning for English and Nepali\n"
        "2. Daily inspirational quotes in English and Nepali\n"
        "3. Music recommendations\n\n"
        "User message: {message}\n\n"
        "Classify the intent as one of: vocabulary, quote, music, learning_general.\n"
        "Respond with ONLY a JSON object, no extra text, no code fences:\n"
        "{{\"intent\": \"<intent>\", \"reply\": \"<helpful reply>\", \"data\": {{}}}}\n"
        "For vocabulary: include {{\"vocabulary\": [{{\"english\": \"<word>\", \"nepali\": \"<translation>\", \"pronunciation\": \"<pronunciation>\", \"category\": \"<category>\"}}]}} in data.\n"
        "For quote: include {{\"quote\": {{\"text\": \"<quote text>\", \"author\": \"<author>\", \"language\": \"<language>\"}}}} in data.\n"
        "For music: include {{\"music\": [{{\"title\": \"<title>\", \"artist\": \"<artist>\", \"genre\": \"<genre>\", \"mood\": \"<mood>\", \"duration\": \"<duration>\"}}]}} in data.\n"
        "Keep the data concise; 3-5 items max for lists."
    ).format(message=message)

    try:
        response = llm.invoke(prompt)
        content = response.content.strip()

        # Strip markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        # Try to find a JSON object in the response
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            content = match.group(0)

        parsed = json.loads(content)
        return parsed
    except Exception as e:
        logger.warning("AI learning response failed: %s", e)
        return {}


def _build_learning_reply(intent: str, data: dict | None = None) -> dict[str, Any]:
    """Build a demo/mock learning response for a given intent."""
    if intent == "vocabulary":
        words = _get_daily_vocabulary(5)
        text = "📚 **Today's English → Nepali vocabulary:**\n\n"
        for i, w in enumerate(words, 1):
            text += f"{i}. **{w['english']}** → {w['nepali']} ({w['pronunciation']}) — *{w['category']}*\n"
        text += "\nTry using these words today! Want me to quiz you?"
        return {"reply": text, "data": {"vocabulary": words, "language": "english-nepali"}}

    if intent == "quote":
        quote = _get_daily_quote()
        lang_label = "English" if quote["language"] == "english" else "नेपाली"
        text = f"💡 **Daily {lang_label} Quote:**\n\n> *\"{quote['text']}\"*\n\n— **{quote['author']}**"
        return {"reply": text, "data": {"quote": quote}}

    if intent == "music":
        songs = _get_music_recommendations(mood="uplifting", count=4)
        text = "🎵 **Here are some great tracks for today:**\n\n"
        for i, s in enumerate(songs, 1):
            text += f"{i}. **{s['title']}** — {s['artist']} ({s['genre']}, {s['mood']})\n"
        text += "\nWant more? Tell me your mood (peaceful, energetic, romantic) and I'll pick better!"
        return {"reply": text, "data": {"music": songs, "action": "recommend"}}

    text = (
        "📚 I'm your **Learning Companion**! Here's what I can help with:\n\n"
        "🗣️ **Vocabulary** — *\"Teach me Nepali vocabulary\"*\n"
        "💬 **Quotes** — *\"Give me a daily quote\"*\n"
        "🎵 **Music** — *\"Play me some uplifting music\"*\n\n"
        "What would you like to explore?"
    )
    return {"reply": text, "data": None}


def handle_learning_message(message: str, user_id: str | None = None) -> dict[str, Any]:
    """Main entry point for the learning agent.

    Tries AI mode first when OPENAI_API_KEY is set, then falls back to demo mode.
    """
    # 1. Rule-based intent classification
    rule_intent = _classify_learning_intent(message)

    # 2. Try AI enhancement when available
    ai_result = _generate_learning_reply_ai(message)
    if ai_result:
        intent = ai_result.get("intent", rule_intent["intent"])
        reply = ai_result.get("reply")
        data = ai_result.get("data")
        if reply:
            return {"reply": reply, "data": data, "intent": intent}

    # 3. Demo/mock response
    mock = _build_learning_reply(rule_intent["intent"])
    mock["intent"] = rule_intent["intent"]
    return mock
