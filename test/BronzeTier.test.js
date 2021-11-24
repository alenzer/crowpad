
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

    standardToken = await Token.deploy(owner.address, "Demo Token","DT",18,1000000);
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
      expect(bronzeTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",0)).to.be.revertedWith("No AMT");
    });

    it("should revert depositor allowed is different address", async () => {
      await bronzeTier.setDepositor(standardToken.address);
      expect(bronzeTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",1)).to.be.revertedWith("Only depositor can call this function");
    });

    it("should be revert for single lock with 99 wei", async () => {
        await standardToken.approve(bronzeTier.address,101);
        expect(bronzeTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",99)).to.be.revertedWith('MIN DEPOSIT');
      });
    it("should be successful for single lock with more than 100 wei", async () => {
      await standardToken.approve(bronzeTier.address,101);
      await expect(() => bronzeTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",101)).to.changeTokenBalance(standardToken,deployer,-101);
    });

    it("should be successful for single lock and it should same iPP for both users with sum to be matched", async () => {
        await standardToken.approve(bronzeTier.address,300);
        await expect(() => bronzeTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",200)).to.changeTokenBalance(standardToken,deployer,-200);
        await expect(() => bronzeTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",100)).to.changeTokenBalance(standardToken,deployer,-100);
        const result1 = await bronzeTier.getPoolPercentagesWithUser('0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34');
        const result2 = await bronzeTier.getPoolPercentagesWithUser('0xf7439635a3d956b7f86a376A73cab7204371af38');
        
        expect(result1[0].toString()).to.equal('2400');
        expect(result1[1].toString()).to.equal('3600');
        expect(result2[0].toString()).to.equal('1200');
        expect(result2[1].toString()).to.equal('3600');
    });

    it("should calculate iPP correct for multiple staking by single user", async () => {
        await standardToken.approve(bronzeTier.address,300);
        await expect(() => bronzeTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",200)).to.changeTokenBalance(standardToken,deployer,-200);
        await expect(() => bronzeTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",100)).to.changeTokenBalance(standardToken,deployer,-100);
        const result1 = await bronzeTier.getPoolPercentagesWithUser('0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34');
        
        expect(result1[0].toString()).to.equal('3600');
        expect(result1[1].toString()).to.equal('3600');
    });

    it("should calculate iPP correct for multiple staking by single user and then withdrawl", async () => {
      await standardToken.approve(bronzeTier.address,400);
      await expect(() => bronzeTier.singleLock(anotherUser1.address,200)).to.changeTokenBalance(standardToken,deployer,-200);
      await expect(() => bronzeTier.singleLock(anotherUser1.address,100)).to.changeTokenBalance(standardToken,deployer,-100);
      await expect(() => bronzeTier.singleLock(deployerAddress,100)).to.changeTokenBalance(standardToken,deployer,-100);
      const lockId = bronzeTier.USER_LOCKS(anotherUser1.address);
      const withdrawlFee = await bronzeTier.emergencyWithdrawlFee();
      await expect(() => bronzeTier.connect(anotherUser1).withdraw(lockId)).to.changeTokenBalance(standardToken,anotherUser1,+(Math.ceil(300* (1-(withdrawlFee/1000)))));
      const result1 = await bronzeTier.getPoolPercentagesWithUser(deployerAddress);
      const result2 = await bronzeTier.getPoolPercentagesWithUser(anotherUser1.address);
      expect(result1[0].toString()).to.equal('1200');
      expect(result1[1].toString()).to.equal('1200');
      expect(result2[0].toString()).to.equal('0');
      expect(result2[1].toString()).to.equal('1200');
  });
  })
});