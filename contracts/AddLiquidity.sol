// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../interfaces/IUniswapV3Pool.sol";
import "../libraries/TickMath.sol";
import "../interfaces/IERC721Receiver.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/INonfungiblePositionManager.sol";
import "../libraries/TransferHelper.sol";
import "./base/LiquidityManagement.sol";
import "../interfaces/IPoolInitializer.sol";
import "../interfaces/IERC20.sol";

contract AddLiquidity is IERC721Receiver{
    address public nonfungiblePositionManager;

    constructor(address _nonfungiblePositionManager) {
        nonfungiblePositionManager = _nonfungiblePositionManager;
    }
    
    event CreatePoolEvent(address indexed newPool,uint160 indexed sqrtPriceX96);
    event MintEvent(uint256 indexed _tokenId, uint256 liquidityAmount);

    struct CreatePoolAndInit{
        address poolInitAddress;
        address token0;
        address token1;
        uint24 poolFee;
        uint160 sqrtPriceX96;
    }

    struct MintNewPositionParams{
        address token0;
        address token1;
        int24 tickLower;
        int24 tickUpper;
        uint24 poolFee;
        uint256 token0Amount;
        uint256 token1Amount;
    }

    struct Deposit {
        address owner;
        uint128 liquidity;
        address token0;
        address token1;
    }

    mapping(uint256 => Deposit) public deposits;

    function getPool(CreatePoolAndInit calldata params)external view returns(address){
        address token0 = params.token0 < params.token1 ? params.token0 : params.token1;
        address token1 = params.token0 < params.token1 ? params.token1 : params.token0;
        return IUniswapV3Factory(params.poolInitAddress).getPool(token0, token1, params.poolFee);
    }

    function createPool(CreatePoolAndInit calldata params)public returns(bytes1 state){
        address token0 = params.token0 < params.token1 ? params.token0 : params.token1;
        address token1 = params.token0 < params.token1 ? params.token1 : params.token0;

        address pool=IPoolInitializer(params.poolInitAddress).createAndInitializePoolIfNecessary(token0, token1, params.poolFee, params.sqrtPriceX96);
        emit CreatePoolEvent(pool ,params.sqrtPriceX96);
        state=0x01;
    }

    function mintLiquidityPool(MintNewPositionParams calldata params) public {
        address token0 = params.token0 < params.token1 ? params.token0 : params.token1;
        address token1 = params.token0 < params.token1 ? params.token1 : params.token0;

        // Transfer tokens to the contract
        IERC20(token0).transferFrom(msg.sender, address(this), params.token0Amount);
        IERC20(token1).transferFrom(msg.sender, address(this), params.token0Amount);

        IERC20(token0).approve(nonfungiblePositionManager, params.token0Amount);
        IERC20(token1).approve(nonfungiblePositionManager, params.token1Amount);
        uint256 tokenId;
        uint128 liquidity;
        // Create the liquidity position
        {
            INonfungiblePositionManager.MintParams memory mintParams = INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: params.poolFee,
                tickLower:  params.tickLower,
                tickUpper: params.tickUpper,
                amount0Desired: params.token0Amount,
                amount1Desired: params.token0Amount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: msg.sender,
                deadline: block.timestamp + 30
            });
            (tokenId, liquidity, , ) = INonfungiblePositionManager(nonfungiblePositionManager).mint(mintParams);
        }
        emit MintEvent(tokenId, liquidity);
    }

    function createAndMintLiquidity(
        CreatePoolAndInit calldata createParams, 
        MintNewPositionParams calldata mintpParams
    ) external
    {   
        {
            bytes1 state1=createPool(createParams);
            require(state1 == 0x01,"Create pool fail");
        }
        {
           mintLiquidityPool(mintpParams);
        }
    }

    function increaseLiquidityCurrentRange(
        uint256 tokenId,
        address token0,
        address token1,
        uint256 amountAdd0,
        uint256 amountAdd1
    )
        external
        returns (
            uint128 liquidity
        )
    {   
        IERC20(token0).transferFrom(msg.sender,address(this), amountAdd0);
        IERC20(token1).transferFrom(msg.sender,address(this), amountAdd1);

        IERC20(token0).approve(nonfungiblePositionManager, amountAdd0);
        IERC20(token1).approve(nonfungiblePositionManager, amountAdd1);
        INonfungiblePositionManager.IncreaseLiquidityParams memory params =
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: amountAdd0,
                amount1Desired: amountAdd1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 30
            });

        (liquidity,,) = INonfungiblePositionManager(nonfungiblePositionManager).increaseLiquidity(params);
    }

    function onERC721Received(
        address operator,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        // get position information
        return this.onERC721Received.selector;
    }

}
