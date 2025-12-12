# CarGPT 🚗

<div align="center">

![CarGPT Logo](https://via.placeholder.com/200x200.png?text=CarGPT)

**Find your perfect car using AI - describe what you need, not what you think you want!**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Ollama](https://img.shields.io/badge/Ollama-Required-blue)](https://ollama.ai)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#features) • [Demo](#demo) • [Installation](#installation) • [Usage](#usage) • [API Docs](docs/API.md) • [Contributing](#contributing)

</div>

---

## 🎯 What is CarGPT?

CarGPT is an **AI-powered car recommendation system** that helps you find the perfect car based on your actual needs - not by searching through endless lists of makes and models.

**Instead of asking** "What do you know about a BMW 3 Series?"

**CarGPT asks** "What do you need from a car?" and then suggests the best options for you!

### The Problem

Shopping for a car is overwhelming:
- 🤯 Too many models to choose from
- 📊 Hard to compare features objectively  
- ❓ Don't know which models fit your needs
- 💸 Difficult to find best value for money

### The Solution

CarGPT uses AI to:
1. **Understand** your needs in natural language
2. **Analyze** the entire car market
3. **Suggest** 3 personalized recommendations
4. **Compare** them in an easy-to-read table
5. **Answer** your specific questions

### 💡 Project Philosophy

This project was born as an exercise to explore how modern AI tools can create dynamic user interfaces. Instead of a traditional static table filled with potentially irrelevant data, the goal is to provide a conversational experience that adapts specifically to the user's prompt and needs.

---

## ✨ Features

### 🤖 AI-Powered Recommendations
- Describe your needs in **plain language**
- Get **3 personalized suggestions** with detailed analysis
- See why each car is recommended for **your** specific case

### 📊 Interactive Comparison Table
- Compare all suggestions side-by-side
- See specs, pros/cons, pricing at a glance
- Make informed decisions quickly

### ⚖️ Detailed Head-to-Head Comparison
- Deep dive into any two cars
- Category-by-category comparison
- Clear winner indication for each aspect

### 💬 Interactive Q&A
- Ask specific questions about any suggested car
- Get detailed, contextual answers
- Learn everything you need to know

### 🔄 Smart Alternatives
- Find similar alternatives to any suggestion
- Discover options you might have missed
- Explore different price points and features

### 🆓 100% Free & Private
- Uses **Ollama** - runs locally on your machine
- **No API costs** - completely free forever
- **100% private** - your data never leaves your computer
- **No registration** required

---

## 🎬 Demo

### 1. Describe Your Needs

```
I need a family car with space for 5 people and a large trunk 
for at least 3 suitcases. I'll use it for daily commutes (40km) 
and weekend trips. Budget: max €30,000. Good fuel economy and 
reliability are important.
```

### 2. Get Personalized Suggestions

The AI analyzes your needs and suggests 3 ideal cars:
- **Skoda Octavia Wagon** - Best for space and reliability
- **Peugeot 5008** - Best for versatility and tech
- **Renault Scenic** - Best value for money

### 3. Compare & Decide

See all specs in a clear comparison table, ask questions, compare details, and make your choice!

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org))
- **Ollama** ([Download](https://ollama.ai))

### Installation

```bash
# 1. Install Ollama
# Windows: https://ollama.ai/download
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh

# 2. Download the Ministral model
ollama pull ministral

# 3. Start Ollama (keep this running!)
ollama serve

# 4. In a new terminal, clone and setup CarGPT
git clone https://github.com/yourusername/CarGPT.git
cd CarGPT
npm install

# 5. Create config file
cp .env.example .env

# 6. Start the application
npm start

# 7. Open your browser
# Visit: http://localhost:3000

# 8. (Optional) View API Documentation
# Visit: http://localhost:3000/api-docs
```

That's it! 🎉

---

## 📖 Usage Examples

### Example 1: Family Car
```
Looking for a reliable family car with:
- Space for 2 adults and 2 kids
- Large trunk (3 suitcases minimum)
- Good safety ratings
- Economical for daily 50km commute
- Budget: €25,000-35,000
```

**Result**: Skoda Octavia Wagon, Peugeot 5008, VW Golf Variant

### Example 2: City Commuter
```
Need a compact car for city driving:
- Easy to park
- Low fuel consumption
- Nimble in traffic
- Budget-friendly (under €20k)
- Hybrid preferred
```

**Result**: Toyota Yaris Hybrid, Fiat 500, Honda Jazz

### Example 3: Adventure SUV
```
Looking for a robust SUV for outdoor adventures:
- 4x4 capability
- Good ground clearance
- Reliable in tough conditions
- Can handle dirt roads and snow
- Budget: up to €40,000
```

**Result**: Dacia Duster, Suzuki Vitara, Subaru Forester

---

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
│  (Vanilla)  │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────┐
│   Express   │
│   Server    │
└──────┬──────┘
       │ JSON
       ▼
┌─────────────┐
│   Ollama    │
│ (Ministral) │
└─────────────┘
```

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **AI**: Ollama with Ministral model
- **Storage**: In-memory sessions (1 hour TTL)

---

## 📚 Documentation

- [**API Documentation**](docs/API.md) - Complete API reference
- [**Swagger UI**](http://localhost:3000/api-docs) - Interactive API documentation (when server is running)
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Changelog](CHANGELOG.md) - Version history
- [Security Policy](SECURITY.md) - Security guidelines

---

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas We Need Help

- 🐛 Bug fixes and testing
- 🎨 UI/UX improvements
- 🌍 Translations (currently English only)
- 📝 Documentation improvements
- ✨ New features (see [issues](https://github.com/yourusername/CarGPT/issues))

---

## 🗺️ Roadmap

### Version 1.1 (Coming Soon)
- [ ] Price range filters
- [ ] Fuel type filters (electric, hybrid, etc.)
- [ ] Export comparison to PDF
- [ ] Car images integration

### Version 1.2
- [ ] Multi-language support (Spanish, German, French)
- [ ] Save favorite searches
- [ ] Search history
- [ ] Dark mode

### Version 2.0
- [ ] Database persistence
- [ ] User accounts (optional)
- [ ] Community reviews integration
- [ ] Real-time market prices
- [ ] Dealership links

See [full roadmap](https://github.com/yourusername/CarGPT/projects)

---

## 💡 Why Ollama + Ministral?

| Feature | Cloud APIs | CarGPT (Ollama) |
|---------|-----------|-----------------|
| Cost | $0.05-0.20/query | **FREE** |
| Privacy | ❌ Cloud processing | ✅ 100% Local |
| Rate Limits | ✅ Limited | ✅ Unlimited |
| Internet Required | ✅ Yes | ❌ No (after setup) |
| Speed | Network latency | Direct (faster!) |
| Setup | API keys, billing | One command |

---

## 🐛 Troubleshooting

### "Cannot connect to Ollama"
```bash
# Make sure Ollama is running
ollama serve
```

### "Model ministral not found"
```bash
# Download the model
ollama pull ministral
```

### Responses are slow
- Ministral typically takes 10-30 seconds per response
- If you have an NVIDIA GPU, it will be used automatically
- For faster responses, try `phi3` (less accurate but faster)

### More issues?
Check our [Issues page](https://github.com/yourusername/CarGPT/issues) or open a new one!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Ollama team** for making local LLMs accessible
- **Mistral AI** for the Ministral model
- **Contributors** who make this project better

---

## 📧 Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/CarGPT/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/yourusername/CarGPT/discussions)

---

<div align="center">

**Made with ❤️ for car enthusiasts who want AI-powered help finding their perfect ride**

⭐ Star this repo if you find it useful!

[Report Bug](https://github.com/yourusername/CarGPT/issues) • [Request Feature](https://github.com/yourusername/CarGPT/issues) • [Documentation](docs/)

</div>
