"""
Quick smoke test for the calendar events plugin.
Run: python backend/run_smoke_test.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from langgraph_agent import run_agent

test_cases = [
    "Add a meeting called 'Design Review' at 3pm",
    "What's on my calendar?",
    "List my upcoming events",
    "Create an appointment called Dentist at 2:30 PM",
    "Hello",
    "Set an alarm for 7:00 AM",
]

print("=" * 60)
print("Calendar Plugin — Smoke Test")
print("=" * 60)

for msg in test_cases:
    result = run_agent(msg, "test-user")
    print(f"\n💬 User:  {msg}")
    print(f"🤖 Agent: {result['reply'][:200]}...")
    if result.get("data"):
        print(f"📦 Data:  {list(result['data'].keys())}")
    print("-" * 60)