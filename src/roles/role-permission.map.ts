import { Role } from './role.enum';
import { Permission } from '../permissions/permission.enum';

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: [
    // DAO
    Permission.DAO_VIEW,
    Permission.DAO_PROPOSAL_VIEW,
    Permission.DAO_PROPOSAL_CREATE,
    Permission.DAO_VOTE,

    // Claims
    Permission.CLAIM_VIEW,
    Permission.CLAIM_CREATE,

    // Policies
    Permission.POLICY_VIEW,
    Permission.POLICY_CREATE,

    // Payments
    Permission.PAYMENT_VIEW,

    // Analytics
    Permission.ANALYTICS_VIEW,

    // Security (self-service)
    Permission.SECURITY_MFA_SETUP,
    Permission.SECURITY_SESSIONS_MANAGE,
  ],

  [Role.MODERATOR]: [
    // All USER permissions
    ...Object.values(Permission).filter(p => [
      Permission.DAO_VIEW,
      Permission.DAO_PROPOSAL_VIEW,
      Permission.DAO_PROPOSAL_CREATE,
      Permission.DAO_VOTE,
      Permission.CLAIM_VIEW,
      Permission.CLAIM_CREATE,
      Permission.POLICY_VIEW,
      Permission.POLICY_CREATE,
      Permission.PAYMENT_VIEW,
      Permission.ANALYTICS_VIEW,
      Permission.SECURITY_MFA_SETUP,
      Permission.SECURITY_SESSIONS_MANAGE,
    ].includes(p)),

    // Moderation permissions
    Permission.CLAIM_APPROVE,
    Permission.CLAIM_REJECT,
    Permission.CLAIM_EDIT,
    Permission.POLICY_APPROVE,
    Permission.AUDIT_LOG_VIEW,
  ],

  [Role.GOVERNANCE]: [
    // DAO permissions
    Permission.DAO_VIEW,
    Permission.DAO_PROPOSAL_VIEW,
    Permission.DAO_PROPOSAL_CREATE,
    Permission.DAO_PROPOSAL_FINALIZE,
    Permission.DAO_VOTE,
    Permission.DAO_MANAGE,

    // Risk Pool
    Permission.RISK_POOL_VIEW,
    Permission.RISK_POOL_MANAGE,

    // User viewing capabilities
    Permission.USER_VIEW,
    Permission.AUDIT_LOG_VIEW,

    // Analytics
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
  ],

  [Role.ADMIN]: [
    // User management
    Permission.USER_VIEW,
    Permission.USER_MANAGE,
    Permission.USER_SUSPEND,
    Permission.USER_DELETE,

    // Claims management
    Permission.CLAIM_VIEW,
    Permission.CLAIM_CREATE,
    Permission.CLAIM_APPROVE,
    Permission.CLAIM_REJECT,
    Permission.CLAIM_EDIT,
    Permission.CLAIM_DELETE,

    // Policy management
    Permission.POLICY_VIEW,
    Permission.POLICY_CREATE,
    Permission.POLICY_EDIT,
    Permission.POLICY_DELETE,
    Permission.POLICY_APPROVE,

    // Risk Pool
    Permission.RISK_POOL_VIEW,
    Permission.RISK_POOL_MANAGE,

    // Oracle
    Permission.ORACLE_VIEW,
    Permission.ORACLE_MANAGE,

    // Payments
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_PROCESS,
    Permission.PAYMENT_REFUND,

    // Analytics
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,

    // System
    Permission.SYSTEM_CONFIG,
    Permission.AUDIT_LOG_VIEW,
    Permission.SECURITY_TOKENS_REVOKE,
  ],

  [Role.SUPER_ADMIN]: Object.values(Permission),
};

