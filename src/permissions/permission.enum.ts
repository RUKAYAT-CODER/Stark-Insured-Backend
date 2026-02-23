export enum Permission {
  // Claims
  CLAIM_VIEW = 'claim:view',
  CLAIM_CREATE = 'claim:create',
  CLAIM_APPROVE = 'claim:approve',
  CLAIM_REJECT = 'claim:reject',
  CLAIM_EDIT = 'claim:edit',
  CLAIM_DELETE = 'claim:delete',

  // Policies
  POLICY_VIEW = 'policy:view',
  POLICY_CREATE = 'policy:create',
  POLICY_EDIT = 'policy:edit',
  POLICY_DELETE = 'policy:delete',
  POLICY_APPROVE = 'policy:approve',

  // DAO
  DAO_VIEW = 'dao:view',
  DAO_PROPOSAL_VIEW = 'dao:proposal:view',
  DAO_PROPOSAL_CREATE = 'dao:proposal:create',
  DAO_PROPOSAL_FINALIZE = 'dao:proposal:finalize',
  DAO_VOTE = 'dao:vote',
  DAO_MANAGE = 'dao:manage',

  // Risk Pool
  RISK_POOL_VIEW = 'risk_pool:view',
  RISK_POOL_MANAGE = 'risk_pool:manage',
  RISK_POOL_LIQUIDATE = 'risk_pool:liquidate',

  // Oracle
  ORACLE_VIEW = 'oracle:view',
  ORACLE_MANAGE = 'oracle:manage',
  ORACLE_REPORT = 'oracle:report',

  // Payments
  PAYMENT_VIEW = 'payment:view',
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_REFUND = 'payment:refund',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // Admin
  USER_VIEW = 'user:view',
  USER_MANAGE = 'user:manage',
  USER_SUSPEND = 'user:suspend',
  USER_DELETE = 'user:delete',
  SYSTEM_CONFIG = 'system:config',
  AUDIT_LOG_VIEW = 'audit_log:view',

  // Security
  SECURITY_MFA_SETUP = 'security:mfa:setup',
  SECURITY_SESSIONS_MANAGE = 'security:sessions:manage',
  SECURITY_TOKENS_REVOKE = 'security:tokens:revoke',
}
