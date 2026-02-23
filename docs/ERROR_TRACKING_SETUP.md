# Error Tracking Setup Guide

## Quick Start (5 Minutes)

### 1. Get Sentry DSN

Visit [https://sentry.io](https://sentry.io) and:
1. Sign up or log in
2. Create a new project (select Node.js/NestJS)
3. Copy the DSN (format: `https://<key>@<organization>.ingest.sentry.io/<projectId>`)

### 2. Configure Environment

Add to your `.env` file:

```bash
SENTRY_DSN=https://YOUR_KEY@YOUR_ORGANIZATION.ingest.sentry.io/YOUR_PROJECT_ID
SENTRY_TRACES_SAMPLE_RATE=0.1
NODE_ENV=production
```

### 3. Install Dependencies

Dependencies are already added to `package.json`:
- `@sentry/node` - Sentry SDK
- `@sentry/integrations` - Additional integrations

Just run:

```bash
npm install
```

### 4. Restart Application

```bash
npm run start:prod
```

Error tracking is now active! 🎉

## Verification

### Test Error Tracking

1. **Trigger an Error**
   ```bash
   # This will create an error
   curl http://localhost:4000/api/v1/invalid-route
   ```

2. **Check Error Metrics**
   ```bash
   curl http://localhost:4000/api/v1/error-tracking/metrics
   ```

3. **View in Sentry Dashboard**
   - Go to your Sentry project
   - Click "Issues"
   - You should see recent errors

### Expected Response

```json
{
  "errorCount": 1,
  "errorRate": 0.0167,
  "topErrors": [
    {
      "errorType": "NotFoundException",
      "count": 1,
      "lastOccurrence": "2025-01-15T10:30:00.000Z",
      "severity": "info",
      "category": "not_found"
    }
  ],
  "errorsByCategory": {
    "not_found": 1
  },
  "errorsBySeverity": {
    "info": 1
  },
  "recentErrors": [...]
}
```

## Common Issues

### Error Tracking Not Working

**Problem**: Errors not appearing in Sentry dashboard

**Solution**:
1. Verify SENTRY_DSN is set: `echo $SENTRY_DSN`
2. Check application logs for errors: `npm run start:dev 2>&1 | grep -i sentry`
3. Verify network connectivity to sentry.io
4. Wait 30 seconds after error (processing delay)

### Too Many Errors

**Problem**: Sentry quota exceeded or too much noise

**Solution**:
1. Reduce sample rate:
   ```bash
   SENTRY_TRACES_SAMPLE_RATE=0.01  # 1% instead of 10%
   ```

2. Filter out 404s:
   ```bash
   SENTRY_FILTER_404S=true
   ```

3. Use Sentry dashboard to create filtering rules

### Performance Issues

**Problem**: Application is slow after enabling error tracking

**Solution**:
1. Reduce sample rate significantly:
   ```bash
   SENTRY_TRACES_SAMPLE_RATE=0.01
   ```

2. Disable profiling in dev:
   ```bash
   NODE_ENV=development
   ```

## Next Steps

1. **Configure Alerts**
   - Go to Sentry dashboard
   - Settings → Alerts
   - Create alert rules for critical errors

2. **Set Up Integrations**
   - Connect to Slack for notifications
   - Set up PagerDuty for critical errors
   - Configure email alerts

3. **Monitor Dashboard**
   - Check daily for error patterns
   - Review release performance
   - Track error trends

4. **Custom Configuration**
   - Adjust sample rates based on traffic
   - Fine-tune error filtering
   - Configure team routing

## Development vs Production

### Development Environment

```bash
NODE_ENV=development
SENTRY_TRACES_SAMPLE_RATE=1.0      # Capture all for debugging
SENTRY_FILTER_404S=false            # See all errors
```

### Production Environment

```bash
NODE_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.1      # 10% to avoid quota
SENTRY_FILTER_404S=true            # Reduce noise
```

### Staging Environment

```bash
NODE_ENV=staging
SENTRY_TRACES_SAMPLE_RATE=0.5      # 50% for good coverage
SENTRY_FILTER_404S=false            # See issues before production
```

## Key Features

### ✅ Automatic Capture
- All exceptions are automatically captured
- Request context included
- Stack traces preserved

### ✅ Error Classification
- Severity levels (info → critical)
- Categories (validation, auth, database, etc.)
- Pattern recognition

### ✅ Error Analytics
- Error metrics API
- Historical data
- Trend analysis

### ✅ API Endpoints
- `GET /api/v1/error-tracking/metrics` - Error statistics
- `GET /api/v1/error-tracking/logs` - All error logs
- `GET /api/v1/error-tracking/health` - Service status

## Documentation

- Full documentation: [ERROR_TRACKING.md](./ERROR_TRACKING.md)
- Sentry docs: https://docs.sentry.io
- Troubleshooting: [ERROR_TRACKING.md#Troubleshooting](./ERROR_TRACKING.md#troubleshooting)

## Support

Issues with error tracking?
1. Check Sentry documentation
2. Review error logs: `GET /api/v1/error-tracking/logs`
3. Check application logs
4. Contact the team

Happy error tracking! 🚀
