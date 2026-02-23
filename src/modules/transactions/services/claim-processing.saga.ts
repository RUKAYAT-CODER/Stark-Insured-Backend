@Injectable()
export class ClaimProcessingSaga {
  constructor(
    private readonly claimService: ClaimService,
    private readonly paymentService: PaymentService,
    private readonly policyService: PolicyService,
  ) {}

  async execute(dto: CreateClaimDto) {
    const sagaState = {
      claim: null,
      payment: null,
    };

    try {
      sagaState.claim = await this.claimService.create(dto);
      sagaState.payment = await this.paymentService.reserve(
        sagaState.claim.id,
      );

      await this.policyService.markClaimInProgress(
        sagaState.claim.policyId,
      );

      return sagaState.claim;
    } catch (error) {
      await this.compensate(sagaState);
      throw error;
    }
  }

  private async compensate(state: any) {
    if (state.payment) {
      await this.paymentService.release(state.payment.id);
    }

    if (state.claim) {
      await this.claimService.markFailed(state.claim.id);
    }
  }
}
