# AI Model Reviews

This document tracks the performance and quality of different AI models tested with carGPT.

## Summary Table

| Date | Model Name | Provider | Quality (1-5) | Latency | Notes |
|------|------------|----------|---------------|---------|-------|
|      |     ministral-3:3b       |     Ollama     |      4         |    1s   |    It's the actual best model for carGPT, i'm building around the capacity of this model. Recognize language e models without any special effort.    |
|      |     gemma3:4b       |     Ollama     |      3         |    0s   |    It's a good model, but it's not as good as ministral-3:3b. It'very fast at answering but doesn't ever respond in the user language. Probably can be better if fine-tuned. It's bad at suggesting models, sometimes invent models that don't even exist.    |
|      |     phi3:3.8       |     Ollama     |      2         |    2s   |    Doens't respond in the User language and has very old data. LoRa needed, but actually not a suggestion.   |
|      |     qwen2.5:7b      |     Ollama     |      4         |    5s   |    It's a bit slower than the others, but maybe it's an hardware limit. The language sometimes is strange, it's the user language but use some weird or inexistent words. It's very concise, it doesn't explain much. Probably it can be the best one after some fine-tuning.   |


---
