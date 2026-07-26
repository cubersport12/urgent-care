import { deepseekToken } from './deepseek-token';

export const environment = {
  production: false,
  deepseekToken,
  apiUrl: 'http://localhost:8000',
  /** Dev auto-login when no valid session is stored */
  testAuth: {
    email: 'test@yandex.ru',
    password: 'test'
  }
};
