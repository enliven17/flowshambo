// Flow configuration for testnet
// This file configures FCL (Flow Client Library) for the FlowShambo application

import * as fcl from '@onflow/fcl';

// Flow testnet configuration
export const flowConfig = {
  accessNode: {
    url: 'https://rest-testnet.onflow.org'
  },
  discovery: {
    wallet: 'https://fcl-discovery.onflow.org/testnet/authn'
  },
  // Contract addresses will be updated after deployment
  contracts: {
    FlowShambo: '0xFLOWSHAMBO_ADDRESS' // Placeholder - update after deployment
  }
};

// Configure FCL for testnet
export function configureFCL() {
  fcl.config({
    'app.detail.title': 'FlowShambo',
    'app.detail.icon': 'https://placekitten.com/g/200/200', // Placeholder icon
    'accessNode.api': flowConfig.accessNode.url,
    'discovery.wallet': flowConfig.discovery.wallet,
    'flow.network': 'testnet'
  });
}

// Export FCL for use throughout the app
export { fcl };
