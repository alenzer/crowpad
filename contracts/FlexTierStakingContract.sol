// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./TransferHelper.sol";
import './FullMath.sol';

import "./EnumerableSet.sol";
import "./Ownable.sol";
import "./ReentrancyGuard.sol";
import "./IERC20.sol";

interface IMigrator {
    function migrate(address token, uint256 sharesDeposited, uint256 sharesWithdrawn, uint256 startEmission, uint256 endEmission, uint256 lockID, address owner, uint256 amountInTokens, uint256 option) external returns (bool);
}

contract FlexTierStakingContract is Ownable, ReentrancyGuard {
  using EnumerableSet for EnumerableSet.AddressSet;
  uint256 public CONTRACT_VERSION = 1;
  struct Config{
    uint8 tierId; //0 based index
    uint8 multiplier; // in 10 to support single decimal such as 0.1 and 1.2
    uint8 emergencyWithdrawlFee; // in 1000 so for 2% fee it will be 20
    uint8 enableEarlyWithdrawal;
    uint256 unlockTime; // epoch timestamp
    address depositor;  // Depositor contract who is allowed to stake
    address feeAddress; // Address to receive the fee
  }

  struct TokenLock{
    uint256 lockID;
    address owner;
    uint256 amount;
    uint256 iPP; // individual pool percentage
  }

  struct LockParams {
    address payable owner; // the user who can withdraw tokens once the lock expires.
    uint256 amount; // amount of tokens to lock
  }

  uint256 public tierTotalParticipationPoints;
  uint256 public NONCE = 1; // incremental lock nonce counter, this is the unique ID for the next lock
  uint256 public MINIMUM_DEPOSIT = 100; // minimum divisibility per lock at time of locking
  address public tokenAddress; // the token address

  Config public CONFIG;
  mapping(uint256 => TokenLock) public LOCKS; // map lockID nonce to the lock
  mapping(address => uint256) public USER_LOCKS; // UserAddress=> LockId
  
  IMigrator public MIGRATOR;
  event onLock(uint256 lockID, address owner, uint256 amountInTokens, uint256 iPP);
  event onLockUpdated(uint256 lockID, address owner, uint256 amountInTokens, uint256 tierId);
  event onWithdraw(uint256 lockID, address owner, uint256 amountInTokens);
  event onFeeCharged(uint256 lockID, address owner, uint256 amountInTokens);
  event onMigrate(uint256 lockID, uint256 amountInTokens);

  
  constructor (address _depositor, address _tokenAddress, address _feeAddress) {
    tokenAddress = _tokenAddress;
    CONFIG.tierId = 1;
    CONFIG.multiplier = 10;
    CONFIG.emergencyWithdrawlFee = 0;
    CONFIG.unlockTime = block.timestamp;
    CONFIG.enableEarlyWithdrawal = 1;
    CONFIG.depositor = _depositor;
    CONFIG.feeAddress = _feeAddress;
  }
  

  /**
   * @notice set the migrator contract which allows the lock to be migrated
   */
  function setMigrator(IMigrator _migrator) external onlyOwner {
    MIGRATOR = _migrator;
  }
  

/**
   * @notice Creates one or multiple locks for the specified token
   * @param _owner the owner of the lock
   * @param _amount amount of the lock
   * owner: user or contract who can withdraw the tokens
   * amount: must be >= 100 units
   * Fails is amount < 100
   */
  function singleLock (address payable _owner, uint256 _amount) external  {
    LockParams memory param = LockParams(_owner, _amount);
    LockParams[] memory params = new LockParams[](1);
    params[0] = param;
    _lock(params);
  }

  function _lock(LockParams[] memory _lock_params) internal nonReentrant{
    require(msg.sender == CONFIG.depositor, 'Only depositor can call this function');
    require(_lock_params.length > 0, 'NO PARAMS');
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < _lock_params.length; i++) {
        require(_lock_params[i].owner!=address(0), 'No ADDR');
        require(_lock_params[i].amount>0, 'No AMT');
        totalAmount += _lock_params[i].amount;
    }

    uint256 balanceBefore = IERC20(tokenAddress).balanceOf(address(this));
    TransferHelper.safeTransferFrom(tokenAddress, address(msg.sender), address(this), totalAmount);
    uint256 amountIn = IERC20(tokenAddress).balanceOf(address(this)) - balanceBefore;
    require(amountIn == totalAmount, 'NOT ENOUGH TOKEN');
    for (uint256 i = 0; i < _lock_params.length; i++) {
        LockParams memory lock_param = _lock_params[i];
        require(lock_param.amount >= MINIMUM_DEPOSIT, 'MIN DEPOSIT');
        if(USER_LOCKS[lock_param.owner] == 0){
            TokenLock memory token_lock;
            token_lock.lockID = NONCE;
            token_lock.owner = lock_param.owner;
            token_lock.amount = lock_param.amount;
            token_lock.iPP = lock_param.amount * CONFIG.multiplier;
            // record the lock globally
            LOCKS[NONCE] = token_lock;
            tierTotalParticipationPoints += token_lock.iPP;
            USER_LOCKS[token_lock.owner] = token_lock.lockID;
            NONCE ++;
            emit onLock(token_lock.lockID, token_lock.owner, token_lock.amount, token_lock.iPP);
        }else{
            TokenLock memory token_lock = LOCKS[USER_LOCKS[lock_param.owner]];
            token_lock.amount += lock_param.amount;
            tierTotalParticipationPoints -= token_lock.iPP;
            token_lock.iPP += lock_param.amount * CONFIG.multiplier;
            tierTotalParticipationPoints += token_lock.iPP;
            LOCKS[USER_LOCKS[lock_param.owner]] = token_lock;
            emit onLockUpdated(token_lock.lockID, token_lock.owner, lock_param.amount, token_lock.iPP);
        }

    }
  }
  /**
   * @notice Creates one or multiple locks
   * @param _lock_params an array of locks with format: [LockParams[owner, amount]]
   * owner: user or contract who can withdraw the tokens
   * amount: must be >= 100 units
   * Fails is amount < 100
   */
  
  function lock (LockParams[] memory _lock_params) external{
    _lock( _lock_params);
  }
  
   /**
   * @notice withdraw a specified amount from a lock. _amount is the ideal amount to be withdrawn.
   * however, this amount might be slightly different in rebasing tokens due to the conversion to shares,
   * then back into an amount
   * @param _lockID the lockID of the lock to be withdrawn
   */
  function withdraw (uint256 _lockID) external nonReentrant {
    require(CONFIG.enableEarlyWithdrawal == 1, 'Early withdrawal is disabled');
    TokenLock storage userLock = LOCKS[_lockID];
    require(userLock.owner == msg.sender, 'OWNER');
    uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
    uint256 withdrawableAmount = LOCKS[USER_LOCKS[msg.sender]].amount;
    require(withdrawableAmount > 0, 'NO TOKENS');
    require(withdrawableAmount <= balance, 'NOT ENOUGH TOKENS');
    LOCKS[USER_LOCKS[msg.sender]].amount = 0;
    tierTotalParticipationPoints -= userLock.iPP;
    LOCKS[USER_LOCKS[msg.sender]].iPP = 0;
    if(CONFIG.unlockTime> block.timestamp && CONFIG.emergencyWithdrawlFee>0){
      uint256 fee = FullMath.mulDiv(withdrawableAmount,CONFIG.emergencyWithdrawlFee , 1000);
      TransferHelper.safeTransfer(tokenAddress, CONFIG.feeAddress, fee);
      withdrawableAmount = withdrawableAmount - fee;
      emit onFeeCharged(_lockID, msg.sender, fee);
    }
    TransferHelper.safeTransfer(tokenAddress, msg.sender, withdrawableAmount);
    emit onWithdraw(_lockID, msg.sender, withdrawableAmount);
  }
  // function changeConfig( uint8 tierId, uint8 multiplier, uint8 emergencyWithdrawlFee, uint8 enableEarlyWithdrawal, uint256 unlockTime, address depositor, address feeAddress)  external onlyOwner returns(bool) {
  //   CONFIG.tierId = tierId;
  //   CONFIG.multiplier = multiplier;
  //   CONFIG.emergencyWithdrawlFee = emergencyWithdrawlFee;
  //   CONFIG.enableEarlyWithdrawal = enableEarlyWithdrawal;
  //   CONFIG.unlockTime = unlockTime;
  //   CONFIG.depositor = depositor;
  //   CONFIG.feeAddress = feeAddress;
  //   return true;
  // }
  
  function setDepositor(address _depositor) external onlyOwner {
    CONFIG.depositor = _depositor;
  }
  function getPoolPercentagesWithUser(address _user) external view returns(uint256, uint256){
    uint256 userLockID = USER_LOCKS[_user];
    if(userLockID == 0){
      return (0, tierTotalParticipationPoints);
    }
    TokenLock memory userLock = LOCKS[userLockID];
    return (userLock.iPP, tierTotalParticipationPoints);
  }
  // /**
  //  * @notice migrates to the next locker version, only callable by lock owners
  //  */
  // function migrate (uint256 _lockID) external nonReentrant {
  //   require(address(MIGRATOR) != address(0), "NOT SET");
  //   TokenLock storage userLock = LOCKS[_lockID];
  //   require(userLock.owner == msg.sender, 'OWNER');
  //   uint256 sharesAvailable = userLock.sharesDeposited - userLock.sharesWithdrawn;
  //   require(sharesAvailable > 0, 'AMOUNT');

  //   uint256 balance = IERC20(userLock.tokenAddress).balanceOf(address(this));
  //   uint256 amountInTokens = FullMath.mulDiv(sharesAvailable, balance, SHARES[userLock.tokenAddress]);
    
  //   TransferHelper.safeApprove(userLock.tokenAddress, address(MIGRATOR), amountInTokens);
  //   MIGRATOR.migrate(userLock.tokenAddress, userLock.sharesDeposited, userLock.sharesWithdrawn, userLock.startEmission,
  //   userLock.endEmission, userLock.lockID, userLock.owner,  amountInTokens, _option);
    
  //   userLock.sharesWithdrawn = userLock.sharesDeposited;
  //   SHARES[userLock.tokenAddress] -= sharesAvailable;
  //   emit onMigrate(_lockID, amountInTokens);
  // }
  
}