pragma solidity >=0.7.0 <0.9.0;
import "github.com/OpenZeppelin/zeppelin-solidity/contracts/math/SafeMath.sol";

contract Lucas {
    using SafeMath for uint256; //
    uint256[] lucseries;

    // n = how many in the series to return
    function generateLuc(uint256 n) public {
        // set 1st and 2nd entries
        lucseries.push(2);
        lucseries.push(1);
        // generate subsequent entries
        for (uint256 i = 2; i < n; i++) {
            lucseries.push(lucseries[i - 1].add(lucseries[i - 2]));
        }
    }
}
