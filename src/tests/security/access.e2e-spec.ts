import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UserModule } from '../../src/user/user.module';

describe('AccessGuard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('denies access when principal mismatch', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/otherUserId')
      .set('Authorization', 'Bearer fake-jwt-for-user123');
    expect(res.status).toBe(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
