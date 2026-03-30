import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockEncryptionService = {
  encryptForStorage: jest.fn((v) => `enc:${v}`),
  decryptFromStorage: jest.fn((v) => v.replace('enc:', '')),
  isEncrypted: jest.fn((v) => typeof v === 'string' && v.startsWith('enc:')),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('getUserById', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserById('non-existent-id')).rejects.toThrow(
        'User not found',
      );
    });

    it('returns user data when user exists', async () => {
      const mockUser = {
        id: 'user-123',
        walletAddress: '0xabc',
        email: null,
        profileData: null,
        reputationScore: 0,
        trustScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-123');

      expect(result.id).toBe('user-123');
      expect(result.walletAddress).toBe('0xabc');
    });

    it('decrypts encrypted email field', async () => {
      const mockUser = {
        id: 'user-123',
        walletAddress: '0xabc',
        email: 'enc:test@example.com',
        profileData: null,
        reputationScore: 0,
        trustScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-123');

      expect(result.email).toBe('test@example.com');
    });
  });

  describe('updateUser', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUser('non-existent-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
