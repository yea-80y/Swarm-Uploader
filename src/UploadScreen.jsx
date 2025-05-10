import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bee } from "@ethersphere/bee-js";

// Mapping from batch depth to effective capacity in MB (for Medium erasure coding)
const EFFECTIVE_VOLUME_MEDIUM_MB = {
  17: 0.04156, 18: 6.19, 19: 104.18, 20: 639.27,
  21: 2410, 22: 7180, 23: 18540, 24: 43750,
  25: 98090, 26: 211950, 27: 443160, 28: 923780,
  29: 1900000, 30: 3880000, 31: 7860000, 32: 15870000,
  33: 31940000, 34: 64190000, 35: 128800000, 36: 258190000,
  37: 517230000, 38: 1040000000, 39: 2070000000,
  40: 4150000000, 41: 8300000000
};

export default function UploadScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const beeApiUrl = state?.beeApiUrl;
  const wallet = state?.wallet;
  const batches = state?.batches;

  const [uploadMode, setUploadMode] = useState("file");
  const [file, setFile] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [isImmutable, setIsImmutable] = useState(true);
  const [uploadStatus, setUploadStatus] = useState("");
  const [feedName, setFeedName] = useState("");

  const bee = new Bee(beeApiUrl);

  const saveAsJson = (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "swarm_upload_info.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file || !selectedBatch) return;

    setUploadStatus("Uploading...");

    try {
      const batch = batches.find(b => b.batchID === selectedBatch);
      if (!batch) throw new Error("Selected batch not found.");

      const isBatchMutable = batch.immutable === false;

      if (isImmutable !== !isBatchMutable) {
        setUploadStatus("❌ Upload failed: File type does not match batch type.");
        return;
      }

      let reference = "";

      if (uploadMode === "file") {
        // Always use direct upload for single files
        const result = await bee.uploadFile(selectedBatch, file);
        reference = result.reference;
      } else {
        // Only use feed for folders (websites) if mutable
        if (isImmutable) {
          const result = await bee.uploadFiles(selectedBatch, file);
          reference = result.reference;
        } else {
          const topic = feedName || "website";
          const result = await bee.uploadFiles(selectedBatch, file);
          reference = result.reference;
        }
      }

      setUploadStatus(`✅ Uploaded! Swarm Hash: ${reference}`);

      if (window.confirm("Save upload info locally?")) {
        saveAsJson({
          type: isImmutable ? "immutable" : "mutable",
          fileName: file.name,
          reference,
          feedName: !isImmutable && uploadMode === "folder" ? (feedName || "website") : undefined,
          batchId: selectedBatch,
          uploadMode,
          ethereumAddress: wallet.ethereumAddress,
          date: new Date().toISOString()
        });
      }

    } catch (err) {
      setUploadStatus("❌ Upload failed: " + err.message);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>Upload to Swarm</h1>

        <label>Immutable:</label>
        <input
          type="checkbox"
          checked={isImmutable}
          onChange={() => setIsImmutable(!isImmutable)}
        />

        <button onClick={handleUpload}>Upload to Swarm</button>
        {uploadStatus && <p>{uploadStatus}</p>}
      </div>
    </div>
  );
}
