import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bee } from "@ethersphere/bee-js";
import * as PODUI from "@pcd/pod-pcd-ui";

export default function PodPassportViewer() {
  const { state } = useLocation();
  const [beeUrl, setBeeUrl] = useState(state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633");
  const [reference, setReference] = useState(state?.reference || "");
  const [pathInCollection, setPathInCollection] = useState(state?.collectionPath || ""); // e.g. "export.json"
  const [pcds, setPcds] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const bee = new Bee(beeUrl.replace(/\/+$/, ""));

      // Single-file vs collection path
      const resp = pathInCollection
        ? await bee.downloadFile(reference, pathInCollection)
        : await bee.downloadFile(reference);

      if (!resp || !resp.data) {
        throw new Error(
          "Bee returned no data. Check the reference/path and use your own Bee node (encrypted refs won’t decrypt on public gateways)."
        );
      }

      // --- Normalize to Uint8Array for TextDecoder ---
      let bytes;
      if (resp.data instanceof Uint8Array) {
        bytes = resp.data;
      } else if (resp.data?.bytes instanceof Uint8Array) {
        // ← bee-js browser build: _Bytes { bytes: Uint8Array, length: number }
        bytes = resp.data.bytes;
      } else if (resp.data?.arrayBuffer) {
        // Blob / Response-like
        bytes = new Uint8Array(await resp.data.arrayBuffer());
      } else if (resp.data?.data) {
        // Some builds: { data: <Uint8Array|Array> }
        bytes =
          resp.data.data instanceof Uint8Array
            ? resp.data.data
            : new Uint8Array(resp.data.data);
      } else {
        console.warn("Unexpected resp.data shape:", resp);
        throw new Error("Unexpected response data type from Bee.");
      }
      // ----------------------------------------------

      const text = new TextDecoder().decode(bytes);
      const exp = JSON.parse(text);

      // Zupass export parsing
      let list = [];
      if (typeof exp?.pcds === "string") {
        const inner = JSON.parse(exp.pcds);
        list = inner?.pcds ?? [];
      } else if (Array.isArray(exp?.pcds)) {
        list = exp.pcds;
      }

      setPcds(list);
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  function PodCard({ pcd }) {
    // Try common exports across versions
    const Comp =
      PODUI.PODPCDCardBody ||
      PODUI.PodPcdCard ||
      PODUI.PODPCDCard ||
      PODUI.PODCardBody;

    if (Comp) {
      return (
        <Comp
          pcd={pcd}
          expanded={true}
          setExpanded={() => {}}
          displayOptions={{}}
        />
      );
    }

    // Fallback: pretty-print JSON if no UI component is available
    return (
      <pre className="text-xs overflow-auto">
        {JSON.stringify(pcd, null, 2)}
      </pre>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">POD Passport</h2>

      {/* prefilled from Upload screen state, but user can adjust */}
      <div className="flex gap-2 items-center">
        <input
          className="border p-2 rounded w-1/3"
          value={beeUrl}
          onChange={(e) => setBeeUrl(e.target.value)}
          placeholder="Bee URL"
        />
        <input
          className="border p-2 rounded flex-1"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Swarm reference (hex)"
        />
        <input
          className="border p-2 rounded w-1/3"
          value={pathInCollection}
          onChange={(e) => setPathInCollection(e.target.value)}
          placeholder="(optional) path in collection e.g. export.json"
        />
        <button
          className="px-3 py-2 rounded bg-black text-white"
          onClick={load}
        >
          Load
        </button>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="grid gap-3">
        {pcds.map((pcd, i) => (
          <div key={i} className="rounded border p-3">
            <PodCard pcd={pcd} />
          </div>
        ))}
      </div>
    </div>
  );
}
