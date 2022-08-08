### Setup:

Get an Opensea api key from https://docs.opensea.io/reference/request-an-api-key

Put all relevant secrets in `../secrets.json` (one level above this repo):

```json
{
  "PKEY": "",
  "OS_API_KEY": "",
  "PRIVATE_RPCS": { "ETH": "" },
  "PRIVATE_WSS": { "ETH": "" },
}
```

### listNftsAtFloor Usage:

Script to check account value and then bulk list nfts for sale at floor price

```shell
# view value of nfts in owner account if sold at floor
NETWORK=mainnet node src/listNftsAtFloor.js
```

```shell
# Sell nfts in owner account at floor prices
NETWORK=mainnet node src/listNftsAtFloor.js sell
```

### Example Output

Obviously, DYOR before putting your keys into anything you find online.

```
getTokenIds::url https://api.opensea.io/api/v1/assets?owner=<youraddress>
Holdings:  {
  '0xe64a3314d1dc2fee6f446b70aae08cca1cb8e5e8': [ 8494, 8493, 8492, 8491 ],
  '0x82f5ef9ddc3d231962ba57a9c2ebb307dc8d26c2': [ 7920, 7888, 4036, 1914, 1055 ]
}
fetchAssetContract::url https://api.opensea.io/api/v1/asset_contract/0xe64a3314d1dc2fee6f446b70aae08cca1cb8e5e8?format=json
fetchCollection::url https://api.opensea.io/collection/vansofficial?format=json
{
  name: 'vansofficial',
  floorPrice: 0.0189,
  sellerFeePct: 0.075,
  floorAfterFees: 0.0174825
}
fetchAssetContract::url https://api.opensea.io/api/v1/asset_contract/0x82f5ef9ddc3d231962ba57a9c2ebb307dc8d26c2?format=json
fetchCollection::url https://api.opensea.io/collection/dippies?format=json
{
  name: 'dippies',
  floorPrice: 0.09,
  sellerFeePct: 0.075,
  floorAfterFees: 0.08325
}
{ totalEthAfterFees: 0.48618, nftsPlusBalance: 0.506364789981299 }
```
