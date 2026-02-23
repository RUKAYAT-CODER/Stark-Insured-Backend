# API Error Codes

This document enumerates the standardized error codes used throughout the backend.  The codes are exposed via the `errorCode` field in every failure response and are kept in `src/common/constants/error-codes.ts`.

| HTTP Status | Error Code               | Meaning / Usage                                    |
|-------------|--------------------------|----------------------------------------------------|
| 400         | `BAD_REQUEST`            | Generic bad request                                 |
| 400         | `VALIDATION_ERROR`       | Input validation failed (details provided)         |
| 401         | `UNAUTHORIZED`           | Authentication required / invalid credentials      |
| 403         | `FORBIDDEN`              | Insufficient permissions                           |
| 404         | `NOT_FOUND`              | Resource not found                                 |
| 404         | `RESOURCE_NOT_FOUND`     | Entity-specific not found (domain error)          |
| 409         | `CONFLICT`               | Conflict occurred (e.g. duplicate resource)        |
| 422         | `UNPROCESSABLE_ENTITY`   | Semantic errors / business rule violation         |
| 429         | `TOO_MANY_REQUESTS`      | Rate limit exceeded                                |
| 500         | `INTERNAL_SERVER_ERROR`  | Unhandled/unexpected server error                  |
| 500         | `DATABASE_ERROR`         | Low‑level database failure                         |
| 503         | `EXTERNAL_SERVICE_ERROR` | Downstream service failed or circuit breaker open  |
| 503         | `SERVICE_UNAVAILABLE`    | System temporarily unavailable (maintenance/fallback)

> 🚨 **Note:** Clients should always display `message` to users and can
> consult these codes for programmatic handling (e.g. retry logic).
