// feature-flag.entity.ts
@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryColumn()
  key: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ nullable: true })
  description?: string;
}
