# Barzakh - AI-Powered Blockchain Intelligence

<img width="3741" height="1751" alt="quality_restoration_20250729043626503" src="https://github.com/user-attachments/assets/bdb03347-8615-4be3-8920-aca4a7fc54b5" />


[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-purple.svg)](https://github.com/your-username/barzakh)

> **A New Gen AI for Blockchain** - Streamline On-Chain Workflows with AI Simplicity

Barzakh is an intelligent blockchain analytics platform that combines real-time on-chain data analysis with powerful AI-driven insights. From wallet monitoring to market sentiment analysis, we automate the complex workflows that drive blockchain intelligence.

## 🌟 Key Features

### 🤖 **Blockchain AI Assistant**
- Intelligent agents for wallet activity tracking
- Real-time on-chain behavior monitoring  
- Automated crypto and regulatory news fetching

### 📊 **Real-Time Intelligence**
- Live blockchain data access
- Smart wallet insights and growth analytics
- Full-spectrum workflow automation

### 🔍 **Unified Data Platform**
- Web sources and blockchain data integration
- AI-powered trend tracking across crypto markets
- Comprehensive market sentiment monitoring

### ⚡ **Smart Automation**
- On-chain data scraping and analysis
- Breaking news discovery and alerts
- Real-time wallet monitoring and notifications

## 🏗️ Project Structure

```
barzakh/
├── README.md
├── apps
│   ├── javin
│   │   ├── LICENSE
│   │   ├── README.md
│   │   ├── app
│   │   │   ├── (auth)
│   │   │   │   ├── actions.ts
│   │   │   │   ├── api
│   │   │   │   │   ├── auth
│   │   │   │   │   │   └── [...nextauth]
│   │   │   │   │   │       └── route.ts
│   │   │   │   │   ├── logout
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── resend-otp
│   │   │   │   │       └── route.ts
│   │   │   │   ├── auth.config.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── forgotpassword
│   │   │   │   │   ├── [token]
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── login
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register
│   │   │   │       └── page.tsx
│   │   │   ├── (chat)
│   │   │   │   ├── actions.ts
│   │   │   │   ├── api
│   │   │   │   │   ├── chat
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── document
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── files
│   │   │   │   │   │   └── upload
│   │   │   │   │   │       └── route.ts
│   │   │   │   │   ├── history
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── messagelimitcron
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── settings
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── suggestions
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── vote
│   │   │   │   │       └── route.ts
│   │   │   │   ├── chat
│   │   │   │   │   └── [id]
│   │   │   │   │       ├── default.tsx
│   │   │   │   │       ├── layout.tsx
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── pwa_stuff.tsx
│   │   │   │   └── twitter-image.png
│   │   │   ├── api
│   │   │   │   └── changes-email
│   │   │   │       ├── request-email-change
│   │   │   │       │   └── route.ts
│   │   │   │       └── verify-email-change
│   │   │   │           └── route.ts
│   │   │   ├── favicon.ico
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── manifest.ts
│   │   ├── biome.jsonc
│   │   ├── components
│   │   │   ├── AddressBlock.tsx
│   │   │   ├── Input
│   │   │   │   ├── GroupSelector.tsx
│   │   │   │   ├── ToolbarButton.tsx
│   │   │   │   ├── model-selector.tsx
│   │   │   │   └── multimodal-input.tsx
│   │   │   ├── action-result-overlay.tsx
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── auth-form.tsx
│   │   │   ├── auth-modal.tsx
│   │   │   ├── birdeye
│   │   │   │   ├── PortfolioTable.tsx
│   │   │   │   └── TokenInfoTable.tsx
│   │   │   ├── bottom-sheet.tsx
│   │   │   ├── chat-header.tsx
│   │   │   ├── chat.tsx
│   │   │   ├── code-block.tsx
│   │   │   ├── code-editor.tsx
│   │   │   ├── console.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── icon.tsx
│   │   │   ├── icons.tsx
│   │   │   ├── image-editor.tsx
│   │   │   ├── install-prompt.tsx
│   │   │   ├── markdown.css
│   │   │   ├── markdown.tsx
│   │   │   ├── message-actions.tsx
│   │   │   ├── message-editor.tsx
│   │   │   ├── message-reasoning.tsx
│   │   │   ├── message.tsx
│   │   │   ├── messages.tsx
│   │   │   ├── multi-search.tsx
│   │   │   ├── overview.tsx
│   │   │   ├── preview-attachment.tsx
│   │   │   ├── settings
│   │   │   │   ├── account
│   │   │   │   │   └── account-page.tsx
│   │   │   │   ├── billing
│   │   │   │   │   └── billing-page.tsx
│   │   │   │   ├── email
│   │   │   │   │   └── email-page.tsx
│   │   │   │   └── password
│   │   │   │       └── password-page.tsx
│   │   │   ├── settings-menu.tsx
│   │   │   ├── sheet-editor.tsx
│   │   │   ├── sidebar-history.tsx
│   │   │   ├── sidebar-toggle.tsx
│   │   │   ├── sidebar-user-nav.tsx
│   │   │   ├── sign-out-form.tsx
│   │   │   ├── submit-button.tsx
│   │   │   ├── suggested-actions.tsx
│   │   │   ├── text-strip.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   ├── ui
│   │   │   │   ├── accordion.tsx
│   │   │   │   ├── alert-dialog.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── drawer.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   └── tooltip.tsx
│   │   │   ├── use-scroll-to-bottom.ts
│   │   │   ├── visibility-selector.tsx
│   │   │   └── weather.tsx
│   │   ├── components.json
│   │   ├── context
│   │   │   └── view-context.tsx
│   │   ├── drizzle.config.ts
│   │   ├── hooks
│   │   │   ├── use-chat-visibility.ts
│   │   │   ├── use-media-query.tsx
│   │   │   ├── use-mobile.tsx
│   │   │   └── use-window-size.tsx
│   │   ├── lib
│   │   │   ├── db
│   │   │   │   ├── db.ts
│   │   │   │   ├── migrate.ts
│   │   │   │   ├── migrations
│   │   │   │   │   ├── 0000_keen_devos.sql
│   │   │   │   │   ├── 0001_sparkling_blue_marvel.sql
│   │   │   │   │   ├── 0002_wandering_riptide.sql
│   │   │   │   │   ├── 0003_cloudy_glorian.sql
│   │   │   │   │   ├── 0004_odd_slayback.sql
│   │   │   │   │   └── meta
│   │   │   │   │       ├── 0000_snapshot.json
│   │   │   │   │       ├── 0001_snapshot.json
│   │   │   │   │       ├── 0002_snapshot.json
│   │   │   │   │       ├── 0003_snapshot.json
│   │   │   │   │       ├── 0004_snapshot.json
│   │   │   │   │       └── _journal.json
│   │   │   │   ├── queries.ts
│   │   │   │   └── schema.ts
│   │   │   ├── utils
│   │   │   │   └── email.ts
│   │   │   └── utils.ts
│   │   ├── middleware.ts
│   │   ├── next-env.d.ts
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── pnpm-lock.yaml
│   │   ├── postcss.config.mjs
│   │   ├── public
│   │   │   ├── fonts
│   │   │   │   ├── geist-mono.woff2
│   │   │   │   ├── geist.woff2
│   │   │   │   └── gramatika_black.ttf
│   │   │   ├── images
│   │   │   │   ├── chain-logo
│   │   │   │   │   ├── arbitrum.png
│   │   │   │   │   ├── avalanche.png
│   │   │   │   │   ├── base.png
│   │   │   │   │   ├── binance.png
│   │   │   │   │   ├── ethereum.png
│   │   │   │   │   ├── optimism.png
│   │   │   │   │   ├── polygon.png
│   │   │   │   │   ├── solana.png
│   │   │   │   │   ├── sui.png
│   │   │   │   │   └── zksync.png
│   │   │   │   ├── icon
│   │   │   │   │   ├── aptos
│   │   │   │   │   │   └── aptos-logo.png
│   │   │   │   │   ├── creditcoin
│   │   │   │   │   │   ├── creditcoin-black.png
│   │   │   │   │   │   └── creditcoin-white.png
│   │   │   │   │   ├── flow-logo.png
│   │   │   │   │   ├── monad
│   │   │   │   │   │   └── monad-logo.jpg
│   │   │   │   │   ├── sei
│   │   │   │   │   │   └── sei-logo.png
│   │   │   │   │   ├── solana
│   │   │   │   │   │   └── solana.png
│   │   │   │   │   ├── vana
│   │   │   │   │   │   ├── vana-icon-black.png
│   │   │   │   │   │   └── vana-icon-white.png
│   │   │   │   │   ├── wormhole
│   │   │   │   │   │   └── wormhole-logo.png
│   │   │   │   │   └── zeta
│   │   │   │   │       └── zetachain-logo.png
│   │   │   │   └── javin
│   │   │   │       ├── SirathLogo-192px.png
│   │   │   │       ├── SirathLogo-512px.png
│   │   │   │       ├── SirathLogo.svg
│   │   │   │       ├── banner
│   │   │   │       │   ├── SirathLogo-512px.png
│   │   │   │       │   └── sirath-banner.svg
│   │   │   │       ├── preview
│   │   │   │       │   └── barzakh_preview_banner.png
│   │   │   │       └── screenshots
│   │   │   │           ├── Screenshot_1280x960.png
│   │   │   │           └── Screenshot_400x800.png
│   │   │   ├── sw.js
│   │   │   └── video
│   │   │       └── background.mp4
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── types
│   │   │   └── next-auth.d.ts
│   │   └── vercel.json
│   └── javin-api
│       ├── README.md
│       ├── eslint.config.mjs
│       ├── next.config.ts
│       ├── package.json
│       ├── public
│       │   ├── file.svg
│       │   ├── globe.svg
│       │   ├── next.svg
│       │   ├── vercel.svg
│       │   └── window.svg
│       ├── src
│       │   └── app
│       │       └── api
│       │           ├── chat
│       │           │   └── completions
│       │           │       ├── route.ts
│       │           │       └── type.ts
│       │           └── completions
│       │               ├── route.ts
│       │               └── type.ts
│       ├── tsconfig.json
│       └── vercel.json
├── bun.lock
├── package.json
├── packages
│   └── shared
│       ├── package.json
│       ├── src
│       │   ├── index.ts
│       │   ├── lib
│       │   │   ├── ai
│       │   │   │   ├── agents
│       │   │   │   │   └── getRelevantWebsiteContentAgent.ts
│       │   │   │   ├── models.ts
│       │   │   │   ├── prompts.ts
│       │   │   │   └── tools
│       │   │   │       ├── aptos
│       │   │   │       │   ├── aptos-graphql-limited-schema.json
│       │   │   │       │   ├── aptos-graphql-portfolio.ts
│       │   │   │       │   ├── aptos-graphql-schema.json
│       │   │   │       │   ├── aptos-names.ts
│       │   │   │       │   ├── aptosGraphqlFunctions.ts
│       │   │   │       │   ├── aptosscan-openapi.json
│       │   │   │       │   ├── get-aptos-api-data.ts
│       │   │   │       │   ├── get-aptos-graphql-data.ts
│       │   │   │       │   ├── get-aptoscan-api-data.ts
│       │   │   │       │   └── get-stats.ts
│       │   │   │       ├── creditcoin
│       │   │   │       │   ├── get-creditcon-api-data.ts
│       │   │   │       │   └── get-stats.ts
│       │   │   │       ├── defi-llama.ts
│       │   │   │       ├── defillama-openapi.json
│       │   │   │       ├── ens-to-address.ts
│       │   │   │       ├── evm
│       │   │   │       │   ├── search-token-evm.ts
│       │   │   │       │   └── wallet-portfolio-evm.ts
│       │   │   │       ├── flow
│       │   │   │       │   ├── get-flow-api-data.ts
│       │   │   │       │   └── get-stats.ts
│       │   │   │       ├── monad
│       │   │   │       │   ├── get-monad-api-data.ts
│       │   │   │       │   ├── get-stats.ts
│       │   │   │       │   └── monad-opanapi.json
│       │   │   │       ├── onchain
│       │   │   │       │   ├── api-fetch.ts
│       │   │   │       │   ├── constant.ts
│       │   │   │       │   ├── get_evm_onchain_data_using_etherscan.ts
│       │   │   │       │   ├── get_evm_onchain_data_using_zerion.ts
│       │   │   │       │   ├── noves-openapi.json
│       │   │   │       │   └── zerion-openapi.json
│       │   │   │       ├── scrap-site.ts
│       │   │   │       ├── sei
│       │   │   │       │   ├── get-sei-api-data.ts
│       │   │   │       │   ├── get-stats.ts
│       │   │   │       │   └── seitrace-opanapi.json
│       │   │   │       ├── solana
│       │   │   │       │   ├── search-token-solana.ts
│       │   │   │       │   └── wallet-portfolio-solana.ts
│       │   │   │       ├── translate-transactions.ts
│       │   │   │       ├── vana
│       │   │   │       │   ├── get-stats.ts
│       │   │   │       │   └── get-vana-api-data.ts
│       │   │   │       ├── web-search.ts
│       │   │   │       ├── wormhole
│       │   │   │       │   ├── get-stats.ts
│       │   │   │       │   └── get-wormhole-api-data.ts
│       │   │   │       └── zeta
│       │   │   │           ├── get-stats.ts
│       │   │   │           └── get-zeta-api-data.ts
│       │   │   ├── constants.ts
│       │   │   └── utils
│       │   │       ├── crawl-site.ts
│       │   │       ├── firecrawlapp.ts
│       │   │       ├── get-stat-page-sceenshot.ts
│       │   │       ├── make-blockscout-api-request.ts
│       │   │       ├── make-blockvision-api-request.ts
│       │   │       ├── make-seitrace-api-request.ts
│       │   │       ├── multichain-ens-lookup.ts
│       │   │       ├── openapi.ts
│       │   │       ├── scrape-site.ts
│       │   │       └── utils.ts
│       │   └── types
│       │       ├── next-auth.d.ts
│       │       ├── token-search-response.ts
│       │       └── wallet-actions-response.ts
│       └── tsconfig.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── turbo.json
```

## 🛠️ Development

### Frontend (Javin)
Located in `apps/javin/`
- **Framework**: React 18+ with modern hooks
- **Styling**: Tailwind CSS / Styled Components
- **State Management**: Context API / Redux Toolkit
- **Build Tool**: Vite / Create React App

### Backend (Javin API)
Located in `apps/javin-api/`
- **Runtime**: Node.js with Express/Fastify
- **Database**: PostgreSQL / MongoDB
- **AI Integration**: OpenAI API / Custom models
- **Blockchain APIs**: Etherscan, Moralis, Alchemy

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Roadmap

- [x] Core blockchain data integration
- [x] AI-powered wallet analysis
- [x] Real-time monitoring system
- [x] Advanced predictive analytics
- [x] Multi-chain support expansion
- [x] Mobile application
- [x] Dashboard

## 🏆 Why Choose Barzakh?

### vs Traditional Analytics
- ✅ **AI-Powered**: Automated insights vs manual analysis
- ✅ **Real-Time**: Live data vs delayed reporting  
- ✅ **Unified Platform**: All-in-one vs fragmented tools

### vs Competitors
- 🚀 **Full-Stack Automation**: Complete workflow automation
- 🧠 **Advanced AI**: Next-gen intelligence capabilities
- 🔗 **Blockchain Native**: Built specifically for crypto workflows

## 📞 Support

- **Email**: support@sirath.network
- **Website**: [https://barzakh.framer.ai](https://barzakh.framer.ai)
- **Issues**: [GitHub Issues](https://github.com/your-username/barzakh/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Blockchain data providers (Etherscan, Moralis, Alchemy, Zerion)
- AI/ML libraries and frameworks
- Open source community contributors

---
