"""Focused tests for local tone and emotion-tuning logic."""
from ai_service import detect_crisis, detect_emotion, get_journal_prompts, get_system_message


def test_detects_new_emotional_pain_points():
    assert detect_emotion("I feel overwhelmed and I am spiraling") == "overwhelm"
    assert detect_emotion("I am lost and don't know what to do") == "confusion"
    assert detect_emotion("I cannot sleep and have been awake all night") == "sleep_strain"


def test_detects_expanded_crisis_language():
    assert detect_crisis("I can't go on like this")
    assert detect_crisis("I might hurt myself tonight")


def test_system_prompt_contains_companion_method():
    prompt = get_system_message("professional", "overwhelm", False)

    assert "Core promise" in prompt
    assert "Conversation method" in prompt
    assert "reduce the problem into the next 5 minutes" in prompt
    assert "Make the next step very small" in prompt


def test_genz_journal_prompts_are_mode_specific():
    prompts = get_journal_prompts("genz")

    assert "10% easier" in prompts[2]
    assert prompts != get_journal_prompts("professional")
