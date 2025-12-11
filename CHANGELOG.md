# Changelog

All notable changes to CarGPT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-07

### 🎉 Initial Release

#### Added
- **Natural language input** for car requirements
- **AI-powered suggestions** using Ollama + Ministral
- **3 personalized car recommendations** based on user needs
- **Comparative table** with detailed specifications
- **Detailed comparison** between any two suggested cars
  - Performance comparison
  - Fuel consumption
  - Space and practicality
  - Reliability
  - Maintenance costs
- **Interactive Q&A** system for specific questions about each car
- **Similar alternatives** finder
- **Responsive UI** for mobile and desktop
- **Session management** for maintaining conversation context
- **Health check endpoint** for monitoring Ollama connection
- **Example prompts** to help users get started
- **Loading states** and spinner animations
- **Error handling** for common issues
- **Modal dialogs** for detailed comparisons and alternatives

#### Features
- 100% free (uses local Ollama)
- 100% private (all processing local)
- No API keys required
- No rate limits
- Offline capable (after model download)
- Italian language interface and responses
- Clean, modern UI with gradients and animations

#### Technical
- Node.js + Express backend
- Vanilla JavaScript frontend (no framework dependencies)
- Ollama integration for AI processing
- Session-based conversation storage
- JSON-based communication with AI model
- Automatic conversation cleanup after 1 hour

### Known Issues
- Occasional JSON parsing errors from Ollama (retry usually works)
- Model responses can take 10-30 seconds depending on hardware
- No persistence across server restarts

## [Unreleased]

### Planned Features
- [ ] Car images integration
- [ ] Price range filters
- [ ] Export comparison to PDF
- [ ] Save favorite searches
- [ ] Search history
- [ ] Support for more languages
- [ ] Dark mode
- [ ] Car availability links (dealerships/used market)
- [ ] Database persistence for conversations
- [ ] Unit and integration tests

---

## Version History

- **1.0.0** (2024-12-07) - Initial release with core features
