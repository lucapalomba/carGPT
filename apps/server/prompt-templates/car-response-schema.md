Return ONLY valid JSON, with no extra text:
{
  "analysis": "Brief analysis of the user's needs OR explanation of the adaptation (2–3 sentences) in the “User Preferred Language”",
  "user_market": "The user's market",
  "cars": [
    {
      "make": "Brand name",
      "model": "Model name",
      "precise_model": "Brand, model, year, equipment level",
      "year": "2023",
      "price": "25,000-30,000€ when new (year)",
      "type": "SUV/Sedan/Compact/Station Wagon/etc",
      "market_availability": "Available in the user's market",
      "properties": {
        "propertyID1": {
          translatedLabel: "The name of the property in the “User Preferred Language”",
          value: "value1 (unit)"
        },
        "propertyID2": {
          translatedLabel: "The name of the property in the “User Preferred Language”",
          value: "value2 (unit)"
        },
        "propertyID3": {
          translatedLabel: "The name of the property in the “User Preferred Language”",
          value: "value3 (unit)"
        }
      },
      "strengths": ["point 1", "point 2", "point 3"],
      "weaknesses": ["point 1", "point 2", "point 3"],
      "reason": "brief explanation why it's suitable (1-2 sentences)",
      "percentage": "Percentage from 0 to 100 indicating how well this car matches the initial request",
      "reasoning": "Brief explanation of the reasoning behind the selection (2–3 sentences)"
    }
  ]
}

PROPERTY NAMING RULES:
- All cars must share the exact same propertyID in order to make them comparable.
- Each property must have a translatedLabel and a value.
