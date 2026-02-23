# Business Rules Engine

A centralized, configurable business rules engine for policy validation, eligibility checks, coverage validation, pricing calculations, and underwriting criteria.

## Features

- ✅ **Centralized Rule Management**: All business rules defined in one place
- ✅ **Dynamic Configuration**: Rules can be updated without code deployment
- ✅ **Version Control**: Full versioning system for rule changes
- ✅ **Rule Testing**: Comprehensive testing framework for validation
- ✅ **Audit Trail**: Complete audit logging for all rule changes
- ✅ **Admin Interface**: REST API for rule management
- ✅ **Performance Monitoring**: Execution tracking and statistics
- ✅ **Type Safety**: Full TypeScript support

## Architecture

### Core Components

1. **Business Rules Engine** (`BusinessRulesEngine`)
   - Executes rules based on context
   - Handles condition evaluation and action execution
   - Manages rule execution flow

2. **Rule Management Service** (`BusinessRulesService`)
   - CRUD operations for rules
   - Version management
   - Rule activation/deactivation

3. **Policy Validation Service** (`PolicyValidationService`)
   - High-level validation endpoints
   - Integrates with existing policy module
   - Provides comprehensive validation results

4. **Rule Testing Service** (`RuleTestingService`)
   - Automated test case generation
   - Test suite execution
   - Results analysis

5. **Rule Audit Service** (`RuleAuditService`)
   - Change tracking
   - Compliance reporting
   - User activity monitoring

## Rule Types

### Policy Validation Rules
- Policy status validation
- Ownership verification
- Coverage period checks

### Eligibility Rules
- Minimum policy value requirements
- Policy age validation
- Risk category assessments

### Coverage Rules
- Coverage limit validation
- Claim type coverage checks
- Remaining coverage calculations

### Pricing Rules
- Base premium calculations
- Risk-based adjustments
- Discount and loading applications

### Underwriting Rules
- Approval requirements
- Risk threshold checks
- Automated underwriting decisions

## API Endpoints

### Public Endpoints
- `POST /policy-validation/validate-for-claim` - Validate policy for claim submission
- `POST /policy-validation/validate-eligibility` - Check policy eligibility
- `POST /policy-validation/validate-coverage` - Validate coverage
- `POST /policy-validation/calculate-pricing` - Calculate pricing
- `POST /policy-validation/validate-comprehensive` - Full validation

### Admin Endpoints
- `GET /admin/business-rules` - List all rules
- `POST /admin/business-rules` - Create new rule
- `PUT /admin/business-rules/:id` - Update rule
- `DELETE /admin/business-rules/:id` - Delete rule
- `POST /admin/business-rules/:id/versions` - Create new version
- `PUT /admin/business-rules/:id/versions/:version/activate` - Activate version
- `POST /admin/business-rules/:id/versions/:version/test` - Test rule version

## Rule Configuration

### Rule Structure
```typescript
{
  name: string;
  description: string;
  type: RuleType;
  priority: RulePriority;
  conditions: RuleCondition[];
  actions: RuleAction[];
  category?: string;
  tags?: string[];
}
```

### Condition Operators
- `equals` - Exact match
- `not_equals` - Not equal
- `greater_than` - Greater than
- `less_than` - Less than
- `between` - Value in range
- `in` - Value in array
- `not_in` - Value not in array
- `contains` - String contains
- `not_contains` - String does not contain

### Action Types
- `validate` - Validation checks
- `calculate` - Perform calculations
- `transform` - Transform data
- `notify` - Send notifications
- `custom` - Custom function execution

## Usage Examples

### Basic Policy Validation
```typescript
const result = await policyValidationService.validatePolicyForClaim({
  policyId: 'policy-123',
  userId: 'user-456',
  claimType: 'ACCIDENT',
  incidentDate: new Date('2024-06-15'),
  claimAmount: 5000,
});
```

### Creating a New Rule
```typescript
const rule = await businessRulesService.createRule({
  name: 'Minimum Coverage Validation',
  description: 'Ensures policy meets minimum coverage requirements',
  type: RuleType.COVERAGE,
  priority: RulePriority.HIGH,
  conditions: [
    {
      operator: 'greater_than',
      field: 'policy.coverageAmount',
      value: 10000,
    },
  ],
  actions: [
    {
      type: 'validate',
      parameters: {
        field: 'policy.coverageAmount',
        validation: 'required',
        message: 'Minimum coverage amount is $10,000',
      },
    },
  ],
  createdBy: 'admin-user',
});
```

### Testing Rules
```typescript
const testResult = await ruleTestingService.executeTestSuite({
  ruleId: 'rule-123',
  version: 1,
  testCases: [
    {
      name: 'Valid Policy Test',
      input: {
        entityType: 'policy',
        entityId: 'test-1',
        userId: 'test-user',
        data: { policy: { coverageAmount: 15000 } },
      },
      expected: {
        success: true,
        errors: [],
      },
    },
  ],
});
```

## Integration with Existing Policy Module

The business rules engine integrates seamlessly with the existing policy module:

1. **Replace PolicyValidationService**: The existing `PolicyValidationService` in the claims module can be replaced with the new rules-based service.

2. **Enhanced Policy Service**: The `PolicyService` can use the rules engine for additional validations during policy transitions.

3. **Event-Driven Updates**: Rule changes can trigger events that update cached policies or notify stakeholders.

## Performance Considerations

- **Caching**: Rule definitions are cached for fast execution
- **Lazy Loading**: Rules are loaded on-demand by type
- **Batch Processing**: Multiple rules can be executed in parallel
- **Execution Tracking**: Performance metrics are collected for optimization

## Security

- **Role-Based Access**: Admin endpoints require proper authorization
- **Audit Logging**: All changes are tracked with user context
- **Input Validation**: All rule inputs are validated before execution
- **Sandbox Execution**: Custom functions run in isolated environments

## Monitoring and Analytics

- **Execution Statistics**: Track rule performance and usage
- **Error Tracking**: Monitor rule failures and exceptions
- **Compliance Reports**: Generate regulatory compliance reports
- **User Activity**: Track rule management activities

## Deployment

### Database Migration
The business rules engine requires the following tables:
- `business_rules` - Rule definitions
- `rule_versions` - Rule version history
- `rule_executions` - Execution logs

### Configuration
```typescript
// app.module.ts
import { BusinessRulesModule } from './modules/business-rules/business-rules.module';

@Module({
  imports: [
    BusinessRulesModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### Environment Variables
```env
# Business Rules Engine Configuration
BUSINESS_RULES_CACHE_TTL=300
BUSINESS_RULES_MAX_EXECUTION_TIME=5000
BUSINESS_RULES_ENABLE_AUDIT_LOG=true
```

## Testing

### Unit Tests
```bash
npm test -- business-rules
```

### Integration Tests
```bash
npm test:e2e -- business-rules
```

### Rule Testing
```bash
# Test all active rules
curl -X POST http://localhost:3000/admin/business-rules/test-all

# Test specific rule
curl -X POST http://localhost:3000/admin/business-rules/rule-123/versions/1/test
```

## Future Enhancements

- **Visual Rule Builder**: Web-based rule creation interface
- **Machine Learning Integration**: AI-powered rule suggestions
- **Advanced Analytics**: Predictive rule performance analysis
- **Multi-tenant Support**: Isolated rule sets per organization
- **Real-time Updates**: WebSocket-based rule change notifications

## Support

For questions or issues related to the business rules engine:
1. Check the API documentation
2. Review the audit logs for troubleshooting
3. Contact the development team

## License

This module is part of the Stellar Insured Backend project.
