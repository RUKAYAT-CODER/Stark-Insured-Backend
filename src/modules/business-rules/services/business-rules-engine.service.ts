import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessRule, RuleType, RuleStatus } from '../entities/business-rule.entity';
import { RuleVersion } from '../entities/rule-version.entity';
import { RuleExecution, RuleExecutionStatus } from '../entities/rule-execution.entity';
import { RuleContext, RuleCondition, RuleAction, RuleDefinition, RuleExecutionResult, RuleValidationResult } from '../interfaces/rule.interfaces';

@Injectable()
export class BusinessRulesEngine {
  private readonly logger = new Logger(BusinessRulesEngine.name);

  constructor(
    @InjectRepository(BusinessRule)
    private ruleRepository: Repository<BusinessRule>,
    @InjectRepository(RuleVersion)
    private versionRepository: Repository<RuleVersion>,
    @InjectRepository(RuleExecution)
    private executionRepository: Repository<RuleExecution>,
  ) {}

  /**
   * Execute rules for a given context
   */
  async executeRules(
    ruleType: RuleType,
    context: RuleContext,
  ): Promise<RuleValidationResult> {
    const startTime = Date.now();
    const executedRules: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get active rules for the specified type
      const rules = await this.getActiveRules(ruleType);
      
      // Sort by priority (higher priority first)
      rules.sort((a, b) => b.priority - a.priority);

      for (const rule of rules) {
        try {
          const result = await this.executeRule(rule, context);
          executedRules.push(rule.name);

          if (!result.success) {
            errors.push(...(result.errors || []));
          }
          
          if (result.warnings) {
            warnings.push(...result.warnings);
          }

          // If a critical rule fails, stop execution
          if (!result.success && rule.priority === 4) {
            break;
          }
        } catch (error) {
          this.logger.error(`Error executing rule ${rule.name}:`, error);
          errors.push(`Rule ${rule.name} execution failed: ${error.message}`);
          
          // Log execution failure
          await this.logExecution(rule, context, null, RuleExecutionStatus.ERROR, error.message);
        }
      }

      const executionTime = Date.now() - startTime;
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        executedRules,
        executionTime,
      };
    } catch (error) {
      this.logger.error('Error executing rules:', error);
      throw error;
    }
  }

  /**
   * Execute a single rule
   */
  async executeRule(rule: BusinessRule, context: RuleContext): Promise<RuleExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get the current version of the rule
      const ruleVersion = await this.getCurrentRuleVersion(rule.id);
      
      if (!ruleVersion) {
        throw new Error(`No active version found for rule ${rule.id}`);
      }

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(ruleVersion.conditions as RuleCondition[], context);
      
      if (!conditionsMet) {
        const executionTime = Date.now() - startTime;
        await this.logExecution(rule, context, { skipped: true }, RuleExecutionStatus.SKIPPED);
        return { success: true, warnings: ['Rule conditions not met'] };
      }

      // Execute actions
      const result = await this.executeActions(ruleVersion.actions as RuleAction[], context);
      
      const executionTime = Date.now() - startTime;
      await this.logExecution(rule, context, result, RuleExecutionStatus.SUCCESS, null, executionTime);
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await this.logExecution(rule, context, null, RuleExecutionStatus.FAILURE, error.message, executionTime);
      throw error;
    }
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateConditions(conditions: RuleDefinition['conditions'], context: RuleContext): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    const results = await Promise.all(
      conditions.map(async (condition) => {
        return this.evaluateCondition(condition, context);
      })
    );

    // Default to AND logic if not specified
    // For now, we'll use AND logic exclusively
    return results.every(result => result);
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: RuleCondition, context: RuleContext): Promise<boolean> {
    const { operator, field, value, customFunction } = condition;
    
    // Get field value from context
    const fieldValue = this.getFieldValue(context, field);
    
    if (customFunction) {
      return this.executeCustomFunction(customFunction, fieldValue, value, context);
    }

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'between':
        return Number(fieldValue) >= Number(value[0]) && Number(fieldValue) <= Number(value[1]);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Execute rule actions
   */
  private async executeActions(actions: RuleDefinition['actions'], context: RuleContext): Promise<RuleExecutionResult> {
    const results: RuleExecutionResult[] = [];
    
    for (const action of actions) {
      try {
        const result = await this.executeAction(action, context);
        results.push(result);
      } catch (error) {
        results.push({ success: false, errors: [error.message] });
      }
    }

    // Combine results
    const allSuccessful = results.every(r => r.success);
    const allErrors = results.flatMap(r => r.errors || []);
    const allWarnings = results.flatMap(r => r.warnings || []);
    const allData = results.reduce((acc, r) => ({ ...acc, ...r.data }), {});

    return {
      success: allSuccessful,
      errors: allErrors,
      warnings: allWarnings,
      data: allData,
    };
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: RuleAction, context: RuleContext): Promise<RuleExecutionResult> {
    const { type, parameters, customFunction } = action;

    if (customFunction) {
      return this.executeCustomFunction(customFunction, context, parameters);
    }

    switch (type) {
      case 'validate':
        return this.executeValidationAction(parameters, context);
      case 'calculate':
        return this.executeCalculationAction(parameters, context);
      case 'transform':
        return this.executeTransformAction(parameters, context);
      case 'notify':
        return this.executeNotificationAction(parameters, context);
      default:
        throw new Error(`Unsupported action type: ${type}`);
    }
  }

  /**
   * Get active rules by type
   */
  private async getActiveRules(ruleType: RuleType): Promise<BusinessRule[]> {
    return this.ruleRepository.find({
      where: {
        type: ruleType,
        status: RuleStatus.ACTIVE,
        isEnabled: true,
      },
      order: {
        priority: 'DESC',
      },
    });
  }

  /**
   * Get current rule version
   */
  private async getCurrentRuleVersion(ruleId: string): Promise<RuleVersion> {
    return this.versionRepository.findOne({
      where: {
        rule: { id: ruleId },
        status: 'ACTIVE',
      },
      order: {
        version: 'DESC',
      },
    });
  }

  /**
   * Log rule execution
   */
  private async logExecution(
    rule: BusinessRule,
    context: RuleContext,
    result: any,
    status: RuleExecutionStatus,
    errorMessage?: string,
    executionTime?: number,
  ): Promise<void> {
    const execution = this.executionRepository.create({
      rule,
      context,
      result,
      status,
      errorMessage,
      executionTime,
      triggeredBy: context.userId,
      entityType: context.entityType,
      entityId: context.entityId,
      metadata: context.metadata,
    });

    await this.executionRepository.save(execution);
  }

  /**
   * Get field value from context
   */
  private getFieldValue(context: RuleContext, field: string): any {
    const parts = field.split('.');
    let value = context.data;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Execute custom function (placeholder for future implementation)
   */
  private async executeCustomFunction(functionName: string, ...args: any[]): Promise<any> {
    // This would be implemented with a secure function execution environment
    // For now, throw an error to indicate it's not implemented
    throw new Error(`Custom function '${functionName}' is not yet implemented`);
  }

  /**
   * Execute validation action
   */
  private async executeValidationAction(parameters: Record<string, any>, context: RuleContext): Promise<RuleExecutionResult> {
    // Implementation for validation actions
    const { field, validation, message } = parameters;
    const value = this.getFieldValue(context, field);
    
    switch (validation) {
      case 'required':
        if (!value) {
          return { success: false, errors: [message || `${field} is required`] };
        }
        break;
      case 'positive':
        if (Number(value) <= 0) {
          return { success: false, errors: [message || `${field} must be positive`] };
        }
        break;
      // Add more validation types as needed
    }
    
    return { success: true };
  }

  /**
   * Execute calculation action
   */
  private async executeCalculationAction(parameters: Record<string, any>, context: RuleContext): Promise<RuleExecutionResult> {
    // Implementation for calculation actions
    const { expression, targetField } = parameters;
    
    // Simple expression evaluation (in production, use a proper expression parser)
    try {
      // This is a simplified example - in production, use a secure expression evaluator
      const result = this.evaluateSimpleExpression(expression, context);
      
      return {
        success: true,
        data: { [targetField]: result },
      };
    } catch (error) {
      return { success: false, errors: [`Calculation error: ${error.message}`] };
    }
  }

  /**
   * Execute transform action
   */
  private async executeTransformAction(parameters: Record<string, any>, context: RuleContext): Promise<RuleExecutionResult> {
    // Implementation for transform actions
    const { field, transform, targetField } = parameters;
    const value = this.getFieldValue(context, field);
    
    let transformedValue = value;
    
    switch (transform) {
      case 'uppercase':
        transformedValue = String(value).toUpperCase();
        break;
      case 'lowercase':
        transformedValue = String(value).toLowerCase();
        break;
      case 'round':
        transformedValue = Math.round(Number(value));
        break;
      // Add more transforms as needed
    }
    
    return {
      success: true,
      data: { [targetField || field]: transformedValue },
    };
  }

  /**
   * Execute notification action
   */
  private async executeNotificationAction(parameters: Record<string, any>, context: RuleContext): Promise<RuleExecutionResult> {
    // Implementation for notification actions
    const { type, message, recipients } = parameters;
    
    // Log notification (in production, integrate with notification service)
    this.logger.log(`Notification: ${type} - ${message} to ${recipients?.join(', ')}`);
    
    return { success: true };
  }

  /**
   * Simple expression evaluator (placeholder)
   */
  private evaluateSimpleExpression(expression: string, context: RuleContext): any {
    // This is a very basic implementation - in production, use a proper expression parser
    // For now, just return a placeholder
    return 0;
  }
}
