

const { BigNumber } = require('@ethersproject/bignumber')

function getEthers(inputEther) {
    return BigNumber.from(ethers.utils.parseEther(inputEther))
}
function getNegativeEthers(inputEther) {
    return BigNumber.from(ethers.utils.parseEther(inputEther)).mul(BigNumber.from(-1))
}