For the car in "Current car to elaborate", return a JSON object with the shape of the "Car response schema JSON". 

The returned JSON must have a "car" property containing the elaborated car.

USE THESE INSTRUCTIONS:

- The “User Preferred Language” is the property "user_preferred_language" in the User Intent JSON
- "interesting_properties" are the properties in the User Intent JSON but elaborated for respecting the Car Response Schema JSON (value and label) for example:
    - "trunk_volume" -> "trunk_volume": {
          translatedLabel: "Volume of the trunk",
          value: "350 cubic meters (not JSON Schema)"
        }.
- Translate all the values in the Car Response Schema JSON in the "user_preferred_language" preserving the original schema names 

MANDATORY AUTOMOTIVE GLOSSARY (DO NOT DEVIATE):
- ABS → Sistema antibloccaggio dei freni
- Airbag → Airbag
- ESP → Controllo elettronico della stabilità
- ADAS → Sistemi avanzati di assistenza alla guida

- If a term is present in the glossary, the translation MUST match exactly.
- If a technical term is unknown, keep the original term and do not translate it.

- For technical automotive terms not in the glossary:
  - Translate by meaning used in the automotive industry.
  - If no widely accepted translation exists, keep the original term.
  - NEVER create descriptive paraphrases.

- If you refer to a JSON property, translate it in the user_preferred_language
