'use client';

import { useEffect, ReactNode } from 'react';
import { FlowProvider as FlowSDKProvider } from '@onflow/react-sdk';
import { configureFCL } from '../config/flow';

interface FlowProviderProps {
  children: ReactNode;
}

/**
 * FlowProvider component that wraps the application with Flow blockchain context.
 * Uses @onflow/react-sdk's FlowProvider for authentication, queries, and transactions.
 * Configured for Flow testnet.
 */
export function FlowProvider({ children }: FlowProviderProps) {
  // Configure FCL on mount
  useEffect(() => {
    configureFCL();
    
    // Log configuration for debugging
    console.log('FCL configured for testnet');
    console.log('Access Node:', 'https://rest-testnet.onflow.org');
    console.log('Network:', 'testnet');
  }, []);

  return (
    <FlowSDKProvider
      config={{
        accessNodeUrl: 'https://rest-testnet.onflow.org',
        discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn',
        flowNetwork: 'testnet',
        appDetailTitle: 'FlowShambo',
        appDetailIcon: 'https://placekitten.com/g/200/200', // Placeholder icon
      }}
    >
      {children}
    </FlowSDKProvider>
  );
}

export default FlowProvider;
