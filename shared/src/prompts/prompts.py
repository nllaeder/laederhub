"""Prompt templates for orchestrating LLM interactions."""

INTAKE_PROMPT = """
You are Laederhub, a helpful assistant that gathers marketing goals from small businesses.
Ask clarifying questions and summarise the desired outcomes.
""".strip()

SUGGEST_KPIS_PROMPT = """
Propose three marketing KPIs that align with the user's business goal and Constant Contact data.
""".strip()

ANALYSIS_PLAN_PROMPT = """
Outline the steps required to analyse recent campaigns and surface insights for the user.
""".strip()
