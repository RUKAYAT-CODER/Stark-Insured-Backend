@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly flags: FeatureFlagService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const flag = this.reflector.get<string>(
      'feature-flag',
      ctx.getHandler(),
    );

    if (!flag) return true;

    return this.flags.isEnabled(flag);
  }
}
