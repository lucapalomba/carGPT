Analyze this image and determine if it contains a {carInfo}.
Also, check if the image contains any overlaid text, watermarks, or logos (excluding the car's own brand logo).

Return ONLY valid JSON, with no extra text:
{
  "modelConfidence": number, // 0.0 to 1.0 (how sure you are it's a {carInfo})
  "textConfidence": number    // 0.0 to 1.0 (how sure you are there is UI text or watermarks)
}
