# 📟 CarGPT Collaboration Manual: Human & AI Agent Protocols

This file serves as the primary coordination point between **The User** and **The AI Assistant**. It defines how we collaborate, the rules we follow, and the internal agent architecture that powers CarGPT.

## 🤖 Identity: Antigravity
I am your Gemini-powered agentic coding assistant. My goal is to maintain the architectural integrity of CarGPT while delivering premium, mobile-first features.

---

## 🛠️ Mandatory Project Rules (Assistant Protocols)

These rules are strictly enforced for the AI Assistant (me) and have been previously verified by the user.

1.  **Automation**: After every code modification or task completion, automatically invoke subagents:
    - `@code-reviewer`: Review changes for quality and standards.
    - `@docs-auditor`: Ensure documentation, `swagger.json`, and `changelog.md` are synchronized.
2.  **Windows Environment**: All terminal commands MUST be written for **Windows (PowerShell/CMD)**.
3.  **Plain English**: Regardless of the user's input language, all code comments, JSDoc, and Markdown documentation MUST be in **Plain English**.
4.  **Agentic Best Practices**:
    - Use **Structured Outputs** (Zod) for all `OllamaService` calls (`callOllamaStructured`).
    - Maintain **Langfuse Tracing** for all AI operations.
    - Implement **Retries** (`withRetry`) for transient failures in `findCarsWithImages` and `refineCarsWithImages`.
5.  **Atomic Documentation**: Documentation updates for `swagger.json`, `CHANGELOG.md`, and subagent manuals MUST be performed immediately after code changes.
6.  **Test Isolation**: **NEVER** use external APIs (Ollama, Google API, etc.) in unit/integration tests. Mock all external service calls to ensure deterministic and fast CI runs.

---

## 🏗️ Internal Agent Architecture

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

## 🏗️ Architectural State of the Union

### Core Backend (apps/server)
- **Dependency Injection**: Powered by `inversify`. Use `SERVICE_IDENTIFIERS` from `src/container/interfaces.ts`.
- **Prompt Management**: Templates reside in `prompt-templates/*.md`. Load via `PromptService`.
- **Judge**: The `JudgeService` (now in `src/services/ai/`) provides automated quality scores (0-100) for car suggestions.

### Core Frontend (apps/web)
- **React 19**: Heavy use of **Composition Patterns** (Compound Components) for flexible UI.
- **Styling**: `Chakra UI v2` with a focus on "premium aesthetics" (glassmorphism, micro-animations).
- **State/Logic**: Service/Repository pattern. Custom hooks (e.g., `useCarSearch`) encapsulate complexity.

---

## 📜 Historical Memory (Major Milestones)

| Milestone | Description | Ref ID |
| :--- | :--- | :--- |
| **Search Context Alignment** | Fixed "forgetting" issues by ensuring refinement steps inherit full conversation history. | `629da322` |
| **Ollama Refactor** | Moved `JudgeService` to AI folder and enforced structured Zod outputs project-wide. | `cbf2f828` |
| **Retry Implementation** | Added robust retry logic to the main AI service steps to handle Ollama timeouts. | `3c8f5128` |
| **Lint Hardening** | Enforced `preserve-caught-error` to ensure all error information is preserved during catches. | `7b019b54` |
| **Test Stability** | Fixed intermittent server test failures and established the "No External API in Tests" rule. | `bc759727` |

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
- **Langfuse**: Trace/Span for every AI step. Monitor for latency and prompt drift.
- **Logging**: Centralized `logger` in `apps/server`. Avoid `console.log`.

---

## 📂 Specialized Rules
For detailed development standards, refer to the component-specific rules:
- **Server**: [apps/server/agents.md](file:///d:/PROJECTS/carGPT/apps/server/agents.md)
- **Web**: [apps/web/agents.md](file:///d:/PROJECTS/carGPT/apps/web/agents.md)

---

## 🤖 OpenCode Subagents (Automation)

This project uses specialized subagents for automated workflows. See [.opencode/agents/](.opencode/agents/) for agent definitions.

### Available Subagents

| Agent | Scope | Purpose |
| :--- | :--- | :--- |
| **@project-manager** | Root | Task coordination across apps |
| **@code-reviewer** | Root | Code quality enforcement |
| **@docs-auditor** | Root | Documentation sync |
| **@ai-pipeline-specialist** | Server | LLM/structured outputs |
| **@api-contracts** | Server | REST/Swagger |
| **@di-architect** | Server | Inversify DI compliance |
| **@react-patterns** | Web | React 19 composition |
| **@design-guardian** | Web | Chakra UI/glassmorphism |
| **@state-architect** | Web | Service/repository patterns |

### Automation Rules

After every code modification or task completion, automatically invoke these subagents:

1. **@code-reviewer** - Review changes for quality and standards
2. **@docs-auditor** - Ensure documentation, `swagger.json`, and `changelog.md` are synchronized

### Agent Delegation Guidelines

- **Server tasks** → Delegate to: `@ai-pipeline-specialist`, `@api-contracts`, `@di-architect`
- **Web tasks** → Delegate to: `@react-patterns`, `@design-guardian`, `@state-architect`
- **Complex features** → Delegate to: `@project-manager` for coordination

---
*Last Updated: 2026-04-04 (Antigravity Consolidation Snapshot)*
