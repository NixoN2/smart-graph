pragma solidity 0.7.0;

contract RolloverExample {
    uint8 public myUint8;

    function decrement() public {
        unchecked {
            myUint8--;
        }
    }

    function increment() public {
        myUint8++;
    }
}
