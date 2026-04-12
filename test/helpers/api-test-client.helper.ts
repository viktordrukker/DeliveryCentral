import { INestApplication } from '@nestjs/common';
import request, { SuperTest, Test } from 'supertest';

export interface ApiTestClient {
  get(path: string): Test;
  post(path: string): Test;
}

export function createApiTestClient(app: INestApplication): ApiTestClient {
  const server = app.getHttpServer();
  const client = request(server) as unknown as SuperTest<Test>;

  return {
    get: (path: string) => client.get(path),
    post: (path: string) => client.post(path),
  };
}
