# Bookmarkify

A production-ready, cloud-native SaaS bookmark management platform.

## Architecture

The project is organized as a monorepo:

- **apps/web**: The main React application (Dashboard).
- **apps/extension**: The Browser Extension (Manifest V3).
- **apps/api**: The NestJS Backend API.
- **packages/shared**: Shared types and utilities.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
npm install
```

### Development

You can run development servers for each application:

```bash
# Web App
npm run dev:web

# Browser Extension
npm run dev:ext

# Backend API
npm run dev:api
```

### Building

To build all applications:

```bash
# Web App
npm run build:web

# Browser Extension
npm run build:ext

# Backend API
npm run build:api
```

## Structure

```text
/
├── apps/
│   ├── web/          # React + Vite
│   ├── extension/    # React + Vite + CRX
│   └── api/          # NestJS
└── packages/         # Shared libraries
```
