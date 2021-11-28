
const { ethers } = require("hardhat");
const chai = require('chai');
const {solidity} = require('ethereum-waffle');

chai.use(solidity);

const expect = chai.expect;
describe("BronzeTierStakingContract", async () =>  {
    let deployerAddress,anotherUser1, bronzeTier, standardToken, deployer;

beforeEach(async () =>  {
    const [owner, user1] = await ethers.getSigners();
    deployer = owner;
    anotherUser1 = user1;
    const Token = await ethers.getContractFactory("StandardToken");

    standardToken = await Token.deploy(owner.address, "Demo Token","DT",18,ethers.utils.parseEther('1000000'));
    await standardToken.deployed();
    deployerAddress = owner.address;
    const BronzeTierStakingContract = await ethers.getContractFactory('BronzeTierStakingContract');
    bronzeTier = await BronzeTierStakingContract.deploy(deployerAddress, standardToken.address,deployerAddress);
    await bronzeTier.deployed();
});
  describe("depositor", ()=>{
      it("should return the correct depositor address", async () => {
        const config = await bronzeTier.CONFIG();
        expect(config.depositor).to.equal(deployerAddress);
      });
  })
  describe("single lock",async ()=>{
    it("should revert if the address is 0", async () => {
      expect(bronzeTier.singleLock("0x0000000000000000000000000000000000000000",1)).to.be.revertedWith("No ADDR");
    });

    it("should revert if the amount is 0", async () => {
      expect(bronzeTier.singleLock(deployerAddress,0)).to.be.revertedWith("No AMT");
    });

    it("should revert depositor allowed is different address", async () => {
      await bronzeTier.setDepositor(standardToken.address);
      expect(bronzeTier.singleLock(deployerAddress,1)).to.be.revertedWith("Only depositor can call this function");
    });

    it("should be revert for single lock with 999 Tokens", async () => {
        await standardToken.approve(bronzeTier.address,ethers.utils.parseEther('999'));
        expect(bronzeTier.singleLock(deployerAddress,ethers.utils.parseEther('999'))).to.be.revertedWith('MIN DEPOSIT');
      });
    it("should be successful for single lock with more than 1000 TOKENS", async () => {
      await standardToken.approve(bronzeTier.address,ethers.utils.parseEther('1000'));
      await expect(() => bronzeTier.singleLock(deployerAddress,ethers.utils.parseEther('1000'))).to.changeTokenBalance(standardToken,deployer,-101);
    });

    it("should be successful for single lock and it should same iPP for both users with sum to be matched", async () => {
        await standardToken.approve(bronzeTier.address,ethers.utils.parseEther('3000'));
        await expect(() => bronzeTier.singleLock(anotherUser1.address,ethers.utils.parseEther('2000'))).to.changeTokenBalance(standardToken,deployer,-1* ethers.utils.parseEther('2000'));
        await expect(() => bronzeTier.singleLock(deployerAddress,ethers.utils.parseEther('1000'))).to.changeTokenBalance(standardToken,deployer,-1* ethers.utils.parseEther('1000'));
        const result1 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
        const result2 = await bronzeTier.getPoolPercentagesWithUser(deployerAddress);
        
        expect(result1[0].toString()).to.equal( ethers.utils.parseEther('24000'));
        expect(result1[1].toString()).to.equal(ethers.utils.parseEther('36000'));
        expect(result2[0].toString()).to.equal(ethers.utils.parseEther('12000'));
        expect(result2[1].toString()).to.equal(ethers.utils.parseEther('36000'));
    });

    it("should calculate iPP correct for multiple staking by single user", async () => {
        await standardToken.approve(bronzeTier.address,300);
        await expect(() => bronzeTier.singleLock(anotherUser1.address,200)).to.changeTokenBalance(standardToken,deployer,-200);
        await expect(() => bronzeTier.singleLock(anotherUser1.address,100)).to.changeTokenBalance(standardToken,deployer,-100);
        const result1 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
        
        expect(result1[0].toString()).to.equal('3600');
        expect(result1[1].toString()).to.equal('3600');
    });

    it("should calculate iPP correct for multiple staking by single user and then withdrawl", async () => {
      await standardToken.approve(bronzeTier.address,400);
      await expect(() => bronzeTier.singleLock(anotherUser1.address,200)).to.changeTokenBalance(standardToken,deployer,-200);
      await expect(() => bronzeTier.singleLock(anotherUser1.address,100)).to.changeTokenBalance(standardToken,deployer,-100);
      await expect(() => bronzeTier.singleLock(deployerAddress,100)).to.changeTokenBalance(standardToken,deployer,-100);
      const lockId = bronzeTier.USER_LOCKS(anotherUser1.address,0);
      const lockId2 = bronzeTier.USER_LOCKS(anotherUser1.address,1);
      const withdrawlFee = await bronzeTier.emergencyWithdrawlFee();
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId,0,10)).to.changeTokenBalance(standardToken,anotherUser1,+(Math.ceil(10* (1-(withdrawlFee/1000)))));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId,0,5)).to.changeTokenBalance(standardToken,anotherUser1,+(Math.ceil(5* (1-(withdrawlFee/1000)))));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId,0,184)).to.changeTokenBalance(standardToken,anotherUser1,+(Math.ceil(184* (1-(withdrawlFee/1000)))));
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId2,1,100)).to.changeTokenBalance(standardToken,anotherUser1,+(Math.ceil(100* (1-(withdrawlFee/1000)))));
      const result1 = await bronzeTier.getPoolPercentagesWithUser(deployerAddress);
      const result2 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
      expect(result1[0].toString()).to.equal('1200');
      expect(result1[1].toString()).to.equal('1212');
      expect(result2[0].toString()).to.equal('12');
      expect(result2[1].toString()).to.equal('1212');
  });
  })
});