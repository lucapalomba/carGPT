# 🗄️ Server-Side Development Rules (apps/server)

This document defines the technical standards and architectural patterns specific to the CarGPT Backend.

## 🏗️ Architectural Patterns

### 1. Dependency Injection (DI)
- **Framework**: `inversify`.
- **Rule**: All services and controllers MUST use DI. Avoid direct instantiations of business logic classes.
- **Identifiers**: Use `SERVICE_IDENTIFIERS` from `src/container/interfaces.ts`.

### 2. Service Layer Pattern
- **Logic Isolation**: Controllers should only handle HTTP concerns (request parsing, response sending).
- **Business Logic**: Must reside in the `services/` directory.
- **Interface Driven**: Every service must have an interface defined in `src/container/interfaces.ts`.

### 3. AI Integration (Agents)
- **Structured Outputs**: All LLM calls via `OllamaService` must use `callOllamaStructured` and provide a **Zod Schema**.
- **Prompt Isolation**: Prompts must be loaded via `PromptService` from the `prompt-templates/` directory (Markdown files). Reusable prompt fragments should be used where applicable.
- **Resilience**: Orchestration steps in `AIService` must use the `withRetry` helper.

## 🛡️ Development Standards

### 1. Error Handling
- **Custom Errors**: Use `AppError`, `OllamaError`, etc. from `src/utils/AppError.ts`.
- **Logging**: Use the centralized `logger` for all operational tracing. Avoid `console.log`.

### 2. Observability
- **Langfuse**: Every AI-related operation must be recorded as a span within the Langfuse trace. Ensure tokens and metadata are correctly captured.

### 3. Maintenance
- **JSDoc**: All exported functions and methods must have JSDoc comments.
- **Swagger**: Update `swagger.json` and associated documentation when changing routes or request/response formats.
