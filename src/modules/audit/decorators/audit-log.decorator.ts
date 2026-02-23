import { SetMetadata } from '@nestjs/common';
import 'reflect-metadata';

export const AUDIT_LOG_METADATA_KEY = 'audit_log';

export interface AuditLogOptions {
  /** The action type being performed */
  action: string;
  /** The entity type being operated on (e.g., 'CLAIM', 'POLICY', 'USER') */
  entity: string;
  /** Description of the action for human readability */
  description?: string;
  /** Whether to log the request body (be careful with sensitive data) */
  logRequestBody?: boolean;
  /** Whether to log the response body */
  logResponseBody?: boolean;
  /** Fields to mask in the log (for PII/sensitive data) */
  maskFields?: string[];
  /** Data classification level for GDPR compliance */
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  /** Whether this action requires explicit consent under GDPR */
  requiresConsent?: boolean;
  /** Custom function to extract entity ID from arguments */
  entityIdExtractor?: (args: any[]) => string | undefined;
  /** Custom function to extract user ID from arguments or context */
  userIdExtractor?: (args: any[], request: any) => string | undefined;
  /** Additional metadata to include */
  metadata?: Record<string, any>;
}

/**
 * Decorator to mark methods for audit logging.
 * When applied, the method execution will be automatically logged with
 * comprehensive context for compliance and investigation purposes.
 *
 * @example
 * ```typescript
 * @AuditLog({
 *   action: 'CLAIM_APPROVE',
 *   entity: 'CLAIM',
 *   description: 'Approve an insurance claim',
 *   dataClassification: 'confidential',
 *   maskFields: ['ssn', 'bankAccount'],
 *   entityIdExtractor: (args) => args[0],
 * })
 * async approveClaim(claimId: string, approvalData: ApproveClaimDto) {
 *   // Method implementation
 * }
 * ```
 */
export const AuditLog = (options: AuditLogOptions) => {
  return SetMetadata(AUDIT_LOG_METADATA_KEY, options);
};

/**
 * Helper to check if a method has audit log metadata
 */
export const hasAuditLogMetadata = (target: any, propertyKey: string): boolean => {
  return Reflect.hasMetadata(AUDIT_LOG_METADATA_KEY, target, propertyKey);
};

/**
 * Helper to get audit log metadata from a method
 */
export const getAuditLogMetadata = (target: any, propertyKey: string): AuditLogOptions | undefined => {
  return Reflect.getMetadata(AUDIT_LOG_METADATA_KEY, target, propertyKey);
};
