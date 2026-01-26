# 🚀 QUICK START GUIDE - CarGPT with Ollama

## Setup in 5 minutes (Recommended: Docker)

### 🔥 Method 1: Docker Development (Recommended)

Docker provides the most reliable setup with built-in logging and monitoring.

#### Prerequisites
- **Docker Desktop** installed ([Download](https://www.docker.com/products/docker-desktop))

#### Quick Setup
```bash
# 1. Clone and setup
git clone https://github.com/lucapalomba/CarGPT.git
cd CarGPT

# 2. Create environment file
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY and GOOGLE_CX

# 3. Start complete stack (one command!)
npm run docker:dev

# 4. Pull AI model (in another terminal)
docker-compose exec ollama ollama pull mistral
```

#### Access the Application
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **Logging (Seq)**: http://localhost:5341
- **Observability**: http://localhost:3000 (Langfuse)

---

### 💻 Method 2: Local Development

If you prefer running directly on your machine.

#### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org))
- **Ollama** ([Download](https://ollama.ai))

#### Quick Setup
```bash
# 1. Install Ollama
# Windows: https://ollama.ai/download
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh

# 2. Download AI model
ollama pull mistral

# 3. Start Ollama (keep running)
ollama serve

# 4. Setup CarGPT
git clone https://github.com/lucapalomba/CarGPT.git
cd CarGPT
npm install
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env and add your GOOGLE_API_KEY and GOOGLE_CX

# 5. Start applications
npm run dev
```

#### Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs

---

## ✅ Verify it works

1. Fill the form with:
   - Requirements: `Family car with 2 kids, large trunk, safe and spacious`
   - Click "Find my perfect cars"

2. You should get a response in ~10-30 seconds

---

## 🐛 Common Issues

### Docker Issues
```bash
# Check containers are running
docker-compose ps

# View logs
npm run docker:logs

# Restart everything
npm run docker:down && npm run docker:dev
```

### Local Development Issues
```bash
# Cannot connect to Ollama?
ollama serve

# Model not found?
ollama pull mistral

# Node.js server won't start?
cd CarGPT
rm -rf node_modules && npm install
```

### Performance Issues
- **Docker**: Recommended for consistent performance
- **NVIDIA GPU**: Automatically used if available
- **Slower responses**: Normal, AI processing takes time
- **Try lighter model**: `docker-compose exec ollama ollama pull phi3`

---

## 💡 Why Docker is Recommended

| Feature | Docker | Local |
|---------|---------|-------|
| **Setup Complexity** | ✅ One command | ❌ Multiple steps |
| **Environment Consistency** | ✅ Guaranteed | ⚠️ Variable |
| **Built-in Logging** | ✅ Seq + Langfuse | ❌ Manual setup |
| **Port Conflicts** | ✅ Handled | ⚠️ Common |
| **GPU Support** | ✅ Auto-detected | ⚠️ Manual |
| **Hot Reload** | ✅ Yes | ✅ Yes |
| **Resource Usage** | ⚠️ Higher | ✅ Lower |

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

### For Docker Users
```bash
# Try different AI models
docker-compose exec ollama ollama pull llama3.2

# View application logs
npm run docker:logs

# Access monitoring dashboards
# Seq: http://localhost:5341
# Langfuse: http://localhost:3000
```

### For Local Users
```bash
# Try different models
ollama pull llama3.2

# Explore more models
# Visit: https://ollama.ai/library
```

---

## 💡 Tips

### Performance
- **Docker**: More consistent performance across machines
- **Mistral**: Fast and accurate - great for this project
- **GPU Acceleration**: Automatic if NVIDIA GPU detected
- **First query slower**: Model needs to load into memory

### Usage
- **Works offline**: Once AI model is downloaded
- **Zero cost**: Use as much as you want without limits
- **Privacy**: All AI processing stays on your machine

---

## 📚 More Documentation

**Have questions?** Check the comprehensive documentation:

- [🏠 Main README](README.md) - Complete project overview
- [🐳 Docker Guide](DOCKER.md) - Detailed Docker setup
- [🌐 Networking Help](docs/NETWORKING.md) - Troubleshooting guide
- [⚙️ Configuration](docs/CONFIGURATION.md) - All environment variables
- [🏗️ Architecture](ARCHITECTURE.md) - System design overview
- [📖 API Docs](docs/API.md) - Complete API reference
