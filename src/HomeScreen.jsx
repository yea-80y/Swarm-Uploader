// HomeScreen.jsx - Landing Page
import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css";

export default function HomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <div className="card">
        <h1>WoCo - World Computer Foundation</h1>
        <p>
          Easily upload and manage files on Ethereum Swarm, with support for
          both immutable and mutable uploads. Get started by connecting to your
          Bee node.
        </p>

        <h2>Getting Started</h2>
        <p>To use this app, you will need a Bee node running. Learn how to set up:</p>
        <ul>
          <li>
            <a href="https://docs.ethswarm.org/docs/installation/overview" target="_blank" rel="noopener noreferrer">
              Bee Node Setup Guide
            </a>
          </li>
          <li>
            <a href="https://docs.ethswarm.org/docs/access/cli" target="_blank" rel="noopener noreferrer">
              Swarm CLI Guide
            </a>
          </li>
        </ul>

        <div className="button-group">
          <button onClick={() => navigate("/connect")} className="btn btn-primary">
            Connect to Bee Node
          </button>
        </div>
      </div>
    </div>
  );
}
