/**
 * Event emitted when a new DAO proposal is created.
 */
export class DaoProposalCreatedEvent {
  constructor(
    public readonly proposalId: string,
    public readonly creatorId: string,
    public readonly title: string,
  ) {}
}
