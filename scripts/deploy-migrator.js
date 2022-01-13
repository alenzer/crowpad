const { ethers } = require('hardhat');
const chainsInfo = {
    '338':{
      // 'dxp':'0x091267bc63B3d00ea8Db5A2831A289c5d882128c',
      // 'privateSaleLockerAddress':'0x8a340F39A468C2FcBFFf2122446a9A0745A313Ad',
      // 'stakingHelperAddress':'0xB24ae1b750b4456a0b972bE4DC6CE4Fd1Debba1f',
      // 'flexTierAddress':'0x74002c753FeF350b74f6592b4b66541c1408E0aC',
      // 'bronzTierAddress':'0xba8C75623484c306775cA5A1D1fCF49583122Aa2',
      // 'silverTierAddress':'0x85232C80c6055448a01B90006Ec0511a5d51027d',
      // 'goldTierAddress':'0xf0Cb49A0eF47E62cb2471239c89eb890caCc1eb9',
      // 'flexTierV2Address':'0x346B00b0C66f2d1e1Ac98385E089dC60F83c2D40',
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
   },
   '31337':{}
  }
// Deploy function
function isNull(val){
  if(val == '' || typeof val == 'undefined')
    return true;
  return false;
}
async function deploy() {
  const ppMultiplier = 10000000;
  [deployer] = await ethers.getSigners();
  deployerAddress = deployer.address;
  const { provider } = deployer
  const chainId = (await provider.getNetwork()).chainId;
  const privateSaleMultiplier = 1;
  var privateSaleLockerAddress = chainsInfo[chainId].privateSaleLockerAddress;
  var stakingHelper;
  var flexTier;
  var flexTierV2;
  var bronzTier;
  var silverTier;
  var goldTier;
  var stakingHelperAddress = chainsInfo[chainId].stakingHelperAddress;
  var flexTierAddress = chainsInfo[chainId].flexTierAddress;
  var flexTierV2Address = chainsInfo[chainId].flexTierV2Address;
  var bronzTierAddress = chainsInfo[chainId].bronzTierAddress;
  var silverTierAddress = chainsInfo[chainId].silverTierAddress;
  var goldTierAddress = chainsInfo[chainId].goldTierAddress;
  var chainInfo = chainsInfo[chainId];
  var migrateContract;
  const startTime = (await provider.getBlock()).timestamp;
  const endTime = startTime + (365*24*60*60);
  console.log(`Deploying contracts using ${deployerAddress} ib chainId: ${chainId}`);

  var tokenAddress =chainInfo.dxp;
  console.log(`starting deployment`);
  if(isNull(tokenAddress)){
      const StandardToken = await ethers.getContractFactory('StandardToken');
      const token = await StandardToken.deploy(deployerAddress, "Xpad Token","XPAD", 18, '100000000000000000000000000');
      await token.deployed();
      console.log(`Deployed token at ${token.address}`);
      tokenAddress = token.address;
  }
  if(isNull(privateSaleLockerAddress)){
      const PrivateSaleLocker = await ethers.getContractFactory('MockTokenLocker');
      const privateSaleLocker = await PrivateSaleLocker.deploy();
      privateSaleLockerAddress = privateSaleLocker.address;
      console.log(`Deployed mock privateSaleLocker at ${privateSaleLockerAddress}`);
  }

  const StakingHelper = await ethers.getContractFactory("StakingHelper");
  if(isNull(stakingHelperAddress)){
    // Deploy the contracts
    stakingHelper = await StakingHelper.deploy(startTime,endTime, tokenAddress, ppMultiplier, privateSaleMultiplier, privateSaleLockerAddress);
    await stakingHelper.deployed();
    console.log(`StakingHelper deployed at ${stakingHelper.address}`);
    stakingHelperAddress = stakingHelper.address;
  }else{
    stakingHelper = await StakingHelper.attach(stakingHelperAddress);
  }

  const FlexTierStakingContract = await ethers.getContractFactory('FlexTierStakingContract');
  if(isNull(flexTierAddress)){
   // Deploy FlexTier
    flexTier = await FlexTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
    await flexTier.deployed();
    console.log(`FlexTierStakingContract deployed at ${flexTier.address}`);
    flexTierAddress = flexTier.address;
  } else{
    flexTier = await FlexTierStakingContract.attach(flexTierAddress);
  }

  const BronzeTierStakingContract = await ethers.getContractFactory('BronzeTierStakingContract');
  if(isNull(bronzTierAddress)){
    // Deploy BronzTier
    bronzeTier = await BronzeTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
    await bronzeTier.deployed();
    console.log(`BronzeTierStakingContract deployed at ${bronzeTier.address}`);
    bronzTierAddress = bronzeTier.address;
  } else{
    bronzTier = await BronzeTierStakingContract.attach(bronzTierAddress);
  }

  const SilverTierStakingContract = await ethers.getContractFactory('SilverTierStakingContract');
  if(isNull(silverTierAddress)){
      // Deploy Silver Tier
    const silverTier = await SilverTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
    await silverTier.deployed();
    console.log(`SilverTierStakingContract deployed at ${silverTier.address}`);
    silverTierAddress = silverTier.address;
  } else{
    silverTier = await SilverTierStakingContract.attach(silverTierAddress);
  }

  const GoldTierStakingContract = await ethers.getContractFactory('GoldTierStakingContract');
  if(isNull(goldTierAddress)){
    // Deploy FlexTier
    const goldTier = await GoldTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
    await goldTier.deployed();
    console.log(`GoldTierStakingContract deployed at ${goldTier.address}`);
    goldTierAddress = goldTier.address;
  } else{
    goldTier = await GoldTierStakingContract.attach(goldTierAddress);
  }

  var tierAddresses = [flexTier.address, bronzTier.address, silverTier.address, goldTier.address];
  await stakingHelper.setTierAddress(tierAddresses);
  console.log(`Tier addresses are set`);
  if(isNull(flexTierV2Address)){
    // Deploy FlexTier
    flexTierV2 = await FlexTierStakingContract.deploy(stakingHelper.address, tokenAddress,deployerAddress);
    await flexTierV2.deployed();
    console.log(`FlexTierStakingContractV2 deployed at ${flexTierV2.address}`);
    flexTierV2Address = flexTierV2.address;
  } else{
    flexTierV2 = await FlexTierStakingContract.attach(flexTierV2Address);
  }

  tierAddresses.push(flexTierV2.address);
  await stakingHelper.setTierAddress(tierAddresses);
  console.log(`Tier addresses are updated`);
  await flexTier.setMigrator(flexTierV2Address);
  console.log(`FlexTierStakingContractV2 is set as migrator`);
  await flexTierV2.toggleMigrator(flexTierAddress,1);
  console.log(`FlexTierStakingContractV2 is set as migrator`);
}

deploy()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
