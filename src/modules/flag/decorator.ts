import { SetMetadata } from "@nestjs/common";

export const Feature = (key: string) =>
  SetMetadata('feature', key);