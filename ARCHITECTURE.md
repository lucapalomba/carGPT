# CarGPT Architecture Documentation 🏗️

This document describes the architectural structure of the CarGPT backend, which follows the **Model-View-Controller (MVC)** and **Service Layer** patterns.

## 📐 Overview

CarGPT has transitioned to a powerful **Monorepo** architecture to separate concerns between the modern **React Frontend** and the **Express Backend**.

---

## 📂 Directory Structure

```text
/
├── apps/
│   ├── web/                # React Frontend (Vite + TS + Tailwind v4)
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── App.tsx      # Main application logic
│   │   │   └── main.tsx     # React entry point
│   │   └── vite.config.ts  # Frontend build & proxy config
│   └── server/             # Express Backend (TypeScript + MVC + Services)
│       ├── server.ts       # API entry point
│       ├── src/
│       │   ├── controllers/ # Request handlers (.ts)
│       │   ├── routes/      # API route definitions (.ts)
│       │   └── services/    # Business logic & Ollama integration (.ts)
│       └── prompt-templates/ # LLM prompt definitions
├── package.json            # Root configuration (Workspaces + Parallel Dev)
└── .node-version           # Repository-wide Node version (v24.12.0)
```

---

## 🔄 Data Flow

1.  **Request**: The browser sends an HTTP request (e.g., `POST /api/find-cars`) with an `Accept-Language` header.
2.  **Entry Point**: `server.ts` receives the request and passes it to the `api.ts` router.
3.  **Router**: `api.ts` identifies the correct controller method.
4.  **Controller**:
    *   Extracts parameters from `req.body` and headers.
    *   Calls `promptService` to load the appropriate template.
    *   Calls `ollamaService` to interact with the LLM.
    *   Parses the LLM response using `ollamaService.parseJsonResponse`.
    *   Saves the interaction to `conversationService`.
    *   **Observability**: All model interactions are traced using **Langfuse**.
5.  **Response**: The controller sends the processed JSON back to the client.

---

## 🔍 Observability (Langfuse)

CarGPT uses **Langfuse** for end-to-end tracing of AI operations:
- **Traces**: Created at the controller level (e.g., `search_cars_API`, `ask_about_car_API`) to track the entire user request.
- **Spans**: Track specific operations like **Google Image Search** or **Ollama Generations**.
- **Generations**: specifically track the input/output and token usage of the LLM.
- **Scores**: (Future) Can be used to track user feedback (refinements).

---

## 💻 Frontend Architecture (apps/web)

The frontend is a modern **Single Page Application (SPA)**:
- **React 19**: Modern UI library with Functional Components and Hooks.
- **Tailwind CSS v4**: Utility-first CSS framework for rapid UI styling with zero runtime overhead.
- **Vite**: Ultra-fast build tool and dev server.
- **TypeScript**: Ensuring type safety across components and API interactions.

### Component Logic
- **`App.tsx`**: Manages the global state (cars, history, views).
- **`InitialForm.tsx`**: Handles requirements input.
- **`ResultsContainer.tsx`**: Orchestrates the display of findings, Q&A, and comparisons.
- **`ComparisonTable.tsx`**: Renders dynamic feature comparisons.

---

## ⚙️ Backend Architecture (apps/server)

The backend is built with **TypeScript** and follows the **MVC** and **Service Layer** patterns:
- **`ollamaService`**: Handles LLM communication and executes **Vision-Language Model (VLM)** tasks to verify that search results correctly match the requested car models.
- **`aiService`**: Orchestrates the search flow, combining LLM analysis with Google Image search and vision-based filtering.
- **`promptService`**: Manages Markdown-based prompt templates. It supports a **modular architecture** where reusable components (like `search-rules.md` and `car-response-schema.md`) are injected into specific task templates (`find-cars.md`, `refine-cars.md`) to ensure consistency and maintainability.

---

## ✅ Best Practices Implemented

-   **Separation of Concerns**: Business logic is separated from HTTP handling.
-   **Lean Entry Point**: `server.ts` is approximately 100 lines and focuses solely on initialization.
-   **TypeScript-First**: Ensuring type safety across all controllers, services, and models.
-   **JSDoc Documentation**: All exported functions and methods are documented for better IDE support and developer experience.
-   **Centralized Config**: No hardcoded secrets or environment dependencies outside `src/config/`.
-   **Native Localization**: Built-in support for browser language detection and market restriction across all layers.
