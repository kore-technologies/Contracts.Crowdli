pragma solidity ^0.6.0;

import "./IERC20.sol";
import "./IERC1404.sol";
import "./math/SafeMath.sol";
import "./access/Roles.sol";
import "./ownership/Ownable.sol";

contract CrowdliToken is ERC20, ERC1404, Ownable {
    using SafeMath for uint256;
    using Roles for Roles.Role;

    Roles.Role _blocklist;
    Roles.Role _whitelist;

    mapping (address => uint256) private _balances;
    mapping (address => uint256) private _allocated;
    mapping (uint8 => bytes32) private _codes;
    mapping (uint8 => bytes32) private _eventCodes;
    mapping (address => mapping (address => uint256)) private _allowances;
    mapping (address => mapping (bytes32 => uint256)) private _propertyAmountLocks;

    uint256 private _totalSupply;
    bytes32 private _name;
    bytes32 private _symbol;
    uint8 private _decimals;

    EventEntry[] private _blockHistory;
    EventEntry[] private _burnHistory;
    EventEntry[] private _mintHistory;

    uint8 private NO_RESTRICTIONS = 0;
    uint8 private NOT_IN_WHITELIST_ROLE = 1;
    uint8 private IN_BLACKLIST_ROLE = 2;
    uint8 private NOT_ENOUGH_FUNDS = 3;
    uint8 private NOT_ENOUGH_UNALLOCATED_FUNDS = 4;

    constructor () internal {
        _symbol = "CRT";
        _name = "CrowdliToken";
        _decimals = 18;
        _codes[0] = "NO_RESTRICTIONS";
        _codes[1] = "NOT_IN_WHITELIST_ROLE";
        _codes[2] = "IN_BLACKLIST_ROLE";
        _codes[3] = "NOT_ENOUGH_FUNDS";
        _codes[4] = "NOT_ENOUGH_UNALLOCATED_FUNDS";
    }

    struct EventEntry {
        uint256 _timestamp;
        address _address;
        uint8 _event;
    }

    function addRestriction(uint8 restrictionCode, bytes32 restriction) internal onlyOwner {
        _restrictionCodes[restrictionCode] = restriction;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(_whitelist.has(msg.sender), "ADDRESS PROVIDED IS NOT ON THE WHITELIST");
        require(!_blocklist.has(msg.sender), "ADDRESS PROVIDED IS ON THE BLACKLIST");
        require(hasEnoughUnallocatedFunds(msg.sender), "ADDRESS PROVIDED HAS NOT ENOUGH UNALLOCATED FUNDS");

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal onlyOwner {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal onlyOwner {
        require(account != address(0), "ERC20: burn from the zero address");

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _burnFrom(address account, uint256 amount) internal onlyOwner {
        _burn(account, amount);
        _approve(account, _msgSender(), _allowances[account][_msgSender()].sub(amount, "ERC20: burn amount exceeds allowance"));
    }

    function mintHistory() public view returns (Event[]) {
        return _mintHistory;
     }

    function burnHistory() public view returns (Event[]) {
        return _burnHistory;
     }

    function blockHistory() public view returns (Event[]) {
        return _blockHistory;
     }

    function messageForEvent(uint8 eventCode) public view override returns (bytes32){
        return _codes[eventCode];
    }

    function messageForTransferRestriction(uint8 restrictionCode) public view override returns (bytes32){
        return _codes[restrictionCode];
    }

    function detectTransferRestriction(address from, address to, uint256 value) public view override returns (uint8){
        if(!_whitelist.has(msg.sender)){
           return NOT_IN_WHITELIST_ROLE;
        } else if(_blacklist.has(msg.sender)){
           return IN_BLACKLIST_ROLE;
        } else if(_balances[msg.sender] > value){
           return NOT_ENOUGH_FUNDS;
        }  else if(_balances[msg.sender].sub(_allocated[msg.sender]) < value){
           return NOT_ENOUGH_UNALLOCATED_FUNDS;
        } else {
           return NO_RESTRICTIONS;
        }
    }

    function addWhitelistRoles(address[] memory whitelistedAddresses) public onlyOwner {
        for(uint i=0; i< whitelistedAddresses.length; i++){
            _whitelist.add(whitelistedAddresses[i]);
        }
    }

    function addBlockRoles(address[] memory blockedAddresses) public onlyOwner {
        for(uint i=0; i< blockedAddresses.length; i++){
            _blocklist.add(blockedAddresses[i]);
        }
    }

    function allocatedFunds(address owner) public view returns (bool){
	    return _allocated[owner];
    }

    function propertyLock(address owner, bytes32[64] propertyAddress) public view onlyOwner returns (uint256) {
        return _propertyAmountLocks[owner][propertyAddress];
    }

    function properties(address owner) public view onlyOwner returns (uint256) {
        return _propertyAmountLocks[owner];
    }

    function setCode(uint8 code, bytes32 codeText) public onlyOwner {
        require(code > 100, "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        _codes[code] = codeText;
    }

    function removeCode(uint8 code) public onlyOwner {
        require(code > 100, "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        delete _codes[code];
    }

    function allocateAmountFromAddressForProperty(address owner, bytes32 propertyAddress, uint256 amount) internal onlyOwner {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(bytes(propertyAddress).length == 32, "CROWDLITOKEN: propertyAddress needs a length of 32 bytes");

        _allocated[propertyAddress] = _allocated[propertyAddress].add(amount);
	    _propertyAmountLocks[owner][propertyAddress] = _propertyAmountLocks[owner][propertyAddress].add(amount);
    }

    function unallocatePropertyFromAddress(address owner, bytes32 propertyAddress) internal onlyOwner {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(bytes(propertyAddress).length == 32, "CROWDLITOKEN: propertyAddress needs a length of 32 bytes");

        _allocated[propertyAddress] = _allocated[propertyAddress].sub(_propertyAmountLocks[owner][propertyAddress]);
	    delete _propertyAmountLocks[owner][propertyAddress];
    }
}
