const { ethers } = require('hardhat');
const chainsInfo = {
    '338':{
      'dxp':'',
      'privateSaleLockerAddress':'0x8a340F39A468C2FcBFFf2122446a9A0745A313Ad',
      'stakingHelperAddress':'0x8a340F39A468C2FcBFFf2122446a9A0745A313Ad',
      'isTestnet':true,
    },
    '1337':{
      'dxp':'',
      'isTestnet':true
    },
    '25':{
      'dxp':'0xe0c41FF9a7032de445771E12C14868CbE061C993',
      'privateSaleLockerAddress':'0x2EC4e8617AB86C05CB0Be6E303BB71eBaeDf0C3E',
      'stakingHelperAddress':'0x8a340F39A468C2FcBFFf2122446a9A0745A313Ad',
      'isTestnet':false
   }
  }
// Deploy function
async function deploy() {

   const ppMultiplier = 10000000;
   [deployer] = await ethers.getSigners();
   deployerAddress = deployer.address;
   const { provider } = deployer
   const chainId = (await provider.getNetwork()).chainId;
   const privateSaleMultiplier = 1;
   var privateSaleLockerAddress = chainsInfo[chainId].privateSaleLockerAddress;
   var chainInfo = chainsInfo[chainId];
   const startTime = (await provider.getBlock()).timestamp;
   const endTime = startTime + (365*24*60*60);
   console.log(`Deploying contracts using ${deployerAddress}`);

   var tokenAddress =chainInfo.dxp;

   if(tokenAddress === ''){
        const StandardToken = await ethers.getContractFactory('StandardToken');
        const token = await StandardToken.deploy(deployerAddress, "Xpad Token","XPAD", 18, '100000000000000000000000000');
        await token.deployed();
        console.log(`Deployed token at ${token.address}`);
        tokenAddress = token.address;
   }
   if(privateSaleLockerAddress === ''){
        const PrivateSaleLocker = await ethers.getContractFactory('MockTokenLocker');
        const privateSaleLocker = await PrivateSaleLocker.deploy();
        privateSaleLockerAddress = privateSaleLocker.address;
        console.log(`Deployed mock privateSaleLocker at ${privateSaleLockerAddress}`);
   }
   // Deploy the contracts
    const StakingHelper = await ethers.getContractFactory("StakingHelper");
    stakingHelper = await StakingHelper.deploy(startTime,endTime, tokenAddress, ppMultiplier, privateSaleMultiplier, privateSaleLockerAddress);
    await stakingHelper.deployed();
    console.log(`StakingHelper deployed at ${stakingHelper.address}`);

   // Deploy FlexTier
   const FlexTierStakingContract = await ethers.getContractFactory('FlexTierStakingContract');
   const flexTier = await FlexTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
   await flexTier.deployed();
   console.log(`FlexTierStakingContract deployed at ${flexTier.address}`);

     // Deploy FlexTier
     const BronzeTierStakingContract = await ethers.getContractFactory('BronzeTierStakingContract');
     const bronzeTier = await BronzeTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
     await bronzeTier.deployed();
     console.log(`BronzeTierStakingContract deployed at ${bronzeTier.address}`);

       // Deploy FlexTier
   const SilverTierStakingContract = await ethers.getContractFactory('SilverTierStakingContract');
   const silverTier = await SilverTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
   await silverTier.deployed();
   console.log(`SilverTierStakingContract deployed at ${silverTier.address}`);

     // Deploy FlexTier
     const GoldTierStakingContract = await ethers.getContractFactory('GoldTierStakingContract');
     const goldTier = await GoldTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
     await goldTier.deployed();
     console.log(`GoldTierStakingContract deployed at ${goldTier.address}`);

     await stakingHelper.setTierAddress([flexTier.address,bronzeTier.address,silverTier.address,goldTier.address]);
     console.log(`Tier addresses are set`);

  
}

deploy()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
