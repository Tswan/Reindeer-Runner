# Reindeer Runner

## Overview

A winter-themed endless runner game built as a full-stack web application. Players control a reindeer dashing through snow, jumping over obstacles, and collecting presents. The game features a leaderboard system where high scores are persisted to a PostgreSQL database. The visual design follows a festive holiday theme with snowflake animations, gradient backgrounds, and custom typography.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React useState for local state
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix UI primitives)
- **Build Tool**: Vite with React plugin

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` (Home, NotFound)
- Reusable components in `client/src/components/`
- Custom hooks in `client/src/hooks/` for data fetching and utilities
- UI primitives in `client/src/components/ui/` (shadcn/ui components)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **API Design**: REST endpoints defined in `shared/routes.ts` with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

The backend follows a simple layered architecture:
- `server/routes.ts`: API route handlers
- `server/storage.ts`: Data access layer with database operations
- `server/db.ts`: Database connection configuration
- `shared/schema.ts`: Database schema definitions shared between client and server

### Game Engine
The game is implemented using HTML5 Canvas (`GameCanvas.tsx`) with:
- Sprite-based animations for the reindeer character
- Obstacle generation and collision detection
- Score tracking with leaderboard integration

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts`: Drizzle table definitions and Zod schemas
- `routes.ts`: API route definitions with type-safe request/response schemas

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via Neon serverless driver (`@neondatabase/serverless`)
- **Drizzle ORM**: Type-safe database queries and migrations
- **Connection**: Requires `DATABASE_URL` environment variable

### Frontend Libraries
- **TanStack React Query**: Server state management and caching
- **Radix UI**: Accessible UI primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management
- **date-fns**: Date formatting utilities

### Build & Development
- **Vite**: Frontend bundler with HMR
- **esbuild**: Server bundling for production
- **Drizzle Kit**: Database migration tooling

### Fonts
- Mountains of Christmas (display font)
- Nunito (body font)
- Loaded via Google Fonts in `client/index.html`