/**
 * Event emitted when a DAO proposal voting has been finalized.
 */
export class DaoProposalFinalizedEvent {
  constructor(
    public readonly proposalId: string,
    public readonly creatorId: string,
    public readonly passed: boolean,
  ) {}
}
