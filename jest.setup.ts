// jest.setup.ts

import dotenv from 'dotenv';

console.log('Jest setup running, NODE_ENV =', process.env.NODE_ENV);
dotenv.config({ path: '.env.test' });
console.log('Loaded .env.test');
