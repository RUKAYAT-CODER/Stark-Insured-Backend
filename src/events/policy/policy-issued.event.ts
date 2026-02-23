/**
 * Event emitted when a new policy is issued.
 */
export class PolicyIssuedEvent {
  constructor(
    public readonly policyId: string,
    public readonly userId: string,
  ) {}
}
