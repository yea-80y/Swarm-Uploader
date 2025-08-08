# 🐝 Swarm Uploader

A decentralized file and website uploader for the [Ethereum Swarm](https://docs.ethswarm.org/) network, built with React and Bee-js.

This app was developed as a hands-on way to better understand Swarm's storage model, including postage stamps, feeds, and node interaction. It allows users to manage storage capacity, upload content, and experiment with decentralised profiles/identity — all from a simple UI.

## 🚀 Features

- Upload **files or entire websites (directories)** to Swarm  
- Manage postage batches: **buy**, **top up**, and **dilute** to increase capacity  
- Support for **immutable** and **mutable** uploads  
- Integration with **Swarm Feeds** for content updates  
- Experimental **Swarm-based user profiles** (profile picture, bio, mood)  
- Optional **ENS integration** – update your content hash with a single click  
- **Local history** saved in JSON for tracking uploads and feeds  
- View **xBZZ wallet balance** and node health  
- Connect to any Bee node (default: `http://localhost:1633` or a custom URL)

## 🛠 Tech Stack

- React  
- @ethersphere/bee-js  
- Swarm Bee Node (full or light)  
- Ethereum Wallet (via Bee node signer)  
- JSON (for local metadata/history storage)

## 📦 Installation

### Prerequisites

- Node.js v18+  
- A running [Bee node](https://docs.ethswarm.org/docs/bee/installation/quick-start/) (local or remote)  
- Some xBZZ in your Bee wallet to buy or top up batches  

### Setup

```bash
# Clone the repository
git clone https://github.com/yea-80y/Swarm-Uploader.git
cd Swarm-Uploader

# Install dependencies
npm install

# Start the development server (Vite uses port 5173)
npm run dev
```

Then open your browser at: [http://localhost:5173](http://localhost:5173)

> 💡 The app will prompt you to connect to your Bee node. You can use `http://localhost:1633`, or any remote node (e.g., `http://bee.swarm.public.dappnode:1633`).

## 🔗 Key Screens

- **Home:** Connect to your Bee node, view available batches, check xBZZ wallet balance  
- **Upload:** Upload files or websites, choose a batch, manage TTL, dilution, and upload type  
- **Profile:** Create a decentralized profile with picture, bio, and mood stored on Swarm  
- **(Optional)** ENS: Update your domain’s content hash with your latest Swarm upload  

## 📂 File Structure

```
src/
├── components/       # Shared UI components
├── screens/          # Multi-screen flow (Home, Upload, Profile)
├── utils/            # Bee API helpers, local storage, ENS logic
├── styles/           # CSS files
└── App.jsx           # Main app entry point
```

## 🛣️ Next Steps

This uploader app became a gateway to deeper Swarm exploration — helping us understand key building blocks like feeds, postage, and persistent identity.

We are now extending this into:

### 🔮 Future Features

- A fully decentralized Reddit-style message board  
- Support for threaded comments stored on Swarm  
- Upload progress tracking and automatic retry on stall  
- Sound effect on successful upload (buzz!)  
- GUI installer for Bee node (incl. WSL setup for Windows users)  
- Automated ENS content hash updates  
- CowSwap transaction signing via Bee node wallet  

## 🙌 Built For the Community, by the Community

> This project is part of a larger vision to make decentralized storage accessible, functional, and empowering for end users.  
> From file uploads to forum threads, all content is truly **owned and served** by the user.

## 📄 License

This project is licensed under the MIT License.

