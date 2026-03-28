/**
 * Contract event types from Soroban smart contracts
 * Matches the event symbols defined in contracts/shared/src/events.rs
 */

export enum ContractEventType {
  // Project events
  PROJECT_CREATED = 'proj_new',
  PROJECT_FUNDED = 'proj_fund',
  PROJECT_COMPLETED = 'proj_done',
  PROJECT_FAILED = 'proj_fail',

  // Contribution events
  CONTRIBUTION_MADE = 'contrib',
  REFUND_ISSUED = 'refund',

  // Escrow events
  ESCROW_INITIALIZED = 'esc_init',
  FUNDS_LOCKED = 'lock',
  FUNDS_RELEASED = 'release',
  MILESTONE_CREATED = 'm_create',
  MILESTONE_SUBMITTED = 'm_submit',
  MILESTONE_APPROVED = 'm_apprv',
  MILESTONE_REJECTED = 'm_reject',
  MILESTONE_COMPLETED = 'milestone',
  VALIDATORS_UPDATED = 'v_update',

  // Distribution events
  PROFIT_DISTRIBUTED = 'profit',
  DIVIDEND_CLAIMED = 'claim',

  // Governance events
  PROPOSAL_CREATED = 'proposal',
  VOTE_CAST = 'vote',
  PROPOSAL_EXECUTED = 'execute',

  // Reputation events
  USER_REGISTERED = 'user_reg',
  REPUTATION_UPDATED = 'rep_up',
  BADGE_EARNED = 'badge',

  // Multi-party payment events
  PAYMENT_SETUP = 'pay_setup',
  PAYMENT_RECEIVED = 'pay_recv',
  PAYMENT_WITHDRAWN = 'pay_withd',

  // Subscription events
  SUBSCRIPTION_CREATED = 'subscr',
  SUBSCRIPTION_CANCELLED = 'sub_cancl',
  SUBSCRIPTION_MODIFIED = 'sub_mod',
  SUBSCRIPTION_PAUSED = 'sub_pause',
  SUBSCRIPTION_RESUMED = 'sub_resum',
  PAYMENT_FAILED = 'pay_fail',
  SUBSCRIPTION_PAYMENT = 'deposit',

  // Cross-chain bridge events
  BRIDGE_INITIALIZED = 'br_init',
  SUPPORTED_CHAIN_ADDED = 'chain_add',
  SUPPORTED_CHAIN_REMOVED = 'chain_rem',
  ASSET_WRAPPED = 'wrap',
  ASSET_UNWRAPPED = 'unwrap',
  BRIDGE_DEPOSIT = 'br_dep',
  BRIDGE_WITHDRAW = 'br_wdraw',
  BRIDGE_PAUSED = 'br_pause',
  BRIDGE_UNPAUSED = 'br_res',
  RELAYER_ADDED = 'rel_add',
  RELAYER_REMOVED = 'rel_rem',
  BRIDGE_TX_CONFIRMED = 'tx_conf',
  BRIDGE_TX_FAILED = 'tx_fail',

  // Contract lifecycle events
  CONTRACT_PAUSED = 'esc_pause',
  CONTRACT_RESUMED = 'esc_resum',
  // Lifecycle events
  UPGRADE_SCHEDULED = 'upg_sched',
  UPGRADE_EXECUTED = 'upg_exec',
  UPGRADE_CANCELLED = 'upg_canc',

  // Insurance events
  POLICY_CREATED = 'pol_new',
  POLICY_ACTIVATED = 'pol_active',
  CLAIM_SUBMITTED = 'clm_new',
  CLAIM_ASSESSED = 'clm_assess',
  CLAIM_PAID = 'clm_paid',
}

/**
 * Raw event data from Stellar RPC
 */
export interface SorobanEvent {
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  id: string;
  pagingToken: string;
  topic: string[];
  value: string;
  inSuccessfulContractCall: boolean;
  txHash: string;
}

/**
 * Parsed contract event with structured data
 * 
 * For backward compatibility with existing code, the default type uses
 * Record<string, unknown> for data. Use ParsedContractEvent<T> with a specific
 * event type for compile-time type safety.
 * 
 * @example
 * // Loose typing (backward compatible)
 * function handleEvent(event: ParsedContractEvent) { ... }
 * 
 * // Strict typing (type-safe)
 * function handleProjectCreated(event: ParsedContractEvent<ContractEventType.PROJECT_CREATED>) {
 *   // event.data is now typed as ProjectCreatedEvent
 *   const projectId = event.data.projectId; // type-safe access
 * }
 */
export interface ParsedContractEvent<T extends ContractEventType | 'unknown' = 'unknown'> {
  eventId: string;
  ledgerSeq: number;
  ledgerClosedAt: Date;
  contractId: string;
  eventType: T extends 'unknown' ? ContractEventType : T;
  transactionHash: string;
  data: T extends 'unknown'
    ? Record<string, unknown>
    : T extends keyof EventTypeToDataMap
      ? EventTypeToDataMap[T]
      : Record<string, unknown>;
  inSuccessfulContractCall: boolean;
}

/**
 * Helper type to get typed event data
 */
export type GetEventData<T extends ContractEventType> = T extends keyof EventTypeToDataMap
  ? EventTypeToDataMap[T]
  : Record<string, unknown>;

/**
 * Project created event data
 */
export interface ProjectCreatedEvent {
  projectId: number;
  creator: string;
  fundingGoal: string;
  deadline: number;
  token: string;
}

/**
 * Contribution made event data
 */
export interface ContributionMadeEvent {
  projectId: number;
  contributor: string;
  amount: string;
  totalRaised: string;
}

/**
 * Milestone approved event data
 */
export interface MilestoneApprovedEvent {
  projectId: number;
  milestoneId: number;
  approvalCount: number;
}

/**
 * Funds released event data
 */
export interface FundsReleasedEvent {
  projectId: number;
  milestoneId: number;
  amount: string;
}

/**
 * Project status changed event data
 */
export interface ProjectStatusEvent {
  projectId: number;
  status: 'completed' | 'failed';
}

// ============================================
// Additional Strict Event Interfaces
// ============================================

/**
 * Project funded event data
 */
export interface ProjectFundedEvent {
  projectId: number;
  totalRaised: string;
}

/**
 * Refund issued event data
 */
export interface RefundIssuedEvent {
  projectId: number;
  contributor: string;
  amount: string;
}

/**
 * Escrow initialized event data
 */
export interface EscrowInitializedEvent {
  projectId: number;
  escrowId: string;
  amount: string;
}

/**
 * Funds locked event data
 */
export interface FundsLockedEvent {
  projectId: number;
  escrowId: string;
  amount: string;
}

/**
 * Milestone created event data
 */
export interface MilestoneCreatedEvent {
  projectId: number;
  milestoneId: number;
  title: string;
  amount: string;
}

/**
 * Milestone submitted event data
 */
export interface MilestoneSubmittedEvent {
  projectId: number;
  milestoneId: number;
  submittedAt: number;
}

/**
 * Milestone rejected event data
 */
export interface MilestoneRejectedEvent {
  projectId: number;
  milestoneId: number;
  reason: string;
}

/**
 * Milestone completed event data
 */
export interface MilestoneCompletedEvent {
  projectId: number;
  milestoneId: number;
  completedAt: number;
}

/**
 * Validators updated event data
 */
export interface ValidatorsUpdatedEvent {
  projectId: number;
  validators: string[];
}

/**
 * Profit distributed event data
 */
export interface ProfitDistributedEvent {
  projectId: number;
  amount: string;
  recipientCount: number;
}

/**
 * Dividend claimed event data
 */
export interface DividendClaimedEvent {
  projectId: number;
  claimant: string;
  amount: string;
}

/**
 * Proposal created event data
 */
export interface ProposalCreatedEvent {
  proposalId: number;
  creator: string;
  title: string;
  deadline: number;
}

/**
 * Vote cast event data
 */
export interface VoteCastEvent {
  proposalId: number;
  voter: string;
  support: boolean;
  weight: string;
}

/**
 * Proposal executed event data
 */
export interface ProposalExecutedEvent {
  proposalId: number;
  executedAt: number;
  success: boolean;
}

/**
 * User registered event data
 */
export interface UserRegisteredEvent {
  userId: string;
  walletAddress: string;
  registeredAt: number;
}

/**
 * Reputation updated event data
 */
export interface ReputationUpdatedEvent {
  userId: string;
  oldScore: number;
  newScore: number;
  reason: string;
}

/**
 * Badge earned event data
 */
export interface BadgeEarnedEvent {
  userId: string;
  badgeType: string;
  earnedAt: number;
}

/**
 * Payment setup event data
 */
export interface PaymentSetupEvent {
  paymentId: string;
  recipients: string[];
  amounts: string[];
}

/**
 * Payment received event data
 */
export interface PaymentReceivedEvent {
  paymentId: string;
  sender: string;
  amount: string;
}

/**
 * Payment withdrawn event data
 */
export interface PaymentWithdrawnEvent {
  paymentId: string;
  recipient: string;
  amount: string;
}

/**
 * Subscription created event data
 */
export interface SubscriptionCreatedEvent {
  subscriptionId: string;
  subscriber: string;
  amount: string;
  interval: number;
}

/**
 * Subscription cancelled event data
 */
export interface SubscriptionCancelledEvent {
  subscriptionId: string;
  cancelledAt: number;
  reason: string;
}

/**
 * Subscription modified event data
 */
export interface SubscriptionModifiedEvent {
  subscriptionId: string;
  newAmount: string;
  newInterval: number;
}

/**
 * Subscription paused event data
 */
export interface SubscriptionPausedEvent {
  subscriptionId: string;
  pausedAt: number;
}

/**
 * Subscription resumed event data
 */
export interface SubscriptionResumedEvent {
  subscriptionId: string;
  resumedAt: number;
}

/**
 * Payment failed event data
 */
export interface PaymentFailedEvent {
  subscriptionId: string;
  failedAt: number;
  reason: string;
}

/**
 * Subscription payment event data
 */
export interface SubscriptionPaymentEvent {
  subscriptionId: string;
  amount: string;
  paidAt: number;
}

/**
 * Bridge initialized event data
 */
export interface BridgeInitializedEvent {
  bridgeId: string;
  admin: string;
}

/**
 * Supported chain added event data
 */
export interface SupportedChainAddedEvent {
  chainId: number;
  chainName: string;
}

/**
 * Supported chain removed event data
 */
export interface SupportedChainRemovedEvent {
  chainId: number;
}

/**
 * Asset wrapped event data
 */
export interface AssetWrappedEvent {
  assetId: string;
  amount: string;
  wrapper: string;
}

/**
 * Asset unwrapped event data
 */
export interface AssetUnwrappedEvent {
  assetId: string;
  amount: string;
  unwrapper: string;
}

/**
 * Bridge deposit event data
 */
export interface BridgeDepositEvent {
  depositId: string;
  chainId: number;
  amount: string;
  depositor: string;
}

/**
 * Bridge withdraw event data
 */
export interface BridgeWithdrawEvent {
  withdrawId: string;
  chainId: number;
  amount: string;
  recipient: string;
}

/**
 * Bridge paused event data
 */
export interface BridgePausedEvent {
  bridgeId: string;
  pausedAt: number;
}

/**
 * Bridge unpaused event data
 */
export interface BridgeUnpausedEvent {
  bridgeId: string;
  unpausedAt: number;
}

/**
 * Relayer added event data
 */
export interface RelayerAddedEvent {
  relayerAddress: string;
  addedAt: number;
}

/**
 * Relayer removed event data
 */
export interface RelayerRemovedEvent {
  relayerAddress: string;
  removedAt: number;
}

/**
 * Bridge transaction confirmed event data
 */
export interface BridgeTxConfirmedEvent {
  txId: string;
  chainId: number;
  confirmedAt: number;
}

/**
 * Bridge transaction failed event data
 */
export interface BridgeTxFailedEvent {
  txId: string;
  chainId: number;
  reason: string;
}

/**
 * Contract paused event data
 */
export interface ContractPausedEvent {
  contractId: string;
  pausedAt: number;
  pausedBy: string;
}

/**
 * Contract resumed event data
 */
export interface ContractResumedEvent {
  contractId: string;
  resumedAt: number;
  resumedBy: string;
}

/**
 * Upgrade scheduled event data
 */
export interface UpgradeScheduledEvent {
  upgradeId: string;
  scheduledFor: number;
  newCodeHash: string;
}

/**
 * Upgrade executed event data
 */
export interface UpgradeExecutedEvent {
  upgradeId: string;
  executedAt: number;
  success: boolean;
}

/**
 * Upgrade cancelled event data
 */
export interface UpgradeCancelledEvent {
  upgradeId: string;
  cancelledAt: number;
  reason: string;
}

/**
 * Policy created event data
 */
export interface PolicyCreatedEventData {
  userId: string;
  poolId: string;
  coverageAmount: string;
  riskType: string;
}

/**
 * Policy activated event data
 */
export interface PolicyActivatedEvent {
  policyId: string;
  activatedAt: number;
}

/**
 * Claim submitted event data
 */
export interface ClaimSubmittedEventData {
  claimId: string;
  policyId: string;
  amount: string;
  submittedAt: number;
}

/**
 * Claim assessed event data
 */
export interface ClaimAssessedEvent {
  claimId: string;
  assessor: string;
  approved: boolean;
  assessedAt: number;
}

/**
 * Claim paid event data
 */
export interface ClaimPaidEvent {
  claimId: string;
  amount: string;
  paidAt: number;
  recipient: string;
}

// ============================================
// Strict Type Mapping & Discriminated Unions
// ============================================

/**
 * Maps ContractEventType to its corresponding event data interface
 * This provides compile-time type safety for event handling
 */
export interface EventTypeToDataMap {
  // Project events
  [ContractEventType.PROJECT_CREATED]: ProjectCreatedEvent;
  [ContractEventType.PROJECT_FUNDED]: ProjectFundedEvent;
  [ContractEventType.PROJECT_COMPLETED]: ProjectStatusEvent;
  [ContractEventType.PROJECT_FAILED]: ProjectStatusEvent;

  // Contribution events
  [ContractEventType.CONTRIBUTION_MADE]: ContributionMadeEvent;
  [ContractEventType.REFUND_ISSUED]: RefundIssuedEvent;

  // Escrow events
  [ContractEventType.ESCROW_INITIALIZED]: EscrowInitializedEvent;
  [ContractEventType.FUNDS_LOCKED]: FundsLockedEvent;
  [ContractEventType.FUNDS_RELEASED]: FundsReleasedEvent;
  [ContractEventType.MILESTONE_CREATED]: MilestoneCreatedEvent;
  [ContractEventType.MILESTONE_SUBMITTED]: MilestoneSubmittedEvent;
  [ContractEventType.MILESTONE_APPROVED]: MilestoneApprovedEvent;
  [ContractEventType.MILESTONE_REJECTED]: MilestoneRejectedEvent;
  [ContractEventType.MILESTONE_COMPLETED]: MilestoneCompletedEvent;
  [ContractEventType.VALIDATORS_UPDATED]: ValidatorsUpdatedEvent;

  // Distribution events
  [ContractEventType.PROFIT_DISTRIBUTED]: ProfitDistributedEvent;
  [ContractEventType.DIVIDEND_CLAIMED]: DividendClaimedEvent;

  // Governance events
  [ContractEventType.PROPOSAL_CREATED]: ProposalCreatedEvent;
  [ContractEventType.VOTE_CAST]: VoteCastEvent;
  [ContractEventType.PROPOSAL_EXECUTED]: ProposalExecutedEvent;

  // Reputation events
  [ContractEventType.USER_REGISTERED]: UserRegisteredEvent;
  [ContractEventType.REPUTATION_UPDATED]: ReputationUpdatedEvent;
  [ContractEventType.BADGE_EARNED]: BadgeEarnedEvent;

  // Multi-party payment events
  [ContractEventType.PAYMENT_SETUP]: PaymentSetupEvent;
  [ContractEventType.PAYMENT_RECEIVED]: PaymentReceivedEvent;
  [ContractEventType.PAYMENT_WITHDRAWN]: PaymentWithdrawnEvent;

  // Subscription events
  [ContractEventType.SUBSCRIPTION_CREATED]: SubscriptionCreatedEvent;
  [ContractEventType.SUBSCRIPTION_CANCELLED]: SubscriptionCancelledEvent;
  [ContractEventType.SUBSCRIPTION_MODIFIED]: SubscriptionModifiedEvent;
  [ContractEventType.SUBSCRIPTION_PAUSED]: SubscriptionPausedEvent;
  [ContractEventType.SUBSCRIPTION_RESUMED]: SubscriptionResumedEvent;
  [ContractEventType.PAYMENT_FAILED]: PaymentFailedEvent;
  [ContractEventType.SUBSCRIPTION_PAYMENT]: SubscriptionPaymentEvent;

  // Cross-chain bridge events
  [ContractEventType.BRIDGE_INITIALIZED]: BridgeInitializedEvent;
  [ContractEventType.SUPPORTED_CHAIN_ADDED]: SupportedChainAddedEvent;
  [ContractEventType.SUPPORTED_CHAIN_REMOVED]: SupportedChainRemovedEvent;
  [ContractEventType.ASSET_WRAPPED]: AssetWrappedEvent;
  [ContractEventType.ASSET_UNWRAPPED]: AssetUnwrappedEvent;
  [ContractEventType.BRIDGE_DEPOSIT]: BridgeDepositEvent;
  [ContractEventType.BRIDGE_WITHDRAW]: BridgeWithdrawEvent;
  [ContractEventType.BRIDGE_PAUSED]: BridgePausedEvent;
  [ContractEventType.BRIDGE_UNPAUSED]: BridgeUnpausedEvent;
  [ContractEventType.RELAYER_ADDED]: RelayerAddedEvent;
  [ContractEventType.RELAYER_REMOVED]: RelayerRemovedEvent;
  [ContractEventType.BRIDGE_TX_CONFIRMED]: BridgeTxConfirmedEvent;
  [ContractEventType.BRIDGE_TX_FAILED]: BridgeTxFailedEvent;

  // Contract lifecycle events
  [ContractEventType.CONTRACT_PAUSED]: ContractPausedEvent;
  [ContractEventType.CONTRACT_RESUMED]: ContractResumedEvent;
  [ContractEventType.UPGRADE_SCHEDULED]: UpgradeScheduledEvent;
  [ContractEventType.UPGRADE_EXECUTED]: UpgradeExecutedEvent;
  [ContractEventType.UPGRADE_CANCELLED]: UpgradeCancelledEvent;

  // Insurance events
  [ContractEventType.POLICY_CREATED]: PolicyCreatedEventData;
  [ContractEventType.POLICY_ACTIVATED]: PolicyActivatedEvent;
  [ContractEventType.CLAIM_SUBMITTED]: ClaimSubmittedEventData;
  [ContractEventType.CLAIM_ASSESSED]: ClaimAssessedEvent;
  [ContractEventType.CLAIM_PAID]: ClaimPaidEvent;
}

/**
 * Union of all possible event data types
 */
export type EventData = EventTypeToDataMap[keyof EventTypeToDataMap];

/**
 * Discriminated union for strongly-typed parsed contract events
 * Use this for event handlers that need type-safe access to event data
 */
export type StrictParsedContractEvent<T extends ContractEventType = ContractEventType> =
  T extends ContractEventType
    ? {
        eventId: string;
        ledgerSeq: number;
        ledgerClosedAt: Date;
        contractId: string;
        eventType: T;
        transactionHash: string;
        data: EventTypeToDataMap[T];
        inSuccessfulContractCall: boolean;
      }
    : never;

/**
 * Union type of all possible strict parsed contract events
 */
export type AnyStrictParsedContractEvent = {
  [K in ContractEventType]: StrictParsedContractEvent<K>
}[ContractEventType];

// ============================================
// Type Guards for Runtime Validation
// ============================================

/**
 * Type guard to check if data is a ProjectCreatedEvent
 */
export function isProjectCreatedEvent(data: unknown): data is ProjectCreatedEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectId' in data &&
    'creator' in data &&
    'fundingGoal' in data &&
    'deadline' in data &&
    'token' in data
  );
}

/**
 * Type guard to check if data is a ContributionMadeEvent
 */
export function isContributionMadeEvent(data: unknown): data is ContributionMadeEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectId' in data &&
    'contributor' in data &&
    'amount' in data &&
    'totalRaised' in data
  );
}

/**
 * Type guard to check if data is a MilestoneApprovedEvent
 */
export function isMilestoneApprovedEvent(data: unknown): data is MilestoneApprovedEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectId' in data &&
    'milestoneId' in data &&
    'approvalCount' in data
  );
}

/**
 * Type guard to check if data is a MilestoneRejectedEvent
 */
export function isMilestoneRejectedEvent(data: unknown): data is MilestoneRejectedEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectId' in data &&
    'milestoneId' in data &&
    'reason' in data
  );
}

/**
 * Type guard to check if data is a FundsReleasedEvent
 */
export function isFundsReleasedEvent(data: unknown): data is FundsReleasedEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectId' in data &&
    'milestoneId' in data &&
    'amount' in data
  );
}

/**
 * Type guard to check if data is a ProjectStatusEvent
 */
export function isProjectStatusEvent(data: unknown): data is ProjectStatusEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectId' in data &&
    'status' in data &&
    (data.status === 'completed' || data.status === 'failed')
  );
}

/**
 * Type guard to check if data is a PolicyCreatedEventData
 */
export function isPolicyCreatedEvent(data: unknown): data is PolicyCreatedEventData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'userId' in data &&
    'poolId' in data &&
    'coverageAmount' in data
  );
}

/**
 * Type guard to check if data is a ClaimSubmittedEventData
 */
export function isClaimSubmittedEvent(data: unknown): data is ClaimSubmittedEventData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'claimId' in data &&
    'policyId' in data &&
    'amount' in data
  );
}

/**
 * Generic type guard factory to validate event data by event type
 * @param eventType The expected event type
 * @param data The data to validate
 * @returns true if data matches the expected structure for the event type
 */
export function isValidEventData<T extends ContractEventType>(
  eventType: T,
  data: unknown,
): data is EventTypeToDataMap[T] {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  // Common validations based on event type
  switch (eventType) {
    case ContractEventType.PROJECT_CREATED:
      return isProjectCreatedEvent(data);
    case ContractEventType.CONTRIBUTION_MADE:
      return isContributionMadeEvent(data);
    case ContractEventType.MILESTONE_APPROVED:
      return isMilestoneApprovedEvent(data);
    case ContractEventType.MILESTONE_REJECTED:
      return isMilestoneRejectedEvent(data);
    case ContractEventType.FUNDS_RELEASED:
      return isFundsReleasedEvent(data);
    case ContractEventType.PROJECT_COMPLETED:
    case ContractEventType.PROJECT_FAILED:
      return isProjectStatusEvent(data);
    case ContractEventType.POLICY_CREATED:
      return isPolicyCreatedEvent(data);
    case ContractEventType.CLAIM_SUBMITTED:
      return isClaimSubmittedEvent(data);
    default:
      // For unhandled types, perform basic object check
      return typeof data === 'object' && data !== null;
  }
}

/**
 * Type-safe event data extractor
 * Use this to safely extract typed event data from a ParsedContractEvent
 */
export function extractEventData<T extends ContractEventType>(
  event: ParsedContractEvent,
  expectedType: T,
): EventTypeToDataMap[T] | null {
  if (event.eventType !== expectedType) {
    return null;
  }

  if (isValidEventData(expectedType, event.data)) {
    return event.data;
  }

  return null;
}
