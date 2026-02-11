# Orbit Wallet (Static Demo)

Orbit is a simple, modern Solana wallet web interface built as a static site (pure HTML/CSS/JS using ethers.js and MetaMask or any injected wallet).

## Features

- Connect to an injected wallet (MetaMask, etc.)
- Show current network, address, and SOL balance
- Send ETH to another address
- Quick button to ask the wallet to switch to testnet

> **Security note:** This is a demo UI. Never use it for large amounts of real funds. It does not store private keys; all signing happens inside the browser wallet extension.

## Local development

You can open `index.html` directly in your browser, but for best results run a tiny static server:

```bash
cd /path/to/orbit
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Deploying to the internet

Because Orbit is a static site (no backend), you can deploy it almost anywhere:

- **GitHub Pages**
  - Create a new GitHub repo and push the files in this folder.
  - In the repo settings, enable Pages, using the `main` branch and root folder.
  - GitHub will give you a public URL for your site.
- **Netlify**
  - Drag and drop this folder into the Netlify dashboard, or connect your Git repo.
  - Set the publish directory to the project root (no build step required).
- **Vercel**
  - Import the repo into Vercel.
  - Framework preset: “Other”; no build command; output directory: `.`.

Once deployed, open the URL in a browser with MetaMask installed, connect your wallet, and Orbit will be live on the internet.

