# 🚀 QUICK START GUIDE - CarGPT with Ollama

## Setup in 5 minutes

### 1️⃣ Install Ollama

**Windows:**
- Go to https://ollama.ai/download
- Download and install the executable
- Restart your PC (recommended)

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2️⃣ Download the Ministral model

Open a terminal and run:
```bash
ollama pull ministral
```

Wait for download (about 4GB). This will take a few minutes.

### 3️⃣ Start Ollama

Leave this terminal open:
```bash
ollama serve
```

You should see:
```
Ollama is running
```

### 4️⃣ Setup CarGPT project

Open a **NEW** terminal in the `CarGPT` folder:

```bash
# Install dependencies
npm install

# Copy configuration
cp .env.example .env

# Start server
npm start
```

### 5️⃣ Open browser

Go to: **http://localhost:3000**

---

## ✅ Verify it works

1. Fill the form with:
   - Requirements: `Family car with 2 kids, large trunk, safe and spacious`
   - Click "Find my perfect cars"

2. You should get a response in ~10-30 seconds (depends on your CPU)

---

## 🐛 Common Issues

### "Cannot connect to Ollama"
```bash
# Verify Ollama is running
ollama serve
```

### "Model ministral not found"
```bash
# Download the model
ollama pull ministral

# Verify it's installed
ollama list
```

### Node.js server won't start
```bash
# Check you're in the right folder
cd CarGPT

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Responses are too slow
- **Ministral** is already optimized for speed
- If you have an NVIDIA GPU, it will be used automatically
- Try a lighter model: `ollama pull phi3` and change `.env`

---

## 🎯 Next Steps

- Try different models: `ollama pull llama3.2`
- Customize the system prompt in `server.js`
- Explore other models at https://ollama.ai/library

---

## 💡 Tips

- **Ministral is fast and accurate** - great for this project
- **Ollama uses GPU** if available (automatic acceleration)
- **Works offline** after downloading the model
- **Zero cost** - use as much as you want without limits

---

**Have questions?** Check the full README.md!
