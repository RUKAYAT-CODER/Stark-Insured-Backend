/**
 * Data classification levels for GDPR and compliance purposes.
 * Used to categorize the sensitivity of data being accessed or modified.
 */
export enum DataClassification {
  /** Public data - no restrictions */
  PUBLIC = 'public',
  /** Internal data - organization use only */
  INTERNAL = 'internal',
  /** Confidential data - restricted access */
  CONFIDENTIAL = 'confidential',
  /** Restricted data - highest protection (PII, financial, health) */
  RESTRICTED = 'restricted',
}
