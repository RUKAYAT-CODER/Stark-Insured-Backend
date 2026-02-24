import { EncryptionRegistry } from './encryption.registry';
import { EncryptionService } from './encryption.service';
import {
  getEncryptionTransformer,
  getObjectEncryptionTransformer,
} from './encryption.transformer';

describe('EncryptionTransformer', () => {
  let encryptionService: jest.Mocked<EncryptionService>;

  beforeEach(() => {
    encryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      encryptObject: jest.fn(),
      decryptObject: jest.fn(),
    } as any;

    EncryptionRegistry.setService(encryptionService as any);
  });

  describe('getEncryptionTransformer', () => {
    it('should call encrypt on to()', () => {
      const transformer = getEncryptionTransformer(encryptionService);
      transformer.to('plain');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('plain');
    });

    it('should call decrypt on from()', () => {
      const transformer = getEncryptionTransformer(encryptionService);
      transformer.from('encrypted');
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted');
    });
  });

  describe('getObjectEncryptionTransformer', () => {
    it('should call encryptObject on to()', () => {
      const transformer = getObjectEncryptionTransformer(encryptionService);
      transformer.to({ foo: 'bar' });
      expect(encryptionService.encryptObject).toHaveBeenCalledWith({
        foo: 'bar',
      });
    });

    it('should call decryptObject on from()', () => {
      const transformer = getObjectEncryptionTransformer(encryptionService);
      transformer.from('encrypted');
      expect(encryptionService.decryptObject).toHaveBeenCalledWith('encrypted');
    });
  });

  describe('EncryptionRegistry static methods', () => {
    it('should return a working transformer via the registry', () => {
      const transformer = EncryptionRegistry.getEncryptionTransformer();
      transformer.to('test');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('test');
    });

    it('should return a working object transformer via the registry', () => {
      const transformer = EncryptionRegistry.getObjectEncryptionTransformer();
      transformer.to({ key: 'value' });
      expect(encryptionService.encryptObject).toHaveBeenCalledWith({
        key: 'value',
      });
    });
  });
});
