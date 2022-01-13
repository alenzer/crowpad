/**
 * @type import('hardhat/config').HardhatUserConfig
 */

 require('@nomiclabs/hardhat-ethers');

 const fs = require('fs')
const dev = fs.readFileSync('.secret').toString().trim()
const deployer = fs.readFileSync('.secret.mainnet').toString().trim()
module.exports = {
    defaultNetwork: 'cronostestnet',
 
    networks: {
       hardhat: {},
 
       cronosmainnet: {
         url: 'https://rpc.nebkas.ro',
         accounts: [deployer],
         chainId: 25,
         gasPrice: 6000000000000, 
      },
      roninmainnet: {
         url: 'https://api.roninchain.com/rpc',
         accounts: [deployer],
         chainId: 2020,
         gasPrice: 0, 
      },
       cronostestnet: {
          url: 'https://cronos-testnet-3.crypto.org:8545/',
          accounts: [dev],
          chainId: 338,
          gasPrice: 5000000000000, 
       },

       bsctestnet: {
         url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
         accounts: [dev],
         chainId: 97,
         gasPrice: 6000000000000, 
      },
       cassini: {
          url: 'https://cassini.crypto.org:8545/',
          accounts: [dev],
          chainId: 339,
       },
       dev: {
          url: 'http://127.0.0.1:7545',
          accounts: [dev],
          network_id: '5777',
          chainId: 1337,
       },
    },
    solidity: {
       compilers: [
          {
             version: '0.8.0',
             settings: {
                optimizer: {
                   enabled: true,
                   runs: 200,
                },
             },
          },
          {
            version: '0.6.12',
            settings: {
               optimizer: {
                  enabled: true,
                  runs: 1,
               },
            },
         }
       ],
    },
    paths: {
       sources: './contracts',
       cache: './cache',
       artifacts: './artifacts',
    },
    mocha: {
       timeout: 20000,
    },
 };
 