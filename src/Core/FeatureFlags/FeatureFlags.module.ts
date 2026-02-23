@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlag])],
  providers: [FeatureFlagService, FeatureFlagGuard],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}
