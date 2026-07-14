import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './msw/server';

// Fresh DOM between tests
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// Boot MSW once
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
