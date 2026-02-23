/**
 * Event emitted when a policy is renewed.
 */
export class PolicyRenewedEvent {
  constructor(
    public readonly policyId: string,
    public readonly userId: string,
  ) {}
}
