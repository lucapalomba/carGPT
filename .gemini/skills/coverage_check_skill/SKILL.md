---
name: coverage_check_skill
description: Ensures comprehensive test coverage and enforces mocking of external APIs.
---

# Skill Overview
This skill mandates checking test coverage and requires the creation or update of tests to meet coverage requirements. It strictly enforces the use of mocked external APIs to ensure tests are isolated and reliable.

## Instructions
1.  **After implementing changes or adding new features**, you must:
    *   **Run coverage tests**: Execute the project's coverage reporting tool (e.g., `vitest run --coverage`, `nyc mocha`, etc.) to determine the current test coverage.
    *   **Analyze coverage report**: Identify areas with insufficient test coverage, especially for new or modified code.
    *   **Create/Update tests**: If coverage is below the project's established threshold (or for any new/modified code without adequate coverage), write new tests or update existing ones to increase coverage.
2.  **Mock External APIs**: When writing or updating tests, ensure that all interactions with external APIs (such as Google API, Ollama, or any other third-party services) are **mocked**.
    *   **DO NOT** make live calls to external services during automated tests.
    *   Use appropriate mocking libraries and techniques (e.g., `vitest.mock`, `jest.mock`, `sinon`, etc.) to simulate API responses.
    *   Focus on testing the application's logic, not the external service's functionality.
3.  **Achieve Required Coverage**: Continue creating or updating tests until the required test coverage is met or exceeded, and all critical paths are adequately tested.
4.  **Verify Test Isolation**: Ensure that tests are isolated, deterministic, and do not rely on external factors or network requests.

---
> **Important**: This is a mandatory step to ensure code quality, maintainability, and reliable testing. Tests that fail due to reliance on unmocked external services will be considered invalid.
