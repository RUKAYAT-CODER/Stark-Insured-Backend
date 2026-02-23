/**
 * Event emitted when a policy expires.
 */
export class PolicyExpiredEvent {
  constructor(
    public readonly policyId: string,
    public readonly userId: string,
  ) {}
}
