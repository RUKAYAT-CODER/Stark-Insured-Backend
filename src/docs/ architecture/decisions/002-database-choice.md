# ADR-002: Database Choice

## Status
Accepted

## Context
Need relational consistency for transactions and relations.

## Decision
Use PostgreSQL.

## Consequences
Pros:
- ACID compliance
- Strong relational support
- JSONB support

Cons:
- Slightly more complex setup than NoSQL