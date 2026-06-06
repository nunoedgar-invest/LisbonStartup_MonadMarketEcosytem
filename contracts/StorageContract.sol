// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StorageContract {
    struct StorageItem {
        uint256 id;
        string key;
        string value;
    }

    StorageItem[] private storageItems;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function storeItem(uint256 _id, string memory _key, string memory _value) public {
        storageItems.push(StorageItem(_id, _key, _value));
    }
    function getItem(uint256 _id) public view returns (string memory) {
        require(_id < storageItems.length, "ID out of range");
        return storageItems[_id].value;
    }
}




