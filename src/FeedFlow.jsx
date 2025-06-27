// FeedFlow.jsx
import React, { useState } from "react"
import { useLocation } from "react-router-dom"
import V3SignerSetup from "./V3SignerSetup"
import FeedCreationScreen from "./FeedCreationScreen"

export default function FeedFlow() {
  const [signer, setSigner] = useState(null)
  const location = useLocation()
  const beeApiUrl = location.state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633"
  const swarmHash = location.state?.swarmHash || ""

  return (
    <div>
      {!signer ? (
        <V3SignerSetup onSignerReady={setSigner} />
      ) : (
        <FeedCreationScreen
          signer={signer}
          beeApiUrl={beeApiUrl}
          onReset={() => setSigner(null)}
          swarmHash={swarmHash}
        />
      )}
    </div>
  )
}
