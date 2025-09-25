"""LLM orchestration stubs."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from . import prompts


def chat_intake(message: str, context: dict[str, Any] | None = None, user: dict | None = None) -> dict[str, Any]:
    """Return a stubbed intake response that echoes the user message."""
    context = context or {}
    summary = (
        f"User '{user.get('email', 'unknown') if user else 'anonymous'}' wants help with "
        f"'{message}'."
    )
    follow_up = [
        "Which campaigns are most important to review?",
        "Do you have a target audience segment in mind?",
    ]
    return {
        "summary": summary,
        "follow_up_questions": follow_up,
        "prompt_used": prompts.INTAKE_PROMPT,
        "context": context,
        "timestamp": datetime.utcnow().isoformat(),
    }


def suggest_kpis(goal_context: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {"name": "Campaign CTR", "reason": "Measures engagement with your email campaigns."},
        {"name": "List Growth", "reason": "Indicates how quickly your audience is expanding."},
        {"name": "Revenue Attribution", "reason": "Connects campaign performance to sales outcomes."},
    ]


def analysis_plan(goal_context: dict[str, Any]) -> dict[str, Any]:
    return {
        "prompt_used": prompts.ANALYSIS_PLAN_PROMPT,
        "steps": [
            "Collect last 30 days of Constant Contact campaign metrics",
            "Segment results by audience list and campaign type",
            "Surface top performing campaigns and underperformers",
            "Draft KPI summary for user feedback",
        ],
        "metadata": goal_context,
    }
