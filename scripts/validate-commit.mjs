#!/usr/bin/env node

/**
 * Script to validate git commit messages using local AI (Ollama).
 * It checks if the message follows the Conventional Commits specification.
 */

import { readFileSync } from 'fs';

// Get commit message from file
const commitMsgFile = process.argv[2] || '.git/COMMIT_EDITMSG';
let commitMsg;

try {
  commitMsg = readFileSync(commitMsgFile, 'utf8').trim();
} catch (err) {
  console.error('Could not read commit message file.');
  process.exit(1);
}

// Skip if it's a merge commit or similar that might be automated
if (commitMsg.startsWith('Merge branch') || commitMsg.startsWith('Merge remote-tracking branch')) {
  process.exit(0);
}

// Skip empty messages
if (!commitMsg) {
  process.exit(0);
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'ministral-3:3b';

const prompt = `
You are a git commit message validator. Check if the following commit message follows the Conventional Commits specification (v1.0.0).

Specification Summary:
- Format: <type>[optional scope]: <description>
- Allowed types: feat, fix, docs, style, refactor, test, chore, perf, build, ci, etc.
- Description must start with a lowercase letter and not end with a period.
- Optional body and footer(s) are allowed.

Message to check:
"""
${commitMsg}
"""

Respond ONLY with a JSON object in this format:
{
  "valid": boolean,
  "reason": "string (brief explanation if invalid, empty if valid)",
  "suggestion": "string (a corrected version of the message if invalid, empty if valid)"
}
`;

async function validate() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { 
          temperature: 0,
          num_predict: 500
        },
        format: "json"
      })
    });

    if (!response.ok) {
      console.warn('AI validation service is unavailable. Skipping check.');
      process.exit(0);
    }

    const data = await response.json();
    let result;
    try {
      result = JSON.parse(data.message.content);
    } catch (e) {
      console.warn('Failed to parse AI response. Skipping check.');
      process.exit(0);
    }

    if (result.valid) {
      console.log('\x1b[32m%s\x1b[0m', '✔ Commit message follows Conventional Commits standard.');
      process.exit(0);
    } else {
      console.error('\x1b[31m%s\x1b[0m', '✖ Commit message does not follow Conventional Commits standard.');
      console.error('\x1b[33m%s\x1b[0m', `Reason: ${result.reason}`);
      if (result.suggestion) {
        console.error('\x1b[32m%s\x1b[0m', `Suggestion: ${result.suggestion}`);
      }
      console.error('\nUse "git commit --no-verify" to skip this check if necessary.');
      process.exit(1);
    }
  } catch (error) {
    console.warn('Failed to connect to local AI for validation. Ensure Ollama is running.');
    console.warn('Skipping AI validation.');
    process.exit(0);
  }
}

validate();
