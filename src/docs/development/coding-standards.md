# Coding Standards

## File Naming

- kebab-case for files
- PascalCase for classes
- camelCase for variables

## Module Structure

Each feature module must contain:

- module.ts
- controller.ts
- service.ts
- dto/
- entities/

## DTO Validation

Use class-validator decorators.

## Error Handling

Use HttpException and global exception filters.

## Logging

Use NestJS Logger service.