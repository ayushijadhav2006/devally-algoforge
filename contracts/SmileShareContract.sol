// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SuperAdmin {
    address[] public allNGOs;
    mapping(address => address) public ngoContracts; // NGO Wallet → NGO Contract

    event NGOCreated(address indexed ngo, address contractAddress);

    function createNGO(address ngcToken) external {
        NGO newNGO = new NGO(msg.sender, ngcToken);
        allNGOs.push(address(newNGO));
        ngoContracts[msg.sender] = address(newNGO);
        emit NGOCreated(msg.sender, address(newNGO));
    }

    function getNGOContract(address ngo) public view returns (address) {
        return ngoContracts[ngo];
    }

    function getAllNGOs() external view returns (address[] memory) {
        return allNGOs;
    }
}

contract NGO {
    IERC20 public immutable ngcToken;
    address public immutable ngoOwner;
    uint256 public availableBalance;

    event DonationReceived(address indexed donor, uint256 amount);
    event PayoutRequested(uint256 amount, string proofImage);

    constructor(address _ngoOwner, address _ngcToken) {
        ngoOwner = _ngoOwner;
        ngcToken = IERC20(_ngcToken);
    }

    function donate(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        ngcToken.transferFrom(msg.sender, address(this), amount);
        availableBalance += amount;
        emit DonationReceived(msg.sender, amount);
    }

    function requestPayout(uint256 amount, string memory proofImage) external {
        require(msg.sender == ngoOwner, "Not authorized");
        require(amount <= availableBalance, "Insufficient balance");

        availableBalance -= amount;
        ngcToken.transfer(ngoOwner, amount);

        emit PayoutRequested(amount, proofImage);
    }

    function getAvailableBalance() external view returns (uint256) {
        return availableBalance;
    }
}
