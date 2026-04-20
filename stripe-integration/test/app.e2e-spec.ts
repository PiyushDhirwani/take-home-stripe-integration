import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });

    app.use(
      express.json({
        verify: (req: any, _res: any, buf: Buffer) => {
          req.rawBody = buf;
        },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) → Hello World!', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('GET /plans → returns 3 plans', () => {
    return request(app.getHttpServer())
      .get('/plans')
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveLength(3);
        expect(res.body.map((p: any) => p.id)).toEqual(['basic', 'standard', 'premium']);
      });
  });

  it('GET /success → returns success message', () => {
    return request(app.getHttpServer())
      .get('/success?session_id=cs_test_123')
      .expect(200)
      .then((res) => {
        expect(res.body.message).toBe('Payment successful!');
        expect(res.body.sessionId).toBe('cs_test_123');
      });
  });

  it('GET /cancel → returns cancel message', () => {
    return request(app.getHttpServer())
      .get('/cancel')
      .expect(200)
      .then((res) => {
        expect(res.body.message).toBe('Payment cancelled.');
      });
  });

  describe('Auth flow', () => {
    const testEmail = `e2e_${Date.now()}@test.com`;
    const testPassword = 'testpass123';
    let accessToken: string;

    it('POST /auth/signup → returns accessToken', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201)
        .then((res) => {
          expect(res.body.accessToken).toBeDefined();
          accessToken = res.body.accessToken;
        });
    });

    it('POST /auth/login → returns accessToken', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(201)
        .then((res) => {
          expect(res.body.accessToken).toBeDefined();
          accessToken = res.body.accessToken;
        });
    });

    it('POST /auth/signup duplicate → 409', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(409);
    });

    it('POST /auth/login wrong password → 401', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'wrong' })
        .expect(401);
    });

    it('GET /subscription without token → 401', () => {
      return request(app.getHttpServer())
        .get('/subscription')
        .expect(401);
    });

    it('GET /subscription with token → 200', () => {
      return request(app.getHttpServer())
        .get('/subscription')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('POST /checkout without token → 401', () => {
      return request(app.getHttpServer())
        .post('/checkout')
        .send({ planId: 'basic' })
        .expect(401);
    });

    it('GET /admin/subscriptions as user → 403', () => {
      return request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });
});
