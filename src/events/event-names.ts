/**
 * Centralized event name constants for domain events.
 * Using constants prevents typos and enables IDE autocomplete.
 */
export const EventNames = {
  // Claim Events
  CLAIM_SUBMITTED: 'claim.submitted',
  CLAIM_APPROVED: 'claim.approved',
  CLAIM_REJECTED: 'claim.rejected',
  CLAIM_SETTLED: 'claim.settled',

  // Policy Events
  POLICY_ISSUED: 'policy.issued',
  POLICY_RENEWED: 'policy.renewed',
  POLICY_EXPIRED: 'policy.expired',
  POLICY_CANCELLED: 'policy.cancelled',

  // DAO Events
  DAO_PROPOSAL_CREATED: 'dao.proposal.created',
  DAO_PROPOSAL_FINALIZED: 'dao.proposal.finalized',
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
