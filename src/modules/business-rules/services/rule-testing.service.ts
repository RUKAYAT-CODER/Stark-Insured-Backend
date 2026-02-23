import { Injectable, Logger } from '@nestjs/common';
import { BusinessRulesEngine } from './business-rules-engine.service';
import { RuleVersion } from '../entities/rule-version.entity';
import { RuleContext, RuleTestResult } from '../interfaces/rule.interfaces';

export interface RuleTestCase {
  name: string;
  description?: string;
  input: RuleContext;
  expected: {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    data?: Record<string, any>;
  };
  timeout?: number;
}

export interface RuleTestSuite {
  ruleId: string;
  version: number;
  testCases: RuleTestCase[];
  metadata?: Record<string, any>;
}

export interface RuleTestExecutionResult {
  testSuite: RuleTestSuite;
  results: RuleTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    executionTime: number;
  };
  executedAt: Date;
}

@Injectable()
export class RuleTestingService {
  private readonly logger = new Logger(RuleTestingService.name);

  constructor(private readonly rulesEngine: BusinessRulesEngine) {}

  /**
   * Execute a test suite for a rule version
   */
  async executeTestSuite(testSuite: RuleTestSuite): Promise<RuleTestExecutionResult> {
    const startTime = Date.now();
    const results: RuleTestResult[] = [];

    this.logger.log(`Executing test suite for rule ${testSuite.ruleId} version ${testSuite.version}`);

    for (const testCase of testSuite.testCases) {
      try {
        const result = await this.executeTestCase(testCase, testSuite.ruleId, testSuite.version);
        results.push(result);
      } catch (error) {
        this.logger.error(`Test case '${testCase.name}' failed:`, error);
        results.push({
          testName: testCase.name,
          passed: false,
          actual: null,
          expected: testCase.expected,
          error: error.message,
        });
      }
    }

    const executionTime = Date.now() - startTime;
    const summary = this.calculateSummary(results, executionTime);

    return {
      testSuite,
      results,
      summary,
      executedAt: new Date(),
    };
  }

  /**
   * Execute a single test case
   */
  async executeTestCase(
    testCase: RuleTestCase,
    ruleId: string,
    ruleVersion: number,
  ): Promise<RuleTestResult> {
    const timeout = testCase.timeout || 5000; // 5 seconds default timeout

    // Create a promise that resolves with the test execution
    const testExecution = this.runTestExecution(testCase, ruleId, ruleVersion);

    // Create a timeout promise
    const timeoutPromise = new Promise<RuleTestResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test case '${testCase.name}' timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      const result = await Promise.race([testExecution, timeoutPromise]);
      return result;
    } catch (error) {
      return {
        testName: testCase.name,
        passed: false,
        actual: null,
        expected: testCase.expected,
        error: error.message,
      };
    }
  }

  /**
   * Run the actual test execution
   */
  private async runTestExecution(
    testCase: RuleTestCase,
    ruleId: string,
    ruleVersion: number,
  ): Promise<RuleTestResult> {
    // This would need to be implemented in the BusinessRulesEngine
    // For now, we'll simulate the execution
    const actual = await this.simulateRuleExecution(testCase.input, ruleId, ruleVersion);

    const passed = this.compareResults(actual, testCase.expected);

    return {
      testName: testCase.name,
      passed,
      actual,
      expected: testCase.expected,
    };
  }

  /**
   * Simulate rule execution (placeholder)
   */
  private async simulateRuleExecution(
    context: RuleContext,
    ruleId: string,
    ruleVersion: number,
  ): Promise<any> {
    // This is a placeholder implementation
    // In a real scenario, this would execute the specific rule version
    // against the provided context
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    // Return a mock result
    return {
      success: true,
      errors: [],
      warnings: [],
      data: context.data,
    } as const;
  }

  /**
   * Compare actual and expected results
   */
  private compareResults(actual: any, expected: any): boolean {
    if (actual.success !== expected.success) {
      return false;
    }

    if (expected.errors && expected.errors.length > 0) {
      const actualErrors = actual.errors || [];
      if (actualErrors.length !== expected.errors.length) {
        return false;
      }
      
      for (const expectedError of expected.errors) {
        if (!actualErrors.includes(expectedError)) {
          return false;
        }
      }
    }

    if (expected.warnings && expected.warnings.length > 0) {
      const actualWarnings = actual.warnings || [];
      if (actualWarnings.length !== expected.warnings.length) {
        return false;
      }
      
      for (const expectedWarning of expected.warnings) {
        if (!actualWarnings.includes(expectedWarning)) {
          return false;
        }
      }
    }

    if (expected.data) {
      // Simple deep comparison for data
      return JSON.stringify(actual.data) === JSON.stringify(expected.data);
    }

    return true;
  }

  /**
   * Calculate test summary
   */
  private calculateSummary(results: RuleTestResult[], executionTime: number) {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const skipped = 0; // Can be implemented later

    return {
      total,
      passed,
      failed,
      skipped,
      executionTime,
    };
  }

  /**
   * Generate test cases from rule version
   */
  generateTestCases(ruleVersion: RuleVersion): RuleTestCase[] {
    const testCases: RuleTestCase[] = [];

    if (ruleVersion.testCases && ruleVersion.testCases.length > 0) {
      // Use existing test cases from the rule version
      for (const testCase of ruleVersion.testCases) {
        testCases.push({
          name: testCase.name,
          description: testCase.description,
          input: testCase.input as RuleContext,
          expected: {
            ...testCase.expected,
            success: testCase.expected.success ?? true,
          },
          timeout: 5000,
        });
      }
    } else {
      // Generate basic test cases based on rule conditions and actions
      testCases.push(...this.generateBasicTestCases(ruleVersion));
    }

    return testCases;
  }

  /**
   * Generate basic test cases for a rule version
   */
  private generateBasicTestCases(ruleVersion: RuleVersion): RuleTestCase[] {
    const testCases: RuleTestCase[] = [];

    // Generate a positive test case (conditions should be met)
    testCases.push({
      name: 'Positive Test Case',
      description: 'Test case where all conditions should be satisfied',
      input: {
        entityType: 'test',
        entityId: 'test-1',
        userId: 'test-user',
        data: this.generatePositiveTestData(ruleVersion.conditions as any[]),
      },
      expected: {
        success: true,
        errors: [],
        warnings: [],
      },
      timeout: 5000,
    });

    // Generate a negative test case (conditions should not be met)
    testCases.push({
      name: 'Negative Test Case',
      description: 'Test case where conditions should not be satisfied',
      input: {
        entityType: 'test',
        entityId: 'test-2',
        userId: 'test-user',
        data: this.generateNegativeTestData(ruleVersion.conditions as any[]),
      },
      expected: {
        success: false,
        errors: ['Rule conditions not met'],
        warnings: [],
      },
      timeout: 5000,
    });

    return testCases;
  }

  /**
   * Generate positive test data based on conditions
   */
  private generatePositiveTestData(conditions: any[]): Record<string, any> {
    const testData: Record<string, any> = {};

    for (const condition of conditions) {
      const { field, value } = condition;
      
      if (typeof value === 'string' && value.includes('.')) {
        // Handle field references (e.g., 'policy.startDate')
        const parts = value.split('.');
        let current = testData;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        
        current[parts[parts.length - 1]] = this.getDefaultValue(condition.operator);
      } else {
        // Set the field to a value that would satisfy the condition
        testData[field] = this.getSatisfyingValue(condition);
      }
    }

    return testData;
  }

  /**
   * Generate negative test data based on conditions
   */
  private generateNegativeTestData(conditions: any[]): Record<string, any> {
    const testData: Record<string, any> = {};

    for (const condition of conditions) {
      const { field } = condition;
      
      // Set the field to a value that would NOT satisfy the condition
      testData[field] = this.getNonSatisfyingValue(condition);
    }

    return testData;
  }

  /**
   * Get a value that satisfies a condition
   */
  private getSatisfyingValue(condition: any): any {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return value;
      case 'not_equals':
        return 'different_value';
      case 'greater_than':
        return typeof value === 'number' ? value + 1 : 100;
      case 'less_than':
        return typeof value === 'number' ? value - 1 : 0;
      case 'between':
        return typeof value === 'object' && Array.isArray(value) ? (value[0] + value[1]) / 2 : 50;
      case 'in':
        return Array.isArray(value) && value.length > 0 ? value[0] : 'default';
      case 'not_in':
        return 'not_in_array_value';
      case 'contains':
        return `contains_${value}`;
      case 'not_contains':
        return 'different_string';
      default:
        return 'default_value';
    }
  }

  /**
   * Get a value that does NOT satisfy a condition
   */
  private getNonSatisfyingValue(condition: any): any {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return 'not_equal_value';
      case 'not_equals':
        return value;
      case 'greater_than':
        return typeof value === 'number' ? value - 1 : -1;
      case 'less_than':
        return typeof value === 'number' ? value + 1 : 999999;
      case 'between':
        return typeof value === 'object' && Array.isArray(value) ? value[1] + 1 : 999999;
      case 'in':
        return 'not_in_array_value';
      case 'not_in':
        return Array.isArray(value) && value.length > 0 ? value[0] : 'default';
      case 'contains':
        return 'does_not_contain';
      case 'not_contains':
        return `contains_${value}`;
      default:
        return 'wrong_value';
    }
  }

  /**
   * Get default value for a field type
   */
  private getDefaultValue(operator: string): any {
    switch (operator) {
      case 'greater_than':
      case 'less_than':
        return 0;
      case 'between':
        return [0, 100];
      case 'in':
        return ['option1', 'option2', 'option3'];
      default:
        return 'default_value';
    }
  }
}
