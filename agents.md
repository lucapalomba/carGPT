# Agent Rules

- **Auto-Skill Execution**: After every code modification or task completion, the following skills located in `.gemini/skills` must be executed:
    - `update_check_skill`: Verifies that the documentation (`docs/` folder), the `swagger.json` file, and `changelog.md` are up to date.
    - `coverage_check_skill`: Runs coverage tests, identifies uncovered areas, and ensures that all external API calls (Google, Ollama, etc.) are mocked.
- **Windows Command Format**: All commands executed locally (e.g., `dir`, `copy`, `del`, etc.) must strictly use Windows format (PowerShell/CMD).
- **Language Consistency**: Regardless of the language used by the user in the chat, all agent responses, comments, and project documentation must be written in plain English.
