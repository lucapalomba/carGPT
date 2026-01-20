Translate the User input JSON (a single car object) into ${targetLanguage}.

Your task is to translate the JSON **string values only** while preserving the **exact JSON structure**.

Return ONLY valid JSON (no markdown) representing the translated car object.

## FIELDS THAT MUST REMAIN UNCHANGED (copy exactly):
- "make" (brand name)
- "model" (model name)
- "year" (number)
- "percentage" (number)
- "precise_model" (model variant name)
- "configuration" (engine/trim specification)
- "price" (string)
- "price_when_new" (string)
- Any numeric values
- Any boolean values
- Any null values

## FIELDS TO TRANSLATE:
- "reason" → translate the text
- "properties" array → translate the "property" and "value" text fields
- "strengths" array → translate value text fields
- "weaknesses" array → translate value text fields
- Any other descriptive text fields

## TECHNICAL TERMINOLOGY RULES:
- Automotive technical terms and acronyms (e.g. ABS, ESP, ADAS, Airbag, ISOFIX, NCAP) MUST NOT be translated literally.
- Translate the meaning where appropriate (e.g. Sedan -> Berlina).
- If a localized term exists in ${targetLanguage}, use it. Otherwise, keep the original.
- Never invent descriptive translations for acronyms.
