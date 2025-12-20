# CarGPT Architecture Documentation 🏗️

This document describes the architectural structure of the CarGPT backend, which follows the **Model-View-Controller (MVC)** and **Service Layer** patterns.

## 📐 Overview

CarGPT has transitioned from a monolithic `server.js` to a modular architecture to improve maintainability, testability, and scalability. The system is divided into distinct layers with clear responsibilities.

---

## 📂 Directory Structure

```text
src/
├── config/             # Application configuration & constants
│   └── index.js        # Environment variables, Ollama config, session settings
├── controllers/        # Request handlers (Parsing req, calling services, sending res)
│   ├── carsController.js    # All car ops: find, refine, ask, alternatives, compare
│   ├── healthController.js  # /api/health, /api/reset-conversation
│   └── qaController.js      # /api/get-conversations (Debug/Admin)
├── middleware/         # Express middleware (Future: validation, auth)
├── models/             # Data structures (Future: Mongoose/Prisma schemas)
├── routes/             # Route definitions
│   └── api.js          # API route mapping to controllers
├── services/           # Business logic & external integrations
│   ├── ollamaService.js       # Ollama API communication & JSON parsing
│   ├── conversationService.js # In-memory session management
│   └── promptService.js       # Prompt template loading
└── utils/              # Helper functions & validators
```

---

## 🔄 Data Flow

1.  **Request**: The browser sends an HTTP request (e.g., `POST /api/find-cars`) with an `Accept-Language` header.
2.  **Entry Point**: `server.js` receives the request and passes it to the `api.js` router.
3.  **Router**: `api.js` identifies the correct controller method.
4.  **Controller**:
    *   Extracts parameters from `req.body` and headers.
    *   Calls `promptService` to load the appropriate template.
    *   Calls `ollamaService` to interact with the LLM.
    *   Parses the LLM response using `ollamaService.parseJsonResponse`.
    *   Saves the interaction to `conversationService`.
5.  **Response**: The controller sends the processed JSON back to the client.

---

## 🛠️ Key Components

### 🧠 Ollama Service
Encapsulates all logic for communicating with the local Ollama instance. It handles:
- AI chat requests
- Aggressive JSON cleaning (handling common LLM formatting issues)
- Connectivity health checks

### 💬 Conversation Service
Manages in-memory storage for user interactions. Features:
- Session-based isolation
- 1-hour Time-To-Live (TTL) for conversation data
- Automated cleanup background task

### 📝 Prompt Service
Isolates file system operations for loading `.md` prompt templates from the `prompt-templates/` directory.

---

## ✅ Best Practices Implemented

-   **Separation of Concerns**: Business logic is separated from HTTP handling.
-   **Lean Entry Point**: `server.js` is under 100 lines and focuses solely on initialization.
-   **JSDoc Documentation**: All exported functions and methods are documented for better IDE support and developer experience.
-   **Centralized Config**: No hardcoded secrets or environment dependencies outside `src/config/`.
-   **Localization Native**: Built-in support for browser language detection and market restriction across all layers.
