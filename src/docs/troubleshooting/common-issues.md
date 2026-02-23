# Common Issues

## 1. Cannot connect to database

Check:
- PostgreSQL is running
- DATABASE_URL is correct
- Port is open

## 2. JWT Invalid Token

Check:
- JWT_SECRET matches
- Token not expired

## 3. Migration Errors

Run:
npm run typeorm migration:run