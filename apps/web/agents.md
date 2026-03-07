# 🎨 Frontend Development Rules (apps/web)

This document defines the technical standards and UI patterns specific to the CarGPT React Frontend.

## 🏗️ Technical Architecture

### 1. Modern React 19
- **API**: Use modern hooks and the composition patterns defined in the `vercel-composition-patterns` skill.
- **Composition**: Prefer Compound Components for complex UI elements like car cards or comparison tables.

### 2. UI System & Aesthetics
- **Framework**: `Chakra UI v2`.
- **Visuals**: Use premium aesthetics (glassmorphism, subtle gradients, micro-animations) as outlined in `web-design-guidelines`.
- **Responsiveness**: All components must be mobile-first and fully responsive across common breakpoints.

### 3. Logic & State management
- **Service/Repository Pattern**: 
    - `CarSearchService`: Handles orchestration and API calls.
    - `Repositories`: Manage persistence (e.g., `ConversationRepository` for IDB/localStorage).
- **Hooks**: Isolate stateful logic (fetching, filtering) into custom hooks (e.g., `useCarSearch`, `usePinnedCars`).

## 🛡️ Implementation Rules

### 1. Component Standards
- **Naming**: Use PascalCase for components and camelCase for hooks.
- **Types**: Mandatory TypeScript interfaces/types for all component props.
- **Stability**: Ensure all interactive elements have unique, descriptive IDs for browser testing.

### 2. Design System Adherence
- **Consistency**: Do not use ad-hoc utility styles. Stick to the predefined design system tokens.
- **Performance**: Optimize images and use lazy loading for car images where possible.

### 3. Maintenance
- **Documentation**: Provide comments for complex UI logic or state transitions.
- **Skills Check**: After UI changes, run the `update_check_skill` to verify documentation.
