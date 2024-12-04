const hre = require("hardhat");
const {ethers} = require("hardhat");

const ERC20ABI=require("../artifacts/contracts/TestToken.sol/TestToken.json");
const WETHABI=require("../artifacts/contracts/WETH.sol/WETH9.json");
const AddLiquidityABI=require("../artifacts/contracts/AddLiquidity.sol/AddLiquidity.json");

async function main() {
    const [owner] = await hre.ethers.getSigners();
    const provider = ethers.provider;
    console.log("owner:",owner.address);

    const base_nonfungiblePositionManager="0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";
    const base_factory="0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
    
    //TestToken
    // const testToken=await hre.ethers.getContractFactory("TestToken");
    // const USDC=await testToken.deploy(6, "TEST USDC", "USDC");
    // const USDCAddress=USDC.target;
    // console.log("USDC Address:", USDCAddress);

    // const USDT=await testToken.deploy(8, "TEST USDT", "USDT");
    // const USDTAddress=USDT.target;
    // console.log("USDT Address:", USDTAddress);

    // const FlyDoge=await testToken.deploy(18, "Fly Doge", "FLYDOGGE");
    // const FlyDogeAddress=FlyDoge.target;
    // console.log("FlyDoge Address:", FlyDogeAddress);

    // const weth=await hre.ethers.getContractFactory("WETH9");
    // const WETH=await weth.deploy();
    // const WETHAddress=WETH.target;
    // console.log("WETH Address:", WETHAddress);

    const WETHAddress="0x847ea91D70532C03dAdCdB59df860E3550191187";
    const WETH=new ethers.Contract(WETHAddress, WETHABI.abi, owner);

    const USDCAddress="0x2f4555dD23ff52a01e26ab94FE84695a6df7885c";
    const USDTAddress="0x534D0e7eC92524338735952863c874f9Cc810492";
    const FlyDogeAddress="0xDa5Dd0d968e439307A606417c96804440132514E";

    const USDC=new ethers.Contract(USDCAddress, ERC20ABI.abi, owner);
    const USDT=new ethers.Contract(USDTAddress, ERC20ABI.abi, owner);
    const FlyDoge=new ethers.Contract(FlyDogeAddress, ERC20ABI.abi, owner);

    const AddLiquidityAddress="0xEEbc3160f8721A1A601662D86392BD610F1A835a";
    const AddLiquidity=new ethers.Contract(AddLiquidityAddress, AddLiquidityABI.abi, owner);

    // const addLiquidity=await hre.ethers.getContractFactory("AddLiquidity");
    // const AddLiquidity=await addLiquidity.deploy(base_nonfungiblePositionManager);
    // const AddLiquidityAddress=AddLiquidity.target;
    // console.log("AddLiquidity Address:", AddLiquidityAddress);

    const minBalance=1000000000n;

    async function MintERC20Token(token, receiver, amount){
      try{
        const ERC20Contract=new ethers.Contract(token, ERC20ABI.abi, owner);
        const balance=await ERC20Contract.balanceOf(receiver);
        if(balance<minBalance){
          const mintToken=await ERC20Contract.mint(receiver, amount);
          await mintToken.wait();
          console.log("Mint erc20 success");
        }else{
          console.log("Not mint");
        }
      }catch(e){
        console.log("Mint ERC20 fail");
      }
    }

    //mint erc20
    await MintERC20Token(USDCAddress, owner.address, 1000000000n*10n**6n);
    await MintERC20Token(USDTAddress, owner.address, 1000000000n*10n**8n);
    await MintERC20Token(FlyDogeAddress, owner.address, 1000000000n*10n**18n);

    //Approve
    const approveMax=ethers.parseEther("100000000000");
    const minAllowance=ethers.parseEther("100000");
    async function Approve(token, spender){
      try{
        const ERC20Contract=new ethers.Contract(token, ERC20ABI.abi, owner);
        const allowance=await ERC20Contract.allowance(owner.address, spender);
        if(allowance <= minAllowance){
          const usdcApprove=await ERC20Contract.approve(spender, approveMax);
          await usdcApprove.wait();
          console.log("Approve success");
        }else{
          console.log("Not approve");
        }
      }catch(e){
        console.log("Approve fail");
      }
    }
    await Approve(USDCAddress, AddLiquidityAddress);
    await Approve(USDTAddress, AddLiquidityAddress);
    await Approve(FlyDogeAddress, AddLiquidityAddress);
    await Approve(WETHAddress, AddLiquidityAddress);

    // const WETHAmount=ethers.parseEther("0.05");
    // const wrapETH=await WETH.deposit({value: WETHAmount});
    // await wrapETH.wait()
    // console.log("wrapETH success");
    const WETHBalance=await WETH.balanceOf(owner.address);
    console.log("WETHBalance:",WETHBalance);

    const ZERO_ADDRESS="0x0000000000000000000000000000000000000000";

    async function CreateAndInit(createParams,name){
      try{
        let pool;
        const thisPool1=await AddLiquidity.getPool(createParams);
        if(thisPool1 === ZERO_ADDRESS){
          const createPool=await AddLiquidity.createPool(createParams);
          await createPool.wait();
          console.log("createPool", name);
          pool = await AddLiquidity.getPool(base_factory, createParams);
        }else{
          pool = thisPool1;
        }
        console.log("pool:",pool);
      }catch(e){
        console.log("CreateAndInit", e);

      }
    }

    //AddLiquidity
    async function MintNewPosition(token1, amount0, amount1, sqrtPriceX96, name){
      try{
        const CreatePoolAndInit={
          poolInitAddress: base_nonfungiblePositionManager,
          token0: WETHAddress,
          token1: token1,
          poolFee: 10000,
          sqrtPriceX96: sqrtPriceX96
        };
        const MintNewPositionParams1={
          token0: WETHAddress,
          token1: token1,
          tickLower: -887200,
          tickUpper: 887200,
          poolFee: 10000,
          token0Amount: amount0,
          token1Amount: amount1 
        };
        await CreateAndInit(CreatePoolAndInit, name);
        const mintNewPosition=await AddLiquidity.mintLiquidityPool(MintNewPositionParams1);
        const mintNewPositionTx=await mintNewPosition.wait();
        console.log("mintNewPosition tx:", mintNewPositionTx);
      }catch(e){
        console.log("mintNewPosition fail:", name, "error:", e);
      }
    }

    //eth-usdc
    // await MintNewPosition(USDCAddress, 10000000000000n, 900000000000000000000n, 79228162514264337593543950336n,"ETH-USDC");

    // //eth-usdt
    // await MintNewPosition(USDTAddress, 10000000000000n, 900000000000000000000n, 79228162514264337593543950336n,"ETH-USDT");

    // //eth-flyDoge
    // await MintNewPosition(FlyDogeAddress, 10000000000000n, 900000000000000000000n, 79228162514264337593543950336n,"ETH-FlyDoge");

    async function IncreaseLiquidity(tokenId){
      try{
        //increaseLiquidityCurrentRange
        const IncreaseLiquidityParams={
          tokenId: tokenId,
          amountAdd0: ethers.parseEther("0.0001"),
          amountAdd1: 100n * 10n**6n 
        };
        const increaseLiquidity=await AddLiquidity.increaseLiquidityCurrentRange(
          IncreaseLiquidityParams.tokenId,
          IncreaseLiquidityParams.amountAdd0,
          IncreaseLiquidityParams.amountAdd1
        );
        const increaseLiquidityTx=await increaseLiquidity.wait();
        console.log("increaseLiquidity success:", increaseLiquidityTx);
      }catch(e){
        console.log("IncreaseLiquidity fail");
      }
    }

    //WETH-USDC
    await IncreaseLiquidity(2702n);
    //WETH-USDT
    await IncreaseLiquidity(2703n);
    //WETH-FlyDog
    await IncreaseLiquidity(2704n);

    
    

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});