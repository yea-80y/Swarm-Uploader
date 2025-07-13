import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";

import HomeScreen from "./screens/HomeScreen";
import ConnectionScreen from "./screens/ConnectionScreen";
import UploadScreen from "./screens/UploadScreen";
import BuyBatchScreen from "./screens/BuyBatchScreen";
import ENSUpdateScreen from "./screens/ENSUpdateScreen";
import FeedCreationScreen from './screens/FeedCreationScreen';
import FeedFlow from './screens/FeedFlow';
import ProfileView from './screens/profile/ProfileView';
import ProfileEdit from './screens/profile/ProfileEdit';

import { SignerProvider } from './context/SignerContext.jsx';
import "./styles.css";

// ✅ You must now define a function component
function App() {
  const [beeApiUrl, setBeeApiUrl] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [userAddress, setUserAddress] = useState("");

  return (
    <React.StrictMode>
      <SignerProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route
              path="/connect"
              element={
                <ConnectionScreen
                  setBeeApiUrl={setBeeApiUrl}
                  setSelectedBatch={setSelectedBatch}
                  setUserAddress={setUserAddress}
                />
              }
            />
            <Route path="/upload" element={<UploadScreen beeApiUrl={beeApiUrl} selectedBatch={selectedBatch} />} />
            <Route path="/buy-batch" element={<BuyBatchScreen beeApiUrl={beeApiUrl} />} />
            <Route path="/ens-update" element={<ENSUpdateScreen beeApiUrl={beeApiUrl} />} />
            <Route path="/create-feed" element={<FeedFlow beeApiUrl={beeApiUrl} selectedBatch={selectedBatch} userAddress={userAddress} />} />
            <Route path="/create-profile" element={<FeedFlow beeApiUrl={beeApiUrl} selectedBatch={selectedBatch} userAddress={userAddress} profileMode={true} />} />
            <Route path="/edit-profile" element={<ProfileEdit beeApiUrl={beeApiUrl} selectedBatch={selectedBatch} userAddress={userAddress} />} />
            <Route path="/profile-view" element={<ProfileView beeApiUrl={beeApiUrl} userAddress={userAddress} />}
            />
          </Routes>
        </Router>
      </SignerProvider>
    </React.StrictMode>
  );
}

// ✅ This is how you must render it now
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
