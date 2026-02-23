import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

describe('FileController (e2e)', () => {
    let app: INestApplication;
    const testFilePath = join(__dirname, 'test-upload.txt');

    beforeAll(async () => {
        // Create a test file
        writeFileSync(testFilePath, 'Test file content for upload');
    });

    afterAll(async () => {
        // Cleanup test file
        if (existsSync(testFilePath)) {
            unlinkSync(testFilePath);
        }
    });

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('/api/v1/files/upload (POST)', () => {
        it('should upload a file and return metadata', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/files/upload')
                .attach('file', testFilePath)
                .expect(201);

            expect(response.body).toHaveProperty('filename');
            expect(response.body).toHaveProperty('originalname', 'test-upload.txt');
            expect(response.body).toHaveProperty('size');
            expect(response.body).toHaveProperty('mimetype');
            expect(response.body.size).toBeGreaterThan(0);
        });

        it('should return 400 when no file is provided', async () => {
            return request(app.getHttpServer())
                .post('/api/v1/files/upload')
                .expect(400);
        });
    });
});
