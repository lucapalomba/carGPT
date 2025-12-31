Return ONLY valid JSON, with no extra text:
{
  "analysis": "brief analysis of user needs OR explanation of adaptation (2-3 sentences)",
  "cars": [
    {
      "make": "Brand name",
      "model": "Model name",
      "precise_model": "Brand, model, year, equipment level",
      "year": "2023",
      "price": "25,000-30,000€",
      "type": "SUV/Sedan/Compact/Station Wagon/etc",
      "properties": {
        "propertyName1": "value1",
        "propertyName2": "value2",
        "propertyName3": "value3"
      },
      "strengths": ["point 1", "point 2", "point 3"],
      "weaknesses": ["point 1", "point 2", "point 3"],
      "reason": "brief explanation why it's suitable (1-2 sentences)",
      "percentage": "The percentage from 0 to 100% what this car is aligned to the start request"
    }
  ]
}

PROPERTY NAMING RULES:
- The keys inside the "properties" object MUST be in the SAME LANGUAGE used by the user
- All cars must share the exact same property key names.
