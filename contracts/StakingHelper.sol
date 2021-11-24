// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "./TransferHelper.sol";
import './FullMath.sol';


import "./ReentrancyGuard.sol";
import "./EnumerableSet.sol";
import "./Ownable.sol";
import "./IERC20.sol";

interface IStakingTierContract{
    function singleLock (address payable _owner, uint256 _amount) external ;
    function getPoolPercentagesWithUser(address _user) external view returns(uint256, uint256);
}

contract StakingHelper is Ownable, ReentrancyGuard{
    struct Settings{
        uint256 startTimeForDeposit;
        uint256 endTimeForDeposit;
        address tokenAddress;
        uint256 ppMultiplier;
    }

    address[] public stakingTierAddresses;

    Settings public SETTINGS;

    constructor(uint256 _startTimeForDeposit, uint256 _endTimeForDeposit, address _tokenAddress, uint256 _ppMultiplier){
        SETTINGS.startTimeForDeposit = _startTimeForDeposit;
        SETTINGS.endTimeForDeposit = _endTimeForDeposit;
        SETTINGS.tokenAddress = _tokenAddress;
        SETTINGS.ppMultiplier = _ppMultiplier;
    }

    receive() external payable {
       revert('No Direct Transfer');
    }
    
    function stake(address payable _owner, uint256 _amount, uint8 _tierId) external nonReentrant {
        require(_tierId < stakingTierAddresses.length, "TierId is out of range");
        require(_depositEnabled(),"Deposit is not enabled");
        require(_owner!=address(0), 'No ADDR');
        require(_amount>0, 'No AMT');
        TransferHelper.safeTransferFrom(SETTINGS.tokenAddress, msg.sender, address(this), _amount);
        TransferHelper.safeApprove(SETTINGS.tokenAddress,  stakingTierAddresses[_tierId], _amount);
        IStakingTierContract(stakingTierAddresses[_tierId]).singleLock(_owner, _amount);
    }

    function setTierAddress(address[] memory _stakingTierAddresses) external onlyOwner{
        stakingTierAddresses = _stakingTierAddresses;
    }
    function getUserSPP(address _user) external view returns (uint256){
        uint256 userTotalPP = 0;
        uint256 tierTotalPP = 0;
        for(uint256 i = 0; i < stakingTierAddresses.length; i++){
            (uint256 _userTierPP, uint256 _tierPP) = IStakingTierContract(stakingTierAddresses[i]).getPoolPercentagesWithUser(_user);
            userTotalPP += _userTierPP;
            tierTotalPP += _tierPP;
        }
        return FullMath.mulDiv(userTotalPP, SETTINGS.ppMultiplier, tierTotalPP);
    }
    function depositEnabled() external view returns (bool){
        return _depositEnabled();
    }

    function _depositEnabled() internal view returns (bool){
        return block.timestamp > SETTINGS.startTimeForDeposit && block.timestamp < SETTINGS.endTimeForDeposit;

    }
    function transferExtraTokens(address _token,address _to, uint256 _amount) public onlyOwner{
        IERC20(_token).transfer(_to, _amount);
    }
}
