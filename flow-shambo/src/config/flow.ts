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
  // Contract addresses - deployed on testnet
  contracts: {
    FlowShambo: '0x9d8d1e6cee0341ec',
    FungibleToken: '0x9a0766d93b6608b7',
    FlowToken: '0x7e60df042a9c0868'
  }
};

// Configure FCL for testnet
export function configureFCL() {
  fcl.config()
    .put('app.detail.title', 'FlowShambo')
    .put('app.detail.icon', 'https://placekitten.com/g/200/200')
    .put('accessNode.api', flowConfig.accessNode.url)
    .put('discovery.wallet', flowConfig.discovery.wallet)
    .put('flow.network', 'testnet')
    .put('0xFlowToken', '0x7e60df042a9c0868') // Flow Token contract on testnet
    .put('0xFungibleToken', '0x9a0766d93b6608b7') // FungibleToken contract on testnet
    .put('0xFlowShambo', '0x9d8d1e6cee0341ec') // FlowShambo contract deployed
    .put('discovery.authn.endpoint', 'https://fcl-discovery.onflow.org/testnet/authn')
    .put('discovery.authn.include', ['0x82ec283f88a62e65', '0x9d2e44203cb13051']); // Lilico and Blocto testnet
}

// Export FCL for use throughout the app
export { fcl };
