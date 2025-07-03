// FeedFlow.jsx
import React, { useState } from "react"
import V3SignerSetup from "./V3SignerSetup"
import FeedCreationScreen from "./FeedCreationScreen"
import ProfilePage from "./profile/ProfilePage"

export default function FeedFlow({ beeApiUrl, userAddress, profileMode = false }) {
  const [signer, setSigner] = useState(null)
  const swarmHash = "" // Optional: you can remove this if no longer used

  return (
    <div>
      {!signer ? (
        <V3SignerSetup onSignerReady={setSigner} />
      ) : profileMode ? (
        <ProfilePage
          signer={signer}
          onReset={() => setSigner(null)} 
          userAddress={userAddress}
        />
      ) : (
        <FeedCreationScreen
          signer={signer}
          onReset={() => setSigner(null)}
          swarmHash={swarmHash}
        />
      )}
    </div>
  )
}

