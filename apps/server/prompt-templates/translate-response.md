Translate the following JSON object into ${targetLanguage}.

HARD CONSTRAINTS:
- Keep the JSON structure EXACTLY as it is.
- Do not add new properties to the JSON.
- Translate all descriptive text, labels, strengths, weaknesses, and explanations.
- DO NOT translate "make", "model", or identifiers.
- Ensure the tone remains consistent with the original.
- Return ONLY the translated JSON.

TECHNICAL TERMINOLOGY RULES:
- Automotive technical terms, acronyms, and standardized feature names (e.g. ABS, ESP, ADAS, Airbag, ISOFIX, NCAP)
  MUST NOT be translated literally.
- Translate the meaning (e.g Sedan -> Berlina, ABS -> Sistema antibloccaggio)
- If a localized, commonly accepted term exists in the user language, use it.
- Otherwise, keep the original technical term unchanged.
- Never invent descriptive translations for acronyms.