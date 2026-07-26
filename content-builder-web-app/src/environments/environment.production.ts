import { deepseekToken } from './deepseek-token';

export const environment = {
  production: true,
  deepseekToken,
  apiUrl: 'http://localhost:8000',
  testAuth: {
    email: 'test@yandex.ru',
    password: 'test'
  }
};
