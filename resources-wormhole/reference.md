---
category: Reference
includes_base_categories: false
base_categories: []
word_count: 31226
token_estimate: 82007
page_count: 10
---

# Begin New Bundle: Reference


---

Page Title: Chain IDs

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-reference-chain-ids.md
- Canonical (HTML): https://wormhole.com/docs/products/reference/chain-ids/
- Summary: This page documents the Wormhole-specific chain IDs for each chain and contrasts them to the more commonly referenced EVM chain IDs originating in EIP-155.
- Word Count: 2000; Token Estimate: 5559

# Chain IDs

The following table documents the chain IDs used by Wormhole and places them alongside the more commonly referenced [EVM Chain IDs](https://chainlist.org/){target=\_blank}.

!!! note
    Please note, Wormhole chain IDs are different than the more commonly referenced [EVM chain IDs](https://chainlist.org/){target=\_blank}, specified in the Mainnet and Testnet ID columns.

!!!warning
    Wormhole Contributors recommend that all connected chains implement robust security practices including (but not exclusively): open sourcing code and running public bug bounty programs, undergoing security audits and publishing those reports, using version control with adequate access controls and mandatory code review, and high unit and integration test coverage where the results of those tests are available publicly. Connected chains that can't verifiably prove that they've implemented a high percentage of these practices may be noted below with the :warning: symbol. 
    
    Wormhole integrators are encouraged to understand the security assumptions of any chain before trusting messages from it. See the recommended security practices for chains in [Wormhole's security program](https://github.com/wormhole-foundation/wormhole/blob/main/SECURITY.md#chain-integrators){target=\_blank}.



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th style="width:26%">Wormhole Chain ID</th><th>Network ID</th></thead><tbody><tr><td>Ethereum</td><td><code>2</code></td><td><code>1</code></td></tr><tr><td>Solana</td><td><code>1</code></td><td><code>Mainnet Beta</code> - <code>5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>67</code></td><td><code>16661</code></td></tr><tr><td>Algorand</td><td><code>8</code></td><td><code>mainnet-v1.0</code></td></tr><tr><td>Aptos</td><td><code>22</code></td><td><code>1</code></td></tr><tr><td>Arbitrum</td><td><code>23</code></td><td><code>Arbitrum One</code> - <code>42161</code></td></tr><tr><td>Avalanche</td><td><code>6</code></td><td><code>C-Chain</code> - <code>43114</code></td></tr><tr><td>Base</td><td><code>30</code></td><td><code>Base</code> - <code>8453</code></td></tr><tr><td>Berachain</td><td><code>39</code></td><td></td></tr><tr><td>BNB Smart Chain</td><td><code>4</code></td><td><code>56</code></td></tr><tr><td>Celestia</td><td><code>4004</code></td><td><code>celestia</code></td></tr><tr><td>Celo</td><td><code>14</code></td><td><code>42220</code></td></tr><tr><td>Converge</td><td><code>53</code></td><td></td></tr><tr><td>Cosmos Hub</td><td><code>4000</code></td><td><code>cosmoshub-4</code></td></tr><tr><td>CreditCoin</td><td><code>59</code></td><td></td></tr><tr><td>Dymension</td><td><code>4007</code></td><td><code>dymension_1100-1</code></td></tr><tr><td>Evmos</td><td><code>4001</code></td><td><code>evmos_9001-2</code></td></tr><tr><td>Fantom</td><td><code>10</code></td><td><code>250</code></td></tr><tr><td>Fogo</td><td><code>51</code></td><td></td></tr><tr><td>HyperCore</td><td><code>65000</code></td><td><code>20000</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>47</code></td><td></td></tr><tr><td>Injective</td><td><code>19</code></td><td><code>injective-1</code></td></tr><tr><td>Ink</td><td><code>46</code></td><td></td></tr><tr><td>Kaia</td><td><code>13</code></td><td><code>8217</code></td></tr><tr><td>Kujira</td><td><code>4002</code></td><td><code>kaiyo-1</code></td></tr><tr><td>Linea</td><td><code>38</code></td><td><code>59144</code></td></tr><tr><td>Mantle</td><td><code>35</code></td><td><code>5000</code></td></tr><tr><td>MegaETH</td><td><code>64</code></td><td><code>4326</code></td></tr><tr><td>Mezo</td><td><code>50</code></td><td></td></tr><tr><td>Moca</td><td><code>63</code></td><td><code>2288</code></td></tr><tr><td>Monad</td><td><code>48</code></td><td></td></tr><tr><td>Moonbeam</td><td><code>16</code></td><td><code>1284</code></td></tr><tr><td>NEAR</td><td><code>15</code></td><td><code>mainnet</code></td></tr><tr><td>Neutron</td><td><code>4003</code></td><td><code>neutron-1</code></td></tr><tr><td>Noble</td><td><code>4009</code></td><td><code>noble-1</code></td></tr><tr><td>Optimism</td><td><code>24</code></td><td><code>10</code></td></tr><tr><td>Osmosis</td><td><code>20</code></td><td><code>osmosis-1</code></td></tr><tr><td>Plasma</td><td><code>58</code></td><td></td></tr><tr><td>Plume</td><td><code>55</code></td><td><code>98866</code></td></tr><tr><td>Polygon</td><td><code>5</code></td><td><code>137</code></td></tr><tr><td>Provenance</td><td><code>4008</code></td><td><code>pio-mainnet-1</code></td></tr><tr><td>Pythnet</td><td><code>26</code></td><td></td></tr><tr><td>Scroll</td><td><code>34</code></td><td><code>534352</code></td></tr><tr><td>SEDA</td><td><code>4006</code></td><td></td></tr><tr><td>Sei</td><td><code>32</code></td><td><code>pacific-1</code></td></tr><tr><td>SeiEVM</td><td><code>40</code></td><td></td></tr><tr><td>Sonic</td><td><code>52</code></td><td><code>146</code></td></tr><tr><td>Stacks</td><td><code>60</code></td><td><code>1</code></td></tr><tr><td>Stargaze</td><td><code>4005</code></td><td><code>stargaze-1</code></td></tr><tr><td>Sui</td><td><code>21</code></td><td><code>35834a8a</code></td></tr><tr><td>Unichain</td><td><code>44</code></td><td><code></code></td></tr><tr><td>World Chain</td><td><code>45</code></td><td><code>480</code></td></tr><tr><td>X Layer</td><td><code>37</code></td><td><code>196</code></td></tr><tr><td>Xrpl</td><td><code>66</code></td><td></td></tr><tr><td>XRPL-EVM</td><td><code>57</code></td><td><code>1440000</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th style="width:26%">Wormhole Chain ID</th><th>Network ID</th></thead><tbody><tr><td>Ethereum Holesky</td><td><code>10006</code></td><td><code>Holesky</code> - <code>17000</code></td></tr><tr><td>Ethereum Sepolia</td><td><code>10002</code></td><td><code>Sepolia</code> - <code>11155111</code></td></tr><tr><td>Solana</td><td><code>1</code></td><td><code>Devnet</code> - <code>EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>67</code></td><td><code>16602</code></td></tr><tr><td>Algorand</td><td><code>8</code></td><td><code>testnet-v1.0</code></td></tr><tr><td>Aptos</td><td><code>22</code></td><td><code>2</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>10003</code></td><td><code>Sepolia</code> - <code>421614</code></td></tr><tr><td>Avalanche</td><td><code>6</code></td><td><code>Fuji</code> - <code>43113</code></td></tr><tr><td>Base Sepolia</td><td><code>10004</code></td><td><code>Base Sepolia</code> - <code>84532</code></td></tr><tr><td>Berachain</td><td><code>39</code></td><td><code>80084</code></td></tr><tr><td>BNB Smart Chain</td><td><code>4</code></td><td><code>97</code></td></tr><tr><td>Celestia</td><td><code>4004</code></td><td><code>mocha-4</code></td></tr><tr><td>Celo</td><td><code>14</code></td><td><code>Alfajores</code> - <code>44787</code></td></tr><tr><td>Converge</td><td><code>53</code></td><td><code>52085145</code></td></tr><tr><td>Cosmos Hub</td><td><code>4000</code></td><td><code>theta-testnet-001</code></td></tr><tr><td>CreditCoin</td><td><code>59</code></td><td></td></tr><tr><td>Dymension</td><td><code>4007</code></td><td></td></tr><tr><td>Evmos</td><td><code>4001</code></td><td><code>evmos_9000-4</code></td></tr><tr><td>Fantom</td><td><code>10</code></td><td><code>4002</code></td></tr><tr><td>Fogo</td><td><code>51</code></td><td><code>9GGSFo95raqzZxWqKM5tGYvJp5iv4Dm565S4r8h5PEu9</code></td></tr><tr><td>HyperCore</td><td><code>65000</code></td><td><code>20000</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>47</code></td><td><code>998</code></td></tr><tr><td>Injective</td><td><code>19</code></td><td><code>injective-888</code></td></tr><tr><td>Ink</td><td><code>46</code></td><td><code>763373</code></td></tr><tr><td>Kaia</td><td><code>13</code></td><td><code>Kairos</code> - <code>1001</code></td></tr><tr><td>Kujira</td><td><code>4002</code></td><td><code>harpoon-4</code></td></tr><tr><td>Linea</td><td><code>38</code></td><td><code>59141</code></td></tr><tr><td>Mantle</td><td><code>35</code></td><td><code>Sepolia</code> - <code>5003</code></td></tr><tr><td>MegaETH</td><td><code>64</code></td><td><code>6343</code></td></tr><tr><td>Mezo</td><td><code>50</code></td><td><code>31611</code></td></tr><tr><td>Moca</td><td><code>63</code></td><td><code>222888</code></td></tr><tr><td>Monad Testnet</td><td><code>10009</code></td><td><code>10143</code></td></tr><tr><td>Moonbeam</td><td><code>16</code></td><td><code>Moonbase-Alphanet</code> - <code>1287</code></td></tr><tr><td>NEAR</td><td><code>15</code></td><td><code>testnet</code></td></tr><tr><td>Neutron</td><td><code>4003</code></td><td><code>pion-1</code></td></tr><tr><td>Noble</td><td><code>4009</code></td><td><code>grand-1</code></td></tr><tr><td>Optimism Sepolia</td><td><code>10005</code></td><td><code>Optimism Sepolia</code> - <code>11155420</code></td></tr><tr><td>Osmosis</td><td><code>20</code></td><td><code>osmo-test-5</code></td></tr><tr><td>Plasma</td><td><code>58</code></td><td></td></tr><tr><td>Plume</td><td><code>55</code></td><td><code>98867</code></td></tr><tr><td>Polygon Amoy</td><td><code>10007</code></td><td><code>Amoy</code> - <code>80002</code></td></tr><tr><td>Provenance</td><td><code>4008</code></td><td></td></tr><tr><td>Pythnet</td><td><code>26</code></td><td></td></tr><tr><td>Scroll</td><td><code>34</code></td><td><code>Sepolia</code> - <code>534351</code></td></tr><tr><td>SEDA</td><td><code>4006</code></td><td><code>seda-1-testnet</code></td></tr><tr><td>Sei</td><td><code>32</code></td><td><code>atlantic-2</code></td></tr><tr><td>SeiEVM</td><td><code>40</code></td><td></td></tr><tr><td>Sonic</td><td><code>52</code></td><td><code>57054</code></td></tr><tr><td>Stacks</td><td><code>60</code></td><td><code>2147483648</code></td></tr><tr><td>Stargaze</td><td><code>4005</code></td><td></td></tr><tr><td>Sui</td><td><code>21</code></td><td><code>4c78adac</code></td></tr><tr><td>Unichain</td><td><code>44</code></td><td><code>Unichain Sepolia</code> - <code>1301</code></td></tr><tr><td>World Chain</td><td><code>45</code></td><td><code>4801</code></td></tr><tr><td>X Layer</td><td><code>37</code></td><td><code>195</code></td></tr><tr><td>Xrpl</td><td><code>66</code></td><td></td></tr><tr><td>XRPL-EVM</td><td><code>57</code></td><td><code>1449000</code></td></tr></tbody></table>


---

Page Title: Contract Addresses

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-reference-contract-addresses.md
- Canonical (HTML): https://wormhole.com/docs/products/reference/contract-addresses/
- Summary: This page documents the deployed contract addresses of the Wormhole contracts on each chain, including Core Contracts, TokenBridge, and more.
- Word Count: 3970; Token Estimate: 11165

# Contract Addresses

## Core Contracts



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B</code></td></tr><tr><td>Solana</td><td><code>worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0xC699482c17d43b7D5349F2D3f58d61fEFA972B8c</code></td></tr><tr><td>Algorand</td><td><code>842125965</code></td></tr><tr><td>Aptos</td><td><code>0x5bc11445584a763c1fa7ed39081f1b920954da14e04b32440cba863d03e19625</code></td></tr><tr><td>Arbitrum</td><td><code>0xa5f208e072434bC67592E4C49C1B991BA79BCA46</code></td></tr><tr><td>Avalanche</td><td><code>0x54a8e5f9c4CbA08F9943965859F6c34eAF03E26c</code></td></tr><tr><td>Base</td><td><code>0xbebdb6C8ddC678FfA9f8748f85C815C556Dd8ac6</code></td></tr><tr><td>Berachain</td><td><code>0xCa1D5a146B03f6303baF59e5AD5615ae0b9d146D</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B</code></td></tr><tr><td>Celo</td><td><code>0xa321448d90d4e5b0A732867c18eA198e75CAC48E</code></td></tr><tr><td>CreditCoin</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Fantom</td><td><code>0x126783A6Cb203a3E35344528B26ca3a0489a1485</code></td></tr><tr><td>Fogo</td><td><code>worm2mrQkG1B1KTz37erMfWN8anHkSK24nzca7UD8BB</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0x7C0faFc4384551f063e05aee704ab943b8B53aB3</code></td></tr><tr><td>Injective</td><td><code>inj17p9rzwnnfxcjp32un9ug7yhhzgtkhvl9l2q74d</code></td></tr><tr><td>Ink</td><td><code>0xCa1D5a146B03f6303baF59e5AD5615ae0b9d146D</code></td></tr><tr><td>Kaia</td><td><code>0x0C21603c4f3a6387e241c0091A7EA39E43E90bb7</code></td></tr><tr><td>Linea</td><td><code>0x0C56aebD76E6D9e4a1Ec5e94F4162B4CBbf77b32</code></td></tr><tr><td>Mantle</td><td><code>0xbebdb6C8ddC678FfA9f8748f85C815C556Dd8ac6</code></td></tr><tr><td>MegaETH</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Mezo</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Moca</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Monad</td><td><code>0x194B123c5E96B9b2E49763619985790Dc241CAC0</code></td></tr><tr><td>Moonbeam</td><td><code>0xC8e2b0cD52Cf01b0Ce87d389Daa3d414d4cE29f3</code></td></tr><tr><td>NEAR</td><td><code>contract.wormhole_crypto.near</code></td></tr><tr><td>Neutron</td><td><code>neutron16rerygcpahqcxx5t8vjla46ym8ccn7xz7rtc6ju5ujcd36cmc7zs9zrunh</code></td></tr><tr><td>Optimism</td><td><code>0xEe91C335eab126dF5fDB3797EA9d6aD93aeC9722</code></td></tr><tr><td>Plume</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Polygon</td><td><code>0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7</code></td></tr><tr><td>Pythnet</td><td><code>H3fxXJ86ADW2PNuDDmZJg6mzTtPxkYCpNuQUTgmJ7AjU</code></td></tr><tr><td>Scroll</td><td><code>0xbebdb6C8ddC678FfA9f8748f85C815C556Dd8ac6</code></td></tr><tr><td>Sei</td><td><code>sei1gjrrme22cyha4ht2xapn3f08zzw6z3d4uxx6fyy9zd5dyr3yxgzqqncdqn</code></td></tr><tr><td>SeiEVM</td><td><code>0xCa1D5a146B03f6303baF59e5AD5615ae0b9d146D</code></td></tr><tr><td>Sui</td><td><code>0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c</code></td></tr><tr><td>Unichain</td><td><code>0xCa1D5a146B03f6303baF59e5AD5615ae0b9d146D</code></td></tr><tr><td>World Chain</td><td><code>0xcbcEe4e081464A15d8Ad5f58BB493954421eB506</code></td></tr><tr><td>X Layer</td><td><code>0x194B123c5E96B9b2E49763619985790Dc241CAC0</code></td></tr><tr><td>XRPL-EVM</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Holesky</td><td><code>0xa10f2eF61dE1f19f586ab8B6F2EbA89bACE63F7a</code></td></tr><tr><td>Ethereum Sepolia</td><td><code>0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78</code></td></tr><tr><td>Solana</td><td><code>3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x059560c0D626bdB982454b5EBd65DC8E7cF7973c</code></td></tr><tr><td>Algorand</td><td><code>86525623</code></td></tr><tr><td>Aptos</td><td><code>0x5bc11445584a763c1fa7ed39081f1b920954da14e04b32440cba863d03e19625</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35</code></td></tr><tr><td>Avalanche</td><td><code>0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C</code></td></tr><tr><td>Base Sepolia</td><td><code>0x79A1027a6A159502049F10906D333EC57E95F083</code></td></tr><tr><td>Berachain</td><td><code>0xBB73cB66C26740F31d1FabDC6b7A46a038A300dd</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D</code></td></tr><tr><td>Celo</td><td><code>0x88505117CA88e7dd2eC6EA1E13f0948db2D50D56</code></td></tr><tr><td>Converge</td><td><code>0x556B259cFaCd9896B2773310080c7c3bcE90Ff01</code></td></tr><tr><td>CreditCoin</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Fantom</td><td><code>0x1BB3B4119b7BA9dfad76B0545fb3F531383c3bB7</code></td></tr><tr><td>Fogo</td><td><code>BhnQyKoQQgpuRTRo6D8Emz93PvXCYfVgHhnrR4T3qhw4</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0xBB73cB66C26740F31d1FabDC6b7A46a038A300dd</code></td></tr><tr><td>Injective</td><td><code>inj1xx3aupmgv3ce537c0yce8zzd3sz567syuyedpg</code></td></tr><tr><td>Ink</td><td><code>0xBB73cB66C26740F31d1FabDC6b7A46a038A300dd</code></td></tr><tr><td>Kaia</td><td><code>0x1830CC6eE66c84D2F177B94D544967c774E624cA</code></td></tr><tr><td>Linea</td><td><code>0x79A1027a6A159502049F10906D333EC57E95F083</code></td></tr><tr><td>Mantle</td><td><code>0x376428e7f26D5867e69201b275553C45B09EE090</code></td></tr><tr><td>MegaETH</td><td><code>0x81705b969cDcc6FbFde91a0C6777bE0EF3A75855</code></td></tr><tr><td>Mezo</td><td><code>0x268557122Ffd64c85750d630b716471118F323c8</code></td></tr><tr><td>Moca</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Monad Testnet</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Moonbeam</td><td><code>0xa5B7D85a8f27dd7907dc8FdC21FA5657D5E2F901</code></td></tr><tr><td>NEAR</td><td><code>wormhole.wormhole.testnet</code></td></tr><tr><td>Neutron</td><td><code>neutron1enf63k37nnv9cugggpm06mg70emcnxgj9p64v2s8yx7a2yhhzk2q6xesk4</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x31377888146f3253211EFEf5c676D41ECe7D58Fe</code></td></tr><tr><td>Osmosis</td><td><code>osmo1hggkxr0hpw83f8vuft7ruvmmamsxmwk2hzz6nytdkzyup9krt0dq27sgyx</code></td></tr><tr><td>Plasma</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr><tr><td>Plume</td><td><code>0x81705b969cDcc6FbFde91a0C6777bE0EF3A75855</code></td></tr><tr><td>Polygon Amoy</td><td><code>0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35</code></td></tr><tr><td>Pythnet</td><td><code>EUrRARh92Cdc54xrDn6qzaqjA77NRrCcfbr8kPwoTL4z</code></td></tr><tr><td>Scroll</td><td><code>0x055F47F1250012C6B20c436570a76e52c17Af2D5</code></td></tr><tr><td>Sei</td><td><code>sei1nna9mzp274djrgzhzkac2gvm3j27l402s4xzr08chq57pjsupqnqaj0d5s</code></td></tr><tr><td>SeiEVM</td><td><code>0xBB73cB66C26740F31d1FabDC6b7A46a038A300dd</code></td></tr><tr><td>Stacks</td><td><code>ST37PDDGEA78QSPSBZM1ZHPCZV9GKAPDFHA32RWY8</code></td></tr><tr><td>Sui</td><td><code>0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790</code></td></tr><tr><td>Unichain</td><td><code>0xBB73cB66C26740F31d1FabDC6b7A46a038A300dd</code></td></tr><tr><td>World Chain</td><td><code>0xe5E02cD12B6FcA153b0d7fF4bF55730AE7B3C93A</code></td></tr><tr><td>X Layer</td><td><code>0xA31aa3FDb7aF7Db93d18DDA4e19F811342EDF780</code></td></tr><tr><td>XRPL-EVM</td><td><code>0xaBf89de706B583424328B54dD05a8fC986750Da8</code></td></tr></tbody></table>

=== "Devnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xC89Ce4735882C9F0f0FE26686c53074E09B0D550</code></td></tr><tr><td>Solana</td><td><code>Bridge1p5gheXUvJ6jGWGeCsgPKgnE3YgdGKRVCMY9o</code></td></tr><tr><td>Algorand</td><td><code>1004</code></td></tr><tr><td>Aptos</td><td><code>0xde0036a9600559e295d5f6802ef6f3f802f510366e0c23912b0655d972166017</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xC89Ce4735882C9F0f0FE26686c53074E09B0D550</code></td></tr><tr><td>NEAR</td><td><code>wormhole.test.near</code></td></tr><tr><td>Stacks</td><td><code>ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM</code></td></tr><tr><td>Sui</td><td><code>0x5a5160ca3c2037f4b4051344096ef7a48ebf4400b3f385e57ea90e1628a8bde0</code></td></tr></tbody></table>

## Wrapped Token Transfers (WTT)



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x3ee18B2214AFF97000D974cf647E7C347E8fa585</code></td></tr><tr><td>Solana</td><td><code>wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0xee12EBDdF6E34A206e1798D185317C846BC21638</code></td></tr><tr><td>Algorand</td><td><code>842126029</code></td></tr><tr><td>Aptos</td><td><code>0x576410486a2da45eee6c949c995670112ddf2fbeedab20350d506328eefc9d4f</code></td></tr><tr><td>Arbitrum</td><td><code>0x0b2402144Bb366A632D14B83F244D2e0e21bD39c</code></td></tr><tr><td>Avalanche</td><td><code>0x0e082F06FF657D94310cB8cE8B0D9a04541d8052</code></td></tr><tr><td>Base</td><td><code>0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627</code></td></tr><tr><td>Berachain</td><td><code>0x3Ff72741fd67D6AD0668d93B41a09248F4700560</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7</code></td></tr><tr><td>Celo</td><td><code>0x796Dff6D74F3E27060B71255Fe517BFb23C93eed</code></td></tr><tr><td>Fantom</td><td><code>0x7C9Fc5741288cDFdD83CeB07f3ea7e22618D79D2</code></td></tr><tr><td>Fogo</td><td><code>wormQuCVWSSmPdjVmEzAWxAXViVyTSWnLyhff5hVYGS</code></td></tr><tr><td>Injective</td><td><code>inj1ghd753shjuwexxywmgs4xz7x2q732vcnxxynfn</code></td></tr><tr><td>Ink</td><td><code>0x3Ff72741fd67D6AD0668d93B41a09248F4700560</code></td></tr><tr><td>Kaia</td><td><code>0x5b08ac39EAED75c0439FC750d9FE7E1F9dD0193F</code></td></tr><tr><td>Mantle</td><td><code>0x24850c6f61C438823F01B7A3BF2B89B72174Fa9d</code></td></tr><tr><td>MegaETH</td><td><code>0xF97B81E513f53c7a6B57Bd0b103a6c295b3096C5</code></td></tr><tr><td>Monad</td><td><code>0x0B2719cdA2F10595369e6673ceA3Ee2EDFa13BA7</code></td></tr><tr><td>Moonbeam</td><td><code>0xb1731c586ca89a23809861c6103f0b96b3f57d92</code></td></tr><tr><td>NEAR</td><td><code>contract.portalbridge.near</code></td></tr><tr><td>Optimism</td><td><code>0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b</code></td></tr><tr><td>Polygon</td><td><code>0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE</code></td></tr><tr><td>Scroll</td><td><code>0x24850c6f61C438823F01B7A3BF2B89B72174Fa9d</code></td></tr><tr><td>Sei</td><td><code>sei1smzlm9t79kur392nu9egl8p8je9j92q4gzguewj56a05kyxxra0qy0nuf3</code></td></tr><tr><td>SeiEVM</td><td><code>0x3Ff72741fd67D6AD0668d93B41a09248F4700560</code></td></tr><tr><td>Sui</td><td><code>0xc57508ee0d4595e5a8728974a4a93a787d38f339757230d441e895422c07aba9</code></td></tr><tr><td>Unichain</td><td><code>0x3Ff72741fd67D6AD0668d93B41a09248F4700560</code></td></tr><tr><td>World Chain</td><td><code>0xc309275443519adca74c9136b02A38eF96E3a1f6</code></td></tr><tr><td>X Layer</td><td><code>0x5537857664B0f9eFe38C9f320F75fEf23234D904</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x47F5195163270345fb4d7B9319Eda8C64C75E278</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Holesky</td><td><code>0x76d093BbaE4529a342080546cAFEec4AcbA59EC6</code></td></tr><tr><td>Ethereum Sepolia</td><td><code>0xDB5492265f6038831E89f495670FF909aDe94bd9</code></td></tr><tr><td>Solana</td><td><code>DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x7d8eBc211C4221eA18E511E4f0fD50c5A539f275</code></td></tr><tr><td>Algorand</td><td><code>86525641</code></td></tr><tr><td>Aptos</td><td><code>0x576410486a2da45eee6c949c995670112ddf2fbeedab20350d506328eefc9d4f</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e</code></td></tr><tr><td>Avalanche</td><td><code>0x61E44E506Ca5659E6c0bba9b678586fA2d729756</code></td></tr><tr><td>Base Sepolia</td><td><code>0x86F55A04690fd7815A3D802bD587e83eA888B239</code></td></tr><tr><td>Berachain</td><td><code>0xa10f2eF61dE1f19f586ab8B6F2EbA89bACE63F7a</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x9dcF9D205C9De35334D646BeE44b2D2859712A09</code></td></tr><tr><td>Celo</td><td><code>0x05ca6037eC51F8b712eD2E6Fa72219FEaE74E153</code></td></tr><tr><td>Fantom</td><td><code>0x599CEa2204B4FaECd584Ab1F2b6aCA137a0afbE8</code></td></tr><tr><td>Fogo</td><td><code>78HdStBqCMioGii9D8mF3zQaWDqDZBQWTUwjjpdmbJKX</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78</code></td></tr><tr><td>Injective</td><td><code>inj1q0e70vhrv063eah90mu97sazhywmeegp7myvnh</code></td></tr><tr><td>Ink</td><td><code>0x376428e7f26D5867e69201b275553C45B09EE090</code></td></tr><tr><td>Kaia</td><td><code>0xC7A13BE098720840dEa132D860fDfa030884b09A</code></td></tr><tr><td>Linea</td><td><code>0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e</code></td></tr><tr><td>Mantle</td><td><code>0x75Bfa155a9D7A3714b0861c8a8aF0C4633c45b5D</code></td></tr><tr><td>MegaETH</td><td><code>0x3D5c2c2BEA15Af5D45F084834c535628C48c42A4</code></td></tr><tr><td>Mezo</td><td><code>0xA31aa3FDb7aF7Db93d18DDA4e19F811342EDF780</code></td></tr><tr><td>Moca</td><td><code>0xF97B81E513f53c7a6B57Bd0b103a6c295b3096C5</code></td></tr><tr><td>Monad Testnet</td><td><code>0xF97B81E513f53c7a6B57Bd0b103a6c295b3096C5</code></td></tr><tr><td>Moonbeam</td><td><code>0xbc976D4b9D57E57c3cA52e1Fd136C45FF7955A96</code></td></tr><tr><td>NEAR</td><td><code>token.wormhole.testnet</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x99737Ec4B815d816c49A385943baf0380e75c0Ac</code></td></tr><tr><td>Polygon Amoy</td><td><code>0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e</code></td></tr><tr><td>Scroll</td><td><code>0x22427d90B7dA3fA4642F7025A854c7254E4e45BF</code></td></tr><tr><td>Sei</td><td><code>sei1jv5xw094mclanxt5emammy875qelf3v62u4tl4lp5nhte3w3s9ts9w9az2</code></td></tr><tr><td>SeiEVM</td><td><code>0x23908A62110e21C04F3A4e011d24F901F911744A</code></td></tr><tr><td>Sui</td><td><code>0x6fb10cdb7aa299e9a4308752dadecb049ff55a892de92992a1edbd7912b3d6da</code></td></tr><tr><td>Unichain</td><td><code>0xa10f2eF61dE1f19f586ab8B6F2EbA89bACE63F7a</code></td></tr><tr><td>World Chain</td><td><code>0x430855B4D43b8AEB9D2B9869B74d58dda79C0dB2</code></td></tr><tr><td>X Layer</td><td><code>0xdA91a06299BBF302091B053c6B9EF86Eff0f930D</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x7d8eBc211C4221eA18E511E4f0fD50c5A539f275</code></td></tr></tbody></table>

=== "Devnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x0290FB167208Af455bB137780163b7B7a9a10C16</code></td></tr><tr><td>Solana</td><td><code>B6RHG3mfcckmrYN1UhmJzyS1XX3fZKbkeUcpJe9Sy3FE</code></td></tr><tr><td>Algorand</td><td><code>1006</code></td></tr><tr><td>Aptos</td><td><code>0x84a5f374d29fc77e370014dce4fd6a55b58ad608de8074b0be5571701724da31</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x0290FB167208Af455bB137780163b7B7a9a10C16</code></td></tr><tr><td>NEAR</td><td><code>token.test.near</code></td></tr><tr><td>Sui</td><td><code>0xa6a3da85bbe05da5bfd953708d56f1a3a023e7fb58e5a824a3d4de3791e8f690</code></td></tr></tbody></table>

## CCTP



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xAaDA05BD399372f0b0463744C09113c137636f6a</code></td></tr><tr><td>Arbitrum</td><td><code>0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c</code></td></tr><tr><td>Avalanche</td><td><code>0x09Fb06A271faFf70A651047395AaEb6265265F13</code></td></tr><tr><td>Base</td><td><code>0x03faBB06Fa052557143dC28eFCFc63FC12843f1D</code></td></tr><tr><td>Optimism</td><td><code>0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c</code></td></tr><tr><td>Polygon</td><td><code>0x0FF28217dCc90372345954563486528aa865cDd6</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c</code></td></tr><tr><td>Avalanche</td><td><code>0x58f4c17449c90665891c42e14d34aae7a26a472e</code></td></tr><tr><td>Base Sepolia</td><td><code>0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c</code></td></tr></tbody></table>

## Settlement Token Router

=== "Mainnet"

    <table data-full-width="true" markdown><thead><tr><th>Chain Name</th><th>Contract Address</th></tr></thead><tbody><tr><td>Ethereum</td><td><code>0x70287c79ee41C5D1df8259Cd68Ba0890cd389c47</code></td></tr><tr><td>Solana</td><td><code>28topqjtJzMnPaGFmmZk68tzGmj9W9aMntaEK3QkgtRe</code></td></tr><tr><td>Arbitrum</td><td><code>0x70287c79ee41C5D1df8259Cd68Ba0890cd389c47</code></td></tr><tr><td>Avalanche</td><td><code>0x70287c79ee41C5D1df8259Cd68Ba0890cd389c47</code></td></tr><tr><td>Base</td><td><code>0x70287c79ee41C5D1df8259Cd68Ba0890cd389c47</code></td></tr><tr><td>Optimism</td><td><code>0x70287c79ee41C5D1df8259Cd68Ba0890cd389c47</code></td></tr><tr><td>Polygon</td><td><code>0x70287c79ee41C5D1df8259Cd68Ba0890cd389c47</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><tr><th>Chain Name</th><th>Contract Address</th></tr></thead><tbody><tr><td>Solana</td><td><code>tD8RmtdcV7bzBeuFgyrFc8wvayj988ChccEzRQzo6md</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xe0418C44F06B0b0D7D1706E01706316DBB0B210E</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x6BAa7397c18abe6221b4f6C3Ac91C88a9faE00D8</code></td></tr></tbody></table>

## Executor



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x84EEe8dBa37C36947397E1E11251cA9A06Fc6F8a</code></td></tr><tr><td>Solana</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0xcD2BffD0C0289e8C0cb89c458dB1B74f1892Fa6c</code></td></tr><tr><td>Aptos</td><td><code>0x11aa75c059e1a7855be66b931bf340a2e0973274ac16b5f519c02ceafaf08a18</code></td></tr><tr><td>Arbitrum</td><td><code>0x3980f8318fc03d79033Bbb421A622CDF8d2Eeab4</code></td></tr><tr><td>Avalanche</td><td><code>0x4661F0E629E4ba8D04Ee90080Aee079740B00381</code></td></tr><tr><td>Base</td><td><code>0x9E1936E91A4a5AE5A5F75fFc472D6cb8e93597ea</code></td></tr><tr><td>Berachain</td><td><code>0x0Dd7a5a32311b8D87A615Cc7f079B632D3d5e2D3</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xeC8cCCD058DbF28e5D002869Aa9aFa3992bf4ee0</code></td></tr><tr><td>Celo</td><td><code>0xe6Ea5087c6860B94Cf098a403506262D8F28cF05</code></td></tr><tr><td>CreditCoin</td><td><code>0xd2e420188f17607Aa6344ee19c3e76Cf86CA7BDe</code></td></tr><tr><td>Fogo</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0xd7717899cc4381033Bc200431286D0AC14265F78</code></td></tr><tr><td>Ink</td><td><code>0x3e44a5F45cbD400acBEF534F51e616043B211Ddd</code></td></tr><tr><td>Linea</td><td><code>0x23aF2B5296122544A9A7861da43405D5B15a9bD3</code></td></tr><tr><td>MegaETH</td><td><code>0xD405E0A1f3f9edc25Ea32d0B079d6118328b2EcB</code></td></tr><tr><td>Mezo</td><td><code>0x0f9b8E144Cc5C5e7C0073829Afd30F26A50c5606</code></td></tr><tr><td>Moca</td><td><code>0x7b8097af5459846c5A72fCc960D94F31C05915aD</code></td></tr><tr><td>Monad</td><td><code>0xC04dE634982cAdF2A677310b73630B7Ac56A3f65</code></td></tr><tr><td>Moonbeam</td><td><code>0x85D06449C78064c2E02d787e9DC71716786F8D19</code></td></tr><tr><td>Optimism</td><td><code>0x85B704501f6AE718205C0636260768C4e72ac3e7</code></td></tr><tr><td>Polygon</td><td><code>0x0B23efA164aB3eD08e9a39AC7aD930Ff4F5A5e81</code></td></tr><tr><td>Scroll</td><td><code>0xcFAdDE24640e395F5A71456A825D0D7C3741F075</code></td></tr><tr><td>SeiEVM</td><td><code>0x25f1c923fb7a5aefa5f0a2b419fc70f2368e66e5</code></td></tr><tr><td>Sonic</td><td><code>0x3Fdc36b4260Da38fBDba1125cCBD33DD0AC74812</code></td></tr><tr><td>Sui</td><td><code>0xdb0fe8bb1e2b5be628adbea0636063325073e1070ee11e4281457dfd7f158235</code></td></tr><tr><td>Unichain</td><td><code>0x764dD868eAdD27ce57BCB801E4ca4a193d231Aed</code></td></tr><tr><td>World Chain</td><td><code>0x8689b4E6226AdC8fa8FF80aCc3a60AcE31e8804B</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x8345E90Dcd92f5Cf2FAb0C8E2A56A5bc2c30d896</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xD0fb39f5a3361F21457653cB70F9D0C9bD86B66B</code></td></tr><tr><td>Solana</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x7C43825EeB76DF7aAf3e1D2e8f684d4876F0CC05</code></td></tr><tr><td>Aptos</td><td><code>0x139717c339f08af674be77143507a905aa28cbc67a0e53e7095c07b630d73815</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xBF161de6B819c8af8f2230Bcd99a9B3592f6F87b</code></td></tr><tr><td>Avalanche</td><td><code>0x4661F0E629E4ba8D04Ee90080Aee079740B00381</code></td></tr><tr><td>Base Sepolia</td><td><code>0x51B47D493CBA7aB97e3F8F163D6Ce07592CE4482</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xeC8cCCD058DbF28e5D002869Aa9aFa3992bf4ee0</code></td></tr><tr><td>Converge</td><td><code>0xAab9935349B9c08e0e970720F6D640d5B91C293E</code></td></tr><tr><td>Fogo</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>Linea</td><td><code>0x4f6c3a93a80DdC691312974DAAbf9B6e4Bb44111</code></td></tr><tr><td>Mezo</td><td><code>0x0f9b8E144Cc5C5e7C0073829Afd30F26A50c5606</code></td></tr><tr><td>Moca</td><td><code>0xc4a03f2c47caA4b961101bAD6338DEf37376F052</code></td></tr><tr><td>Monad Testnet</td><td><code>0xe37D3E162B4B1F17131E4e0e6122DbA31243382f</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x5856651eB82aeb6979B4954317194d48e1891b3c</code></td></tr><tr><td>Plume</td><td><code>0x8fc2FbA8F962fbE89a9B02f03557a011c335A455</code></td></tr><tr><td>Polygon Amoy</td><td><code>0x7056721C33De437f0997F67BC87521cA86b721d3</code></td></tr><tr><td>SeiEVM</td><td><code>0x25f1c923Fb7A5aEFA5F0A2b419fC70f2368e66e5</code></td></tr><tr><td>Sui</td><td><code>0x4000cfe2955d8355b3d3cf186f854fea9f787a457257056926fde1ec977670eb</code></td></tr><tr><td>Unichain</td><td><code>0x764dD868eAdD27ce57BCB801E4ca4a193d231Aed</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x4d9525D94D275dEB495b7C8840b154Ae04cfaC2A</code></td></tr></tbody></table>

## Quoter Router



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xF22F1c0A3a8Cb42F695601731974784C499C4EF3</code></td></tr><tr><td>Arbitrum</td><td><code>0x32eec14c963c23176bd8951f192292006756bDcC</code></td></tr><tr><td>Avalanche</td><td><code>0xA3a2A615774d34c6a4dF443C488B084eacaBd2D0</code></td></tr><tr><td>Base</td><td><code>0x265fd0500a430d65d6D79Cd8707F24C048604658</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xc921F293c27F332D47283174b11C872295624Edb</code></td></tr><tr><td>Ink</td><td><code>0xdEC050E66BEb2f0d5507761A0fE4867839bd88D2</code></td></tr><tr><td>Monad</td><td><code>0x3d9282A8e9a3cdd9b25AE969eff4705a1Fe75F34</code></td></tr><tr><td>Optimism</td><td><code>0xa3B6551cCbB5Fe1dc33b71EE3590B1Df22ae75B3</code></td></tr><tr><td>Plume</td><td><code>0x85BA1B2A2195be51Ab715be458B32B120532d230</code></td></tr><tr><td>Polygon</td><td><code>0x2a856931603930B827B1A4352FB4D66fA029F123</code></td></tr><tr><td>Sei</td><td><code>0x1D6FeA87671F7c5E184F4c59c3BdcEc5CFC3eC1c</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xc0C35D7bfBc4175e0991Ae294f561b433eA4158f</code></td></tr><tr><td>Solana</td><td><code>qtrrrV7W3E1jnX1145wXR6ZpthG19ur5xHC1n6PPhDV</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x5E8c14F436c9ed2ff2E8B042B0542136bf108C6f</code></td></tr><tr><td>Avalanche</td><td><code>0xA3a2A615774d34c6a4dF443C488B084eacaBd2D0</code></td></tr><tr><td>Base Sepolia</td><td><code>0x2507d6899C3D4b93BF46b555d0cB401f44065772</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x6a829dF7C91f35f9aD72Cd5d05550b95BbC9fd2F</code></td></tr><tr><td>Polygon Amoy</td><td><code>0xE00444636DA924FBAe94471d73D56b5E03cA781c</code></td></tr><tr><td>Sei</td><td><code>0x1D6FeA87671F7c5E184F4c59c3BdcEc5CFC3eC1c</code></td></tr></tbody></table>

!!! note
    Wormhole Labs’ Quoter uses the following public keys:

    - **Mainnet**: `0xa54008017941EcE968623a0Dd8Ee907E2b133596`.
    - **Testnet**: `0x5241c9276698439fef2780dbab76fec90b633fbd`.
## Wormhole Labs Quoter Implementation



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Arbitrum</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Avalanche</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Base</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Ink</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Monad</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Optimism</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Plume</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Polygon</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Sei</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Solana</td><td><code>qtrxiqVAfVS61utwZLUi7UKugjCgFaNxBGyskmGingz</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Avalanche</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Base Sepolia</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Polygon Amoy</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Sei</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr></tbody></table>

!!! note
    Wormhole Labs’ Quoter uses the following public keys:

    - **Mainnet**: `0xa54008017941EcE968623a0Dd8Ee907E2b133596`.
    - **Testnet**: `0x5241c9276698439fef2780dbab76fec90b633fbd`.
## Guardian Governance

=== "Mainnet"

    
    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x23Fea5514DFC9821479fBE18BA1D7e1A61f6FfCf</code></td></tr><tr><td>Solana</td><td><code>NGoD1yTeq5KaURrZo7MnCTFzTA4g62ygakJCnzMLCfm</code></td></tr><tr><td>Arbitrum</td><td><code>0x36CF4c88FA548c6Ad9fcDc696e1c27Bb3306163F</code></td></tr><tr><td>Avalanche</td><td><code>0x169D91C797edF56100F1B765268145660503a423</code></td></tr><tr><td>Base</td><td><code>0x838a95B6a3E06B6f11C437e22f3C7561a6ec40F1</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x8E4dc685e990379b8D53EcA47841E09B8d30043e</code></td></tr><tr><td>Fogo</td><td><code>ngoLQ35zgtP3SxWrjAJ8Mz2H8BPFVeZoxyBPotPYwnB</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0x574B7864119C9223A9870Ea614dC91A8EE09E512</code></td></tr><tr><td>MegaETH</td><td><code>0x574B7864119C9223A9870Ea614dC91A8EE09E512</code></td></tr><tr><td>Monad</td><td><code>0x574B7864119C9223A9870Ea614dC91A8EE09E512</code></td></tr><tr><td>Optimism</td><td><code>0x0E09a3081837ff23D2e59B179E0Bc48A349Afbd8</code></td></tr><tr><td>Unichain</td><td><code>0x574b7864119c9223a9870ea614dc91a8ee09e512</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x574B7864119C9223A9870Ea614dC91A8EE09E512</code></td></tr></tbody></table>
    

=== "Testnet"

    
    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x9517F0164c1d089ad72E669E57b9088790966dBd</code></td></tr><tr><td>Solana</td><td><code>NGoD1yTeq5KaURrZo7MnCTFzTA4g62ygakJCnzMLCfm</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x81b65A48DCAccBA04aCa3C055C4112b0715b90c0</code></td></tr><tr><td>Base Sepolia</td><td><code>0x720A59128B96Eda6EC2940c7899406E4dc56d0DC</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0xcE1DE1eA4b040D324a07719043A6234C94fd0b5d</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x574B7864119C9223A9870Ea614dC91A8EE09E512</code></td></tr></tbody></table>
    
!!! note
    Guardian-governed ownership contracts are used where an owner is required, without adding new trust assumptions. They only accept instructions signed by a quorum of Wormhole Guardians, validated on-chain by the Wormhole Core contracts. Implementations: [EVM](https://github.com/wormhole-foundation/native-token-transfers/blob/main/evm/src/wormhole/Governance.sol){target=\_blank} and [SVM](https://github.com/wormhole-foundation/native-token-transfers/blob/main/solana/programs/wormhole-governance/src/instructions/governance.rs){target=\_blank}.

    On SVM chains, deployments set the admin to a [governance PDA](https://solana.com/docs/core/pda){target=\_blank} derived from the Guardian governance program. The admin address may differ from the program ID when inspecting deployments on-chain.

    The following governance PDAs are used as the admin for deployments on SVM chains:

    - **Solana:** `4iUtozoQLdJ2FV7vXe9q215ETSw1Mnt8WKP4NyqNgAxz`.
    - **Fogo:** `nWfGbhWvREnvF1zCvhrXiKidzDJ8DzCdHb13YYZeVkV`.


## Delegated Guardians

=== "Mainnet"

    <table data-full-width="true" markdown><thead><tr><th>Chain Name</th><th>Contract Address</th></tr></thead><tbody><tr><td>Ethereum</td><td><code>0x1462800febd49232798132e8c8b721aa86c4c209</code></td></tr></tbody></table>

## Read-Only Deployments

=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody>
    <tr><td>Acala</td><td><code>0xa321448d90d4e5b0A732867c18eA198e75CAC48E</code></td></tr>
    <tr><td>Aurora</td><td><code>0x51b5123a7b0F9b2bA265f9c4C8de7D78D52f510F</code></td></tr>
    <tr><td>Blast</td><td><code>0xbebdb6C8ddC678FfA9f8748f85C815C556Dd8ac6</code></td></tr>
    <tr><td>Corn</td><td><code>0xa683c66045ad16abb1bCE5ad46A64d95f9A25785</code></td></tr>
    <tr><td>Gnosis</td><td><code>0xa321448d90d4e5b0A732867c18eA198e75CAC48E</code></td></tr>
    <tr><td>Goat</td><td><code>0x352A86168e6988A1aDF9A15Cb00017AAd3B67155</code></td></tr>
    <tr><td>Karura</td><td><code>0xa321448d90d4e5b0A732867c18eA198e75CAC48E</code></td></tr>
    <tr><td>LightLink</td><td><code>0x352A86168e6988A1aDF9A15Cb00017AAd3B67155</code></td></tr>
    <tr><td>Oasis</td><td><code>0xfE8cD454b4A1CA468B57D79c0cc77Ef5B6f64585</code></td></tr>
    <tr><td>Rootstock</td><td><code>0xbebdb6C8ddC678FfA9f8748f85C815C556Dd8ac6</code></td></tr>
    <tr><td>Sonic</td><td><code>0x352A86168e6988A1aDF9A15Cb00017AAd3B67155</code></td></tr>
    <tr><td>Telos</td><td><code>0x352A86168e6988A1aDF9A15Cb00017AAd3B67155</code></td></tr>
    <tr><td>Terra</td><td><code>terra1dq03ugtd40zu9hcgdzrsq6z2z4hwhc9tqk2uy5</code></td></tr>
    <tr><td>Terra 2.0</td><td><code>terra12mrnzvhx3rpej6843uge2yyfppfyd3u9c3uq223q8sl48huz9juqffcnhp</code></td></tr>
    <tr><td>SNAXchain</td><td><code>0xc1BA3CC4bFE724A08FbbFbF64F8db196738665f4</code></td></tr>
    <tr><td>XPLA</td><td><code>xpla1jn8qmdda5m6f6fqu9qv46rt7ajhklg40ukpqchkejcvy8x7w26cqxamv3w</code></td></tr>
    </tbody>
    </table>
!!! note  
    Read-only deployments allow Wormhole messages to be received on chains not fully integrated with Wormhole Guardians. These deployments support cross-chain data verification but cannot originate messages. For example, a governance message can be sent from a fully integrated chain and processed on a read-only chain, but the read-only chain cannot send messages back.


---

Page Title: Core Contract (EVM)

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-messaging-reference-core-contract-evm.md
- Canonical (HTML): https://wormhole.com/docs/products/messaging/reference/core-contract-evm/
- Summary: Reference for the Wormhole Core contract on EVM chains. Covers the proxy structure, components, state variables, functions, events, and errors.
- Word Count: 1963; Token Estimate: 4016

# Core Contract (EVM)

The [Wormhole Core Contract on EVM](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol){target=\_blank} chains is a proxy-based contract responsible for receiving and verifying Wormhole messages (VAAs). It implements the messaging interface and delegates logic to upgradeable implementation contracts.

## Structure Overview

The Wormhole Core system consists of a proxy contract and a modular implementation constructed through layered inheritance.

```text
Wormhole.sol (Proxy)
└── Implementation.sol
    └── Governance.sol
        ├── Getters.sol
        ├── GovernanceStructs.sol
        ├── Messages.sol
        ├── Setters.sol
        └── Structs.sol
```

**Key Components:**

 - **Wormhole.sol**: The upgradeable proxy contract that delegates all logic to `Implementation.sol`.
 - **Implementation.sol**: The main logic contract, which handles message publication and initialization. Inherits from Governance.sol.
 - **Governance.sol**: Core governance logic for processing upgrades, setting fees, and updating the Guardian set. Also responsible for verifying governance VAAs and performing privileged actions.
 - **Getters.sol**: Exposes view functions to access internal contract state, such as current Guardian sets, fees, and contract configuration.
 - **GovernanceStructs.sol**: Provides structures and helpers for processing governance-related VAAs.
 - **Messages.sol**: Handles VAA parsing and verification.
 - **Setters.sol**: Contains internal functions for mutating contract state.
 - **Structs.sol**: Defines core data structures like GuardianSet and VM (VAA Message) used across multiple modules.

## State Variables

 - **`provider` ++"Structs.Provider"++**: Holds metadata like `chainId`, `governanceChainId`, and `governanceContract`. This is a nested struct.
 - **`guardianSets` ++"mapping(uint32 => GuardianSet)"++**: Mapping of all Guardian sets by index.
 - **`guardianSetIndex` ++"uint32"++**: Index of the currently active Guardian set.
 - **`guardianSetExpiry` ++"uint32"++**: How long a Guardian set remains valid after it's replaced (in seconds).
 - **`sequences` ++"mapping(address => uint64)"++**: Tracks message sequences per emitter (used to enforce message ordering).
 - **`consumedGovernanceActions` ++"mapping(bytes32 => bool)"++**: Used to prevent governance VAAs from being reused (replay protection).
 - **`initializedImplementations` ++"mapping(address => bool)"++**: Tracks which implementation addresses have been initialized (for upgrade safety).
 - **`messageFee` ++"uint256"++**: The amount (in native gas token) required to post a message. Set via governance.
 - **`evmChainId` ++"uint256"++**: The actual EVM chain ID (e.g., 1 for Ethereum, 10 for Optimism). Used in fork recovery.

## Events

### LogMessagePublished

Emitted when a message is published via `publishMessage`. *(Defined in [Implementation.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol){target=\_blank})*

```solidity
event LogMessagePublished(
    address indexed sender,
    uint64 sequence,
    uint32 nonce,
    bytes payload,
    uint8 consistencyLevel
)
```

??? interface "Parameters"

    `sender` ++"address"++  

    Address that called `publishMessage`.

    ---

    `sequence` ++"uint64"++

    The sequence number of the message.

    ---

    `nonce` ++"uint32"++

    The provided nonce.

    ---

    `payload` ++"bytes"++

    The payload that was published.

    ---

    `consistencyLevel` ++"uint8"++

    Finality level requested.

### ContractUpgraded

Emitted when the Core Contract is upgraded to a new implementation via governance. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

```solidity
event ContractUpgraded(
    address indexed oldContract,
    address indexed newContract
)
```

??? interface "Parameters"

    `oldContract` ++"address"++

    The address of the previous implementation.

    ---

    `newContract` ++"address"++

    The address of the new implementation.

### GuardianSetAdded

Emitted when a new Guardian set is registered via governance. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

```solidity
event GuardianSetAdded(
    uint32 indexed index
)
```

??? interface "Parameters"

    `index` ++"uint32"++

    Index of the newly added Guardian set.

### LogGuardianSetChanged

Emitted when the active Guardian set is changed. *(Defined in [State.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/State.sol){target=\_blank})*

```solidity
event LogGuardianSetChanged(
    uint32 oldGuardianIndex,
    uint32 newGuardianIndex
)
```

??? interface "Parameters"

    `oldGuardianIndex` ++"uint32"++

    The previous active Guardian set index.

    ---

    `newGuardianIndex` ++"uint32"++

    The new active Guardian set index.

## Functions

### publishMessage

Publishes a message to Wormhole's Guardian Network. *(Defined in [Implementation.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol){target=\_blank})*

```solidity
function publishMessage(
    uint32 nonce,
    bytes memory payload,
    uint8 consistencyLevel
) public payable returns (uint64 sequence)
```

??? interface "Parameters"

    `nonce` ++"uint32"++

    Custom sequence identifier for the emitter.

    ---

    `payload` ++"bytes"++

    Arbitrary user data to be included in the message.

    ---

    `consistencyLevel` ++"uint8"++

    Finality requirement for Guardian attestation (e.g., safe or finalized).

??? interface "Returns"

    `sequence` ++"uint64"++

    Unique sequence number assigned to this message.

### getCurrentGuardianSetIndex

Returns the index of the currently active Guardian set. *(Defined in [Getters.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Getters.sol){target=\_blank})*

Each VAA includes the index of the Guardian set that signed it. This function allows contracts to retrieve the current index, ensuring the VAA is verified against the correct set.

```solidity
function getCurrentGuardianSetIndex() external view returns (uint32)
```

??? interface "Returns"

    `index` ++"uint32"++

    The index of the active Guardian set used to verify signatures.

### getGuardianSet

Retrieves metadata for a given Guardian set index. *(Defined in [Getters.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Getters.sol){target=\_blank})*

```solidity
function getGuardianSet(uint32 index) external view returns (address[] memory keys, uint32 expirationTime)
```

??? interface "Parameters"

    `index` ++"uint32"++

    Guardian set index to query.

??? interface "Returns"

    `keys` ++"address[]"++

    Public keys of the guardians in this set.

    ---

    `expirationTime` ++"uint32"++

    Timestamp after which the Guardian set is considered expired.

### getGuardianSetExpiry

Returns the expiration time of a specific Guardian set index. *(Defined in [Getters.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Getters.sol){target=\_blank})*

```solidity
function getGuardianSetExpiry(uint32 index) external view returns (uint32)
```

??? interface "Parameters"

    `index` ++"uint32"++

    The index of the Guardian set to query.

??? interface "Returns"

    `expiry` ++"uint32"++

    UNIX timestamp after which the set is no longer valid.

### messageFee

Returns the current fee (in native tokens) required to publish a message. *(Defined in [Getters.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Getters.sol){target=\_blank})*

```solidity
function messageFee() public view returns (uint256)
```

??? interface "Returns"

    `fee` ++"uint256"++

    Fee in Wei required to publish a message successfully. Must be sent as `msg.value`.

### nextSequence

Retrieves the next sequence number for a given emitter address. *(Defined in [Getters.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Getters.sol){target=\_blank})*

```solidity
function nextSequence(address emitter) external view returns (uint64)
```

??? interface "Parameters"

    `emitter` ++"address"++

    The address for which the next sequence will be issued.

??? interface "Returns"

    `sequence` ++"uint64"++

    The next sequence number for the specified emitter.

### parseAndVerifyVM

Verifies signatures and parses a signed VAA. *(Defined in [Messages.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Messages.sol){target=\_blank})*

```solidity
function parseAndVerifyVM(bytes memory encodedVM)
    external
    view
    returns (
        VM memory vm,
        bool valid,
        string memory reason
    )
```

??? interface "Parameters"

    `encodedVM` ++"bytes"++

    Serialized signed VAA from Guardians.

??? interface "Returns"

    `vm` ++"VM memory"++

    Full parsed VAA contents

    ---

    `valid` ++"bool"++

    Whether the VAA is valid according to the current Guardian set.

    ---

    `reason` ++"string"++

    Reason for invalidity if `valid` is false (invalid).

### verifyVM

Performs low-level VAA signature verification. *(Defined in [Messages.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Messages.sol){target=\_blank})*

```solidity
function verifyVM(bytes memory encodedVM)
    public view returns (bool isValid, string memory reason)
```

??? interface "Parameters"

    `encodedVM` ++"bytes"++

    Serialized signed VAA to verify.

??? interface "Returns"

    `isValid` ++"bool"++

    `true` if the signatures are valid and meet the quorum.

    ---

    `reason` ++"string"++

    Explanation for failure if `isValid` is `false`.

### verifySignatures

Used to verify individual Guardian signatures against a VAA digest. *(Defined in [Messages.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Messages.sol){target=\_blank})*

```solidity
function verifySignatures(
    bytes32 hash,
    Structs.Signature[] memory signatures,
    GuardianSet memory guardianSet
) public view returns (bool)
```

??? interface "Parameters"

    `hash` ++"bytes32"++

    The message digest to verify.

    ---

    `signatures` ++"Structs.Signature[]"++

    An array of Guardian signatures.

    ---

    `guardianSet` ++"GuardianSet memory"++

    Guardian set to validate against.

??? interface "Returns"

    `isValid` ++"bool"++

    `true` if the required number of valid signatures is present.

### quorum

Returns the number of Guardian signatures required to reach quorum. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

```solidity
function quorum() public view returns (uint8)
```

??? interface "Returns"

    `quorum` ++"uint8"++

    Number of valid Guardian signatures required to reach consensus for VAA verification.

### chainId

Returns Wormhole chain ID used internally by the protocol. *(Defined in [Getters.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Getters.sol){target=\_blank})*

```solidity
function chainId() public view returns (uint16)
```

??? interface "Returns"

    `id` ++"uint16"++

    Wormhole-specific chain identifier. 

### evmChainId

Returns the EVM chain ID (i.e., value from `block.chainid`). *(Defined in [Getters.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Getters.sol){target=\_blank})*

```solidity
function evmChainId() public view returns (uint256)
```

??? interface "Returns"

    `id` ++"uint256"++

    Native EVM chain ID for the current network.

## Errors

### Invalid Fee

Reverts when the message fee (`msg.value`) sent is not equal to the required fee returned by `messageFee()`. *(Defined in [Implementation.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol){target=\_blank})*

### Unsupported

Reverts on any call to the fallback function. The contract does not support arbitrary calls. *(Defined in [Implementation.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol){target=\_blank})*

### The Wormhole Contract Does Not Accept Assets

Reverts when native tokens (ETH) are sent directly to the contract via the `receive()` function. *(Defined in [Implementation.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol){target=\_blank})*

### Already Initialized

Reverts when trying to call `initialize()` on an implementation that has already been initialized. *(Defined in [Implementation.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol){target=\_blank}, via `initializer` modifier)*

### Unknown Chain ID

Reverts inside the `initialize()` function if the chain ID stored by the contract does not match any known Wormhole chain. *(Defined in [Implementation.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol){target=\_blank})*

### Invalid Fork

Reverts when attempting to perform a governance action intended only for forked chains on a non-forked chain. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Invalid Module

Reverts if the VAA’s module field doesn’t match the expected "Core" module. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Invalid Chain

Reverts if the VAA’s target chain doesn’t match the chain on which this contract is deployed. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### New Guardian Set is Empty

Reverts when trying to register a new Guardian set that has no keys. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Index Must Increase in Steps of 1

Reverts when the new Guardian set index is not exactly one greater than the current. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Not a Fork

Reverts when trying to recover chain ID on a non-forked chain. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Invalid EVM Chain

Reverts if the recovered chain ID doesn't match the current `block.chainid`. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Governance Action Already Consumed

Reverts when the same governance VAA is submitted more than once. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Wrong Governance Contract

Reverts when the governance VAA’s emitter address doesn't match the expected governance contract address. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Wrong Governance Chain

Reverts when the governance VAA’s emitter chain doesn't match the expected governance chain (Solana). *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*

### Not Signed by Current Guardian Set

Reverts if the Guardian set index in the VAA doesn’t match the current Guardian set. *(Defined in [Governance.sol](https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Governance.sol){target=\_blank})*


---

Page Title: Core Contract (Solana)

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-messaging-reference-core-contract-solana.md
- Canonical (HTML): https://wormhole.com/docs/products/messaging/reference/core-contract-solana/
- Summary: Reference for the Wormhole Core program on Solana. Covers architecture, PDA accounts, and instructions for posting, verifying, and processing VAAs.
- Word Count: 2162; Token Estimate: 4527

# Core Contract (Solana)

The [Wormhole Core Program on Solana](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/lib.rs){target=\_blank} is a native Solana program responsible for posting, verifying, and relaying Wormhole messages (VAAs). It implements core messaging functionality, Guardian set updates, and upgradeability.

## Structure Overview

The Wormhole Core program on Solana is implemented using modular Rust files. Logic is separated across instruction dispatch, account definitions, core types, and signature verification.

```text
lib.rs
├── instructions.rs
├── accounts.rs
├── api.rs
│   ├── post_message
│   ├── verify_signatures
│   ├── post_vaa
│   ├── upgrade_contract
│   └── upgrade_guardian_set
├── types.rs
└── vaa.rs
```

**Key Components:**

 - **lib.rs**: Program entry point and instruction dispatcher. Registers all handlers and exposes the on-chain processor.
 - **instructions.rs**: Defines the `WormholeInstruction` enum and maps it to individual instruction handlers.
 - **accounts.rs**: Specifies the account constraints and validation logic for each instruction.
 - **api.rs**: Contains the main logic for processing instructions such as message posting, VAA verification, upgrades, and governance actions.
 - **types.rs**: Defines shared structs and enums used throughout the program, including configuration and `GuardianSet` formats.
 - **vaa.rs**: Implements VAA parsing, hashing, and signature-related logic used to verify Wormhole messages.
 - **error.rs** (not listed above): Defines custom error types used across the program for precise failure handling.
 - **wasm.rs** (not listed above): Provides WebAssembly bindings for testing and external tooling; not used on-chain.

## State Accounts

Below are on-chain PDAs used to store persistent state for the core contract. All are derived using deterministic seeds with the program ID.

 - **`bridge` ++"BridgeData"++**: Stores global config like the active Guardian set index, message fee, and Guardian set expiration time. (Derived at PDA seed `["Bridge"]`)
 - **`guardianSets` ++"GuardianSetData"++**: Mapping of Guardian sets by index. Each Guardian set includes public key hashes and creation/expiration times. (Derived at PDA seed `["GuardianSet", index]`)
 - **`sequences` ++"SequenceTracker"++**: Tracks the last sequence number used by each emitter, enforcing strict message ordering. (Derived at PDA seed `["Sequence", emitter]`)
 - **`postedVAAs` ++"PostedVAAData"++**: Stores verified and finalized VAAs, preventing replay. (Derived at PDA seed `["PostedVAA", hash]`)
 - **`claims` ++"ClaimData"++**: Tracks consumed governance VAAs to ensure replay protection. (Derived at PDA seed `["Claim", emitter, sequence]`)
 - **`feeCollector` ++"FeeCollector"++**: Holds lamports collected via message fees, and can be drained via governance. (Derived at PDA seed `["fee_collector"]`)

## Instructions

### initialize

Initializes the Wormhole Core contract on Solana with a Guardian set and fee configuration. This should be called only once at deployment time. *(Defined in [api/initialize.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/initialize.rs){target=\_blank})*

```rust
initialize(
    payer: Pubkey,
    fee: u64,
    guardian_set_expiration_time: u32,
    initial_guardians: &[[u8; 20]]
)
```

??? interface "Accounts"

    - **`Bridge`**: PDA to store global configuration.
    - **`GuardianSet`**: PDA for Guardian set at index 0.
    - **`FeeCollector`**: PDA to collect message posting fees.
    - **`Payer`**: Funds account creation.
    - **`Clock`, `Rent`, `SystemProgram`**: Solana system accounts.

??? interface "Parameters"

    `fee` ++"u64"++

    Fee in lamports required to post messages.

    ---

    `guardian_set_expiration_time` ++"u32"++

    Time in seconds after which the Guardian set expires.

    ---

    `initial_guardians` ++"[[u8; 20]]"++

    List of Guardian public key hashes (Ethereum-style addresses).

### post_message

Posts a Wormhole message to the Solana Core contract. *(Defined in [api/post_message.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/post_message.rs){target=\_blank})*

```rust
PostMessage {
    nonce: u32,
    payload: Vec<u8>,
    consistency_level: u8
}
```

??? interface "Accounts"

    - **`Bridge`**: PDA for global config.
    - **`Message`**: PDA where the posted message will be stored.
    - **`Emitter`**: The emitting account (must sign).
    - **`Sequence`**: PDA tracking the emitter’s message sequence.
    - **`Payer`**: Pays for account creation and fees.
    - **`FeeCollector`**: PDA that collects message fees.
    - **`Clock`, `Rent`, `SystemProgram`**: Solana system accounts.

??? interface "Parameters"

    `nonce` ++"u32"++

    Unique nonce to disambiguate messages with the same payload.

    ---

    `payload` ++"Vec<u8>"++

    The arbitrary message payload to be posted.

    ---

    `consistency_level` ++"u8"++

    Level of finality required before the message is processed.

    `1` = Confirmed, `32` = Finalized.

### post_message_unreliable

Posts a Wormhole message without requiring reliable delivery. Used for lightweight publishing when finality isn't critical. *(Defined in [api/post_message.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/post_message.rs){target=\_blank})*

```rust
PostMessageUnreliable {
    nonce: u32,
    payload: Vec<u8>,
    consistency_level: u8
}
```

??? interface "Accounts"

    - **`Bridge`**: PDA for global config.
    - **`Message`**: PDA where the posted message will be stored.
    - **`Emitter`**: The emitting account (must sign).
    - **`Sequence`**: PDA tracking the emitter’s message sequence.
    - **`Payer`**: Pays for account creation and fees.
    - **`FeeCollector`**: PDA that collects message fees.
    - **`Clock`, `Rent`, `SystemProgram`**: Solana system accounts.

??? interface "Parameters"

    `nonce` ++"u32"++

    Unique nonce to disambiguate messages with the same payload.

    ---

    `payload` ++"Vec<u8>"++

    The arbitrary message payload to be posted.

    ---

    `consistency_level` ++"u8"++

    Level of finality required before the message is processed. `1` = Confirmed, `32` = Finalized.

### verify_signatures

Verifies Guardian signatures over a VAA body hash. This is the first step in VAA processing and is required before posting the VAA. *(Defined in [api/verify_signature.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/verify_signature.rs){target=\_blank})*

```rust
VerifySignatures {
    signers: [i8; 19]
}
```

??? interface "Accounts"

    - **`Payer`**: Pays for account creation and fees.
    - **`GuardianSet`**: PDA holding the current Guardian set.
    - **`SignatureSet`**: PDA that will store the verified signature data.
    - **`InstructionsSysvar`**: Required to access prior instructions (e.g., secp256k1 sigverify).
    - **`Rent`, `SystemProgram`**: Solana system accounts.

??? interface "Parameters"

    `signers` ++"[i8; 19]"++

    A mapping from Guardian index to its position in the instruction payload (or -1 if not present).

    Used to correlate secp256k1 verify instructions with Guardian set entries.

### post_vaa

Finalizes a VAA after signature verification. This stores the message on-chain and marks it as consumed. *(Defined in [api/post_vaa.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/post_vaa.rs){target=\_blank})*

```rust
PostVAA {
    version: u8,
    guardian_set_index: u32,
    timestamp: u32,
    nonce: u32,
    emitter_chain: u16,
    emitter_address: [u8; 32],
    sequence: u64,
    consistency_level: u8,
    payload: Vec<u8>
}
```

??? interface "Accounts"

    - **`GuardianSet`**: PDA of the Guardian set used to verify the VAA.
    - **`Bridge`**: Global Wormhole state.
    - **`SignatureSet`**: Verified signature PDA (from verify_signatures).
    - **`PostedVAA`**: PDA where the VAA will be stored.
    - **`Payer`**: Funds the account creation.
    - **`Clock`, `Rent`, `SystemProgram`**: Solana system accounts.

??? interface "Parameters"

    `version` ++"u8"++

    VAA protocol version.

    ---

    `guardian_set_index` ++"u32"++

    Index of the Guardian Set that signed this VAA.

    ---

    `timestamp` ++"u32"++

    The time the emitter submitted the message.

    ---

    `nonce` ++"u32"++

    Unique identifier for the message.

    ---

    `emitter_chain` ++"u16"++

    ID of the chain where the message originated.

    ---

    `emitter_address` ++"[u8; 32]"++

    Address of the contract or account that emitted the message.

    ---

    `sequence` ++"u64"++

    Monotonically increasing sequence number for the emitter.

    ---

    `consistency_level` ++"u8"++

    Required confirmation level before the message is accepted.
    
    `1` = Confirmed, `32` = Finalized.

    ---

    `payload` ++"Vec<u8>"++

    Arbitrary data being transferred in the message.

### set_fees

Updates the message posting fee for the core bridge contract. *(Defined in [api/governance.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/governance.rs){target=\_blank})*

```rust
SetFees {}
```

This function is called via governance and requires a valid governance VAA. The VAA payload must contain the new fee value.

??? interface "Accounts"

    - **`Payer`**: Funds transaction execution.
    - **`Bridge`**: PDA storing global Wormhole state.
    - **`Message`**: The PostedVAA account containing the governance message.
    - **`Claim`**: PDA that ensures this governance message hasn't been processed already.
    - **`SystemProgram`**: Required by Solana for creating/initializing accounts.

### transfer_fees

Transfers the accumulated message posting fees from the contract to a specified recipient. *(Defined in [api/governance.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/governance.rs){target=\_blank})*

```rust
TransferFees {}
```

This function is triggered via a governance VAA and transfers the fee balance from the `FeeCollector` to the recipient address specified in the VAA payload.

??? interface "Accounts"

    - **`Payer`**: Funds transaction execution.
    - **`Bridge`**: PDA storing global Wormhole state.
    - **`Message`**: PostedVAA account containing the governance message.
    - **`FeeCollector`**: PDA holding the accumulated fees.
    - **`Recipient`**: The account that will receive the fees.
    - **`Claim`**: PDA that ensures this governance message hasn't been processed already.
    - **`Rent`, `SystemProgram`**: Standard Solana system accounts.

### upgrade_contract

Upgrades the deployed Wormhole program using a governance VAA. *(Defined in [api/governance.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/governance.rs){target=\_blank})*

```rust
UpgradeContract {}
```

This instruction allows authorized governance messages to trigger an upgrade of the on-chain Wormhole program logic to a new address.

??? interface "Accounts"

    - **`Payer`**: Funds transaction execution.
    - **`Bridge`**: PDA storing global Wormhole state.
    - **`Message`**: PostedVAA account containing the governance message.
    - **`Claim`**: PDA that ensures this governance message hasn't been processed already.
    - **`UpgradeAuthority`**: PDA with authority to perform the upgrade (seeded with "upgrade").
    - **`Spill`**: Account that receives remaining funds from the upgrade buffer.
    - **`NewContract`**: Account holding the new program data.
    - **`ProgramData`**: Metadata account for the upgradable program.
    - **`Program`**: Current program to be upgraded.
    - **`Rent`, `Clock`**: System accounts used during the upgrade process.
    - **`BPFLoaderUpgradeable`**: Solana system program for upgrades.
    - **`SystemProgram`**: Required by Solana for creating/initializing accounts.

### upgrade_guardian_set

Upgrades the current Guardian set using a governance VAA. *(Defined in [api/governance.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/api/governance.rs){target=\_blank})*

```rust
UpgradeGuardianSet {}
```

This instruction replaces the active Guardian set with a new one, allowing the Wormhole network to rotate its validator keys securely through governance.

??? interface "Accounts"

    - **`Payer`**: Funds transaction execution.
    - **`Bridge`**: PDA storing global Wormhole state.
    - **`Message`**: PostedVAA account containing the governance message.
    - **`Claim`**: PDA that ensures this governance message hasn't been processed already.
    - **`GuardianSetOld`**: Current (active) Guardian set PDA.
    - **`GuardianSetNew`**: PDA for the newly proposed Guardian set.
    - **`SystemProgram`**: Standard Solana system accounts.

## Errors

### GuardianSetMismatch

The Guardian set index does not match the expected value. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InstructionAtWrongIndex

The instruction was found at the wrong index. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InsufficientFees

Insufficient fees were provided to post the message. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidFeeRecipient

The recipient address does not match the one specified in the governance VAA. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidGovernanceAction

The action specified in the governance payload is invalid. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidGovernanceChain

The governance VAA was not emitted by a valid governance chain. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidGovernanceKey

The emitter address in the governance VAA is not the expected governance key. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidGovernanceModule

The module string in the governance VAA header is invalid. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidGovernanceWithdrawal

Fee withdrawal would cause the fee collector account to drop below rent-exempt balance. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidGuardianSetUpgrade

The Guardian set upgrade VAA is invalid (e.g., skipped index or mismatched current index). *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidHash

The hash computed from the VAA does not match the expected result. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidSecpInstruction

The SECP256k1 instruction used for signature verification is malformed. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### MathOverflow

An arithmetic overflow occurred during computation. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### PostVAAConsensusFailed

Not enough valid signatures were collected to achieve quorum. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### PostVAAGuardianSetExpired

The Guardian set used to verify the VAA has already expired. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### TooManyGuardians

The Guardian set exceeds the maximum allowed number of guardians. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### VAAAlreadyExecuted

The VAA has already been executed and cannot be processed again. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### VAAInvalid

The VAA is structurally invalid or fails to decode. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### InvalidPayloadLength

The payload length is incorrect or malformed. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*

### EmitterChanged

The emitter address changed unexpectedly. *(Defined in [error.rs](https://github.com/wormhole-foundation/wormhole/blob/main/solana/bridge/program/src/error.rs){target=\_blank})*


---

Page Title: Executor Addresses

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-messaging-reference-executor-addresses.md
- Canonical (HTML): https://wormhole.com/docs/products/messaging/reference/executor-addresses/
- Summary: Reference list of deployed Executor contract addresses across integrations, including CCTP, NTT, WTT, and referrer variants.
- Word Count: 2682; Token Estimate: 7713

# Executor Addresses

## Executor



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x84EEe8dBa37C36947397E1E11251cA9A06Fc6F8a</code></td></tr><tr><td>Solana</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0xcD2BffD0C0289e8C0cb89c458dB1B74f1892Fa6c</code></td></tr><tr><td>Aptos</td><td><code>0x11aa75c059e1a7855be66b931bf340a2e0973274ac16b5f519c02ceafaf08a18</code></td></tr><tr><td>Arbitrum</td><td><code>0x3980f8318fc03d79033Bbb421A622CDF8d2Eeab4</code></td></tr><tr><td>Avalanche</td><td><code>0x4661F0E629E4ba8D04Ee90080Aee079740B00381</code></td></tr><tr><td>Base</td><td><code>0x9E1936E91A4a5AE5A5F75fFc472D6cb8e93597ea</code></td></tr><tr><td>Berachain</td><td><code>0x0Dd7a5a32311b8D87A615Cc7f079B632D3d5e2D3</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xeC8cCCD058DbF28e5D002869Aa9aFa3992bf4ee0</code></td></tr><tr><td>Celo</td><td><code>0xe6Ea5087c6860B94Cf098a403506262D8F28cF05</code></td></tr><tr><td>CreditCoin</td><td><code>0xd2e420188f17607Aa6344ee19c3e76Cf86CA7BDe</code></td></tr><tr><td>Fogo</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0xd7717899cc4381033Bc200431286D0AC14265F78</code></td></tr><tr><td>Ink</td><td><code>0x3e44a5F45cbD400acBEF534F51e616043B211Ddd</code></td></tr><tr><td>Linea</td><td><code>0x23aF2B5296122544A9A7861da43405D5B15a9bD3</code></td></tr><tr><td>MegaETH</td><td><code>0xD405E0A1f3f9edc25Ea32d0B079d6118328b2EcB</code></td></tr><tr><td>Mezo</td><td><code>0x0f9b8E144Cc5C5e7C0073829Afd30F26A50c5606</code></td></tr><tr><td>Moca</td><td><code>0x7b8097af5459846c5A72fCc960D94F31C05915aD</code></td></tr><tr><td>Monad</td><td><code>0xC04dE634982cAdF2A677310b73630B7Ac56A3f65</code></td></tr><tr><td>Moonbeam</td><td><code>0x85D06449C78064c2E02d787e9DC71716786F8D19</code></td></tr><tr><td>Optimism</td><td><code>0x85B704501f6AE718205C0636260768C4e72ac3e7</code></td></tr><tr><td>Polygon</td><td><code>0x0B23efA164aB3eD08e9a39AC7aD930Ff4F5A5e81</code></td></tr><tr><td>Scroll</td><td><code>0xcFAdDE24640e395F5A71456A825D0D7C3741F075</code></td></tr><tr><td>SeiEVM</td><td><code>0x25f1c923fb7a5aefa5f0a2b419fc70f2368e66e5</code></td></tr><tr><td>Sonic</td><td><code>0x3Fdc36b4260Da38fBDba1125cCBD33DD0AC74812</code></td></tr><tr><td>Sui</td><td><code>0xdb0fe8bb1e2b5be628adbea0636063325073e1070ee11e4281457dfd7f158235</code></td></tr><tr><td>Unichain</td><td><code>0x764dD868eAdD27ce57BCB801E4ca4a193d231Aed</code></td></tr><tr><td>World Chain</td><td><code>0x8689b4E6226AdC8fa8FF80aCc3a60AcE31e8804B</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x8345E90Dcd92f5Cf2FAb0C8E2A56A5bc2c30d896</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xD0fb39f5a3361F21457653cB70F9D0C9bD86B66B</code></td></tr><tr><td>Solana</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x7C43825EeB76DF7aAf3e1D2e8f684d4876F0CC05</code></td></tr><tr><td>Aptos</td><td><code>0x139717c339f08af674be77143507a905aa28cbc67a0e53e7095c07b630d73815</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xBF161de6B819c8af8f2230Bcd99a9B3592f6F87b</code></td></tr><tr><td>Avalanche</td><td><code>0x4661F0E629E4ba8D04Ee90080Aee079740B00381</code></td></tr><tr><td>Base Sepolia</td><td><code>0x51B47D493CBA7aB97e3F8F163D6Ce07592CE4482</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xeC8cCCD058DbF28e5D002869Aa9aFa3992bf4ee0</code></td></tr><tr><td>Converge</td><td><code>0xAab9935349B9c08e0e970720F6D640d5B91C293E</code></td></tr><tr><td>Fogo</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>Linea</td><td><code>0x4f6c3a93a80DdC691312974DAAbf9B6e4Bb44111</code></td></tr><tr><td>Mezo</td><td><code>0x0f9b8E144Cc5C5e7C0073829Afd30F26A50c5606</code></td></tr><tr><td>Moca</td><td><code>0xc4a03f2c47caA4b961101bAD6338DEf37376F052</code></td></tr><tr><td>Monad Testnet</td><td><code>0xe37D3E162B4B1F17131E4e0e6122DbA31243382f</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x5856651eB82aeb6979B4954317194d48e1891b3c</code></td></tr><tr><td>Plume</td><td><code>0x8fc2FbA8F962fbE89a9B02f03557a011c335A455</code></td></tr><tr><td>Polygon Amoy</td><td><code>0x7056721C33De437f0997F67BC87521cA86b721d3</code></td></tr><tr><td>SeiEVM</td><td><code>0x25f1c923Fb7A5aEFA5F0A2b419fC70f2368e66e5</code></td></tr><tr><td>Sui</td><td><code>0x4000cfe2955d8355b3d3cf186f854fea9f787a457257056926fde1ec977670eb</code></td></tr><tr><td>Unichain</td><td><code>0x764dD868eAdD27ce57BCB801E4ca4a193d231Aed</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x4d9525D94D275dEB495b7C8840b154Ae04cfaC2A</code></td></tr></tbody></table>

## CCTP with Executor



=== "Mainnet v1"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x6DDE92942DbB24F7c9B75765b74a33446980C1e3</code></td></tr><tr><td>Solana</td><td><code>CXGRA5SCc8jxDbaQPZrmmZNu2JV34DP7gFW4m31uC1zs</code></td></tr><tr><td>Aptos</td><td><code>0xc89bf3746dfc70bb3f2de7c35a98f327a40b9d55a443743a5935c5e3de90b7ac</code></td></tr><tr><td>Arbitrum</td><td><code>0x772373214238F09a494828A5323574E3d7e27558</code></td></tr><tr><td>Avalanche</td><td><code>0x58aC806cd205083E7E048E196f36Ff6C4Ae17bE5</code></td></tr><tr><td>Base</td><td><code>0x4D1Cc8921e297155044C01761f581fa52a24C33d</code></td></tr><tr><td>Optimism</td><td><code>0x6826c075973a4393CEf0e131c4B16869426563a7</code></td></tr><tr><td>Polygon</td><td><code>0x7e6Ae241101B355447A4B471D0C6968b132eC4Ab</code></td></tr><tr><td>Sui</td><td><code>N/A*</code></td></tr><tr><td>Unichain</td><td><code>0xa997Ef229E4D2a1fEca249eB41fBf5D4b2217d6E</code></td></tr></tbody></table>

=== "Testnet v1"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x2fcc7b2332d924764f17f1cf5eda1cd4b36751a2</code></td></tr><tr><td>Solana</td><td><code>CXGRA5SCc8jxDbaQPZrmmZNu2JV34DP7gFW4m31uC1zs</code></td></tr><tr><td>Aptos</td><td><code>0x14a12d1fd6ef371b70c2113155534ec152ec7f779e281b54866c796c9a4a58d3</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x8158305d331594f3e8d18c33ca4e6d3cdc109b75</code></td></tr><tr><td>Avalanche</td><td><code>0x62819ab61cc7fcc864af7bcfc92e6c1965eb69a6</code></td></tr><tr><td>Base Sepolia</td><td><code>0x96846c31e4f87c0f186a322926c61d4183439f0a</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0xe17de8e29f1f0941b541b053829af74ac81c89a6</code></td></tr><tr><td>Polygon</td><td><code>0xdce63172e9ad15243c97acafd01cc4fdda98bead</code></td></tr><tr><td>Unichain Sepolia</td><td><code>0x2c1354296a11029056e0d7d7abbdd58743dbaf59</code></td></tr></tbody></table>

=== "Mainnet v2"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xDD68aBa3E04CB1a05082402B9325753314803005</code></td></tr><tr><td>Solana</td><td><code>Supported</code></td></tr><tr><td>Arbitrum</td><td><code>0x760feC4425B46E3D8FEf8E2CE49786e5a6f74446</code></td></tr><tr><td>Avalanche</td><td><code>0xE42aE9e352157fcEf74E971F2C5c74A5963a71D7</code></td></tr><tr><td>Base</td><td><code>0x52892976559fB2fc8b7f850440eD9AA5Dc26f7D9</code></td></tr><tr><td>Codex</td><td><code>0x0684286448140F75d4C3D2F2c02BF66f98CdEA51</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0x001319beBA062d918d7007E4D2D76a0A9cc439Db</code></td></tr><tr><td>Ink</td><td><code>0xef0B43b49315A4aDF11bA2617Be81a304c5D6ecc</code></td></tr><tr><td>Linea</td><td><code>0x257dBB6AD7C7AC19360bEe1A107ebE631D568776</code></td></tr><tr><td>Monad</td><td><code>0x1FdCCf65318b34CFd3F5903fFb747C17e76330ac</code></td></tr><tr><td>Optimism</td><td><code>0x9b51579e67D4ab18D79609105509ad37B2a0D342</code></td></tr><tr><td>Plume</td><td><code>0x9be9C6B420eAfaaC1162D680fd7E61446b38Cf29</code></td></tr><tr><td>Polygon</td><td><code>0x5116F1358ae2445f571AA702dA1feB5e13094E59</code></td></tr><tr><td>SeiEVM</td><td><code>0xe067C0D378C50CDc34bCd973F202736D5A19e5D2</code></td></tr><tr><td>Sonic</td><td><code>0x8A850b2077F1eFccA89eAa9c35b45C4dC9227cdb</code></td></tr><tr><td>Sui</td><td><code>N/A*</code></td></tr><tr><td>Unichain</td><td><code>0xaf7f4FbB6C220baf57ABC7babF81D47Fd628bdb4</code></td></tr><tr><td>World Chain</td><td><code>0xAA4841e5d9652593852403E3ce9e8003f8D579D0</code></td></tr></tbody></table>

=== "Testnet v2"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xc58475c97ebde9cf4fefa0d4fb2774df81905d43</code></td></tr><tr><td>Solana</td><td><code>Supported</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xf601f9988d62943cb842baae1e46be9b17d0b2a4</code></td></tr><tr><td>Avalanche</td><td><code>0x10018394905f70daa1d740040d64cbed5a82301e</code></td></tr><tr><td>Base Sepolia</td><td><code>0x1effdcfedc6d45e44b3133257debfb522adb1cae</code></td></tr><tr><td>Ink</td><td><code>0x63993ee08bda32ecb0ba5cdc751b404f5c5c0458</code></td></tr><tr><td>Linea Sepolia</td><td><code>0xe8Ad216e23fc9425E65aB315F0EC13737e75afEF</code></td></tr><tr><td>Monad Testnet</td><td><code>0x358bAd031d7A217ebA2d471cad5fD611AeC2aF17</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x49f386393c26439b74e62f5794062925dfb7c1db</code></td></tr><tr><td>Polygon</td><td><code>0x05da7c69db265b37b4d3530d476ec4b33bd9dd45</code></td></tr><tr><td>SeiEVM</td><td><code>0xDC735908C3eCF29f40D8CA5f6407F2d94d316a9F</code></td></tr><tr><td>Unichain Sepolia</td><td><code>0xf082af7668f000f60bc519b378f6363708fc302b</code></td></tr></tbody></table>

## NTT with Executor



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xD2D9c936165a85F27a5a7e07aFb974D022B89463</code><br>Multi Ntt: <code>0x03dB430D830601DB368991eE55DAa9A708df7912</code></td></tr><tr><td>Solana</td><td><code>nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR</code></td></tr><tr><td>0G</td><td><code>0xe175a8b838f3cdb2e1aaf4ff74c05cf2f3aea9a8</code></td></tr><tr><td>Arbitrum</td><td><code>0x0Af42A597b0C201D4dcf450DcD0c06d55ddC1C77</code></td></tr><tr><td>Avalanche</td><td><code>0x4e9Af03fbf1aa2b79A2D4babD3e22e09f18Bb8EE</code></td></tr><tr><td>Base</td><td><code>0x83216747fC21b86173D800E2960c0D5395de0F30</code></td></tr><tr><td>Berachain</td><td><code>0x0a2AF374Cc9CCCbB0Acc4E34B20b9d02a0f08c30</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x39B57Dd9908F8be02CfeE283b67eA1303Bc29fe1</code></td></tr><tr><td>Celo</td><td><code>0x3d69869fcB9e1CD1F4020b637fb8256030BAc8fC</code></td></tr><tr><td>CreditCoin</td><td><code>0x5454b995719626256C96fb57454b044ffb3Da2F9</code></td></tr><tr><td>Fogo</td><td><code>nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0x431017B1718b86898C7590fFcCC380DEf0456393</code></td></tr><tr><td>Ink</td><td><code>0x420370DC2ECC4D44b47514B7859fd11809BbeFF5</code></td></tr><tr><td>Linea</td><td><code>0xEAa5AddB5b8939Eb73F7faF46e193EefECaF13E9</code></td></tr><tr><td>MegaETH</td><td><code>0x3EFEc0c7Ee79135330DD03e995872f84b1AD49b6</code></td></tr><tr><td>Mezo</td><td><code>0x484b5593BbB90383f94FB299470F09427cf6cfE2</code></td></tr><tr><td>Moca</td><td><code>0xE612837749a0690BA2BCe490D6eFb5F8Fc347df3</code></td></tr><tr><td>Monad</td><td><code>0xc3F3dDa544815a440633176c7598f5B97500793e</code><br>Multi Ntt: <code>0xFEA937F7124E19124671f1685671d3f04a9Af4E4</code></td></tr><tr><td>Moonbeam</td><td><code>0x1365593C8bae71a55e48E105a2Bb76d5928c7DE3</code></td></tr><tr><td>Optimism</td><td><code>0x85C0129bE5226C9F0Cf4e419D2fefc1c3FCa25cF</code></td></tr><tr><td>Plume</td><td><code>0x6Eb53371f646788De6B4D0225a4Ed1d9267188AD</code></td></tr><tr><td>Polygon</td><td><code>0x6762157b73941e36cEd0AEf54614DdE545d0F990</code></td></tr><tr><td>Scroll</td><td><code>0x055625d48968f99409244E8c3e03FbE73B235a62</code></td></tr><tr><td>SeiEVM</td><td><code>0x3F2D6441C7a59Dfe80f8e14142F9E28F6D440445</code></td></tr><tr><td>Sonic</td><td><code>0xaCa00703bb87F31D6F9fCcc963548b48FA46DfeB</code></td></tr><tr><td>Sui</td><td><code>N/A*</code></td></tr><tr><td>Unichain</td><td><code>0x607723D6353Dae3ef62B7B277Cfabd0F4bc6CB4C</code></td></tr><tr><td>World Chain</td><td><code>0x66b1644400D51e104272337226De3EF1A820eC79</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x6bBd1ff3bB303F88835A714EE3241bF45DE26d29</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x54DD7080aE169DD923fE56d0C4f814a0a17B8f41</code></td></tr><tr><td>Solana</td><td><code>nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR</code></td></tr><tr><td>0G Galileo</td><td><code>0xA8CA118f4C8d44Ab651Dad52B5E1a212e5d5c55b</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xd048170F1ECB8D47E499D3459aC379DA023E2C1B</code></td></tr><tr><td>Avalanche</td><td><code>0x4e9Af03fbf1aa2b79A2D4babD3e22e09f18Bb8EE</code></td></tr><tr><td>Base Sepolia</td><td><code>0x5845E08d890E21687F7Ebf7CbAbD360cD91c6245</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x39B57Dd9908F8be02CfeE283b67eA1303Bc29fe1</code></td></tr><tr><td>Celo</td><td><code>0x3d69869fcB9e1CD1F4020b637fb8256030BAc8fC</code></td></tr><tr><td>Converge</td><td><code>0x3d8c26b67BDf630FBB44F09266aFA735F1129197</code></td></tr><tr><td>Fogo</td><td><code>nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR</code></td></tr><tr><td>Ink</td><td><code>0xF420BFFf922D11c2bBF587C9dF71b83651fAf8Bc</code></td></tr><tr><td>Linea Sepolia</td><td><code>0xaA469cb84C91D5a63bf4B370dE35f0831F2CE4FF</code></td></tr><tr><td>Mezo</td><td><code>0x484b5593BbB90383f94FB299470F09427cf6cfE2</code></td></tr><tr><td>Moca</td><td><code>0x47f26bF9253Eb398fBAf825D7565FE975D839a71</code></td></tr><tr><td>Monad Testnet</td><td><code>0xc8F014FE6a8521259D9ADDc2170bA9e59305D306</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0xaDB1C56D363FF5A75260c3bd27dd7C1fC8421EF5</code></td></tr><tr><td>Plume</td><td><code>0x6Eb53371f646788De6B4D0225a4Ed1d9267188AD</code></td></tr><tr><td>Polygon</td><td><code>0x2982B9566E912458fE711FB1Fd78158264596937</code></td></tr><tr><td>SeiEVM</td><td><code>0x3F2D6441C7a59Dfe80f8e14142F9E28F6D440445</code></td></tr><tr><td>Unichain Sepolia</td><td><code>0x607723D6353Dae3ef62B7B277Cfabd0F4bc6CB4C</code></td></tr><tr><td>XRPL EVM Testnet</td><td><code>0xcDD9d7C759b29680f7a516d0058de8293b2AC7b1</code></td></tr></tbody></table>

## WTT Executor



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xa8969F3f8D97b3Ed89D4e2EC19B6B0CfD504b212</code></td></tr><tr><td>Solana</td><td><code>tbr7Qje6qBzPwfM52csL5KFi8ps5c5vDyiVVBLYVdRf</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x3dBb4dCf25dBA8F0C2417E1c34e527De0E465ecc</code></td></tr><tr><td>Arbitrum</td><td><code>0x04C98824a64d75CD1E9Bc418088b4c9A99048153</code></td></tr><tr><td>Avalanche</td><td><code>0x8849F05675E034b54506caB84450c8C82694a786</code></td></tr><tr><td>Base</td><td><code>0xD8B736EF27Fc997b1d00F22FE37A58145D3BDA07</code></td></tr><tr><td>Berachain</td><td><code>0xFAeFa20CB3759AEd2310E25015F05d62D8567A3F</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x2513515340fF71DD5AF02fC1BdB9615704d91524</code></td></tr><tr><td>Celo</td><td><code>0xe478DEe705BEae591395B08934FA19F54df316BE</code></td></tr><tr><td>Fantom</td><td><code>0xcafd2f0a35a4459fa40c0517e17e6fa2939441ca</code></td></tr><tr><td>Fogo</td><td><code>tbr7Qje6qBzPwfM52csL5KFi8ps5c5vDyiVVBLYVdRf</code></td></tr><tr><td>Ink</td><td><code>0x4bFB47F4c8A904d2C24e73601D175FE3a38aAb5B</code></td></tr><tr><td>MegaETH</td><td><code>0x4eEC1c908aD6e778664Efb03386C429fE5710D77</code></td></tr><tr><td>Monad</td><td><code>0xf7E051f93948415952a2239582823028DacA948e</code></td></tr><tr><td>Moonbeam</td><td><code>0xF6b9616C63Fa48D07D82c93CE02B5d9111c51a3d</code></td></tr><tr><td>Optimism</td><td><code>0x37aC29617AE74c750a1e4d55990296BAF9b8De73</code></td></tr><tr><td>Polygon</td><td><code>0x1d98CA4221516B9ac4869F5CeA7E6bb9C41609D6</code></td></tr><tr><td>Scroll</td><td><code>0x05129e142e7d5A518D81f19Db342fBF5f7E26A18</code></td></tr><tr><td>SeiEVM</td><td><code>0x7C129bc8F6188d12c0d1BBDE247F134148B97618</code></td></tr><tr><td>Sui</td><td><code>0x9b68b36399a3cd87680878d72253b3e8fdf82edb8ed74f7ec440b8bddd51f85d</code></td></tr><tr><td>Unichain</td><td><code>0x9Bca817F67f01557aeD615130825A28F4C5f3b87</code></td></tr><tr><td>World Chain</td><td><code>0xc0565Bd29b34603C0383598E16843d95Ae9c4f65</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x37bCc9d175124F77Bfce68589d2a8090eF846B85</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xb0b2119067cF04fa959f654250BD49fE1BD6F53c</code></td></tr><tr><td>Solana</td><td><code>tbr7Qje6qBzPwfM52csL5KFi8ps5c5vDyiVVBLYVdRf</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x57188fC61ce92c8E941504562811660Ab883E895</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xaE8dc4a7438801Ec4edC0B035EcCCcF3807F4CC1</code></td></tr><tr><td>Avalanche</td><td><code>0x10Ce9a35883C44640e8B12fea4Cc1e77F77D8c52</code></td></tr><tr><td>Base Sepolia</td><td><code>0x523d25D33B975ad72283f73B1103354352dBCBb8</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x26e7e3869b781f360A108728EE8391Cee6051E17</code></td></tr><tr><td>Celo</td><td><code>0x9563a59c15842a6f322b10f69d1dd88b41f2e97b</code></td></tr><tr><td>Fantom</td><td><code>0x9563a59c15842a6f322b10f69d1dd88b41f2e97b</code></td></tr><tr><td>Fogo</td><td><code>tbr7Qje6qBzPwfM52csL5KFi8ps5c5vDyiVVBLYVdRf</code></td></tr><tr><td>Linea</td><td><code>0x1C5CC8522b5eE1e528159989A163167bC9264D07</code></td></tr><tr><td>Mezo</td><td><code>0x2002a44b1106DF83671Fb419A2079a75e2a34808</code></td></tr><tr><td>Moca</td><td><code>0x36b91D24BAba19Af3aD1b5D5E2493A571044f14F</code></td></tr><tr><td>Monad Testnet</td><td><code>0x03D9739c91a26d30f4B35f7e55B9FF995ef13dDb</code></td></tr><tr><td>Moonbeam</td><td><code>0x9563a59c15842a6f322b10f69d1dd88b41f2e97b</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0xD9AA4f8Ac271B3149b8C3d1D0f999Ef7cb9af9EC</code></td></tr><tr><td>Polygon Amoy</td><td><code>0xC5c0bF6A8419b3d47150B2a6146b7Ed598C9d736</code></td></tr><tr><td>SeiEVM</td><td><code>0x595712bA7e4882af338d60ae37058082a5d0331A</code></td></tr><tr><td>Sui</td><td><code>0xb4b86c12d4ee0a813d976fb452b7afb325a2b381d00ccb2e54c5342f5ef2e684</code></td></tr><tr><td>Unichain</td><td><code>0x74D37B2bcD2f8CaB6409c5a5f81C8cF5b4156963</code></td></tr><tr><td>XRPL-EVM</td><td><code>0xb00224c60fe6ab134c8544dc29350286545f8dcc</code></td></tr></tbody></table>

## WTT Executor with Referrer



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Arbitrum</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Avalanche</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Base</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Berachain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Celo</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Ink</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>MegaETH</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Monad</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Moonbeam</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Optimism</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Polygon</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Scroll</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>SeiEVM</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Unichain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>World Chain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x13a35c075D6Acc1Fb9BddFE5FE38e7672789e4db</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Avalanche</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Base Sepolia</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Linea</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Mezo</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Moca</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Monad Testnet</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Polygon Amoy</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>SeiEVM</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Unichain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x17CFAAf9e8a5ABb1eee758dB9040F945c9EAC907</code></td></tr></tbody></table>


---

Page Title: Executor Addresses

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-reference-executor-addresses.md
- Canonical (HTML): https://wormhole.com/docs/products/reference/executor-addresses/
- Summary: Reference list of deployed Executor contract addresses across integrations, including CCTP, NTT, WTT, and referrer variants.
- Word Count: 3178; Token Estimate: 9141

# Executor Addresses

## Executor



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x84EEe8dBa37C36947397E1E11251cA9A06Fc6F8a</code></td></tr><tr><td>Solana</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0xcD2BffD0C0289e8C0cb89c458dB1B74f1892Fa6c</code></td></tr><tr><td>Aptos</td><td><code>0x11aa75c059e1a7855be66b931bf340a2e0973274ac16b5f519c02ceafaf08a18</code></td></tr><tr><td>Arbitrum</td><td><code>0x3980f8318fc03d79033Bbb421A622CDF8d2Eeab4</code></td></tr><tr><td>Avalanche</td><td><code>0x4661F0E629E4ba8D04Ee90080Aee079740B00381</code></td></tr><tr><td>Base</td><td><code>0x9E1936E91A4a5AE5A5F75fFc472D6cb8e93597ea</code></td></tr><tr><td>Berachain</td><td><code>0x0Dd7a5a32311b8D87A615Cc7f079B632D3d5e2D3</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xeC8cCCD058DbF28e5D002869Aa9aFa3992bf4ee0</code></td></tr><tr><td>Celo</td><td><code>0xe6Ea5087c6860B94Cf098a403506262D8F28cF05</code></td></tr><tr><td>CreditCoin</td><td><code>0xd2e420188f17607Aa6344ee19c3e76Cf86CA7BDe</code></td></tr><tr><td>Fogo</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0xd7717899cc4381033Bc200431286D0AC14265F78</code></td></tr><tr><td>Ink</td><td><code>0x3e44a5F45cbD400acBEF534F51e616043B211Ddd</code></td></tr><tr><td>Linea</td><td><code>0x23aF2B5296122544A9A7861da43405D5B15a9bD3</code></td></tr><tr><td>MegaETH</td><td><code>0xD405E0A1f3f9edc25Ea32d0B079d6118328b2EcB</code></td></tr><tr><td>Mezo</td><td><code>0x0f9b8E144Cc5C5e7C0073829Afd30F26A50c5606</code></td></tr><tr><td>Moca</td><td><code>0x7b8097af5459846c5A72fCc960D94F31C05915aD</code></td></tr><tr><td>Monad</td><td><code>0xC04dE634982cAdF2A677310b73630B7Ac56A3f65</code></td></tr><tr><td>Moonbeam</td><td><code>0x85D06449C78064c2E02d787e9DC71716786F8D19</code></td></tr><tr><td>Optimism</td><td><code>0x85B704501f6AE718205C0636260768C4e72ac3e7</code></td></tr><tr><td>Polygon</td><td><code>0x0B23efA164aB3eD08e9a39AC7aD930Ff4F5A5e81</code></td></tr><tr><td>Scroll</td><td><code>0xcFAdDE24640e395F5A71456A825D0D7C3741F075</code></td></tr><tr><td>SeiEVM</td><td><code>0x25f1c923fb7a5aefa5f0a2b419fc70f2368e66e5</code></td></tr><tr><td>Sonic</td><td><code>0x3Fdc36b4260Da38fBDba1125cCBD33DD0AC74812</code></td></tr><tr><td>Sui</td><td><code>0xdb0fe8bb1e2b5be628adbea0636063325073e1070ee11e4281457dfd7f158235</code></td></tr><tr><td>Unichain</td><td><code>0x764dD868eAdD27ce57BCB801E4ca4a193d231Aed</code></td></tr><tr><td>World Chain</td><td><code>0x8689b4E6226AdC8fa8FF80aCc3a60AcE31e8804B</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x8345E90Dcd92f5Cf2FAb0C8E2A56A5bc2c30d896</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xD0fb39f5a3361F21457653cB70F9D0C9bD86B66B</code></td></tr><tr><td>Solana</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x7C43825EeB76DF7aAf3e1D2e8f684d4876F0CC05</code></td></tr><tr><td>Aptos</td><td><code>0x139717c339f08af674be77143507a905aa28cbc67a0e53e7095c07b630d73815</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xBF161de6B819c8af8f2230Bcd99a9B3592f6F87b</code></td></tr><tr><td>Avalanche</td><td><code>0x4661F0E629E4ba8D04Ee90080Aee079740B00381</code></td></tr><tr><td>Base Sepolia</td><td><code>0x51B47D493CBA7aB97e3F8F163D6Ce07592CE4482</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xeC8cCCD058DbF28e5D002869Aa9aFa3992bf4ee0</code></td></tr><tr><td>Converge</td><td><code>0xAab9935349B9c08e0e970720F6D640d5B91C293E</code></td></tr><tr><td>Fogo</td><td><code>execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV</code></td></tr><tr><td>Linea</td><td><code>0x4f6c3a93a80DdC691312974DAAbf9B6e4Bb44111</code></td></tr><tr><td>Mezo</td><td><code>0x0f9b8E144Cc5C5e7C0073829Afd30F26A50c5606</code></td></tr><tr><td>Moca</td><td><code>0xc4a03f2c47caA4b961101bAD6338DEf37376F052</code></td></tr><tr><td>Monad Testnet</td><td><code>0xe37D3E162B4B1F17131E4e0e6122DbA31243382f</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x5856651eB82aeb6979B4954317194d48e1891b3c</code></td></tr><tr><td>Plume</td><td><code>0x8fc2FbA8F962fbE89a9B02f03557a011c335A455</code></td></tr><tr><td>Polygon Amoy</td><td><code>0x7056721C33De437f0997F67BC87521cA86b721d3</code></td></tr><tr><td>SeiEVM</td><td><code>0x25f1c923Fb7A5aEFA5F0A2b419fC70f2368e66e5</code></td></tr><tr><td>Sui</td><td><code>0x4000cfe2955d8355b3d3cf186f854fea9f787a457257056926fde1ec977670eb</code></td></tr><tr><td>Unichain</td><td><code>0x764dD868eAdD27ce57BCB801E4ca4a193d231Aed</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x4d9525D94D275dEB495b7C8840b154Ae04cfaC2A</code></td></tr></tbody></table>

## CCTP With Executor



=== "Mainnet v1"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x6DDE92942DbB24F7c9B75765b74a33446980C1e3</code></td></tr><tr><td>Solana</td><td><code>CXGRA5SCc8jxDbaQPZrmmZNu2JV34DP7gFW4m31uC1zs</code></td></tr><tr><td>Aptos</td><td><code>0xc89bf3746dfc70bb3f2de7c35a98f327a40b9d55a443743a5935c5e3de90b7ac</code></td></tr><tr><td>Arbitrum</td><td><code>0x772373214238F09a494828A5323574E3d7e27558</code></td></tr><tr><td>Avalanche</td><td><code>0x58aC806cd205083E7E048E196f36Ff6C4Ae17bE5</code></td></tr><tr><td>Base</td><td><code>0x4D1Cc8921e297155044C01761f581fa52a24C33d</code></td></tr><tr><td>Optimism</td><td><code>0x6826c075973a4393CEf0e131c4B16869426563a7</code></td></tr><tr><td>Polygon</td><td><code>0x7e6Ae241101B355447A4B471D0C6968b132eC4Ab</code></td></tr><tr><td>Sui</td><td><code>N/A*</code></td></tr><tr><td>Unichain</td><td><code>0xa997Ef229E4D2a1fEca249eB41fBf5D4b2217d6E</code></td></tr></tbody></table>

=== "Testnet v1"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x2fcc7b2332d924764f17f1cf5eda1cd4b36751a2</code></td></tr><tr><td>Solana</td><td><code>CXGRA5SCc8jxDbaQPZrmmZNu2JV34DP7gFW4m31uC1zs</code></td></tr><tr><td>Aptos</td><td><code>0x14a12d1fd6ef371b70c2113155534ec152ec7f779e281b54866c796c9a4a58d3</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x8158305d331594f3e8d18c33ca4e6d3cdc109b75</code></td></tr><tr><td>Avalanche</td><td><code>0x62819ab61cc7fcc864af7bcfc92e6c1965eb69a6</code></td></tr><tr><td>Base Sepolia</td><td><code>0x96846c31e4f87c0f186a322926c61d4183439f0a</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0xe17de8e29f1f0941b541b053829af74ac81c89a6</code></td></tr><tr><td>Polygon</td><td><code>0xdce63172e9ad15243c97acafd01cc4fdda98bead</code></td></tr><tr><td>Unichain Sepolia</td><td><code>0x2c1354296a11029056e0d7d7abbdd58743dbaf59</code></td></tr></tbody></table>

=== "Mainnet v2"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xDD68aBa3E04CB1a05082402B9325753314803005</code></td></tr><tr><td>Solana</td><td><code>Supported</code></td></tr><tr><td>Arbitrum</td><td><code>0x760feC4425B46E3D8FEf8E2CE49786e5a6f74446</code></td></tr><tr><td>Avalanche</td><td><code>0xE42aE9e352157fcEf74E971F2C5c74A5963a71D7</code></td></tr><tr><td>Base</td><td><code>0x52892976559fB2fc8b7f850440eD9AA5Dc26f7D9</code></td></tr><tr><td>Codex</td><td><code>0x0684286448140F75d4C3D2F2c02BF66f98CdEA51</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0x001319beBA062d918d7007E4D2D76a0A9cc439Db</code></td></tr><tr><td>Ink</td><td><code>0xef0B43b49315A4aDF11bA2617Be81a304c5D6ecc</code></td></tr><tr><td>Linea</td><td><code>0x257dBB6AD7C7AC19360bEe1A107ebE631D568776</code></td></tr><tr><td>Monad</td><td><code>0x1FdCCf65318b34CFd3F5903fFb747C17e76330ac</code></td></tr><tr><td>Optimism</td><td><code>0x9b51579e67D4ab18D79609105509ad37B2a0D342</code></td></tr><tr><td>Plume</td><td><code>0x9be9C6B420eAfaaC1162D680fd7E61446b38Cf29</code></td></tr><tr><td>Polygon</td><td><code>0x5116F1358ae2445f571AA702dA1feB5e13094E59</code></td></tr><tr><td>SeiEVM</td><td><code>0xe067C0D378C50CDc34bCd973F202736D5A19e5D2</code></td></tr><tr><td>Sonic</td><td><code>0x8A850b2077F1eFccA89eAa9c35b45C4dC9227cdb</code></td></tr><tr><td>Sui</td><td><code>N/A*</code></td></tr><tr><td>Unichain</td><td><code>0xaf7f4FbB6C220baf57ABC7babF81D47Fd628bdb4</code></td></tr><tr><td>World Chain</td><td><code>0xAA4841e5d9652593852403E3ce9e8003f8D579D0</code></td></tr></tbody></table>

=== "Testnet v2"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xc58475c97ebde9cf4fefa0d4fb2774df81905d43</code></td></tr><tr><td>Solana</td><td><code>Supported</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xf601f9988d62943cb842baae1e46be9b17d0b2a4</code></td></tr><tr><td>Avalanche</td><td><code>0x10018394905f70daa1d740040d64cbed5a82301e</code></td></tr><tr><td>Base Sepolia</td><td><code>0x1effdcfedc6d45e44b3133257debfb522adb1cae</code></td></tr><tr><td>Ink</td><td><code>0x63993ee08bda32ecb0ba5cdc751b404f5c5c0458</code></td></tr><tr><td>Linea Sepolia</td><td><code>0xe8Ad216e23fc9425E65aB315F0EC13737e75afEF</code></td></tr><tr><td>Monad Testnet</td><td><code>0x358bAd031d7A217ebA2d471cad5fD611AeC2aF17</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x49f386393c26439b74e62f5794062925dfb7c1db</code></td></tr><tr><td>Polygon</td><td><code>0x05da7c69db265b37b4d3530d476ec4b33bd9dd45</code></td></tr><tr><td>SeiEVM</td><td><code>0xDC735908C3eCF29f40D8CA5f6407F2d94d316a9F</code></td></tr><tr><td>Unichain Sepolia</td><td><code>0xf082af7668f000f60bc519b378f6363708fc302b</code></td></tr></tbody></table>

## NTT With Executor



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xD2D9c936165a85F27a5a7e07aFb974D022B89463</code><br>Multi Ntt: <code>0x03dB430D830601DB368991eE55DAa9A708df7912</code></td></tr><tr><td>Solana</td><td><code>nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR</code></td></tr><tr><td>0G</td><td><code>0xe175a8b838f3cdb2e1aaf4ff74c05cf2f3aea9a8</code></td></tr><tr><td>Arbitrum</td><td><code>0x0Af42A597b0C201D4dcf450DcD0c06d55ddC1C77</code></td></tr><tr><td>Avalanche</td><td><code>0x4e9Af03fbf1aa2b79A2D4babD3e22e09f18Bb8EE</code></td></tr><tr><td>Base</td><td><code>0x83216747fC21b86173D800E2960c0D5395de0F30</code></td></tr><tr><td>Berachain</td><td><code>0x0a2AF374Cc9CCCbB0Acc4E34B20b9d02a0f08c30</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x39B57Dd9908F8be02CfeE283b67eA1303Bc29fe1</code></td></tr><tr><td>Celo</td><td><code>0x3d69869fcB9e1CD1F4020b637fb8256030BAc8fC</code></td></tr><tr><td>CreditCoin</td><td><code>0x5454b995719626256C96fb57454b044ffb3Da2F9</code></td></tr><tr><td>Fogo</td><td><code>nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR</code></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td><code>0x431017B1718b86898C7590fFcCC380DEf0456393</code></td></tr><tr><td>Ink</td><td><code>0x420370DC2ECC4D44b47514B7859fd11809BbeFF5</code></td></tr><tr><td>Linea</td><td><code>0xEAa5AddB5b8939Eb73F7faF46e193EefECaF13E9</code></td></tr><tr><td>MegaETH</td><td><code>0x3EFEc0c7Ee79135330DD03e995872f84b1AD49b6</code></td></tr><tr><td>Mezo</td><td><code>0x484b5593BbB90383f94FB299470F09427cf6cfE2</code></td></tr><tr><td>Moca</td><td><code>0xE612837749a0690BA2BCe490D6eFb5F8Fc347df3</code></td></tr><tr><td>Monad</td><td><code>0xc3F3dDa544815a440633176c7598f5B97500793e</code><br>Multi Ntt: <code>0xFEA937F7124E19124671f1685671d3f04a9Af4E4</code></td></tr><tr><td>Moonbeam</td><td><code>0x1365593C8bae71a55e48E105a2Bb76d5928c7DE3</code></td></tr><tr><td>Optimism</td><td><code>0x85C0129bE5226C9F0Cf4e419D2fefc1c3FCa25cF</code></td></tr><tr><td>Plume</td><td><code>0x6Eb53371f646788De6B4D0225a4Ed1d9267188AD</code></td></tr><tr><td>Polygon</td><td><code>0x6762157b73941e36cEd0AEf54614DdE545d0F990</code></td></tr><tr><td>Scroll</td><td><code>0x055625d48968f99409244E8c3e03FbE73B235a62</code></td></tr><tr><td>SeiEVM</td><td><code>0x3F2D6441C7a59Dfe80f8e14142F9E28F6D440445</code></td></tr><tr><td>Sonic</td><td><code>0xaCa00703bb87F31D6F9fCcc963548b48FA46DfeB</code></td></tr><tr><td>Sui</td><td><code>N/A*</code></td></tr><tr><td>Unichain</td><td><code>0x607723D6353Dae3ef62B7B277Cfabd0F4bc6CB4C</code></td></tr><tr><td>World Chain</td><td><code>0x66b1644400D51e104272337226De3EF1A820eC79</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x6bBd1ff3bB303F88835A714EE3241bF45DE26d29</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x54DD7080aE169DD923fE56d0C4f814a0a17B8f41</code></td></tr><tr><td>Solana</td><td><code>nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR</code></td></tr><tr><td>0G Galileo</td><td><code>0xA8CA118f4C8d44Ab651Dad52B5E1a212e5d5c55b</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xd048170F1ECB8D47E499D3459aC379DA023E2C1B</code></td></tr><tr><td>Avalanche</td><td><code>0x4e9Af03fbf1aa2b79A2D4babD3e22e09f18Bb8EE</code></td></tr><tr><td>Base Sepolia</td><td><code>0x5845E08d890E21687F7Ebf7CbAbD360cD91c6245</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x39B57Dd9908F8be02CfeE283b67eA1303Bc29fe1</code></td></tr><tr><td>Celo</td><td><code>0x3d69869fcB9e1CD1F4020b637fb8256030BAc8fC</code></td></tr><tr><td>Converge</td><td><code>0x3d8c26b67BDf630FBB44F09266aFA735F1129197</code></td></tr><tr><td>Fogo</td><td><code>nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR</code></td></tr><tr><td>Ink</td><td><code>0xF420BFFf922D11c2bBF587C9dF71b83651fAf8Bc</code></td></tr><tr><td>Linea Sepolia</td><td><code>0xaA469cb84C91D5a63bf4B370dE35f0831F2CE4FF</code></td></tr><tr><td>Mezo</td><td><code>0x484b5593BbB90383f94FB299470F09427cf6cfE2</code></td></tr><tr><td>Moca</td><td><code>0x47f26bF9253Eb398fBAf825D7565FE975D839a71</code></td></tr><tr><td>Monad Testnet</td><td><code>0xc8F014FE6a8521259D9ADDc2170bA9e59305D306</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0xaDB1C56D363FF5A75260c3bd27dd7C1fC8421EF5</code></td></tr><tr><td>Plume</td><td><code>0x6Eb53371f646788De6B4D0225a4Ed1d9267188AD</code></td></tr><tr><td>Polygon</td><td><code>0x2982B9566E912458fE711FB1Fd78158264596937</code></td></tr><tr><td>SeiEVM</td><td><code>0x3F2D6441C7a59Dfe80f8e14142F9E28F6D440445</code></td></tr><tr><td>Unichain Sepolia</td><td><code>0x607723D6353Dae3ef62B7B277Cfabd0F4bc6CB4C</code></td></tr><tr><td>XRPL EVM Testnet</td><td><code>0xcDD9d7C759b29680f7a516d0058de8293b2AC7b1</code></td></tr></tbody></table>

## WTT Executor



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xa8969F3f8D97b3Ed89D4e2EC19B6B0CfD504b212</code></td></tr><tr><td>Solana</td><td><code>tbr7Qje6qBzPwfM52csL5KFi8ps5c5vDyiVVBLYVdRf</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x3dBb4dCf25dBA8F0C2417E1c34e527De0E465ecc</code></td></tr><tr><td>Arbitrum</td><td><code>0x04C98824a64d75CD1E9Bc418088b4c9A99048153</code></td></tr><tr><td>Avalanche</td><td><code>0x8849F05675E034b54506caB84450c8C82694a786</code></td></tr><tr><td>Base</td><td><code>0xD8B736EF27Fc997b1d00F22FE37A58145D3BDA07</code></td></tr><tr><td>Berachain</td><td><code>0xFAeFa20CB3759AEd2310E25015F05d62D8567A3F</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x2513515340fF71DD5AF02fC1BdB9615704d91524</code></td></tr><tr><td>Celo</td><td><code>0xe478DEe705BEae591395B08934FA19F54df316BE</code></td></tr><tr><td>Fantom</td><td><code>0xcafd2f0a35a4459fa40c0517e17e6fa2939441ca</code></td></tr><tr><td>Fogo</td><td><code>tbr7Qje6qBzPwfM52csL5KFi8ps5c5vDyiVVBLYVdRf</code></td></tr><tr><td>Ink</td><td><code>0x4bFB47F4c8A904d2C24e73601D175FE3a38aAb5B</code></td></tr><tr><td>MegaETH</td><td><code>0x4eEC1c908aD6e778664Efb03386C429fE5710D77</code></td></tr><tr><td>Monad</td><td><code>0xf7E051f93948415952a2239582823028DacA948e</code></td></tr><tr><td>Moonbeam</td><td><code>0xF6b9616C63Fa48D07D82c93CE02B5d9111c51a3d</code></td></tr><tr><td>Optimism</td><td><code>0x37aC29617AE74c750a1e4d55990296BAF9b8De73</code></td></tr><tr><td>Polygon</td><td><code>0x1d98CA4221516B9ac4869F5CeA7E6bb9C41609D6</code></td></tr><tr><td>Scroll</td><td><code>0x05129e142e7d5A518D81f19Db342fBF5f7E26A18</code></td></tr><tr><td>SeiEVM</td><td><code>0x7C129bc8F6188d12c0d1BBDE247F134148B97618</code></td></tr><tr><td>Sui</td><td><code>0x9b68b36399a3cd87680878d72253b3e8fdf82edb8ed74f7ec440b8bddd51f85d</code></td></tr><tr><td>Unichain</td><td><code>0x9Bca817F67f01557aeD615130825A28F4C5f3b87</code></td></tr><tr><td>World Chain</td><td><code>0xc0565Bd29b34603C0383598E16843d95Ae9c4f65</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x37bCc9d175124F77Bfce68589d2a8090eF846B85</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xb0b2119067cF04fa959f654250BD49fE1BD6F53c</code></td></tr><tr><td>Solana</td><td><code>tbr7Qje6qBzPwfM52csL5KFi8ps5c5vDyiVVBLYVdRf</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x57188fC61ce92c8E941504562811660Ab883E895</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0xaE8dc4a7438801Ec4edC0B035EcCCcF3807F4CC1</code></td></tr><tr><td>Avalanche</td><td><code>0x10Ce9a35883C44640e8B12fea4Cc1e77F77D8c52</code></td></tr><tr><td>Base Sepolia</td><td><code>0x523d25D33B975ad72283f73B1103354352dBCBb8</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x26e7e3869b781f360A108728EE8391Cee6051E17</code></td></tr><tr><td>Celo</td><td><code>0x9563a59c15842a6f322b10f69d1dd88b41f2e97b</code></td></tr><tr><td>Fantom</td><td><code>0x9563a59c15842a6f322b10f69d1dd88b41f2e97b</code></td></tr><tr><td>Fogo</td><td><code>tbr7Qje6qBzPwfM52csL5KFi8ps5c5vDyiVVBLYVdRf</code></td></tr><tr><td>Linea</td><td><code>0x1C5CC8522b5eE1e528159989A163167bC9264D07</code></td></tr><tr><td>Mezo</td><td><code>0x2002a44b1106DF83671Fb419A2079a75e2a34808</code></td></tr><tr><td>Moca</td><td><code>0x36b91D24BAba19Af3aD1b5D5E2493A571044f14F</code></td></tr><tr><td>Monad Testnet</td><td><code>0x03D9739c91a26d30f4B35f7e55B9FF995ef13dDb</code></td></tr><tr><td>Moonbeam</td><td><code>0x9563a59c15842a6f322b10f69d1dd88b41f2e97b</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0xD9AA4f8Ac271B3149b8C3d1D0f999Ef7cb9af9EC</code></td></tr><tr><td>Polygon Amoy</td><td><code>0xC5c0bF6A8419b3d47150B2a6146b7Ed598C9d736</code></td></tr><tr><td>SeiEVM</td><td><code>0x595712bA7e4882af338d60ae37058082a5d0331A</code></td></tr><tr><td>Sui</td><td><code>0xb4b86c12d4ee0a813d976fb452b7afb325a2b381d00ccb2e54c5342f5ef2e684</code></td></tr><tr><td>Unichain</td><td><code>0x74D37B2bcD2f8CaB6409c5a5f81C8cF5b4156963</code></td></tr><tr><td>XRPL-EVM</td><td><code>0xb00224c60fe6ab134c8544dc29350286545f8dcc</code></td></tr></tbody></table>

## WTT Executor With Referrer



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Arbitrum</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Avalanche</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Base</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Berachain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Celo</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Ink</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>MegaETH</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Monad</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Moonbeam</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Optimism</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Polygon</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Scroll</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>SeiEVM</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Unichain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>World Chain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x13a35c075D6Acc1Fb9BddFE5FE38e7672789e4db</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>0G (Zero Gravity)</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Avalanche</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Base Sepolia</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Linea</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Mezo</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Moca</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Monad Testnet</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Polygon Amoy</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>SeiEVM</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>Unichain</td><td><code>0x412f30e9f8B4a1e99eaE90209A6b00f5C3cc8739</code></td></tr><tr><td>XRPL-EVM</td><td><code>0x17CFAAf9e8a5ABb1eee758dB9040F945c9EAC907</code></td></tr></tbody></table>

## On-Chain Quoter

!!! note
    Wormhole Labs’ Quoter uses the following public keys:

    - **Mainnet**: `0xa54008017941EcE968623a0Dd8Ee907E2b133596`.
    - **Testnet**: `0x5241c9276698439fef2780dbab76fec90b633fbd`.
### Wormhole Labs Quoter Implementation



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Arbitrum</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Avalanche</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Base</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Ink</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Monad</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Optimism</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Plume</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Polygon</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr><tr><td>Sei</td><td><code>0xA25862D222Eb8343505c12d96e097e4332468D60</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Solana</td><td><code>qtrxiqVAfVS61utwZLUi7UKugjCgFaNxBGyskmGingz</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Avalanche</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Base Sepolia</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Polygon Amoy</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr><tr><td>Sei</td><td><code>0x5a6c5A46082D029FDD7c5cF8265047E0c4BB2089</code></td></tr></tbody></table>

### Quoter Router



=== "Mainnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum</td><td><code>0xF22F1c0A3a8Cb42F695601731974784C499C4EF3</code></td></tr><tr><td>Arbitrum</td><td><code>0x32eec14c963c23176bd8951f192292006756bDcC</code></td></tr><tr><td>Avalanche</td><td><code>0xA3a2A615774d34c6a4dF443C488B084eacaBd2D0</code></td></tr><tr><td>Base</td><td><code>0x265fd0500a430d65d6D79Cd8707F24C048604658</code></td></tr><tr><td>BNB Smart Chain</td><td><code>0xc921F293c27F332D47283174b11C872295624Edb</code></td></tr><tr><td>Ink</td><td><code>0xdEC050E66BEb2f0d5507761A0fE4867839bd88D2</code></td></tr><tr><td>Monad</td><td><code>0x3d9282A8e9a3cdd9b25AE969eff4705a1Fe75F34</code></td></tr><tr><td>Optimism</td><td><code>0xa3B6551cCbB5Fe1dc33b71EE3590B1Df22ae75B3</code></td></tr><tr><td>Plume</td><td><code>0x85BA1B2A2195be51Ab715be458B32B120532d230</code></td></tr><tr><td>Polygon</td><td><code>0x2a856931603930B827B1A4352FB4D66fA029F123</code></td></tr><tr><td>Sei</td><td><code>0x1D6FeA87671F7c5E184F4c59c3BdcEc5CFC3eC1c</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><th>Chain Name</th><th>Contract Address</th></thead><tbody><tr><td>Ethereum Sepolia</td><td><code>0xc0C35D7bfBc4175e0991Ae294f561b433eA4158f</code></td></tr><tr><td>Solana</td><td><code>qtrrrV7W3E1jnX1145wXR6ZpthG19ur5xHC1n6PPhDV</code></td></tr><tr><td>Arbitrum Sepolia</td><td><code>0x5E8c14F436c9ed2ff2E8B042B0542136bf108C6f</code></td></tr><tr><td>Avalanche</td><td><code>0xA3a2A615774d34c6a4dF443C488B084eacaBd2D0</code></td></tr><tr><td>Base Sepolia</td><td><code>0x2507d6899C3D4b93BF46b555d0cB401f44065772</code></td></tr><tr><td>Optimism Sepolia</td><td><code>0x6a829dF7C91f35f9aD72Cd5d05550b95BbC9fd2F</code></td></tr><tr><td>Polygon Amoy</td><td><code>0xE00444636DA924FBAe94471d73D56b5E03cA781c</code></td></tr><tr><td>Sei</td><td><code>0x1D6FeA87671F7c5E184F4c59c3BdcEc5CFC3eC1c</code></td></tr></tbody></table>


---

Page Title: Supported Networks

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-reference-supported-networks.md
- Canonical (HTML): https://wormhole.com/docs/products/reference/supported-networks/
- Summary: Learn about the networks each Wormhole product supports, and explore links to documentation, official websites, and block explorers.
- Word Count: 10869; Token Estimate: 29569

# Supported Networks

Wormhole supports many blockchains across mainnet, testnet, and devnets. You can use these tables to verify if your desired chains are supported by the Wormhole products you plan to include in your integration. 

## Supported Networks by Product

### Connect



<div class="full-width" markdown>

<table data-full-width="true" markdown><thead><th>Blockchain</th><th>Environment</th><th>Mainnet</th><th>Testnet</th><th>Devnet</th><th>Quick Links</th></thead><tbody><tr><td>Ethereum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://ethereum.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://ethereum.org/developers/docs/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Solana</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://solana.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://solana.com/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.solana.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Aptos</td><td>Move VM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://aptosnetwork.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://aptos.dev/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.aptoslabs.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Arbitrum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://arbitrum.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.arbitrum.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://arbiscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Avalanche</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.avax.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://build.avax.network/docs/primary-network" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://snowtrace.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Base</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://base.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.base.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://basescan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Berachain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.berachain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.berachain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://berascan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>BNB Smart Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.bnbchain.org/en/bnb-smart-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.bnbchain.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://bscscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Celo</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://celo.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.celo.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://celo.blockscout.com/" target="_blank">Block Explorer</a></td></tr><tr><td>CreditCoin</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://creditcoin.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.creditcoin.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://creditcoin.subscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Fantom</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://fantom.foundation/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.fantom.foundation/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.fantom.network/" target="_blank">Block Explorer</a></td></tr><tr><td>Fogo</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.fogo.io/" target="_blank">Website</a><br>:octicons-package-16: <a href="https://fogoscan.com/?cluster=testnet" target="_blank">Block Explorer</a></td></tr><tr><td>HyperCore</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore" target="_blank">Website</a><br>:material-file-document: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore" target="_blank">Developer Docs</a><br></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://hyperfoundation.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs" target="_blank">Developer Docs</a><br></td></tr><tr><td>Ink</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://inkonchain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.inkonchain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer-sepolia.inkonchain.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Kaia</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.kaia.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.kaia.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://kaiascan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Linea</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://linea.build/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.linea.build/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.linea.build/get-started/build/block-explorers" target="_blank">Block Explorer</a></td></tr><tr><td>Mantle</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.mantle.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.mantle.xyz/network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://mantlescan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>MegaETH</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.megaeth.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.megaeth.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://mega.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Mezo</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://mezo.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://mezo.org/docs/developers/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.test.mezo.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Moca</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://mocachain.org/en" target="_blank">Website</a><br>:material-file-document: <a href="https://mocacoin.gitbook.io/litepaper" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://devnet-scan.mocachain.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Monad</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.monad.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.monad.xyz/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://testnet.monvision.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Moonbeam</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://moonbeam.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.moonbeam.network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://moonscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Optimism</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.optimism.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.optimism.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://optimistic.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Plume</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://plume.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.plume.org/plume" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.plume.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Polygon</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://polygon.technology/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.polygon.technology/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://polygonscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Scroll</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://scroll.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.scroll.io/en/home/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://scrollscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>SeiEVM</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.sei.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sei.io/evm" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://seistream.app/" target="_blank">Block Explorer</a></td></tr><tr><td>Sonic</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.soniclabs.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.soniclabs.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sonicscan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Sui</td><td>Sui Move VM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.sui.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sui.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://suiscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>Unichain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.unichain.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.unichain.org/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sepolia.uniscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>World Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://world.org/world-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.world.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.world.org/world-chain/providers/explorers" target="_blank">Block Explorer</a></td></tr><tr><td>X Layer</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://web3.okx.com/xlayer" target="_blank">Website</a><br>:material-file-document: <a href="https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/about-xlayer" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://web3.okx.com/explorer/x-layer" target="_blank">Block Explorer</a></td></tr><tr><td>XRPL-EVM</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.xrplevm.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.xrplevm.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.xrplevm.org/" target="_blank">Block Explorer</a></td></tr></tbody></table>

</div>

### NTT



<div class="full-width" markdown>

<table data-full-width="true" markdown><thead><th>Blockchain</th><th>Environment</th><th>Mainnet</th><th>Testnet</th><th>Devnet</th><th>Quick Links</th></thead><tbody><tr><td>Ethereum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://ethereum.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://ethereum.org/developers/docs/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Solana</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://solana.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://solana.com/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.solana.com/" target="_blank">Block Explorer</a></td></tr><tr><td>0G (Zero Gravity)</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://0g.ai/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.0g.ai/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://chainscan.0g.ai" target="_blank">Block Explorer</a></td></tr><tr><td>Arbitrum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://arbitrum.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.arbitrum.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://arbiscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Avalanche</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.avax.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://build.avax.network/docs/primary-network" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://snowtrace.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Base</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://base.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.base.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://basescan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Berachain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.berachain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.berachain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://berascan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>BNB Smart Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.bnbchain.org/en/bnb-smart-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.bnbchain.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://bscscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Celo</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://celo.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.celo.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://celo.blockscout.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Converge</td><td>EVM</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.convergeonchain.xyz/" target="_blank">Website</a><br></td></tr><tr><td>CreditCoin</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://creditcoin.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.creditcoin.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://creditcoin.subscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Fantom</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://fantom.foundation/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.fantom.foundation/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.fantom.network/" target="_blank">Block Explorer</a></td></tr><tr><td>Fogo</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.fogo.io/" target="_blank">Website</a><br>:octicons-package-16: <a href="https://fogoscan.com/?cluster=testnet" target="_blank">Block Explorer</a></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://hyperfoundation.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs" target="_blank">Developer Docs</a><br></td></tr><tr><td>Ink</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://inkonchain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.inkonchain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer-sepolia.inkonchain.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Kaia</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.kaia.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.kaia.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://kaiascan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Linea</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://linea.build/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.linea.build/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.linea.build/get-started/build/block-explorers" target="_blank">Block Explorer</a></td></tr><tr><td>Mantle</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.mantle.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.mantle.xyz/network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://mantlescan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>MegaETH</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.megaeth.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.megaeth.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://mega.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Mezo</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://mezo.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://mezo.org/docs/developers/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.test.mezo.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Moca</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://mocachain.org/en" target="_blank">Website</a><br>:material-file-document: <a href="https://mocacoin.gitbook.io/litepaper" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://devnet-scan.mocachain.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Monad</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.monad.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.monad.xyz/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://testnet.monvision.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Moonbeam</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://moonbeam.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.moonbeam.network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://moonscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Optimism</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.optimism.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.optimism.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://optimistic.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Plume</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://plume.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.plume.org/plume" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.plume.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Polygon</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://polygon.technology/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.polygon.technology/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://polygonscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Scroll</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://scroll.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.scroll.io/en/home/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://scrollscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>SeiEVM</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.sei.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sei.io/evm" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://seistream.app/" target="_blank">Block Explorer</a></td></tr><tr><td>Sui</td><td>Sui Move VM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.sui.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sui.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://suiscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>Unichain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.unichain.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.unichain.org/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sepolia.uniscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>World Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://world.org/world-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.world.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.world.org/world-chain/providers/explorers" target="_blank">Block Explorer</a></td></tr><tr><td>X Layer</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://web3.okx.com/xlayer" target="_blank">Website</a><br>:material-file-document: <a href="https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/about-xlayer" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://web3.okx.com/explorer/x-layer" target="_blank">Block Explorer</a></td></tr><tr><td>XRPL-EVM</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.xrplevm.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.xrplevm.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.xrplevm.org/" target="_blank">Block Explorer</a></td></tr></tbody></table>

</div>

### WTT



<div class="full-width" markdown>

<table data-full-width="true" markdown><thead><th>Blockchain</th><th>Environment</th><th>Mainnet</th><th>Testnet</th><th>Devnet</th><th>Quick Links</th></thead><tbody><tr><td>Ethereum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://ethereum.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://ethereum.org/developers/docs/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Solana</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://solana.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://solana.com/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.solana.com/" target="_blank">Block Explorer</a></td></tr><tr><td>0G (Zero Gravity)</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://0g.ai/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.0g.ai/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://chainscan.0g.ai" target="_blank">Block Explorer</a></td></tr><tr><td>Algorand</td><td>AVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://algorandtechnologies.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://dev.algorand.co" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://allo.info/" target="_blank">Block Explorer</a></td></tr><tr><td>Aptos</td><td>Move VM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://aptosnetwork.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://aptos.dev/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.aptoslabs.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Arbitrum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://arbitrum.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.arbitrum.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://arbiscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Avalanche</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.avax.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://build.avax.network/docs/primary-network" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://snowtrace.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Base</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://base.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.base.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://basescan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Berachain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.berachain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.berachain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://berascan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>BNB Smart Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.bnbchain.org/en/bnb-smart-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.bnbchain.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://bscscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Celo</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://celo.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.celo.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://celo.blockscout.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Fantom</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://fantom.foundation/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.fantom.foundation/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.fantom.network/" target="_blank">Block Explorer</a></td></tr><tr><td>Fogo</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.fogo.io/" target="_blank">Website</a><br>:octicons-package-16: <a href="https://fogoscan.com/?cluster=testnet" target="_blank">Block Explorer</a></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td>EVM</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://hyperfoundation.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs" target="_blank">Developer Docs</a><br></td></tr><tr><td>Injective</td><td>CosmWasm</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://injective.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.injective.network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://injscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Ink</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://inkonchain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.inkonchain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer-sepolia.inkonchain.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Kaia</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.kaia.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.kaia.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://kaiascan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Linea</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://linea.build/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.linea.build/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.linea.build/get-started/build/block-explorers" target="_blank">Block Explorer</a></td></tr><tr><td>Mantle</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.mantle.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.mantle.xyz/network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://mantlescan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>MegaETH</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.megaeth.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.megaeth.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://mega.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Mezo</td><td>EVM</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://mezo.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://mezo.org/docs/developers/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.test.mezo.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Moca</td><td>EVM</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://mocachain.org/en" target="_blank">Website</a><br>:material-file-document: <a href="https://mocacoin.gitbook.io/litepaper" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://devnet-scan.mocachain.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Monad</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.monad.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.monad.xyz/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://testnet.monvision.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Moonbeam</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://moonbeam.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.moonbeam.network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://moonscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>NEAR</td><td>NEAR VM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://near.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.near.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://nearblocks.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Optimism</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.optimism.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.optimism.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://optimistic.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Polygon</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://polygon.technology/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.polygon.technology/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://polygonscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Scroll</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://scroll.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.scroll.io/en/home/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://scrollscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Sei</td><td>CosmWasm</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.sei.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sei.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.sei.io/learn/explorers#sei-explorers" target="_blank">Block Explorer</a></td></tr><tr><td>SeiEVM</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.sei.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sei.io/evm" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://seistream.app/" target="_blank">Block Explorer</a></td></tr><tr><td>Sui</td><td>Sui Move VM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.sui.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sui.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://suiscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>Unichain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.unichain.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.unichain.org/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sepolia.uniscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>World Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://world.org/world-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.world.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.world.org/world-chain/providers/explorers" target="_blank">Block Explorer</a></td></tr><tr><td>X Layer</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://web3.okx.com/xlayer" target="_blank">Website</a><br>:material-file-document: <a href="https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/about-xlayer" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://web3.okx.com/explorer/x-layer" target="_blank">Block Explorer</a></td></tr><tr><td>XRPL-EVM</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.xrplevm.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.xrplevm.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.xrplevm.org/" target="_blank">Block Explorer</a></td></tr></tbody></table>

</div>

### CCTP



<div class="full-width" markdown>

=== "CCTP v1"

    <table data-full-width="true" markdown><thead><th>Blockchain</th><th>Environment</th><th>Mainnet</th><th>Testnet</th><th>Devnet</th><th>Quick Links</th></thead><tbody><tr><td>Ethereum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://ethereum.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://ethereum.org/developers/docs/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Solana</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://solana.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://solana.com/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.solana.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Aptos</td><td>Move VM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://aptosnetwork.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://aptos.dev/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.aptoslabs.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Arbitrum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://arbitrum.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.arbitrum.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://arbiscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Avalanche</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.avax.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://build.avax.network/docs/primary-network" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://snowtrace.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Base</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://base.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.base.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://basescan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Optimism</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.optimism.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.optimism.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://optimistic.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Polygon</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://polygon.technology/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.polygon.technology/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://polygonscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Sui</td><td>Sui Move VM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.sui.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sui.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://suiscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>Unichain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.unichain.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.unichain.org/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sepolia.uniscan.xyz/" target="_blank">Block Explorer</a></td></tr></tbody></table>

=== "CCTP v2"

    <table data-full-width="true" markdown><thead><th>Blockchain</th><th>Environment</th><th>Mainnet</th><th>Testnet</th><th>Devnet</th><th>Quick Links</th></thead><tbody><tr><td>Ethereum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://ethereum.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://ethereum.org/developers/docs/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Solana</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://solana.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://solana.com/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.solana.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Arbitrum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://arbitrum.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.arbitrum.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://arbiscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Avalanche</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.avax.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://build.avax.network/docs/primary-network" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://snowtrace.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Base</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://base.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.base.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://basescan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://hyperfoundation.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs" target="_blank">Developer Docs</a><br></td></tr><tr><td>Ink</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://inkonchain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.inkonchain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer-sepolia.inkonchain.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Linea</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://linea.build/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.linea.build/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.linea.build/get-started/build/block-explorers" target="_blank">Block Explorer</a></td></tr><tr><td>Monad</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.monad.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.monad.xyz/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://testnet.monvision.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Optimism</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.optimism.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.optimism.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://optimistic.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Plume</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://plume.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.plume.org/plume" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.plume.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Polygon</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://polygon.technology/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.polygon.technology/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://polygonscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>SeiEVM</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.sei.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sei.io/evm" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://seistream.app/" target="_blank">Block Explorer</a></td></tr><tr><td>Sonic</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.soniclabs.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.soniclabs.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sonicscan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Sui</td><td>Sui Move VM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.sui.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sui.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://suiscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>Unichain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.unichain.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.unichain.org/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sepolia.uniscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>World Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://world.org/world-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.world.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.world.org/world-chain/providers/explorers" target="_blank">Block Explorer</a></td></tr></tbody></table>

</div>

### Settlement



<div class="full-width" markdown>

<table data-full-width="true" markdown><thead><th>Blockchain</th><th>Environment</th><th>Mainnet</th><th>Testnet</th><th>Devnet</th><th>Quick Links</th></thead><tbody><tr><td>Ethereum</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://ethereum.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://ethereum.org/developers/docs/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Solana</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://solana.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://solana.com/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.solana.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Arbitrum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://arbitrum.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.arbitrum.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://arbiscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Avalanche</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.avax.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://build.avax.network/docs/primary-network" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://snowtrace.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Base</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://base.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.base.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://basescan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Optimism</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:material-web: <a href="https://www.optimism.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.optimism.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://optimistic.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Polygon</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://polygon.technology/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.polygon.technology/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://polygonscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Sui</td><td>Sui Move VM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.sui.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sui.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://suiscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>Unichain</td><td>EVM</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:material-web: <a href="https://www.unichain.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.unichain.org/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sepolia.uniscan.xyz/" target="_blank">Block Explorer</a></td></tr></tbody></table>

</div>

### Multigov



<div class="full-width" markdown>

<table data-full-width="true" markdown><thead><th>Blockchain</th><th>Environment</th><th>Mainnet</th><th>Testnet</th><th>Devnet</th><th>Quick Links</th></thead><tbody><tr><td>Ethereum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://ethereum.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://ethereum.org/developers/docs/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Solana</td><td>SVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://solana.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://solana.com/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.solana.com/" target="_blank">Block Explorer</a></td></tr><tr><td>0G (Zero Gravity)</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://0g.ai/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.0g.ai/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://chainscan.0g.ai" target="_blank">Block Explorer</a></td></tr><tr><td>Arbitrum</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://arbitrum.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.arbitrum.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://arbiscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Avalanche</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.avax.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://build.avax.network/docs/primary-network" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://snowtrace.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Base</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://base.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.base.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://basescan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Berachain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.berachain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.berachain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://berascan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>BNB Smart Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.bnbchain.org/en/bnb-smart-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.bnbchain.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://bscscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Celo</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://celo.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.celo.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://celo.blockscout.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Converge</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.convergeonchain.xyz/" target="_blank">Website</a><br></td></tr><tr><td>CreditCoin</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://creditcoin.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.creditcoin.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://creditcoin.subscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Fantom</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://fantom.foundation/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.fantom.foundation/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.fantom.network/" target="_blank">Block Explorer</a></td></tr><tr><td>HyperCore</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore" target="_blank">Website</a><br>:material-file-document: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore" target="_blank">Developer Docs</a><br></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://hyperfoundation.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://hyperliquid.gitbook.io/hyperliquid-docs" target="_blank">Developer Docs</a><br></td></tr><tr><td>Ink</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://inkonchain.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.inkonchain.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer-sepolia.inkonchain.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Kaia</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.kaia.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.kaia.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://kaiascan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Linea</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://linea.build/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.linea.build/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.linea.build/get-started/build/block-explorers" target="_blank">Block Explorer</a></td></tr><tr><td>Mantle</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.mantle.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.mantle.xyz/network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://mantlescan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>MegaETH</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.megaeth.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.megaeth.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://mega.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Mezo</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://mezo.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://mezo.org/docs/developers/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.test.mezo.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Moca</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://mocachain.org/en" target="_blank">Website</a><br>:material-file-document: <a href="https://mocacoin.gitbook.io/litepaper" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://devnet-scan.mocachain.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Monad</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.monad.xyz/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.monad.xyz/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://testnet.monvision.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Moonbeam</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://moonbeam.network/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.moonbeam.network/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://moonscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Optimism</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.optimism.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.optimism.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://optimistic.etherscan.io/" target="_blank">Block Explorer</a></td></tr><tr><td>Plasma</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.plasma.to/" target="_blank">Website</a><br>:material-file-document: <a href="https://www.plasma.to/docs/get-started/introduction/start-here" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://plasmascan.to/" target="_blank">Block Explorer</a></td></tr><tr><td>Plume</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://plume.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.plume.org/plume" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.plume.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Polygon</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://polygon.technology/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.polygon.technology/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://polygonscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Scroll</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://scroll.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.scroll.io/en/home/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://scrollscan.com/" target="_blank">Block Explorer</a></td></tr><tr><td>Sei</td><td>CosmWasm</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.sei.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sei.io/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.sei.io/learn/explorers#sei-explorers" target="_blank">Block Explorer</a></td></tr><tr><td>SeiEVM</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.sei.io/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.sei.io/evm" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://seistream.app/" target="_blank">Block Explorer</a></td></tr><tr><td>Sonic</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.soniclabs.com/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.soniclabs.com/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sonicscan.org/" target="_blank">Block Explorer</a></td></tr><tr><td>Unichain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.unichain.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.unichain.org/docs" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://sepolia.uniscan.xyz/" target="_blank">Block Explorer</a></td></tr><tr><td>World Chain</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://world.org/world-chain" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.world.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://docs.world.org/world-chain/providers/explorers" target="_blank">Block Explorer</a></td></tr><tr><td>X Layer</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://web3.okx.com/xlayer" target="_blank">Website</a><br>:material-file-document: <a href="https://web3.okx.com/xlayer/docs/developer/build-on-xlayer/about-xlayer" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://web3.okx.com/explorer/x-layer" target="_blank">Block Explorer</a></td></tr><tr><td>XRPL-EVM</td><td>EVM</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:material-web: <a href="https://www.xrplevm.org/" target="_blank">Website</a><br>:material-file-document: <a href="https://docs.xrplevm.org/" target="_blank">Developer Docs</a><br>:octicons-package-16: <a href="https://explorer.xrplevm.org/" target="_blank">Block Explorer</a></td></tr></tbody></table>

</div>


---

Page Title: Testnet Faucets

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-reference-testnet-faucets.md
- Canonical (HTML): https://wormhole.com/docs/products/reference/testnet-faucets/
- Summary: This page includes resources to quickly find the Testnet tokens you need to deploy and test applications and contracts on Wormhole's supported networks.
- Word Count: 1395; Token Estimate: 3553

# Testnet Faucets

Don't let the need for testnet tokens get in the way of building your next great idea with Wormhole. Use this guide to quickly locate the testnet token faucets you need to deploy and test applications and contracts on Wormhole's supported networks.




<div class="full-width" markdown>

### EVM

<table data-full-width="true" markdown><thead><th>Testnet</th><th>Environment</th><th>Token</th><th>Faucet</th></thead><tbody><tr><td>Ethereum Holesky</td><td>EVM</td><td>ETH</td><td><a href="https://www.alchemy.com/faucets/ethereum-holesky" target="_blank">Alchemy Faucet</a></td></tr><tr><td>Ethereum Sepolia</td><td>EVM</td><td>ETH</td><td><a href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank">Alchemy Faucet</a></td></tr><tr><td>0G (Zero Gravity)</td><td>EVM</td><td>0G</td><td><a href="https://faucet.0g.ai/" target="_blank">0G Official Faucet</a></td></tr><tr><td>Arbitrum Sepolia</td><td>EVM</td><td>ETH</td><td><a href="https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info#faucets" target="_blank">List of Faucets</a></td></tr><tr><td>Avalanche</td><td>EVM</td><td>AVAX</td><td><a href="https://core.app/tools/testnet-faucet/?subnet=c&token=c" target="_blank">Official Avalanche Faucet</a></td></tr><tr><td>Base Sepolia</td><td>EVM</td><td>ETH</td><td><a href="https://docs.base.org/docs/tools/network-faucets/" target="_blank">List of Faucets</a></td></tr><tr><td>Berachain</td><td>EVM</td><td>BERA</td><td><a href="https://bepolia.faucet.berachain.com/" target="_blank">Official Berachain Faucet</a></td></tr><tr><td>BNB Smart Chain</td><td>EVM</td><td>BNB</td><td><a href="https://www.bnbchain.org/en/testnet-faucet" target="_blank">Official BNB Faucet</a></td></tr><tr><td>Sonic</td><td>EVM</td><td>S</td><td><a href="https://testnet.soniclabs.com/account" target="_blank">Official Sonic Faucet</a></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td>EVM</td><td>mock USDC</td><td><a href="https://app.hyperliquid-testnet.xyz/drip" target="_blank">Official Hyperliquid Faucet</a></td></tr><tr><td>Ink</td><td>EVM</td><td>ETH</td><td><a href="https://inkonchain.com/faucet" target="_blank">Official Ink Faucet</a></td></tr><tr><td>Kaia</td><td>EVM</td><td>KAIA</td><td><a href="https://www.kaia.io/faucet" target="_blank">Official Kaia Faucet</a></td></tr><tr><td>Linea</td><td>EVM</td><td>ETH</td><td><a href="https://docs.linea.build/get-started/how-to/get-testnet-eth" target="_blank">List of Faucets</a></td></tr><tr><td>Mantle</td><td>EVM</td><td>MNT</td><td><a href="https://faucet.sepolia.mantle.xyz/" target="_blank">Official Mantle Faucet</a></td></tr><tr><td>MegaETH</td><td>EVM</td><td>ETH</td><td><a href="https://testnet.megaeth.com/" target="_blank">Official MegaETH Faucet</a></td></tr><tr><td>Moca</td><td>EVM</td><td>MOCA</td><td><a href="https://devnet-scan.mocachain.org/faucet" target="_blank">Official Moca Faucet</a></td></tr><tr><td>Monad Testnet</td><td>EVM</td><td>MON</td><td><a href="https://testnet.monad.xyz/" target="_blank">Official Monad Faucet</a></td></tr><tr><td>Moonbeam</td><td>EVM</td><td>DEV</td><td><a href="https://faucet.moonbeam.network/" target="_blank">Official Moonbeam Faucet</a></td></tr><tr><td>Optimism Sepolia</td><td>EVM</td><td>ETH</td><td><a href="https://console.optimism.io/faucet" target="_blank">Superchain Faucet</a></td></tr><tr><td>Plasma</td><td>EVM</td><td>XPL</td><td><a href="https://faucet.quicknode.com/plasma" target="_blank">QuickNode Faucet</a></td></tr><tr><td>Plume</td><td>EVM</td><td>PLUME</td><td><a href="https://faucet.plume.org/" target="_blank">Official Plume Faucet</a></td></tr><tr><td>Polygon Amoy</td><td>EVM</td><td>POL</td><td><a href="https://faucet.polygon.technology/" target="_blank">Official Polygon Faucet</a></td></tr><tr><td>Scroll</td><td>EVM</td><td>SCR</td><td><a href="https://docs.scroll.io/en/developers/faq/#testnet-eth" target="_blank">List of Faucets</a></td></tr><tr><td>SeiEVM</td><td>EVM</td><td>SEI</td><td><a href="https://docs.sei.io/learn/faucet" target="_blank">Sei Atlantic-2 Faucet</a></td></tr><tr><td>Unichain</td><td>EVM</td><td>ETH</td><td><a href="https://faucet.quicknode.com/unichain/sepolia" target="_blank">QuickNode Faucet</a></td></tr><tr><td>World Chain</td><td>EVM</td><td>ETH</td><td><a href="https://www.alchemy.com/faucets/world-chain-sepolia" target="_blank">Alchemy Faucet</a></td></tr><tr><td>X Layer</td><td>EVM</td><td>OKB</td><td><a href="https://web3.okx.com/xlayer/faucet" target="_blank">X Layer Official Faucet</a></td></tr><tr><td>XRPL-EVM</td><td>EVM</td><td>XRP</td><td><a href="https://faucet.xrplevm.org/" target="_blank">XRPL Official Faucet</a></td></tr></tbody></table>

### SVM

<table data-full-width="true" markdown><thead><th>Testnet</th><th>Environment</th><th>Token</th><th>Faucet</th></thead><tbody><tr><td>Pythnet</td><td>SVM</td><td>ETH</td><td><a href="https://console.optimism.io/faucet" target="_blank">Superchain Faucet</a></td></tr></tbody></table>

### AVM

<table data-full-width="true" markdown><thead><th>Testnet</th><th>Environment</th><th>Token</th><th>Faucet</th></thead><tbody><tr><td>Algorand</td><td>AVM</td><td>ALGO</td><td><a href="https://lora.algokit.io/testnet/fund" target="_blank">Official Algorand Faucet</a></td></tr></tbody></table>

### CosmWasm

<table data-full-width="true" markdown><thead><th>Testnet</th><th>Environment</th><th>Token</th><th>Faucet</th></thead><tbody><tr><td>Celestia</td><td>CosmWasm</td><td>TIA</td><td><a href="https://discord.com/invite/celestiacommunity" target="_blank">Discord Faucet</a></td></tr><tr><td>Cosmos Hub</td><td>CosmWasm</td><td>ATOM</td><td><a href="https://discord.com/invite/cosmosnetwork" target="_blank">Discord Faucet</a></td></tr><tr><td>Injective</td><td>CosmWasm</td><td>INJ</td><td><a href="https://testnet.faucet.injective.network/" target="_blank">Official Injective Faucet</a></td></tr><tr><td>Kujira</td><td>CosmWasm</td><td>KUJI</td><td><a href="https://discord.com/channels/970650215801569330/1009931570263629854" target="_blank">Discord Faucet</a></td></tr><tr><td>Neutron</td><td>CosmWasm</td><td>NTRN</td><td><a href="https://docs.neutron.org/developers/faq#where-is-the-testnet-faucet" target="_blank">List of Faucets</a></td></tr><tr><td>Noble</td><td>CosmWasm</td><td>USDC</td><td><a href="https://faucet.circle.com/" target="_blank">Circle Faucet</a></td></tr><tr><td>Osmosis</td><td>CosmWasm</td><td>OSMO</td><td><a href="https://faucet.testnet.osmosis.zone/" target="_blank">Official Osmosis Faucet</a></td></tr><tr><td>SEDA</td><td>CosmWasm</td><td>SEDA</td><td><a href="https://devnet.explorer.seda.xyz/faucet" target="_blank">Official SEDA Faucet</a></td></tr><tr><td>Sei</td><td>CosmWasm</td><td>SEI</td><td><a href="https://docs.sei.io/learn/faucet" target="_blank">Sei Atlantic-2 Faucet</a></td></tr></tbody></table>

### Move VM

<table data-full-width="true" markdown><thead><th>Testnet</th><th>Environment</th><th>Token</th><th>Faucet</th></thead><tbody><tr><td>Aptos</td><td>Move VM</td><td>APT</td><td><a href="https://www.aptosfaucet.com/" target="_blank">Official Aptos Faucet</a></td></tr></tbody></table>

### NEAR VM

<table data-full-width="true" markdown><thead><th>Testnet</th><th>Environment</th><th>Token</th><th>Faucet</th></thead><tbody><tr><td>NEAR</td><td>NEAR VM</td><td>NEAR</td><td><a href="https://near-faucet.io/" target="_blank">Official NEAR Faucet</a></td></tr></tbody></table>

### Sui Move VM

<table data-full-width="true" markdown><thead><th>Testnet</th><th>Environment</th><th>Token</th><th>Faucet</th></thead><tbody><tr><td>Sui</td><td>Sui Move VM</td><td>SUI</td><td><a href="https://docs.sui.io/guides/developer/getting-started/get-coins" target="_blank">List of Faucets</a></td></tr></tbody></table>

</div>


---

Page Title: Wormhole Finality | Consistency Levels

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-reference-consistency-levels.md
- Canonical (HTML): https://wormhole.com/docs/products/reference/consistency-levels/
- Summary: This page documents how long to wait for finality before signing, based on each chain’s consistency (finality) level and consensus mechanism.
- Word Count: 2208; Token Estimate: 5327

# Wormhole Finality

Wormhole allows integrators to specify the finality level at which a VAA is verified. This determines how long the Guardians wait before attesting to a message.

These options provide different trade-offs between latency and re-org resistance:

- `instant` is sufficient when low latency is required and limited reorg risk is acceptable.
- `safe` provides additional protection while maintaining reasonable latency.
- `finalized` offers the strongest guarantees but increases confirmation time.

`finalized` provides the strongest protection against chain re-orgs. Selecting `instant`, `safe`, or a custom finality level increases exposure to re-org risk and should be evaluated carefully based on the application's risk profile.

!!! warning

    Some Wormhole-supported EVM chains support setting a custom finality level. Wormhole Contributors recommend using this advanced feature with caution. Choosing a level of finality other than `finalized` — including `instant`, `safe`, or any custom configuration — on EVM chains exposes you to [re-org risk](https://www.alchemy.com/overviews/what-is-a-reorg){target=\_blank}. This is especially dangerous when moving assets cross-chain, because assets released or minted on the destination chain may not have been burned or locked on the source chain. This risk can extend to other types of cross-chain data, depending on your application. 

    Assumption of risk; no warranty; no liability. By selecting a Custom finality level, you acknowledge and accept all risk of chain re-orgs/rollbacks and any resulting loss, imbalance, or data inconsistency. Wormhole contributors, and their affiliates (“Wormhole Parties”) provide this feature “as is,” make no warranties of any kind, and will not be liable for any losses or damages arising from your selection or use of Custom finality. You are solely responsible for appropriate safeguards (e.g., caps, delays, monitoring, circuit breakers).
    
    See the [Custom Consistency Levels](#custom-consistency-levels-advanced) section.


The following table documents each chain's `consistencyLevel` values (i.e., finality reached before signing). The consistency level defines how long the Guardians should wait before signing a VAA. The finalization time depends on the specific chain's consensus mechanism. The consistency level is a `u8`, so any single byte may be used. However, a small subset has particular meanings. If the `consistencyLevel` isn't one of those specific values, the `Otherwise` column describes how it's interpreted.



<table data-full-width="true" markdown><thead><th>Chain</th><th>Instant</th><th>Safe</th><th>Finalized</th><th>Custom</th><th>Otherwise</th><th>Time to Finalize</th><th>Details</th></thead><tbody><tr><td>Ethereum</td><td>200</td><td>201</td><td>202</td><td>203</td><td>finalized</td><td>~ 19min</td><td><a href="https://www.alchemy.com/overviews/ethereum-commitment-levels" target="_blank">Details</a></td></tr><tr><td>Solana</td><td></td><td>0</td><td>1</td><td>N/A</td><td></td><td>~ 14s</td><td><a href="https://docs.anza.xyz/consensus/commitments/" target="_blank">Details</a></td></tr><tr><td>0G (Zero Gravity)</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 69min</td><td></td></tr><tr><td>Algorand</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 4s</td><td><a href="https://dev.algorand.co/getting-started/why-algorand/#instant-finality" target="_blank">Details</a></td></tr><tr><td>Aptos</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 4s</td><td><a href="https://aptos.dev/network/blockchain/validator-nodes#overview" target="_blank">Details</a></td></tr><tr><td>Arbitrum</td><td>200</td><td>201</td><td></td><td>N/A</td><td>finalized</td><td>~ 18min</td><td><a href="https://docs.arbitrum.io/learn-more/faq#how-many-blocks-are-needed-for-a-transaction-to-be-confirmedfinalized-in-arbitrum" target="_blank">Details</a></td></tr><tr><td>Avalanche</td><td>200</td><td></td><td></td><td>N/A</td><td>finalized</td><td>~ 2s</td><td><a href="https://build.avax.network/docs/primary-network/exchange-integration#determining-finality" target="_blank">Details</a></td></tr><tr><td>Base</td><td>200</td><td>201</td><td></td><td>N/A</td><td>finalized</td><td>~ 18min</td><td></td></tr><tr><td>Berachain</td><td>200</td><td></td><td></td><td>N/A</td><td>finalized</td><td>~ 4s</td><td></td></tr><tr><td>BNB Smart Chain</td><td>200</td><td>201</td><td></td><td>N/A</td><td>finalized</td><td>~ 12s</td><td><a href="https://docs.bnbchain.org/bnb-smart-chain/introduction/?h=finality" target="_blank">Details</a></td></tr><tr><td>Celestia</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 5s</td><td></td></tr><tr><td>Celo</td><td>200</td><td></td><td></td><td>N/A</td><td>finalized</td><td>~ 10s</td><td></td></tr><tr><td>Converge</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 7min</td><td></td></tr><tr><td>Cosmos Hub</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 5s</td><td></td></tr><tr><td>CreditCoin</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 60s</td><td></td></tr><tr><td>Dymension</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 5s</td><td></td></tr><tr><td>Evmos</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 2s</td><td></td></tr><tr><td>Fantom</td><td>200</td><td></td><td></td><td>N/A</td><td>finalized</td><td>~ 5s</td><td></td></tr><tr><td>Fogo</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 14s</td><td></td></tr><tr><td>HyperEVM :material-alert:{ title='⚠️ The HyperEVM integration is experimental, as its node software is not open source. Use Wormhole messaging on HyperEVM with caution.' }</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 2s</td><td></td></tr><tr><td>Injective</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 3s</td><td></td></tr><tr><td>Ink</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 9min</td><td></td></tr><tr><td>Kaia</td><td>200</td><td></td><td></td><td>N/A</td><td>finalized</td><td>~ 1s</td><td></td></tr><tr><td>Kujira</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 3s</td><td></td></tr><tr><td>Mantle</td><td>200</td><td>201</td><td></td><td>N/A</td><td>finalized</td><td>~ 18min</td><td></td></tr><tr><td>MegaETH</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 69min</td><td></td></tr><tr><td>Mezo</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 8s</td><td></td></tr><tr><td>Moca</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 1s</td><td></td></tr><tr><td>Monad</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 2s</td><td></td></tr><tr><td>Moonbeam</td><td>200</td><td>201</td><td></td><td>N/A</td><td>finalized</td><td>~ 24s</td><td><a href="https://docs.moonbeam.network/builders/ethereum/json-rpc/moonbeam-custom-api/#finality-rpc-endpoints" target="_blank">Details</a></td></tr><tr><td>NEAR</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 2s</td><td><a href="https://nomicon.io/ChainSpec/Consensus" target="_blank">Details</a></td></tr><tr><td>Neutron</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 5s</td><td></td></tr><tr><td>Optimism</td><td>200</td><td>201</td><td></td><td>N/A</td><td>finalized</td><td>~ 18min</td><td></td></tr><tr><td>Osmosis</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 6s</td><td></td></tr><tr><td>Plasma</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 3s</td><td></td></tr><tr><td>Plume</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 18min</td><td></td></tr><tr><td>Polygon</td><td>200</td><td></td><td></td><td>N/A</td><td>finalized</td><td>~ 6s</td><td><a href="https://docs.polygon.technology/pos/architecture/heimdall_v2/checkpoints/" target="_blank">Details</a></td></tr><tr><td>Scroll</td><td>200</td><td></td><td></td><td>N/A</td><td>finalized</td><td>~ 50min</td><td></td></tr><tr><td>Sei</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 1s</td><td></td></tr><tr><td>SeiEVM</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 1s</td><td></td></tr><tr><td>Sonic</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 1s</td><td></td></tr><tr><td>Stacks</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 61min</td><td></td></tr><tr><td>Stargaze</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 5s</td><td></td></tr><tr><td>Sui</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 3s</td><td><a href="https://docs.sui.io/concepts/sui-architecture/consensus" target="_blank">Details</a></td></tr><tr><td>Unichain</td><td>200</td><td>201</td><td></td><td>N/A</td><td>finalized</td><td>~ 18min</td><td></td></tr><tr><td>World Chain</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 18min</td><td></td></tr><tr><td>X Layer</td><td>200</td><td>201</td><td></td><td>N/A</td><td>finalized</td><td>~ 16min</td><td></td></tr><tr><td>Xrpl</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 4s</td><td></td></tr><tr><td>XRPL-EVM</td><td></td><td></td><td>0</td><td>N/A</td><td></td><td>~ 10s</td><td></td></tr></tbody></table>

## Custom Consistency Levels (Advanced)

On supported EVM chains (currently Ethereum and Linea), integrators may specify a custom consistency level. See the [white paper](https://github.com/wormhole-foundation/wormhole/blob/main/whitepapers/0001_generic_message_passing.md#custom-handling){target=\_blank} to learn how this works. 

!!!warning
    **Custom finality is an advanced feature and Wormhole Contributors recommend to use this with caution.** Custom consistency should only be used when standard finality options do not meet the application’s requirements. Most integrations **do not** require custom consistency levels. Using custom finality exposes users to re-org risk. Lower finality levels increase the chance that a source-chain transaction may be reverted after assets are released or minted on the destination chain. Custom finality should be used only with a clear understanding of these risks.
    
How to select a Custom Finality Level:

- For L1s: Wormhole Contributors recommend referring to information on forked blocks in blockchain explorers such as [Etherscan](https://etherscan.io/blocks_forked?p=1){target=\_blank}, [Polygonscan](https://polygonscan.com/blocks_forked){target=\_blank}, and others, paying specific attention to the “ReorgDepth” column. Polygon, for instance, has been known to have reorgs with a depth of up to 128 blocks! 
- For L2s: Wormhole Contributors recommend reviewing L2 block explorers as well as details around whether the sequencer is centralized and how the L2 RPC node treats finality. Typically, the risks one is exposed to when not waiting for full finality from an L2 are: (1) a centralized (or compromised) sequencer censoring transactions, (2) re-orgs if sequencing is not centralized, and (3) L1 reorg risk and the L2 sequencer not re-submitting the transaction batch to the L1.


### CCL Contract Addresses

Custom Consistency Level (CCL) enables advanced finality control for EVM chains. CCL is currently supported on select EVM chains. The contract addresses below are the on-chain contracts queried when 203 (Custom) is used.

=== "Mainnet"

    <table data-full-width="true" markdown><thead><tr><th>Chain Name</th><th>Contract Address</th></tr></thead><tbody><tr><td>Ethereum</td><td><code>0x6A4B4A882F5F0a447078b4Fd0b4B571A82371ec2</code></td></tr><tr><td>Linea</td><td><code>0x6A4B4A882F5F0a447078b4Fd0b4B571A82371ec2</code></td></tr></tbody></table>

=== "Testnet"

    <table data-full-width="true" markdown><thead><tr><th>Chain Name</th><th>Contract Address</th></tr></thead><tbody><tr><td>Ethereum</td><td><code>0x6A4B4A882F5F0a447078b4Fd0b4B571A82371ec2</code></td></tr><tr><td>Sepolia</td><td><code>0x6A4B4A882F5F0a447078b4Fd0b4B571A82371ec2</code></td></tr><tr><td>Linea</td><td><code>0x6A4B4A882F5F0a447078b4Fd0b4B571A82371ec2</code></td></tr></tbody></table>

=== "Devnet"

    <table data-full-width="true" markdown><thead><tr><th>Chain Name</th><th>Contract Address</th></tr></thead><tbody><tr><td>Ethereum</td><td><code>0x6A4B4A882F5F0a447078b4Fd0b4B571A82371ec2</code></td></tr></tbody></table>


---

Page Title: Wormhole Formatted Addresses

- Resolved Markdown: https://wormhole.com/docs/ai/pages/products-reference-wormhole-formatted-addresses.md
- Canonical (HTML): https://wormhole.com/docs/products/reference/wormhole-formatted-addresses/
- Summary: Explanation of Wormhole formatted 32-byte hex addresses, their conversion, and usage across different blockchain platforms.
- Word Count: 799; Token Estimate: 1437

# Wormhole Formatted Addresses

Wormhole formatted addresses are 32-byte hex representations of addresses from any supported blockchain. Whether an address originates from EVM, Solana, Cosmos, or another ecosystem, Wormhole standardizes all addresses into this format to ensure cross-chain compatibility.

This uniform format is essential for smooth interoperability in token transfers and messaging across chains. Wormhole uses formatted addresses throughout the [Wormhole SDK](https://github.com/wormhole-foundation/wormhole-sdk-ts){target=\_blank}, especially in cross-chain transactions, such as transfer functions that utilize the `bytes32` representation for recipient addresses.

## Platform-Specific Address Formats

Each blockchain ecosystem Wormhole supports has its method for formatting native addresses. To enable cross-chain compatibility, Wormhole converts these native addresses into the standardized 32-byte hex format.

Here’s an overview of the native address formats and how they are normalized to the Wormhole format:

| Platform        | Native Address Format            | Wormhole Formatted Address |
|-----------------|----------------------------------|----------------------------|
| EVM             |  Hex (e.g., 0x...)               |  32-byte Hex               |
| Solana          |  Base58                          |  32-byte Hex               |
| CosmWasm        |  Bech32                          |  32-byte Hex               |
| Algorand        |  Algorand App ID                 |  32-byte Hex               |
| Sui             |  Hex                             |  32-byte Hex               |
| Aptos           |  Hex                             |  32-byte Hex               |
| Near            |  SHA-256                         |  32-byte Hex               |

These conversions allow Wormhole to interact seamlessly with various chains using a uniform format for all addresses.

### Address Format Handling

The Wormhole SDK provides mappings that associate each platform with its native address format. You can find this mapping in the Wormhole SDK file [`platforms.ts`](https://github.com/wormhole-foundation/wormhole-sdk-ts/blob/007f61b27c650c1cf0fada2436f79940dfa4f211/core/base/src/constants/platforms.ts#L93-L102){target=\_blank}:

```typescript
const platformAddressFormatEntries = [
  ['Evm', 'hex'],
  ['Solana', 'base58'],
  ['Cosmwasm', 'bech32'],
  ['Algorand', 'algorandAppId'],
  ['Sui', 'hex'],
  ['Aptos', 'hex'],
  ['Near', 'sha256'],
];
```

These entries define how the [`UniversalAddress`](https://github.com/wormhole-foundation/wormhole-sdk-ts/blob/007f61b27c650c1cf0fada2436f79940dfa4f211/core/definitions/src/universalAddress.ts#L23){target=\_blank} class handles different address formats based on the platform.

## Universal Address Methods

The `UniversalAddress` class is essential for working with Wormhole formatted addresses. It converts native blockchain addresses into the standardized 32-byte hex format used across Wormhole operations.

Key functions:

 - **`new UniversalAddress()`**: Use the `UniversalAddress` constructor to convert native addresses into the Wormhole format.

    ```typescript
    const universalAddress = new UniversalAddress('0x123...', 'hex');
    ```

 - **`toUniversalAddress()`**: Converts a platform-specific address into the Wormhole formatted 32-byte hex address.

    ```typescript
    const ethAddress: NativeAddress<'Evm'> = toNative('Ethereum', '0x0C9...');
    const universalAddress = ethAddress.toUniversalAddress().toString();
    ```

 - **`toNative()`**: Converts the Wormhole formatted address back to a native address for a specific blockchain platform.

    ```typescript
    const nativeAddress = universalAddress.toNative('Evm');
    ```

 - **`toString()`**: Returns the Wormhole formatted address as a hex string, which can be used in various SDK operations.

    ```typescript
    console.log(universalAddress.toString());
    ```

These methods allow developers to convert between native addresses and the Wormhole format, ensuring cross-chain compatibility.

## Convert Between Native and Wormhole Formatted Addresses

The Wormhole SDK allows developers to easily convert between native addresses and Wormhole formatted addresses when building cross-chain applications.

### Convert a Native Address to a Wormhole Formatted Address

Example conversions for EVM and Solana:

=== "EVM"

    ```typescript
    import { toNative } from '@wormhole-foundation/sdk-core';

    const ethAddress: NativeAddress<'Evm'> = toNative(
      'Ethereum',
      '0x0C99567DC6f8f1864cafb580797b4B56944EEd28'
    );
    const universalAddress = ethAddress.toUniversalAddress().toString();
    console.log('Universal Address (EVM):', universalAddress);
    ```

=== "Solana"

    ```typescript
    import { toNative } from '@wormhole-foundation/sdk-core';

    const solAddress: NativeAddress<'Solana'> = toNative(
      'Solana',
      '6zZHv9EiqQYcdg52ueADRY6NbCXa37VKPngEHaokZq5J'
    );
    const universalAddressSol = solAddress.toUniversalAddress().toString();
    console.log('Universal Address (Solana):', universalAddressSol);
    ```

The result is a standardized address format that is ready for cross-chain operations.

### Convert Back to Native Addresses

Below is how you can convert a Wormhole formatted address back to an EVM or Solana native address:

```typescript
const nativeAddressEvm = universalAddress.toNative('Evm');
console.log('EVM Native Address:', nativeAddressEvm);

const nativeAddressSolana = universalAddress.toNative('Solana');
console.log('Solana Native Address:', nativeAddressSolana);
```

These conversions ensure that your cross-chain applications can seamlessly handle addresses across different ecosystems.

## Use Cases for Wormhole Formatted Addresses

### Cross-chain Token Transfers

Cross-chain token transfers require addresses to be converted into a standard format. For example, when transferring tokens from Ethereum to Solana, the Ethereum address is converted into a Wormhole formatted address to ensure compatibility. After the transfer, the Wormhole formatted address is converted back into the Solana native format.

### Smart Contract Interactions

In smart contract interactions, especially when building dApps that communicate across multiple chains, Wormhole formatted addresses provide a uniform way to reference addresses. This ensures that addresses from different blockchains can interact seamlessly, whether you're sending messages or making cross-chain contract calls.

### DApp Development

For cross-chain dApp development, Wormhole formatted addresses simplify handling user wallet addresses across various blockchains. This allows developers to manage addresses consistently, regardless of whether they work with EVM, Solana, or another supported platform.

### Relayers and Infrastructure

Finally, relayers and infrastructure components, such as Wormhole Guardians, rely on the standardized format to efficiently process and relay cross-chain messages. A uniform address format simplifies operations, ensuring smooth interoperability across multiple blockchains.
