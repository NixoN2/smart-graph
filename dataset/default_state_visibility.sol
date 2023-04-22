pragma solidity 0.4.24;

contract TestStorage {
    uint storeduint1 = 15;
    uint constant constuint = 16;
    uint32 investmentsDeadlineTimeStamp = uint32(now);

    bytes16 string1 = "test1";
    bytes32 private string2 = "test1236";
    string public string3 = "lets string something";

    mapping(address => uint) public uints1;

    uint[] uintarray;

    function testStorage() public {
        address address1 = 0xbccc714d56bc0da0fd33d96d2a87b680dd6d0df6;
        address address2 = 0xaee905fdd3ed851e48d22059575b9f4245a82b04;

        uints1[address1] = 88;
        uints1[address2] = 99;

        uintarray.push(8000);
        uintarray.push(9000);
    }
}
