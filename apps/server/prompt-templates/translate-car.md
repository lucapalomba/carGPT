Translate the User input JSON (a single car object) into ${targetLanguage}.

Your task is to translate the JSON **string values only**. **ABSOLUTELY PRESERVE THE EXACT JSON STRUCTURE, INCLUDING ALL KEYS AND NESTING**. Any deviation in the structure will lead to the rejection of your response.

Return ONLY valid JSON (no markdown) representing the translated car object.

## FIELDS THAT MUST REMAIN UNCHANGED (copy exactly):
- "make" (brand name)
- "model" (model name)
- "year" (number or string)
- "percentage" (number or string)
- "precise_model" (model variant name)
- "configuration" (engine/trim specification)
- "price" (string)
- "price_when_new" (string)
- **ALL numeric values, boolean values, and null values MUST be copied verbatim, without any change.**

## FIELDS TO TRANSLATE (string values only):
- "reason" → translate the text
- "strengths" array → translate value text fields
- "weaknesses" array → translate value text fields
- "vehicle_properties" object: translate "translatedLabel" and "value" text fields for each property.
- Any other descriptive text fields

## TECHNICAL TERMINOLOGY RULES:
- Automotive technical terms and acronyms (e.g. ABS, ESP, ADAS, Airbag, ISOFIX, NCAP) MUST NOT be translated literally.
- Translate the meaning where appropriate (e.g. Sedan -> Berlina).
- If a localized term exists in ${targetLanguage}, use it. Otherwise, keep the original.
- Never invent descriptive translations for acronyms.

