/**
 * FCL (Flow Client Library) Mocks for Testing
 * 
 * These mocks simulate Flow blockchain interactions for unit testing
 * without requiring actual blockchain connectivity.
 */

import { vi } from 'vitest';

// Mock user state
export interface MockUser {
  loggedIn: boolean;
  addr: string | null;
}

// Default mock user state
export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  loggedIn: false,
  addr: null,
  ...overrides,
});

// Mock connected user
export const mockConnectedUser: MockUser = {
  loggedIn: true,
  addr: '0x1234567890abcdef',
};

// Mock disconnected user
export const mockDisconnectedUser: MockUser = {
  loggedIn: false,
  addr: null,
};

// Mock transaction result
export interface MockTransactionResult {
  transactionId: string;
  status: number;
  statusCode: number;
  errorMessage: string;
  events: MockEvent[];
}

export interface MockEvent {
  type: string;
  transactionId: string;
  transactionIndex: number;
  eventIndex: number;
  data: Record<string, unknown>;
}

// Create mock transaction result
export const createMockTransactionResult = (
  overrides?: Partial<MockTransactionResult>
): MockTransactionResult => ({
  transactionId: 'mock-tx-id-' + Math.random().toString(36).substring(7),
  status: 4, // SEALED
  statusCode: 0, // SUCCESS
  errorMessage: '',
  events: [],
  ...overrides,
});

// Mock FCL module
export const createFclMock = () => {
  let currentUser: MockUser = mockDisconnectedUser;
  const userSubscribers: ((user: MockUser) => void)[] = [];

  return {
    // Configuration
    config: vi.fn().mockReturnValue({
      put: vi.fn().mockReturnThis(),
      get: vi.fn(),
    }),

    // Authentication
    authenticate: vi.fn().mockImplementation(async () => {
      currentUser = mockConnectedUser;
      userSubscribers.forEach((cb) => cb(currentUser));
      return currentUser;
    }),

    unauthenticate: vi.fn().mockImplementation(async () => {
      currentUser = mockDisconnectedUser;
      userSubscribers.forEach((cb) => cb(currentUser));
    }),

    reauthenticate: vi.fn().mockImplementation(async () => {
      currentUser = mockConnectedUser;
      userSubscribers.forEach((cb) => cb(currentUser));
      return currentUser;
    }),

    // Current user subscription
    currentUser: {
      subscribe: vi.fn().mockImplementation((callback: (user: MockUser) => void) => {
        userSubscribers.push(callback);
        callback(currentUser);
        return () => {
          const index = userSubscribers.indexOf(callback);
          if (index > -1) userSubscribers.splice(index, 1);
        };
      }),
      snapshot: vi.fn().mockImplementation(() => currentUser),
    },

    // Transactions
    mutate: vi.fn().mockImplementation(async () => {
      return 'mock-transaction-id';
    }),

    // Scripts (queries)
    query: vi.fn().mockImplementation(async () => {
      return null;
    }),

    // Transaction status
    tx: vi.fn().mockImplementation(() => ({
      onceSealed: vi.fn().mockResolvedValue(createMockTransactionResult()),
      onceFinalized: vi.fn().mockResolvedValue(createMockTransactionResult()),
      onceExecuted: vi.fn().mockResolvedValue(createMockTransactionResult()),
      subscribe: vi.fn(),
    })),

    // Cadence template literals
    cadence: vi.fn().mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
    }),

    // Arguments
    arg: vi.fn().mockImplementation((value: unknown, type: unknown) => ({ value, type })),
    args: vi.fn().mockImplementation((args: unknown[]) => args),

    // Types
    t: {
      UInt8: 'UInt8',
      UInt64: 'UInt64',
      UInt256: 'UInt256',
      UFix64: 'UFix64',
      Fix64: 'Fix64',
      String: 'String',
      Address: 'Address',
      Bool: 'Bool',
      Array: vi.fn((type: string) => `[${type}]`),
      Optional: vi.fn((type: string) => `${type}?`),
    },

    // Helper to set mock user state (for testing)
    __setMockUser: (user: MockUser) => {
      currentUser = user;
      userSubscribers.forEach((cb) => cb(currentUser));
    },

    // Helper to get current mock user (for testing)
    __getMockUser: () => currentUser,
  };
};

// Default FCL mock instance
export const fclMock = createFclMock();

// Mock @onflow/fcl module
vi.mock('@onflow/fcl', () => fclMock);
