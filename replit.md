# Overview

This is a VR sword fighting game built with React Three Fiber and WebXR technologies. The application creates an immersive virtual reality experience where users can wield swords using VR controllers to destroy targets and interact with a 3D environment. The project features a full-stack architecture with Express.js backend, PostgreSQL database integration via Drizzle ORM, and a comprehensive VR frontend using modern React patterns.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client uses a **React Three Fiber** approach for 3D rendering with **WebXR integration** for VR functionality. Key architectural decisions include:

- **Component-based VR scene management**: Separate components handle different aspects (VRControllers, GameObjects, SwordEffects) for maintainability
- **Zustand state management**: Multiple stores handle different concerns (useVRGame, useAudio, useGame) to avoid prop drilling and provide reactive state updates
- **Custom hooks pattern**: useVRControllers encapsulates complex controller logic and collision detection
- **Modular collision system**: Dedicated collision.ts utility provides reusable AABB and sphere collision detection functions

The frontend prioritizes **immersive VR experience** over traditional web interfaces, with minimal UI overlays and full 3D interaction paradigms.

## Backend Architecture

The server follows a **lightweight Express.js** pattern with:

- **Modular route registration**: Routes are separated from server setup for better organization
- **Storage abstraction layer**: IStorage interface allows switching between in-memory and database storage
- **Development-focused Vite integration**: Hot module replacement and asset serving in development mode
- **Production build optimization**: Separate build process with esbuild for server-side code

The backend currently uses **in-memory storage** but includes database schema definitions for future PostgreSQL integration.

## Data Storage Solutions

**Database Layer**:
- **Drizzle ORM** with PostgreSQL dialect for type-safe database operations
- **Neon Database** integration via @neondatabase/serverless for serverless PostgreSQL
- **Schema-first approach**: Centralized schema definitions in shared/schema.ts
- **Migration support**: Drizzle-kit handles database migrations and schema changes

**State Management**:
- **Zustand stores** for client-side reactive state
- **Subscriptions pattern**: State changes trigger side effects and component updates
- **Immutable updates**: State modifications follow immutable patterns for predictable behavior

## Authentication and Authorization

The current implementation includes:
- **User schema** with username/password fields in PostgreSQL
- **Zod validation** for input sanitization and type safety
- **Session-ready structure** with placeholder for authentication middleware

The authentication system is **prepared but not fully implemented**, allowing for future integration of session management or JWT-based auth.

# External Dependencies

## VR and 3D Graphics
- **@react-three/fiber**: React renderer for Three.js, enabling declarative 3D scene construction
- **@react-three/xr**: WebXR integration for VR controller support and immersive experiences
- **@react-three/drei**: Utility components and helpers for common 3D patterns
- **three.js**: Core 3D graphics library for WebGL rendering and spatial mathematics

## Database and ORM
- **@neondatabase/serverless**: Serverless PostgreSQL driver optimized for edge environments
- **drizzle-orm**: Type-safe ORM with excellent TypeScript integration and migration support
- **drizzle-kit**: CLI tools for schema management and database operations

## UI Framework
- **Radix UI components**: Accessible, unstyled components for building custom interfaces
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **class-variance-authority**: Component variant management for consistent styling patterns

## Development Tools
- **Vite**: Fast build tool with HMR support and optimized bundling
- **TypeScript**: Type safety across the entire application stack
- **tsx**: TypeScript execution for development server running
- **esbuild**: Fast JavaScript bundler for production builds

## State Management and Utilities
- **zustand**: Lightweight state management with subscriptions and middleware support
- **@tanstack/react-query**: Server state management and caching (prepared for API integration)
- **nanoid**: Unique ID generation for game objects and entities
- **clsx**: Conditional className construction utility