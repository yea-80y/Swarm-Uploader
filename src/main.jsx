// main.jsx (Fully Corrected - Complete Navigation Flow)
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ConnectionScreen from "./ConnectionScreen";
import UploadScreen from "./UploadScreen";
import BuyBatchScreen from "./BuyBatchScreen";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConnectionScreen />} />
        <Route path="/upload" element={<UploadScreen />} />
        <Route path="/buy-batch" element={<BuyBatchScreen />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
