@Controller('claims')
export class ClaimsController {
  constructor(
    private readonly claimV1Service: ClaimV1Service,
    private readonly claimV2Service: ClaimV2Service,
  ) {}

  @UseGuards(FeatureFlagGuard)
  @FeatureFlag('NEW_CLAIMS')
  @Post()
  createClaimV2() {
    return this.claimV2Service.create();
  }
}
