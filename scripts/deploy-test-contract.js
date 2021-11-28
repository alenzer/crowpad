const { ethers } = require('hardhat');
const chainsInfo = {
    '338':{
      'dxp':'',
      'isTestnet':true
    },
    '1337':{
      'dxp':'',
      'isTestnet':true
    },
    '25':{
      'dxp':'',
      'isTestnet':false
   },
   '2020':{
     'dxp':'',
     'isTestnet':false
  }
  }
// Deploy function
async function deploy() {

   const ppMultiplier = 10000;
   [deployer] = await ethers.getSigners();
   deployerAddress = deployer.address;
   const { provider } = deployer
   const chainId = (await provider.getNetwork()).chainId;
   var chainInfo = chainsInfo[chainId];
   const startTime = (await provider.getBlock()).timestamp;
   const endTime = startTime + (1000);
   console.log(`Deploying contracts using ${deployerAddress}`);

   const TestContract = await ethers.getContractFactory("TestContract");
   const testContract = await  TestContract.deploy();
   await testContract.deployed();
   console.log('Demo Contract Deployed');
  
}

deploy()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
