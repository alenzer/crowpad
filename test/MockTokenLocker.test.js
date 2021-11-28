
const { ethers, timeAndMine } = require("hardhat");
const chai = require('chai');
const {solidity} = require('ethereum-waffle');

chai.use(solidity);

const expect = chai.expect;
describe("StakingHelper", async () =>  {
    let mockTokenLocker;

beforeEach(async () =>  {
    const [owner, user1] = await ethers.getSigners();
  const MockTokenLocker = await ethers.getContractFactory("MockTokenLocker");
  const mockTokenLocker = await MockTokenLocker.deploy();
  await mockTokenLocker.deployed();
});
  describe("stake",async ()=>{
    // // await timeAndMine.setTimeIncrease(1001);
    // // it("should revert with deposit not enabled", async () => {
       
    // //     expect(stakingHelper.stake("0x0000000000000000000000000000000000000000",1,0)).to.be.revertedWith("No ADDR");
    // // });
    // it("should revert with tierId out of bound", async () => {
    //     expect(stakingHelper.stake("0x0000000000000000000000000000000000000000",1,1)).to.be.revertedWith("TierId is out of range");
    // });
    // it("should revert if the address is 0", async () => {
    //   expect(stakingHelper.stake("0x0000000000000000000000000000000000000000",1,0)).to.be.revertedWith("No ADDR");
    // });

    // it("should revert if the amount is 0", async () => {
    //   expect(stakingHelper.stake("0xf7439635a3d956b7f86a376A73cab7204371af38",0,0)).to.be.revertedWith("No AMT");
    // });

    // it("should be successful for single lock with more than 100 wei", async () => {
    //   await standardToken.approve(stakingHelper.address,101);
    //   await expect(() => stakingHelper.stake("0xf7439635a3d956b7f86a376A73cab7204371af38",101,0)).to.changeTokenBalance(standardToken,deployer,-101);
    // });

    // // it("should be successful for single lock and it should same iPP for both users with sum to be matched", async () => {
    // //     await standardToken.approve(stakingHelper.address,300);
    // //     await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",200)).to.changeTokenBalance(standardToken,deployer,-200);
    // //     await expect(() => flexTier.singleLock("0xf7439635a3d956b7f86a376A73cab7204371af38",100)).to.changeTokenBalance(standardToken,deployer,-100);
    // //     const result1 = await flexTier.getPoolPercentagesWithUser('0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34');
    // //     const result2 = await flexTier.getPoolPercentagesWithUser('0xf7439635a3d956b7f86a376A73cab7204371af38');
        
    // //     expect(result1[0].toString()).to.equal('2000');
    // //     expect(result1[1].toString()).to.equal('3000');
    // //     expect(result2[0].toString()).to.equal('1000');
    // //     expect(result2[1].toString()).to.equal('3000');
    // // });

    // // it("should calculate iPP correct for multiple staking by single user", async () => {
    // //     await standardToken.approve(flexTier.address,300);
    // //     await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",200)).to.changeTokenBalance(standardToken,deployer,-200);
    // //     await expect(() => flexTier.singleLock("0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34",100)).to.changeTokenBalance(standardToken,deployer,-100);
    // //     const result1 = await flexTier.getPoolPercentagesWithUser('0xCc456df4ea3B13e78C22d5A27c8d55F6F2273d34');
        
    // //     expect(result1[0].toString()).to.equal('3000');
    // //     expect(result1[1].toString()).to.equal('3000');
    // // });

    // it("should calculate iPP correct for multiple staking by single user and then withdrawl", async () => {
    //     await standardToken.approve(stakingHelper.address,400);
    //     await expect(() => stakingHelper.stake(anotherUser1.address,200,0)).to.changeTokenBalance(standardToken,deployer,-200);
    //     await expect(() => stakingHelper.stake(anotherUser1.address,100,0)).to.changeTokenBalance(standardToken,deployer,-100);
    //     await expect(() => stakingHelper.stake(deployerAddress,100,0)).to.changeTokenBalance(standardToken,deployer,-100);
    //     const lockId = flexTier.USER_LOCKS(anotherUser1.address);
    //     await expect(() => flexTier.connect(anotherUser1).withdraw(lockId)).to.changeTokenBalance(standardToken,anotherUser1,+300);
    //     const result1 = await flexTier.getPoolPercentagesWithUser(deployerAddress);
    //     const result2 = await flexTier.getPoolPercentagesWithUser(anotherUser1.address);
    //     const result3 = await stakingHelper.getUserSPP(deployerAddress);
    //     const result4 = await stakingHelper.getUserSPP(anotherUser1.address);
    //     expect(result1[0].toString()).to.equal('1000');
    //     expect(result1[1].toString()).to.equal('1000');
    //     expect(result2[0].toString()).to.equal('0');
    //     expect(result2[1].toString()).to.equal('1000');
    //     expect(result3.toString()).to.equal(ppMultiplier.toString());
    //     expect(result4.toString()).to.equal('0');
    // });
  })
});