# AI Model Reviews

This document tracks the performance and quality of different AI models tested with carGPT.

## Summary Table

| Date | Model Name     | Provider | Quality (1-5) | Latency | Notes                                                                                                                                                                                                                                                   |
|------|----------------|----------|---------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|      | ministral-3:3b | Ollama   | 4             | 16s     | Currently the best model for carGPT; I am building around its capabilities. It recognizes languages and models without any special effort.                                                                                                              |
|      | ministral-3:8b | Ollama   | 5             | 35s     | Better quality but too much slower for development on my machine.                                                                                                                                                                                       |
|      | gemma3:4b      | Ollama   | 4             | 15s     | A good model, but not as good as ministral-3:3b. It's very fast at answering but doesn't always respond in the user's language. Might improve with fine-tuning. It's poor at suggesting models, sometimes inventing models that don't exist. Visually is slower than ministral-3:3b. |
|      | phi3:3.8b      | Ollama   | 1             | 25s     | Doesn't respond in the user's language and has very old data. LoRA needed, but currently not recommended.                                                                                                                                               |
|      | qwen2.5:7b     | Ollama   | 3             | 1m 20s  | A bit slower than others, possibly due to hardware limits. The language is sometimes strange—it uses the user's language but with weird or non-existent words. It's very concise and doesn't explain much. It could be the best after some fine-tuning. |
|      | qwen3:4b       | Ollama   | 4             | 18s     | Good response quality, sometimes allucinate on models that not in the merchant refers. Investigate more |
|      | qwen3:4b       | Ollama   | 5             | 25s     | Good response quality, Fast for 8b model but selected  properties seems not so interesting as Ministral models. It can be approached using thinking for retrieve some generation phase informations |
