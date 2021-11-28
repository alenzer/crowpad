// Sources flattened with hardhat v2.6.8 https://hardhat.org

// File contracts/Context.sol

// MIT

// File @openzeppelin/contracts/utils/Context.sol@v4.0.0

pragma solidity ^0.8.0;

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}


// File contracts/Ownable.sol

// MIT

// File @openzeppelin/contracts/access/Ownable.sol@v4.0.0

pragma solidity ^0.8.0;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}


// File contracts/TestContract.sol

pragma solidity ^0.8.0;

interface ITokenLocker{
    function convertSharesToTokens (address _token, uint256 _shares) external view returns (uint256) ;
    function TOKEN_LOCKS(uint256 lockId) external view returns(address,uint256,uint256,uint256,uint256,uint256,address,string memory);
}
contract TestContract is Ownable{
struct Settings{
        uint256 startTimeForDeposit;
        uint256 endTimeForDeposit;
        uint256 ppMultiplier;
        uint256 privateSaleMultiplier;
        uint256 privateSaleTotalPP;
        address tokenAddress;
    }

    address[] public stakingTierAddresses;
    mapping(address => uint256[]) public privateSaleUserLockerIds;
    uint256[] public privateSaleLockerIds;
    address public privateSaleLockerAddress;
    ITokenLocker private tokenLocker;
    Settings public SETTINGS;

    constructor(){
       SETTINGS.startTimeForDeposit = 0;
        SETTINGS.endTimeForDeposit = 0;
        SETTINGS.tokenAddress = 0xe0c41FF9a7032de445771E12C14868CbE061C993;
        SETTINGS.ppMultiplier = 10000;
        SETTINGS.privateSaleMultiplier = 1;
        privateSaleLockerAddress = 0x2EC4e8617AB86C05CB0Be6E303BB71eBaeDf0C3E;
        tokenLocker = ITokenLocker(privateSaleLockerAddress);
    }

    function setPrivateSaleLockerIds(uint256[] memory _privateSaleLockerIds, address[] memory _privateSaleLockerOwners) external onlyOwner{
        require(_privateSaleLockerIds.length == _privateSaleLockerOwners.length, "Length Not Matched");
        for(uint256 i = 0; i < _privateSaleLockerIds.length; i++){
            address owner = _privateSaleLockerOwners[i];
            uint256 lockId = _privateSaleLockerIds[i];
            privateSaleUserLockerIds[owner].push( lockId);
        }
        privateSaleLockerIds = _privateSaleLockerIds;
    }
    function _getLockedPrivateSaleTokens(uint256 lockerId) internal view returns (uint256){
        (,uint256 sharesDeposited,uint256 sharesWithdrawn,,,,,) = tokenLocker.TOKEN_LOCKS(lockerId);
       return tokenLocker.convertSharesToTokens(SETTINGS.tokenAddress,sharesDeposited - sharesWithdrawn); 
    }
      function updatePrivateSaleTotalPPFromContract() external onlyOwner{
        uint256 privateSaleTotalPP = 0;
        for(uint256 i = 0; i < privateSaleLockerIds.length; i++){
            privateSaleTotalPP += (_getLockedPrivateSaleTokens(privateSaleLockerIds[i])*SETTINGS.privateSaleMultiplier);
        }
        SETTINGS.privateSaleTotalPP = privateSaleTotalPP;
    }
}
