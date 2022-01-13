
const { ethers, timeAndMine } = require("hardhat");
const chai = require('chai');
const { solidity } = require('ethereum-waffle');
const { BigNumber } = require('@ethersproject/bignumber')
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function getEthers(inputEther) {
  return BigNumber.from(ethers.utils.parseEther(inputEther))
}
function getNegativeEthers(inputEther) {
  return BigNumber.from(ethers.utils.parseEther(inputEther)).mul(BigNumber.from(-1))
}

chai.use(solidity);

const expect = chai.expect;
describe("BronzeTierStakingContract", async () => {
  let deployerAddress, anotherUser1,stakingHelper, bronzeTier, standardToken, deployer;

  beforeEach(async () => {
    const [owner, user1] = await ethers.getSigners();
    deployer = owner;
    anotherUser1 = user1;
    ppMultiplier = 10000;
    privateSaleMultiplier = 1;
    const Token = await ethers.getContractFactory("StandardToken");
    const startTime = (await deployer.provider.getBlock()).timestamp;
    const endTime = startTime + (1000);
console.log("standardToken is deplying");    
    standardToken = await Token.deploy(owner.address, "Demo Token", "DT", 18, getEthers("1000000"));
    await standardToken.deployed();
console.log("standardToken deployed");
    const PrivateSaleLocker = await ethers.getContractFactory("MockTokenLocker");
    const privateSaleLocker = await PrivateSaleLocker.deploy();
    privateSaleLockerAddress = privateSaleLocker.address;
    deployerAddress = owner.address;
console.log(privateSaleLockerAddress);
    const StakingHelper = await ethers.getContractFactory("StakingHelper");
    stakingHelper = await StakingHelper.deploy(startTime, endTime, standardToken.address, ppMultiplier, privateSaleMultiplier, privateSaleLockerAddress);
    await stakingHelper.deployed();
    const BronzeTierStakingContract = await ethers.getContractFactory('BronzeTierStakingContract');
    bronzeTier = await BronzeTierStakingContract.deploy(deployerAddress, standardToken.address, deployerAddress,stakingHelper.address);
    await bronzeTier.deployed();
  });
  describe("depositor", () => {
    it("should return the correct depositor address", async () => {
      const config = await bronzeTier.CONFIG();
      expect(config.depositor).to.equal(deployerAddress);
    });
  })
  describe("single lock", async () => {
    it("should revert if the address is 0", async () => {
      expect(bronzeTier.singleLock("0x0000000000000000000000000000000000000000", 1)).to.be.revertedWith("No ADDR");
    });

    it("should revert if the amount is 0", async () => {
      expect(bronzeTier.singleLock(deployerAddress, 0)).to.be.revertedWith("No AMT");
    });

    it("should revert depositor allowed is different address", async () => {
      await bronzeTier.setDepositor(standardToken.address);
      expect(bronzeTier.singleLock(deployerAddress, 1)).to.be.revertedWith("Only depositor can call this function");
    });

    it("should be revert for single lock with 999 Tokens", async () => {
      await standardToken.approve(bronzeTier.address, getEthers('999'));
      expect(bronzeTier.singleLock(deployerAddress, getEthers('999'))).to.be.revertedWith('MIN DEPOSIT');
    });
    it("should be successful for single lock with more than 1000 TOKENS", async () => {
      await standardToken.approve(bronzeTier.address, getEthers('1000'));
      await expect(() => bronzeTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
    });

    it("should be successful for single lock and it should same iPP for both users with sum to be matched", async () => {
      await standardToken.approve(bronzeTier.address, getEthers('3000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => bronzeTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const result1 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
      const result2 = await bronzeTier.getPoolPercentagesWithUser(deployerAddress);

      expect(result1[0].toString()).to.equal(getEthers('24000'));
      expect(result1[1].toString()).to.equal(getEthers('36000'));
      expect(result2[0].toString()).to.equal(getEthers('12000'));
      expect(result2[1].toString()).to.equal(getEthers('36000'));
    });

    it("should calculate iPP correct for multiple staking by single user", async () => {
      await standardToken.approve(bronzeTier.address, getEthers('3000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const result1 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);

      expect(result1[0].toString()).to.equal(getEthers('36000'));
      expect(result1[1].toString()).to.equal(getEthers('36000'));
    });
    it("should fail for withdrawl if its done during suspension time", async () => {
      await bronzeTier.changeUnlockDuration(1);
      const startTime = (await deployer.provider.getBlock()).timestamp;
      const endTime = startTime + (30);
      await stakingHelper.setWithdrawalSuspension(startTime, endTime);
      await standardToken.approve(bronzeTier.address, getEthers('3000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => bronzeTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const result1 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
      const result2 = await bronzeTier.getPoolPercentagesWithUser(deployerAddress);
      const lockId = bronzeTier.USER_LOCKS(anotherUser1.address, 0);
      expect(bronzeTier.connect(anotherUser1).withdraw(lockId, 0, getEthers('100'))).to.be.revertedWith('NOT ALLOWED');
      
      expect(result1[0].toString()).to.equal(getEthers('24000'));
      expect(result1[1].toString()).to.equal(getEthers('36000'));
      expect(result2[0].toString()).to.equal(getEthers('12000'));
      expect(result2[1].toString()).to.equal(getEthers('36000'));
    });
    it("should fail for withdrawl if its done before unlock duration", async () => {
      await standardToken.approve(bronzeTier.address, getEthers('3000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => bronzeTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const result1 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
      const result2 = await bronzeTier.getPoolPercentagesWithUser(deployerAddress);
      const lockId = bronzeTier.USER_LOCKS(anotherUser1.address, 0);
      expect(bronzeTier.connect(anotherUser1).withdraw(lockId, 0, getEthers('100'))).to.be.revertedWith('Early withdrawal is disabled');
      expect(result1[0].toString()).to.equal(getEthers('24000'));
      expect(result1[1].toString()).to.equal(getEthers('36000'));
      expect(result2[0].toString()).to.equal(getEthers('12000'));
      expect(result2[1].toString()).to.equal(getEthers('36000'));
    });
    it("should calculate iPP correct for multiple staking by single user and then withdrawl after unlock duration", async () => {
      //const config = await bronzeTier.CONFIG();
      //console.log(config.tierId, config.multiplier, config.emergencyWithdrawlFee,1,config.unlockDuration, config.depositor, config.feeAddress,config.enableRewards);
      await bronzeTier.changeUnlockDuration(1);
      await standardToken.approve(bronzeTier.address, getEthers('4000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      await expect(() => bronzeTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const lockId = bronzeTier.USER_LOCKS(anotherUser1.address, 0);
      const lockId2 = bronzeTier.USER_LOCKS(anotherUser1.address, 1);
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId, 0, getEthers('100'))).to.changeTokenBalance(standardToken, anotherUser1, (getEthers('100')));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId, 0, getEthers('50'))).to.changeTokenBalance(standardToken, anotherUser1, (getEthers('50')));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId, 0, getEthers('1840'))).to.changeTokenBalance(standardToken, anotherUser1, (getEthers('1840')));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId2, 1, getEthers('1000'))).to.changeTokenBalance(standardToken, anotherUser1, (getEthers('1000')));
      const result1 = await bronzeTier.getPoolPercentagesWithUser(deployerAddress);
      const result2 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
      expect(result1[0].toString()).to.equal(getEthers('12000'));
      expect(result1[1].toString()).to.equal(getEthers('12120'));
      expect(result2[0].toString()).to.equal(getEthers('120'));
      expect(result2[1].toString()).to.equal(getEthers('12120'));
    });
    it("should calculate iPP correct for multiple staking by single user and then withdrawl", async () => {
      await bronzeTier.changeEarlyWithdrawl(1);
      await standardToken.approve(bronzeTier.address, getEthers('4000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('2000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('2000'));
      await expect(() => bronzeTier.singleLock(anotherUser1.address, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      await expect(() => bronzeTier.singleLock(deployerAddress, getEthers('1000'))).to.changeTokenBalance(standardToken, deployer, getNegativeEthers('1000'));
      const lockId = bronzeTier.USER_LOCKS(anotherUser1.address, 0);
      const lockId2 = bronzeTier.USER_LOCKS(anotherUser1.address, 1);
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId, 0, getEthers('100'))).to.changeTokenBalance(standardToken, anotherUser1, (getEthers('98.8')));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId, 0, getEthers('50'))).to.changeTokenBalance(standardToken, anotherUser1, (getEthers('49.4')));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId, 0, getEthers('1840'))).to.changeTokenBalance(standardToken, anotherUser1, (getEthers('1817.92')));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId2, 1, getEthers('1000'))).to.changeTokenBalance(standardToken, anotherUser1, (getEthers('988')));
      const result1 = await bronzeTier.getPoolPercentagesWithUser(deployerAddress);
      const result2 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
      expect(result1[0].toString()).to.equal(getEthers('12000'));
      expect(result1[1].toString()).to.equal(getEthers('12120'));
      expect(result2[0].toString()).to.equal(getEthers('120'));
      expect(result2[1].toString()).to.equal(getEthers('12120'));
    });
  })
});