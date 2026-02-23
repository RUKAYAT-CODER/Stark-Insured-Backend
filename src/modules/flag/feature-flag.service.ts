import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FeatureFlag } from './feature-flag.entity';

@Injectable()
export class FeatureFlagService {
  private cache = new Map<string, FeatureFlag>();

  constructor(
    @InjectRepository(FeatureFlag)
    private repo: Repository<FeatureFlag>,
  ) {}

  async loadFlags() {
    const flags = await this.repo.find();
    flags.forEach(flag => this.cache.set(flag.key, flag));
  }

  async isEnabled(
    key: string,
    context?: { userId?: string; roles?: string[]; group?: string },
  ): Promise<boolean> {
    const flag = this.cache.get(key);
    if (!flag) return false;

    if (!flag.enabled) return false;

    if (this.matchesTargeting(flag, context)) return true;

    return this.matchesRollout(flag, context?.userId);
  }

  private matchesTargeting(flag: FeatureFlag, context?: any): boolean {
    if (!flag.targetingRules) return false;

    if (flag.targetingRules.userIds?.includes(context?.userId)) return true;

    if (
      flag.targetingRules.roles?.some(role =>
        context?.roles?.includes(role),
      )
    )
      return true;

    if (flag.targetingRules.groups?.includes(context?.group)) return true;

    return false;
  }

  private matchesRollout(flag: FeatureFlag, userId?: string): boolean {
    if (!userId) return false;

    const hash = this.hashUser(userId);
    return hash % 100 < flag.rolloutPercentage;
  }

  private hashUser(userId: string): number {
    return (
      userId
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100
    );
  }

  async getVariant(
  key: string,
  userId: string,
): Promise<string | null> {
  const flag = this.cache.get(key);
  if (!flag?.isAbTest || !flag.variants) return null;

  const hash = this.hashUser(userId);
  let cumulative = 0;

  for (const variant of flag.variants) {
    cumulative += variant.weight;
    if (hash % 100 < cumulative) {
      return variant.name;
    }
  }

  return null;
}

async trackUsage(key: string, userId: string, variant?: string) {
  await this.usageRepo.save({
    featureKey: key,
    userId,
    variant,
  });
}
}