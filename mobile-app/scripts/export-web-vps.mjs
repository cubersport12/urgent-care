import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  EXPO_BASE_URL: process.env.EXPO_BASE_URL || '/mobile-app',
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://trouble-dent.ru',
};

console.log(`EXPO_BASE_URL=${env.EXPO_BASE_URL}`);
console.log(`EXPO_PUBLIC_API_URL=${env.EXPO_PUBLIC_API_URL}`);

const result = spawnSync(
  'npx',
  [
    'expo',
    'export',
    '-p',
    'web',
    '--clear',
    '--output-dir',
    '../dist/mobile-app',
  ],
  { stdio: 'inherit', env, shell: true }
);

process.exit(result.status ?? 1);
