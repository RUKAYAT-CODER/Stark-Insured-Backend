import { EncryptionRegistry } from './encryption.registry';
import { EncryptionService } from './encryption.service';
import { getEncryptionTransformer, getObjectEncryptionTransformer } from './encryption.transformer';

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
        const transformer = getEncryptionTransformer();

        it('should call encrypt on to()', () => {
            transformer.to('plain');
            expect(encryptionService.encrypt).toHaveBeenCalledWith('plain');
        });

        it('should call decrypt on from()', () => {
            transformer.from('encrypted');
            expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted');
        });
    });

    describe('getObjectEncryptionTransformer', () => {
        const transformer = getObjectEncryptionTransformer();

        it('should call encryptObject on to()', () => {
            transformer.to({ foo: 'bar' });
            expect(encryptionService.encryptObject).toHaveBeenCalledWith({ foo: 'bar' });
        });

        it('should call decryptObject on from()', () => {
            transformer.from('encrypted');
            expect(encryptionService.decryptObject).toHaveBeenCalledWith('encrypted');
        });
    });
});
