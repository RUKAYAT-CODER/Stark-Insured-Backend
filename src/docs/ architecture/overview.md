# Architecture Overview

## Tech Stack

- Framework: NestJS
- Database: PostgreSQL
- ORM: TypeORM
- Authentication: JWT
- Deployment: Docker + CI/CD

## Architectural Style

The application follows:

- Modular architecture (NestJS modules)
- Layered structure:
  - Controller layer (HTTP)
  - Service layer (Business logic)
  - Repository/ORM layer (Database)

## High-Level Flow

Client → Controller → Service → Repository → Database

## Key Principles

- Separation of concerns
- Dependency injection
- Feature-based module organization
- Reusable DTO validation