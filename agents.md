# 📟 CarGPT Collaboration Manual: Human & AI Agent Protocols

This file serves as the primary coordination point between **The User** and **The AI Assistant**. It defines how we collaborate, the rules we follow, and the internal agent architecture that powers CarGPT.

## 🛠️ Mandatory Project Rules (Assistant Protocols)

These rules are strictly enforced for the AI Assistant (me) and have been previously verified by the user.

1.  **Auto-Skill Execution**: After every code modification or task completion, the following skills in `.gemini/skills` must be executed:
    - `update_check_skill`: Verifies documentation (`docs/`), `swagger.json`, and `changelog.md`.
    -  `coverage_check_skill`: Runs coverage tests and ensures external APIs are mocked.
2.  **Windows Command Format**: All local commands (e.g., `dir`, `copy`, `del`) MUST strictly use Windows format (PowerShell/CMD).
3.  **Language Consistency**: Regardless of the user's input language, all assistant responses, comments, and project documentation must be written in **Plain English**.
4.  **Agentic Best Practices**:
    - Use **Structured Outputs** (Zod) for all internal agent interactions.
    - Maintain **Langfuse Tracing** for all AI operations.
    - Implement **Retries** for transient external service failures.

---

## 🏗️ Internal Agent Architecture

To collaborate effectively, it's important to understand the specialized agents working "under the hood" of the application.

### 1. The Orchestrator (`AIService`)
- **Role**: Pipeline Manager. Coordinates the hand-off between specialized agents.
- **Protocol**: Orchestrates: Intent → Suggestion → Elaboration → Translation → Vision → Judge.

### 2. The Specialized Pipeline
| Agent | Persona | Goal |
| :--- | :--- | :--- |
| **Intent** | Researcher | Extract structured constraints and map markets (e.g., `it` -> `ITA`). |
| **Suggestion** | Specialist | Find up to 3 real-world cars matching the intent (Anti-hallucination).|
| **Elaboration** | Journalist | Enlarge data with technical specs and property formatting. |
| **Vision** | Verifier | Uses vision models to filter and verify car image contents. |
| **Translation** | Localizer | Localizes results while protecting "identity" fields (`make`, `model`, `year`). |
| **Judge** | Auditor | Critically evaluates the final bundle acting as the User (Score 0-100). |

### 3. Client Interaction Agent (`CarSearchService`)
- **Role**: Interface Bridge. Manages session context and input validation on the frontend.

---

## 🔄 How We Collaborate

### 1. Shared Understanding
The Assistant should always refer to this `agents.md` to ensure it follows the latest architectural patterns and project rules. The development process is powered by a strategic combination of **Gemini (Antigravity)** for reasoning and **OpenCode (BigPickle)** for specialized implementation tasks.

### 2. Feedback Loops
- The **Judge Agent** provides automated feedback on the LLM flow.
- The **User** provides the ultimate feedback via chat or refinement requests.
- The Assistant uses these signals to iterate on prompt templates or service logic.

### 3. Pipeline Observability
We use **Langfuse** as our shared "brain dump" to debug agent collaborations. Every step in the pipeline is a Trace/Span that we can analyze together.

---

## 📂 Specialized Rules
For detailed development standards, refer to the component-specific rules:
- **Server**: [apps/server/agents.md](file:///d:/PROJECTS/carGPT/apps/server/agents.md)
- **Web**: [apps/web/agents.md](file:///d:/PROJECTS/carGPT/apps/web/agents.md)
