Translate the following analysis text into ${targetLanguage}.

CRITICAL: Return ONLY the translated text as plain text.
- DO NOT wrap the response in JSON
- DO NOT use curly braces {}
- DO NOT add any properties like "user" or "analysis"
- DO NOT use markdown formatting
- Just output the translated text directly

## TRANSLATION INSTRUCTIONS:
- Translate the analysis text naturally into ${targetLanguage}.
- Preserve the meaning and tone of the original text.
- Keep car brand names and model names unchanged.

## TECHNICAL TERMINOLOGY RULES:
- Automotive technical terms and acronyms (e.g. ABS, ESP, ADAS, Airbag, ISOFIX, NCAP) MUST NOT be translated literally.
- If a localized term exists in ${targetLanguage}, use it. Otherwise, keep the original.

Return a JSON object with the following structure:
{
  "analysis": "Translated analysis text"
}