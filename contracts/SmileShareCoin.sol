// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NGOCoin is ERC20 {
    constructor() ERC20("SmileShareCoin", "SMC") {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    // Explicitly override decimals
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
