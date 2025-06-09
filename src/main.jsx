import React from "react";
import ReactDOM from "react-dom/client";
// ✅ Switch to HashRouter (aliased as Router)
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import HomeScreen from "./HomeScreen";
import ConnectionScreen from "./ConnectionScreen";
import UploadScreen from "./UploadScreen";
import BuyBatchScreen from "./BuyBatchScreen";
import ENSUpdateScreen from "./ENSUpdateScreen";
import FeedCreationScreen from './FeedCreationScreen'
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router> {/* ✅ wraps routes with HashRouter */}
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/connect" element={<ConnectionScreen />} />
        <Route path="/upload" element={<UploadScreen />} />
        <Route path="/buy-batch" element={<BuyBatchScreen />} />
        <Route path="/ens-update" element={<ENSUpdateScreen />} />
        <Route path="/create-feed" element={<FeedCreationScreen />} />
      </Routes>
    </Router>
  </React.StrictMode>
);