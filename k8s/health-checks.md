# Kubernetes Health Checks Configuration

## Health Check Endpoints

The application provides the following health check endpoints:

### 1. General Health Check
- **Endpoint**: `/health`
- **Method**: GET
- **Purpose**: Comprehensive health check including all dependencies
- **Response Codes**: 
  - 200: All services healthy
  - 503: One or more services unhealthy

### 2. Liveness Probe
- **Endpoint**: `/health/live`
- **Method**: GET
- **Purpose**: Determines if the application is running
- **Response Codes**:
  - 200: Application is alive
  - 500: Application is not responding

### 3. Readiness Probe
- **Endpoint**: `/health/ready`
- **Method**: GET
- **Purpose**: Determines if the application is ready to serve traffic
- **Response Codes**:
  - 200: Application is ready
  - 503: Application is not ready (dependencies unavailable)

### 4. Component-Specific Health Checks
- **Database**: `/health/database`
- **Cache**: `/health/cache`
- **Queue**: `/health/queue`
- **Disk**: `/health/disk`

## Kubernetes Configuration

The `deployment.yaml` file includes:

### Liveness Probe Configuration
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe Configuration
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Startup Probe Configuration
```yaml
startupProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30
```

## Health Check Response Format

### Healthy Response (200)
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "cache": {
      "status": "up"
    },
    "queue": {
      "status": "up"
    },
    "disk": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "cache": {
      "status": "up"
    },
    "queue": {
      "status": "up"
    },
    "disk": {
      "status": "up"
    }
  }
}
```

### Unhealthy Response (503)
```json
{
  "status": "error",
  "info": {
    "database": {
      "status": "down"
    }
  },
  "error": {
    "database": {
      "status": "down",
      "message": "Database connection failed"
    }
  },
  "details": {
    "database": {
      "status": "down",
      "message": "Database connection failed"
    }
  }
}
```

## Monitoring and Alerting

### Recommended Prometheus Metrics
- Application uptime
- Health check response times
- Component availability rates
- Error rates by component

### Alert Rules Examples
```yaml
# Alert when application is not ready
- alert: ApplicationNotReady
  expr: probe_success{job="kubernetes-probes", probe="readiness"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Application is not ready to serve traffic"

# Alert when database is unhealthy
- alert: DatabaseUnhealthy
  expr: health_check_status{component="database"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Database health check failed"
```

## Best Practices

1. **Configure appropriate timeouts** - Set timeouts based on your application's response times
2. **Use different thresholds** - Liveness probes should be less sensitive than readiness probes
3. **Monitor probe metrics** - Track probe success rates and response times
4. **Implement graceful shutdown** - Ensure proper cleanup during pod termination
5. **Test in staging** - Validate health check behavior before production deployment

## Testing Health Checks Locally

```bash
# Test general health
curl http://localhost:4000/health

# Test liveness probe
curl http://localhost:4000/health/live

# Test readiness probe
curl http://localhost:4000/health/ready

# Test specific components
curl http://localhost:4000/health/database
curl http://localhost:4000/health/cache
curl http://localhost:4000/health/queue
curl http://localhost:4000/health/disk
```