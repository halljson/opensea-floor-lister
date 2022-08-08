// NOTE derived from https://github.com/ProjectOpenSea/opensea-creatures/blob/master/scripts/sell.js

// USAGE
// NETWORK=mainnet node src/listNftsAtFloor.js

const {
  PKEY,
  OS_API_KEY,
  PRIVATE_WSS,
  PRIVATE_RPCS
} = require("../../secrets");

const _ = require("lodash");
const ethers = require("ethers");
const { providers, Wallet, utils } = ethers;
const opensea = require("opensea-js");
const OpenSeaPort = opensea.OpenSeaPort;
const Network = opensea.Network;
const SubProviders = require("@0x/subproviders");
const RPCSubprovider = require("web3-provider-engine/subproviders/rpc");
const Web3ProviderEngine = require("web3-provider-engine");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const NETWORK = process.env.NETWORK === "mainnet" ? "mainnet" : "rinkeby";

if (!PKEY) throw "Please set PKEY in secrets";
if (!OS_API_KEY) throw "Please set OS_API_KEY in secrets (from https://docs.opensea.io/reference/request-an-api-key)";

const walletSubProvider = new SubProviders.PrivateKeyWalletSubprovider(PKEY);
const rpcSubProvider = new RPCSubprovider({ rpcUrl: PRIVATE_RPCS.ETH });
const providerEngine = new Web3ProviderEngine();
providerEngine.addProvider(walletSubProvider);
providerEngine.addProvider(rpcSubProvider);
providerEngine.start();
const networkName = NETWORK === "mainnet" ? Network.Main : Network.Rinkeby;
const seaport = new OpenSeaPort(providerEngine, { networkName, apiKey: OS_API_KEY, }, console.log);

const provider = new providers.WebSocketProvider(PRIVATE_WSS.ETH);
const signer = new Wallet(PKEY, provider);
const headers = { headers: { "X-API-KEY": OS_API_KEY }};

async function listTokenIds(tokenIds, tokenAddress, startAmount, { exclusions=[], percentToList=1.00 }) {

  const accountAddress = signer.address;
  const expirationTime = Math.round(Date.now() / 1000 + 60 * 60 * 24);
  tokenIds = tokenIds[tokenAddress];
  tokenIds = _.pullAll(tokenIds, exclusions);
  const amountToList = Math.floor(tokenIds.length*percentToList);

  for (let i=0; i<amountToList; i++) {
    const tokenId = tokenIds[i];
    console.log("Sending sell order for", tokenId);
    const fixedPriceSellOrder = await seaport.createSellOrder({
      startAmount,
      expirationTime,
      accountAddress,
      asset: { tokenId, tokenAddress },
    });
    console.log(`Listed ${fixedPriceSellOrder.asset.openseaLink}\n`);
  }
}

async function getTokenIds() {
  let tokenIds = {};
  const url = `https://api.opensea.io/api/v1/assets?owner=${signer.address}`;
  console.log("getTokenIds::url", url);
  const assets = await fetch(url, headers)
    .then(resp => resp.json())
    .then(resp => resp.assets)
    .catch();
  for (let i in assets) {
    const address = assets[i].asset_contract.address;
    if (address == "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85") continue; // skip ENS
    if (address == "0x495f947276749ce646f68ac8c248420045cb7b5e") continue; // skip OPENSTORE
    const tokenId = parseInt(assets[i].token_id);
    tokenIds[address] = !!tokenIds[address] ? tokenIds[address].concat(tokenId) : [tokenId];
  }
  return tokenIds;
}

async function fetchAssetContract(nftAddress) {
  const url = `https://api.opensea.io/api/v1/asset_contract/${nftAddress}?format=json`;
  console.log("fetchAssetContract::url", url);
  return await fetch(url, headers).then(resp => resp.json()).catch();
}

async function fetchCollection(collectionName) {
  const url = `https://api.opensea.io/collection/${collectionName}?format=json`;
  console.log("fetchCollection::url", url);
  return await fetch(url)
      .then(resp => resp.json())
      .then(resp => _.get(resp, 'collection'))
      .catch();
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function main() {
  const tokenIds = await getTokenIds();
  console.log("Holdings: ", tokenIds);

  let totalEthAfterFees = 0;

  for (let address in tokenIds) {

    const assetContract = await fetchAssetContract(address);
    const name = assetContract.collection.slug;

    const collection = await fetchCollection(name);
    const floorPrice = collection.stats.floor_price;

    const primary_asset_contracts = collection.primary_asset_contracts;
    const sellerFeePct = primary_asset_contracts[0].seller_fee_basis_points / 10000;
    const floorAfterFees = (floorPrice * (1-sellerFeePct));
    const ethAfterFees = floorAfterFees * tokenIds[address].length;
    totalEthAfterFees += ethAfterFees;

    console.log({ name, floorPrice, sellerFeePct, floorAfterFees });

    if (process.argv.includes("sell")) {
      await listTokenIds(tokenIds, address, floorPrice, {});
    }
  }

  const ethBalance = parseFloat(utils.formatUnits(await provider.getBalance(signer.address), 18));
  console.log({
    totalEthAfterFees,
    nftsPlusBalance: totalEthAfterFees + ethBalance,
  });

}

main().then(() => process.exit(0));
