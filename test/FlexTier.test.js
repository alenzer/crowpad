
const { ethers } = require("hardhat");
const chai = require('chai');
const { solidity } = require('ethereum-waffle');
const { BigNumber } = require('@ethersproject/bignumber')

function getEthers(inputEther) {
  return BigNumber.from(ethers.utils.parseEther(inputEther))
}
function getNegativeEthers(inputEther) {
  return BigNumber.from(ethers.utils.parseEther(inputEther)).mul(BigNumber.from(-1))
}

chai.use(solidity);

const expect = chai.expect;
describe("FlexTierStakingContract", async () => {
  let deployerAddress, anotherUser1, stakingHelper, flexTier, flexTierV2, flexTierAddress, standardToken, deployer;
  
  beforeEach(async () => {
    const [owner, user1] = await ethers.getSigners();
    deployer = owner;
    anotherUser1 = user1;
    ppMultiplier = 10000;
    privateSaleMultiplier = 1;
    const Token = await ethers.getContractFactory("StandardToken");
    const startTime = (await deployer.provider.getBlock()).timestamp;
    const endTime = startTime + (1000);
    standardToken = await Token.deploy(owner.address, "Demo Token", "DT", 18, getEthers("1000000"));
    await standardToken.deployed();

    const PrivateSaleLocker = await ethers.getContractFactory("MockTokenLocker");
    const privateSaleLocker = await PrivateSaleLocker.deploy();
    privateSaleLockerAddress = privateSaleLocker.address;
    deployerAddress = owner.address;

    const StakingHelper = await ethers.getContractFactory("StakingHelper");
    stakingHelper = await StakingHelper.deploy(startTime, endTime, standardToken.address, ppMultiplier, privateSaleMultiplier, privateSaleLockerAddress);
    await stakingHelper.deployed();

    const FlexTierStakingContract = await ethers.getContractFactory('FlexTierStakingContract');

    flexTier = await FlexTierStakingContract.deploy(deployerAddress, standardToken.address, deployerAddress, stakingHelper.address);
    flexTierV2 = await FlexTierStakingContract.deploy(deployerAddress, standardToken.address, deployerAddress,  stakingHelper.address);
    await flexTier.deployed();
    flexTierAddress = flexTier.address;
    await flexTierV2.deployed();
    await flexTier.setMigrator(flexTierV2.address);
    await flexTierV2.toggleMigrator(flexTier.address,1);
  });
  describe("depositor", () => {
    it("should return the correct depositor address", async () => {
      const config = await flexTier.CONFIG();
      expect(config.depositor).to.equal(deployerAddress);
    });
  })
  describe("single lock", async () => {
    it("should revert if the address is 0", async () => {
      expect(flexTier.singleLock("0x0000000000000000000000000000000000000000", 1)).to.be.revertedWith("No ADDR");
    });

    it("should revert if the amount is 0", async () => {
      expect(flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38", 0)).to.be.revertedWith("No AMT");
    });

    it("should revert depositor allowed is different address", async () => {
      await flexTier.setDepositor(standardToken.address);
      expect(flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38", 1)).to.be.revertedWith("Only depositor can call this function");
    });

    it("should be revert for single lock with 99 wei", async () => {
      await standardToken.approve(flexTier.address, 1001);
      expect(flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38", 999)).to.be.revertedWith('MIN DEPOSIT');
    });
    // it("should be successful for single lock with more than 1000 wei", async () => {
    //   await standardToken.approve(flexTier.address, getEthers('1002'));
    //   //  await expect(() => bronzeTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
    //   await expect(() => flexTier.singleLock(deployerAddress, getEthers('1001'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1001'));
    // });

    it("should be successful for single lock with more than 1000 TOKENS and migrate", async () => {
      await standardToken.approve(flexTier.address, getEthers('1000'));
      await expect(() => flexTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const lockId1 = await flexTier.USER_LOCKS(deployerAddress, 0);
      console.log(lockId1);
      await expect(flexTier.migrateToNewVersion(lockId1));
      const newBalance = await standardToken.balanceOf(flexTierV2.address);
      const oldBalance = await standardToken.balanceOf(flexTier.address);
      console.log(oldBalance);
      console.log(newBalance);
      expect(oldBalance).to.equal(getEthers('0'));
      expect(newBalance).to.equal(getEthers('1000'));
    });

    it("should be successful for single lock and it should same iPP for both users with sum to be matched", async () => {
      await standardToken.approve(flexTier.address, getEthers('3000'));
      await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34", getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38", getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const result1 = await flexTier.getPoolPercentagesWithUser('0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34');
      const result2 = await flexTier.getPoolPercentagesWithUser('0xf7439635a3d956b7f86a376A73cab7204371af38');

      expect(result1[0].toString()).to.equal(getEthers('20000')?.toString());
      expect(result1[1].toString()).to.equal(getEthers('30000')?.toString());
      expect(result2[0].toString()).to.equal(getEthers('10000')?.toString());
      expect(result2[1].toString()).to.equal(getEthers('30000')?.toString());
    });

    it("should calculate iPP correct for multiple staking by single user", async () => {
      await standardToken.approve(flexTier.address, getEthers('3000'));
      await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34", getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34", getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const result1 = await flexTier.getPoolPercentagesWithUser('0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34');

      expect(result1[0].toString()).to.equal(getEthers('30000')?.toString());
      expect(result1[1].toString()).to.equal(getEthers('30000')?.toString());
    });

    it("should calculate iPP correct for multiple staking by single user and then withdrawl", async () => {
      await flexTier.changeEarlyWithdrawl(1);
      await standardToken.approve(flexTier.address, getEthers('4000'));
      await expect(() => flexTier.singleLock(anotherUser1.address, getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => flexTier.singleLock(anotherUser1.address, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      await expect(() => flexTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const lockId1 = flexTier.USER_LOCKS(anotherUser1.address, 0);
      const lockId2 = flexTier.USER_LOCKS(anotherUser1.address, 1);
      await expect(() => flexTier.connect(anotherUser1).withdraw(lockId1, 0, getEthers('2000'))).to.changeTokenBalance(standardToken, anotherUser1, getEthers('1980'));
      await expect(() => flexTier.connect(anotherUser1).withdraw(lockId2, 1, getEthers('1000'))).to.changeTokenBalance(standardToken, anotherUser1, getEthers('990'));
      const result1 = await flexTier.getPoolPercentagesWithUser(deployerAddress);
      const result2 = await flexTier.getPoolPercentagesWithUser(anotherUser1.address);
      expect(result1[0].toString()).to.equal(getEthers('10000')?.toString());
      expect(result1[1].toString()).to.equal(getEthers('10000')?.toString());
      expect(result2[0].toString()).to.equal('0');
      expect(result2[1].toString()).to.equal(getEthers('10000')?.toString());
    });
  })
});