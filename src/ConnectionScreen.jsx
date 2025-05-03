import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BeeConnection from "./BeeConnection";

// This screen connects the user to the Bee node and, once connected, allows navigation to the Upload screen
export default function ConnectionScreen() {
  const [beeApiUrl, setBeeApiUrl] = useState("http://bee.swarm.public.dappnode:1633");
  const [wallet, setWallet] = useState(null);
  const [batches, setBatches] = useState([]);
  const navigate = useNavigate();

  return (
    <div>
      <BeeConnection
        beeApiUrl={beeApiUrl}
        setBeeApiUrl={setBeeApiUrl}
        wallet={wallet}
        setWallet={setWallet}
        batches={batches}
        setBatches={setBatches}
      />

      {/* Show "Proceed to Upload" once Bee node is connected */}
      {wallet && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: "18px", padding: "12px 24px" }}
            onClick={() =>
              navigate("/upload", {
                state: {
                  beeApiUrl,
                  wallet,
                  batches
                }
              })
            }
          >
            Proceed to Upload →
          </button>
        </div>
      )}
    </div>
  );
}

