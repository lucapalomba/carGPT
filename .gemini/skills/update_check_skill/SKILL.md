---
name: update_check_skill
description: Checks that documentation and swagger are up-to-date after each task.
---

# Skill Overview
This skill must be invoked after every task is completed. Your primary responsibility is to ensure that the project's documentation and API specifications are current.

## Instructions
1. **At the end of every task**, you must:
   - Review the changes made during the task.
   - Update all relevant Markdown files in the `docs/` directory to reflect the new state of the code.
   - Update the `swagger.json` file if any API endpoints, request/response schemas, or parameters have changed.
2. Ensure that the documentation and the Swagger file remain synchronized with the implementation.
3. If no changes were made that affect the API or documentation, you may skip the updates but you must still verify that everything is consistent.
4. Update the `changelog.md` file with the changes made during the task.

---
> **Important**: This is a mandatory step for the agent to perform before considering a task fully verified and closed.
