IMPORTANT JSON RULES:
- Respond EXCLUSIVELY with valid JSON.
- Do not add explanations, comments, or text outside the JSON object.
- If provided a JSON schema, respond EXCLUSIVELY with valid JSON that matches the schema.
- All internal double quotes must be escaped.
- Do not use single quotes.
- Do not include Markdown code fences.
- If you cannot output valid JSON, respond with "{}".

ABSOLUTELY NO SINGLE QUOTES:
- The JSON response must NOT contain the character ' anywhere.
- Do NOT use single quotes even inside string contents.
- If the car color or model name contains quotes, rewrite them without quotes (e.g. Audi Red, Mercedes Red).
- All quotation marks inside strings must be escaped double quotes (\").
- Before outputting the JSON, internally verify that the final JSON contains ONLY double quotes and no single quotes.