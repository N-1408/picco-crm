import dotenv from 'dotenv';

let isLoaded = false;

export function loadEnv(path = '.env') {
  if (isLoaded) return;
  dotenv.config({ path });
  isLoaded = true;
}

export function getRequiredEnv(key) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return process.env[key];
}
