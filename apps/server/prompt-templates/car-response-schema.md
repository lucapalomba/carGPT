Return ONLY valid JSON, with no extra text:
{
  "analysis": "Brief analysis of the user's needs OR explanation of the adaptation (2–3 sentences) in user_preferred_language",
  "cars": [
    {
      "make": "Brand name",
      "model": "Model name",
      "precise_model": "The precise_model in the Cars suggestions JSON",
      "year": "2023",
      "price": "25,000-30,000€ when new (year)",
      "type": "SUV/Sedan/Compact/Station Wagon/etc",
      "market_availability": "Available in the user's market",
      "constraints_satisfaction": "The constraints_satisfaction in the Cars suggestions JSON",
      "properties": {
        "propertyID": {
          translatedLabel: "The name of the property in the user_preferred_language",
          value: "value1 (unit)"
        }
      },
      "strengths": ["point 1", "point 2", "point 3"],
      "weaknesses": ["point 1", "point 2", "point 3"],
      "reason": "brief explanation why it's suitable (1-2 sentences)",
      "percentage": "The percentage in the Cars suggestion JSON",
      "selection_reasoning": "The selection_reasoning in the Cars suggestions JSON"
    }
  ]
}
