# Changelog

All notable changes to CarGPT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.4] - 2026-03-07

### 📟 Agent Collaboration & Governance
- **Enhanced Agent Architecture**: Transformed `agents.md` into a comprehensive architecture document with formal role definitions for specialized AI agents (Intent, Suggestion, Elaboration, Vision, Judge, Translation).
- **Collaboration Manual**: Blended project-wide governance rules with AI persona documentation to facilitate human-AI pairing.
- **Component-Specific Rules**: Introduced specialized `agents.md` files in `apps/server` and `apps/web` to codify module-specific architectural patterns (DI, Service Layer, React 19 composition).
- **Audit & Alignment**: Conducted a full audit of the rules hierarchy to ensured consistency across the monorepo.
- **Development Methodology**: Updated documentation to reflect the dual-AI development strategy using **Gemini (Antigravity)** and **OpenCode (BigPickle)**.
- **Improvement Analysis**: Performed a deep-dive audit of both `apps/server` and `apps/web`, generating comprehensive improvement reports in `docs/improve-analysis.md`.

### 🔧 Technical Improvements
- **Linting Excellence**: Resolved 15 `preserve-caught-error` violations across `apps/server` and `apps/web`.
- **Enhanced Error Tracking**: Updated `AppError` hierarchy in the server to support the `cause` property for better debugging.
- **Agent Rules**: Implemented mandatory auto-skill execution and Windows command format rules in `agents.md`.

## [v2.3] - 2026-02-17

### 🎨 UI/UX Refactoring & Excellence
- **Compound Component Refactor**: Refactored `InitialForm` into compound components (`Root`, `Header`, `Input`, `Examples`, `Submit`) for better scalability and flexibility.
- **Web Interface Excellence**: 
  - Fixed **Cumulative Layout Shift (CLS)** by adding explicit dimensions to the logo.
  - Improved **Accessibility** with explicit button types and `touch-action: manipulation`.
  - Refined **Typography** using proper ellipsis character `…` and `tabular-nums` for data alignment.
  - Enhanced **Image Carousel** with better keyboard navigation and screen reader support.

## [v2.2.1] - 2026-01-31

### 🚀 Features
- **Sequential Promise Execution**: Added a `SEQUENTIAL_PROMISE_EXECUTION` environment variable to enforce sequential promise execution. This can improve performance and precision with smaller, local LLMs.

## [v2.2] - 2026-01-28

### 🚀 Features
- **UI Suggestions**: Added `ui_suggestions` field to API response to guide frontend visualization.
- **Port Update**: Development server now defaults to port 3001.

### 🗑️ Removals
- **API Cleanup**: Removed deprecated endpoints (`askAboutCar`, `getAlternatives`, `compareCars`).
- **Documentation**: Updated Swagger and API docs to reflect current feature set.

## [v2.1] - 2026-01-22

### 🚀 Major Enhancements
- **Comprehensive testing framework** with unit tests, coverage, and e2e testing
- **Cross-environment validation** with secure cookies for production
- **Repository pattern** for conversation storage and retrieval
- **Service connection pool** for Ollama integration
- **Agent connection definitions** for improved AI service management

### ⚡ Performance & Architecture
- **Parallel processing** for car elaboration and API calls
- **Light caching and serialization** for optimized responses
- **Refactored backend** with divided responsibilities
- **Extracted business logic** into dedicated modules
- **Configuration providers** using configuration abstraction

### 🎨 UI/UX Improvements
- **Migration to Chakra v3** from Tailwind CSS
- **Brand theme application** with consistent styling
- **Optimized loading states** and refresh renders
- **Improved prompt workflows** with markdown formatting

### 🔧 Technical Improvements
- **Multiple model support** - each Ollama call can use different models
- **Centralized error handling** and logging structure
- **Type-safe shared types** instead of duplicate implementations
- **Strict parameter validation** and boundary checks
- **Comprehensive test coverage** with CI/CD integration

### 🐛 Bug Fixes
- **Translation flow fixes** to keep LLM focused
- **Response determinism** enforcement
- **Memory management** improvements
- **Node.js version compatibility** fixes

---

## [v2] - 2026-01-12

### 🧠 AI & Language Processing
- **Refined search workflow** using long-term conversation context
- **Divided principal prompt** into structured workflow
- **Enhanced translation step** for better localization
- **Pinned car elaboration** system for consistent results
- **Parallel car processing** to maintain LLM focus

### 🔄 API Improvements
- **Separated Search Intent** from search prompt
- **Improved JSON response structure** and validation
- **User country determination** instead of inference
- **Refactored helpers, controllers, and services**
- **Enhanced prompt engineering** with better focus

### 🌍 Localization
- **Hardened translation vocabulary** for consistency
- **Improved prompt language** for better AI understanding
- **Documentation updates** with corrected schemas
- **Multilingual response improvements**

---

## [v1] - 2026-01-04

### 🎉 Initial Release

#### Added
- **Natural language input** for car requirements
- **AI-powered suggestions** using Ollama + Ministral
- **3 personalized car recommendations** based on user needs
- **Comparative table** with detailed specifications
- **Detailed comparison** between any two suggested cars
  - Performance comparison
  - Fuel consumption
  - Space and practicality
  - Reliability
  - Maintenance costs
- **Interactive Q&A** system for specific questions about each car
- **Similar alternatives** finder
- **Responsive UI** for mobile and desktop
- **Session management** for maintaining conversation context
- **Health check endpoint** for monitoring Ollama connection
- **Example prompts** to help users get started
- **Loading states** and spinner animations
- **Error handling** for common issues
- **Modal dialogs** for detailed comparisons and alternatives

#### Features
- 100% free (uses local Ollama)
- 100% private (all processing local)
- No API keys required
- No rate limits
- Offline capable (after model download)
- Italian language interface and responses
- Clean, modern UI with gradients and animations

#### Technical
- Node.js + Express backend
- Vanilla JavaScript frontend (no framework dependencies)
- Ollama integration for AI processing
- Session-based conversation storage
- JSON-based communication with AI model
- Automatic conversation cleanup after 1 hour

### Known Issues
- Occasional JSON parsing errors from Ollama (retry usually works)
- Model responses can take 10-30 seconds depending on hardware
- No persistence across server restarts

---

## [Unreleased]

### Planned Features
- [ ] Car images integration
- [ ] Price range filters
- [ ] Export comparison to PDF
- [ ] Save favorite searches
- [ ] Search history
- [ ] Support for more languages
- [ ] Dark mode
- [ ] Car availability links (dealerships/used market)
- [ ] Database persistence for conversations
- [ ] Unit and integration tests

---

## Version History

- **v2.1** (2026-01-22) - Testing framework, architecture refactoring, Chakra v3 migration
- **v2** (2026-01-12) - AI workflow improvements, API enhancements, localization upgrades
- **v1** (2026-01-04) - Initial release with core features