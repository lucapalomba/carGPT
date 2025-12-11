# Contributing to CarGPT

First off, thank you for considering contributing to CarGPT! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear description** of the issue
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Node version, Ollama version, model used)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Clear description** of the enhancement
- **Use case** - why would this be useful?
- **Possible implementation** approach (if you have ideas)

### Pull Requests

1. **Fork** the repository
2. **Create a branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly** - ensure the app works with your changes
5. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
6. **Push** to your branch (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

#### PR Guidelines

- Follow the existing code style
- Update documentation if needed
- Add comments for complex logic
- Test with Ollama before submitting
- Keep PRs focused - one feature/fix per PR

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/CarGPT.git
cd CarGPT

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Ensure Ollama is running
ollama serve

# Start development server
npm run dev
```

## Code Style

- Use **ES6+ features** (async/await, arrow functions, etc.)
- **Consistent naming**: camelCase for variables/functions, PascalCase for classes
- **Meaningful names**: `currentCars` not `arr`, `showResults` not `func1`
- **Comments in English** for all code
- **Error handling**: Always use try-catch for async operations
- **Async/await** preferred over promises

## Project Structure

```
CarGPT/
├── server.js          # Backend - API endpoints and Ollama integration
├── public/
│   ├── index.html     # Main UI structure
│   ├── style.css      # All styles (no external CSS frameworks)
│   └── app.js         # Frontend logic and API calls
├── package.json       # Dependencies and scripts
└── .env              # Configuration (not in repo)
```

## Areas for Contribution

### High Priority
- [ ] Improve JSON parsing reliability from Ollama responses
- [ ] Add loading states and better error messages
- [ ] Support for more Ollama models (configuration)
- [ ] Unit tests for API endpoints
- [ ] Integration tests

### Medium Priority
- [ ] Price filters (budget ranges)
- [ ] Save/export comparison results (PDF, JSON)
- [ ] Fuel type filters (electric, hybrid, diesel, petrol)
- [ ] Year range filters
- [ ] Car images integration
- [ ] Internationalization (Spanish, German, French)

### Low Priority / Nice to Have
- [ ] Dark mode
- [ ] Search history
- [ ] Favorites system
- [ ] Share results via URL
- [ ] Progressive Web App (PWA)
- [ ] Voice input for requirements

## Testing

Currently, testing is manual. To test your changes:

1. **Start Ollama**: `ollama serve`
2. **Start server**: `npm start`
3. **Test basic flow**:
   - Submit requirements
   - Verify 3 cars are suggested
   - Check comparison table displays correctly
   - Test detailed comparison modal
   - Test Q&A feature
   - Test alternatives feature
4. **Test edge cases**:
   - Very short requirements
   - Very long requirements
   - Special characters in input
   - Rapid successive requests
   - Browser refresh during loading

## Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers.

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone.

### Our Standards

- Be respectful and constructive
- Welcome newcomers
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

## Recognition

Contributors will be recognized in the README.md file.

---

Thank you for contributing! 🚗💨
