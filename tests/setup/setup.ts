import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import path from 'path';
import Module from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shimPath = path.resolve(__dirname, '../../backend/shims');
if (!process.env.NODE_PATH?.includes(shimPath)) {
  const paths = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
  paths.push(shimPath);
  process.env.NODE_PATH = paths.join(path.delimiter);
  Module._initPaths();
}
import { cleanup } from '@testing-library/react';

vi.mock('uuid', () => ({
  v4: () => (typeof randomUUID === 'function' ? randomUUID() : 'mock-uuid'),
}));

vi.mock('dotenv', () => ({
  config: () => ({ parsed: {} }),
}));

afterEach(() => {
  cleanup();
});

global.fetch = vi.fn();

window.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});
