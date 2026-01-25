# Ottimizzazioni della Codebase CarGPT

## 🎯 Ottimizzazioni Specifiche

### 2. API Response Handling
**Problema:** Tipizzazione debole nelle risposte API
- **api.ts Righe 38-43:** Controllo `data.success` non tipizzato
- **Suggerimento:** Implementare Zod o io-ts per validazione delle risposte


## 📊 Metriche da Monitorare

### 1. Performance
- Tempo di risposta API (target: <2s)
- Memory usage del server (target: <512MB)
- Bundle size frontend (target: <1MB)

### 2. Code Quality
- Complessità ciclomatica (target: <10 per funzione)
- Code coverage (target: >80%)
- Duplicazione codice (target: <3%)

## 🛠️ Strumenti Suggeriti

1. **Performance:** Lighthouse, WebPageTest
2. **Code Quality:** ESLint, Prettier, SonarQube
3. **Testing:** Jest, React Testing Library
4. **Monitoring:** New Relic, DataDog


# Refactoring Recommendations


## 1. Service Layer (`src/services/aiService.ts`)
### Observations
- **Monolithic orchestration**: `findCarsWithImages` and `refineCarsWithImages` contain many sequential steps.
- **Cache logic is duplicated** for intent and suggestions.
- **Error handling** is limited to a generic catch‑all.
- **Logging** mixes info/debug levels in the same block.

### Recommendations
1. **Extract sub‑services** into separate files (e.g. `intentCache.ts`, `suggestionCache.ts`).
2. **Create a generic `CacheHelper`** that abstracts `generateKey`, `set`, `get` and TTL handling.
3. **Introduce a `ResultWrapper`** type to standardize the shape of returned objects and reduce duplication.
4. **Add granular error types** (`IntentError`, `SuggestionError`, …) and map them to specific Langfuse spans.
5. **Move parallel execution logic** to a utility (`parallel.ts`) to keep the orchestration readable.

---

## 2. Conversation Service (`src/services/conversationService.ts`)
### Observations
- Uses a simple `Map` with a hard‑coded cleanup interval.
- No TTL per conversation; cleanup runs every hour regardless of activity.
- No persistence layer – all data is lost on server restart.

### Recommendations
1. **Replace the `Map` with a lightweight in‑memory store** (e.g. `node-cache`) that supports per‑key TTL.
2. **Expose a `resetAll` method** for testing purposes.
3. **Add optional persistence** (e.g. write to a JSON file on graceful shutdown) to avoid losing conversation history.
4. **Provide a `pruneInactive` public method** that can be called by a scheduled job with a configurable interval.

---

## 3. Logging (`src/utils/logger.ts`)
### Observations
- Direct calls to `logger.info/debug/error` are scattered.
- No correlation ID for tracing across services.

### Recommendations
1. **Wrap logger calls** in a helper that automatically injects `sessionId` and a generated `requestId`.
2. **Standardize log schema** (timestamp, level, sessionId, requestId, message, meta).
3. **Add log level configuration** via environment variable.

---

## 4. Error Handling & Tracing
### Observations
- Errors are re‑thrown after logging, but Langfuse spans are not always marked as failed.
- Some `try/catch` blocks swallow stack traces.

### Recommendations
1. **Create a `withSpan` higher‑order function** that runs a callback, captures errors, and updates the span status accordingly.
2. **Define custom error classes** with `code` and `details` to improve API responses.
3. **Ensure every async service method** uses `withSpan` for consistent tracing.

---

## 5. Test Coverage
### Observations
- `conversationService` lacks unit tests.
- Cache behavior is not verified.
- Parallel execution paths are not exercised.

### Recommendations
1. **Add Jest tests** for `CacheService` covering TTL expiration and key generation.
2. **Write unit tests** for `conversationService` focusing on `getOrInitialize`, TTL cleanup, and `pruneInactive`.
3. **Mock Langfuse** in service tests to assert that spans are created and updated.
4. **Introduce integration tests** for the full `findCarsWithImages` flow using mocked sub‑services.

---

## 6. Code Organization
### Observations
- Several `src/services/ai` subfolders contain one‑off files.
- Import paths are deep (`../../utils/logger`).

### Recommendations
1. **Create an `src/lib` folder** for shared utilities (logger, cache, tracing helpers).
2. **Add barrel exports** (`index.ts`) in each module to simplify imports.
3. **Adopt absolute imports** via `tsconfig` `paths` (e.g. `@utils/logger`).

---

## 7. Documentation
- Update `README.md` with the new module layout.
- Add a **Refactoring Checklist** in `docs/refactoring.md` (this file) for future reference.

---

## 8. Future‑Proofing
- Consider moving heavy services (cache, tracing) to their own micro‑service if load grows.
- Evaluate a Redis‑backed cache for distributed deployments.

---

*Prepared by Antigravity – AI coding assistant*
