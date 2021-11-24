
const { ethers } = require("hardhat");
const chai = require('chai');
const {solidity} = require('ethereum-waffle');

chai.use(solidity);

const expect = chai.expect;
describe("FlexTierStakingContract", async () =>  {
    let deployerAddress, anotherUser1, flexTier, standardToken, deployer;

beforeEach(async () =>  {
    const [owner, user1] = await ethers.getSigners();
    deployer = owner;
    anotherUser1 = user1;
    const Token = await ethers.getContractFactory("StandardToken");

    standardToken = await Token.deploy(owner.address, "Demo Token","DT",18,1000000);
    await standardToken.deployed();
    deployerAddress = owner.address;
    const FlexTierStakingContract = await ethers.getContractFactory('FlexTierStakingContract');
    flexTier = await FlexTierStakingContract.deploy(deployerAddress, standardToken.address,deployerAddress);
    await flexTier.deployed();
});
  describe("depositor", ()=>{
      it("should return the correct depositor address", async () => {
        const config = await flexTier.CONFIG();
        expect(config.depositor).to.equal(deployerAddress);
      });
  })
  describe("single lock",async ()=>{
    it("should revert if the address is 0", async () => {
      expect(flexTier.singleLock("0x0000000000000000000000000000000000000000",1)).to.be.revertedWith("No ADDR");
    });

    it("should revert if the amount is 0", async () => {
      expect(flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",0)).to.be.revertedWith("No AMT");
    });

    it("should revert depositor allowed is different address", async () => {
      await flexTier.setDepositor(standardToken.address);
      expect(flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",1)).to.be.revertedWith("Only depositor can call this function");
    });

    it("should be revert for single lock with 99 wei", async () => {
        await standardToken.approve(flexTier.address,101);
        expect(flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",99)).to.be.revertedWith('MIN DEPOSIT');
      });
    it("should be successful for single lock with more than 100 wei", async () => {
      await standardToken.approve(flexTier.address,101);
      await expect(() => flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",101)).to.changeTokenBalance(standardToken,deployer,-101);
    });

    it("should be successful for single lock and it should same iPP for both users with sum to be matched", async () => {
        await standardToken.approve(flexTier.address,300);
        await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",200)).to.changeTokenBalance(standardToken,deployer,-200);
        await expect(() => flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",100)).to.changeTokenBalance(standardToken,deployer,-100);
        const result1 = await flexTier.getPoolPercentagesWithUser('0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34');
        const result2 = await flexTier.getPoolPercentagesWithUser('0xf7439635a3d956b7f86a376A73cab7204371af38');
        
        expect(result1[0].toString()).to.equal('2000');
        expect(result1[1].toString()).to.equal('3000');
        expect(result2[0].toString()).to.equal('1000');
        expect(result2[1].toString()).to.equal('3000');
    });

    it("should calculate iPP correct for multiple staking by single user", async () => {
        await standardToken.approve(flexTier.address,300);
        await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",200)).to.changeTokenBalance(standardToken,deployer,-200);
        await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",100)).to.changeTokenBalance(standardToken,deployer,-100);
        const result1 = await flexTier.getPoolPercentagesWithUser('0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34');
        
        expect(result1[0].toString()).to.equal('3000');
        expect(result1[1].toString()).to.equal('3000');
    });

    it("should calculate iPP correct for multiple staking by single user and then withdrawl", async () => {
        await standardToken.approve(flexTier.address,400);
        await expect(() => flexTier.singleLock(anotherUser1.address,200)).to.changeTokenBalance(standardToken,deployer,-200);
        await expect(() => flexTier.singleLock(anotherUser1.address,100)).to.changeTokenBalance(standardToken,deployer,-100);
        await expect(() => flexTier.singleLock(deployerAddress,100)).to.changeTokenBalance(standardToken,deployer,-100);
        const lockId = flexTier.USER_LOCKS(anotherUser1.address);
        await expect(() => flexTier.connect(anotherUser1).withdraw(lockId)).to.changeTokenBalance(standardToken,anotherUser1,+300);
        const result1 = await flexTier.getPoolPercentagesWithUser(deployerAddress);
        const result2 = await flexTier.getPoolPercentagesWithUser(anotherUser1.address);
        expect(result1[0].toString()).to.equal('1000');
        expect(result1[1].toString()).to.equal('1000');
        expect(result2[0].toString()).to.equal('0');
        expect(result2[1].toString()).to.equal('1000');
    });
  })
});