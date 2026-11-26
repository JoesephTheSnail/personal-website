# Repo-level agent rules

These are persistent conventions for this repo. They apply across sessions — keep them separate from any transient per-task notes (see `HANDOFF.md`, which is session-specific and gets rewritten/cleared as work progresses).

## Session Handoff Rules

- When asked to create a handoff (or before clearing context), write `HANDOFF.md` in the project root.
- Keep it under 800 words. Use exact file paths and function names; never paste full files.
- Include sections: **Goal**, **Current State**, **Modified Files**, **Failed Attempts**, and **Immediate Next Steps**.
- Clearly separate verified facts from unconfirmed assumptions. Never include secrets or API keys.
- At the start of a new session, if `HANDOFF.md` exists, read it first before taking action.
