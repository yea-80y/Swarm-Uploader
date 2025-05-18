// main.jsx - Updated with HomeScreen
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeScreen from "./HomeScreen"; // ✅ New Home Screen
import ConnectionScreen from "./ConnectionScreen";
import UploadScreen from "./UploadScreen";
import BuyBatchScreen from "./BuyBatchScreen";
import ENSUpdateScreen from "./ENSUpdateScreen";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/connect" element={<ConnectionScreen />} />
        <Route path="/upload" element={<UploadScreen />} />
        <Route path="/buy-batch" element={<BuyBatchScreen />} />
        <Route path="/ens-update" element={<ENSUpdateScreen />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);