import { ValueTransformer } from 'typeorm';

export class EncryptionRegistry {
  static getEncryptionTransformer(): ValueTransformer {
    return {
      to: (value: any) => value,
      from: (value: any) => value,
    };
  }

  static getObjectEncryptionTransformer(): ValueTransformer {
    return {
      to: (value: any) => value,
      from: (value: any) => value,
    };
  }
}
