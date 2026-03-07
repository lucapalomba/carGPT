# Web Code Improvement Analysis

This report outlines identified areas for improvement in the `apps/web` module, focusing on state management, UI composition, and data persistence.

## ⚛️ React & State Management

### 1. Introduction of Search Context
**Observation**: `App.tsx` coordinates logic between multiple hooks (`useCarSearch`, `usePinnedCars`).
**Recommendation**: As the app grows, lift the car search state into a `SearchContext`. This avoids prop-drilling into `ResultsContainer` and `DetailedComparison`, allowing deep components to access the current search state directly.

### 2. Hook Orchestration
**Observation**: The interaction between pinning and results is managed via a `useEffect` in `App.tsx`.
**Recommendation**: Encapsulate this relationship within a specialized `useCarSearchOrchestrator` hook to keep `App.tsx` focused purely on layout as per clean architecture principles.

## 🎨 UI & UX Improvements

### 1. Component Granularity
**Observation**: `ComparisonTable.tsx` and `DetailedComparison.tsx` are relatively large (6kb-8kb).
**Recommendation**: Deconstruct these into smaller, focused components (e.g., `ComparisonRow`, `FeatureBadge`, `SpecList`) to improve maintainability and testability.

### 2. Performance Memoization
**Observation**: Complex UI elements like `ImageCarousel` and `ComparisonTable` don't use much memoisation.
**Recommendation**: Implement `React.memo` or `useMemo` for individual car items and comparison rows to prevent unnecessary re-renders when the user toggles a pin or interacts with a refinement.

## 💾 Persistence & Data Strategy

### 1. Schema Migration for Conversations
**Observation**: `ConversationRepository` uses `localStorage` with a static interface.
**Recommendation**: Add a `version` field to the stored data and implement a simple migration strategy. This prevents app crashes if the `Conversation` or `Car` types are updated in future versions.

### 2. IndexedDB Transition
**Observation**: `localStorage` has a 5MB limit. Storing detailed conversation history with metadata might hit this limit quickly.
**Recommendation**: For long-term growth, transition the `ConversationRepository` to `IndexedDB` (using a library like `idb` or `dexie`) to support larger datasets and better querying.

## 🧪 Testing & Reliability

### 1. Verification of E2E Stability
**Observation**: Tests occasionally timeout in restricted environments (e.g., worker forks).
**Recommendation**: Audit Playwright and Vitest configurations to ensure better resource management, perhaps by limiting parallel workers in CI/resource-constrained environments.

### 2. Accessibility Audit
**Observation**: While using Chakra UI gives a good baseline, complex interactions in the `ComparisonTable` should be audited for full keyboard and screen reader support.
