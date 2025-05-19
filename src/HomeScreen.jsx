// HomeScreen.jsx - Clean and Centered Layout (Perfectly Balanced)
import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css";
import ThemeToggle from "./ThemeToggle"; // ✅ Import Toggle

export default function HomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="app-container home-screen">
      <div className="logo-container">
        <img src="/logo.png" alt="WoCo Logo" className="logo" />
      </div>
      
      <div className="theme-toggle-container">
        <ThemeToggle />
        </div>

      <div className="text-container">
        <h1 className="main-title">WoCo</h1>
        <h2 className="sub-title">World Computer Foundation</h2>

        <div className="button-group">
        <button onClick={() => navigate("/connect")} className="btn btn-primary">
          Connect to Bee Node
        </button>
      </div>

        <p className="description">
        Easily upload and manage files on Ethereum Swarm, with automatic ENS content hash updates - connect 
        to your Bee node to get started. WoCo is continuously evolving, delivering exciting updates, and working to 
        build <br></br>the only app we'll ever need. <br></br><br></br>
        
        As an open-source initiative, WoCo creates the World Computer by fusing p2p technologies to deliver secure, 
        scalable storage, connectivity, and computation. Our mission is to disrupt digital marketplaces, redirecting 
        shareholder profits back into communities - Ultimately, reshaping the way we connect and communicate on<br></br>the 
        internet... a change is coming.<br></br><br></br>

        Coming Soon:<br></br>
        - World-first fully decentralized profiles and message boards, revolutionizing user interactions with complete decentralization.<br></br>
        - Enhanced storage options with the ability to locally store Swarm hashes and feeds, transitioning toward seamless 
        integration within user profiles.</p>
      </div>

      <div className="getting-started">
        <h2>Getting Started</h2>
        <p>To use this app, you will need a Bee node running. Learn how to set up:</p>
        <ul>
          <li>
            <a href="https://docs.ethswarm.org/docs/bee/installation/getting-started/" target="_blank" rel="noopener noreferrer">
              Bee Node Setup Guide
            </a>
          </li>
        </ul>
      </div>

      <div className="button-group">
        <button onClick={() => navigate("/connect")} className="btn btn-primary">
          Connect to Bee Node
        </button>
      </div>
      <a href="https://github.com/yea-80y/Swarm-Uploader" target="_blank" rel="noopener noreferrer">
              Check Out Our GitHub
            </a>
            <div className="discord-link">
        <p className="discord-text">
          Join Our Community on Discord
          <a 
            href="https://discord.gg/YOUR_DISCORD_INVITE_LINK" 
            target="_blank" 
            rel="noopener noreferrer"
            className="discord-button"
          >
            <img src="/discord-icon.svg" alt="Discord" className="discord-icon" />
          </a>
        </p>
      </div>
        <p>Built by the Community, For the Community🦾🦾</p>
    </div>
  );
}
