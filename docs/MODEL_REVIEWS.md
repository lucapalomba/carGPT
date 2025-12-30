# AI Model Reviews

This document tracks the performance and quality of different AI models tested with carGPT.

## Summary Table

| Date | Model Name | Provider | Quality (1-5) | Latency | Notes |
|------|------------|----------|---------------|---------|-------|
|      |     ministral-3:3b       |     Ollama     |      4         |    1s   |    Currently the best model for carGPT; I am building around its capabilities. It recognizes languages and models without any special effort. I tested also the 8b, better quality but too much slower for development on my machine.    |
|      |     gemma3:4b       |     Ollama     |      3         |    0s   |    A good model, but not as good as ministral-3:3b. It's very fast at answering but doesn't always respond in the user's language. Might improve with fine-tuning. It's poor at suggesting models, sometimes inventing models that don't exist.    |
|      |     phi3:3.8       |     Ollama     |      2         |    2s   |    Doesn't respond in the user's language and has very old data. LoRA needed, but currently not recommended.   |
|      |     qwen2.5:7b      |     Ollama     |      4         |    5s   |    A bit slower than others, possibly due to hardware limits. The language is sometimes strange—it uses the user's language but with weird or non-existent words. It's very concise and doesn't explain much. It could be the best after some fine-tuning.   |


---
