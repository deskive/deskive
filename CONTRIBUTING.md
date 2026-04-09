# Contributing to Deskive

Thank you for your interest in contributing to Deskive! This guide will help you get started.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Open a [Bug Report](https://github.com/deskive/deskive/issues/new?template=bug_report.yml) with:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details

### Suggesting Features

Open a [Feature Request](https://github.com/deskive/deskive/issues/new?template=feature_request.yml).

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run linting: `cd backend && npm run lint` and `cd frontend && npm run lint`
5. Commit with a descriptive message
6. Push and open a Pull Request

## Development Setup

### Prerequisites
- Node.js 20+, PostgreSQL 15+, Redis 7+
- Flutter SDK 3.7+ (for mobile)
- Docker & Docker Compose (recommended)

### Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/deskive.git
cd deskive

# Backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm run start:dev

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Code Style

- **TypeScript** for backend and frontend
- **Dart** for mobile (Flutter)
- **Prettier** for formatting
- **ESLint** for linting

## Questions?

- Open a [Discussion](https://github.com/deskive/deskive/discussions)

Thank you for contributing!
