export interface RuleContext {
  entityType: string;
  entityId: string;
  userId?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface RuleCondition {
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'custom';
  field: string;
  value: any;
  customFunction?: string;
}

export interface RuleAction {
  type: 'validate' | 'calculate' | 'transform' | 'notify' | 'custom';
  parameters: Record<string, any>;
  customFunction?: string;
}

export interface RuleDefinition {
  conditions: RuleCondition[];
  actions: RuleAction[];
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleExecutionResult {
  success: boolean;
  data?: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface RuleTestResult {
  testName: string;
  passed: boolean;
  actual: any;
  expected: any;
  error?: string;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  executedRules: string[];
  executionTime: number;
  metadata?: Record<string, any>;
}
