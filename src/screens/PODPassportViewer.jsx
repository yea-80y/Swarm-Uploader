import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { PCDCollection } from "@pcd/pcd-collection";

// PCD packages (logic)
import { PODPCDPackage } from "@pcd/pod-pcd";
import { PODTicketPCDPackage } from "@pcd/pod-ticket-pcd";
import { EmailPCDPackage } from "@pcd/email-pcd";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { PODEmailPCDPackage } from "@pcd/pod-email-pcd";

// UI renderers for each PCD type
import { PODPCDUI } from "@pcd/pod-pcd-ui";
import { PODTicketPCDUI } from "@pcd/pod-ticket-pcd-ui";
import { EmailPCDUI } from "@pcd/email-pcd-ui";
import { EdDSATicketPCDUI } from "@pcd/eddsa-ticket-pcd-ui";
import { SemaphoreIdentityPCDUI } from "@pcd/semaphore-identity-pcd-ui";
import { PODEmailPCDUI } from "@pcd/pod-email-pcd-ui";

export default function PodPassportViewer() {
  const { state } = useLocation();

  const PCD_PACKAGES = [
    PODPCDPackage,
    PODTicketPCDPackage,
    EmailPCDPackage,
    EdDSATicketPCDPackage,
    SemaphoreIdentityPCDPackage,
    PODEmailPCDPackage
    ];

  // Inputs
  const [beeUrl, setBeeUrl] = useState(state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633");
  const [reference, setReference] = useState(state?.reference || "");
  const [pathInCollection, setPathInCollection] = useState(state?.collectionPath || "");

  // State
  const [pcds, setPcds] = useState([]);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState({ tried: [], used: "", contentType: "", preview: "", textLen: 0 });

  // Step markers to see where we are
  const [step1OK, setStep1OK] = useState(false); // outer JSON parsed
  const [step2OK, setStep2OK] = useState(false); // inner pcds parsed
  const [step3OK, setStep3OK] = useState(false); // deserialized + rendered

  // Manual paste fallback (paste JSON you see in /bzz tab)
  const [manualJSON, setManualJSON] = useState("");

  /** Build candidate URLs (we’ll try /bzz variants then /bzz-raw) */
  function candidateUrls() {
    const base = beeUrl.replace(/\/+$/, "");
    const ref = reference.trim();
    const path = (pathInCollection || "").trim();
    if (!ref) return [];
    if (path) {
      return [
        `${base}/bzz/${ref}/${encodeURIComponent(path)}`,
        `${base}/bzz/${ref}/${path}`,
        `${base}/bzz/${ref}/${encodeURIComponent(path)}?download=true`,
        `${base}/bzz/${ref}/${path}?download=true`
      ];
    }
    return [
      `${base}/bzz/${ref}`,
      `${base}/bzz/${ref}/`,
      `${base}/bzz/${ref}?download=true`,
      `${base}/bzz/${ref}/?download=true`,
      `${base}/bzz-raw/${ref}`
    ];
  }

  /** Fetch text from the first candidate URL that returns non-empty content. */
  async function fetchFirstGoodText() {
    const urls = candidateUrls();
    const tried = [];
    for (const url of urls) {
      tried.push(url);
      const resp = await fetch(url, { method: "GET", cache: "no-store" }).catch(() => null);
      if (!resp || !resp.ok) continue;
      const contentType = resp.headers.get("content-type") || "";
      const text = await resp.text(); // don’t trim here; we’ll show raw preview
      if (text && text.length > 0) {
        setDebug({
          tried,
          used: url,
          contentType,
          preview: text.slice(0, 180).replace(/\s+/g, " "),
          textLen: text.length
        });
        return text;
      }
    }
    setDebug({ tried, used: "", contentType: "", preview: "", textLen: 0 });
    return null;
  }

  /** Parse the Zupass export text into a list of serialized PCDs (step 1 + 2). */
  function parseZupassExport(text) {
    // --- Step 1: outer JSON ---
    let exp;
    try {
      exp = JSON.parse(text);
      setStep1OK(true);
    } catch (e) {
      const preview = text.slice(0, 180).replace(/\s+/g, " ");
      throw new Error(`Step 1 (outer JSON) failed: ${e.message}\nPreview: ${preview}`);
    }

    /**
     * Zupass export shapes supported:
     * A) { pcds: "<stringified json>" }   <-- your export has this
     * B) { pcds: [ ... ] }
     * C) [ ... ] (array)
     * D) { pcd: { ... }, type: "..." } (single)
     */
    let list = [];

    if (typeof exp?.pcds === "string") {
      // --- Step 2: inner JSON (stringified) ---
      const innerStr = exp.pcds; // do not trim; parse as-is
      try {
        const inner = JSON.parse(innerStr);
        setStep2OK(true);
        if (Array.isArray(inner?.pcds)) list = inner.pcds;
        else if (Array.isArray(inner)) list = inner;
        else if (inner?.pcd && inner?.type) list = [inner];
        else throw new Error("Inner JSON didn’t contain an array of PCDs.");
      } catch (e) {
        const innerPrev = innerStr.slice(0, 180).replace(/\s+/g, " ");
        throw new Error(`Step 2 (inner pcds string) failed: ${e.message}\nInner preview: ${innerPrev}`);
      }
    } else if (Array.isArray(exp?.pcds)) {
      setStep2OK(true);
      list = exp.pcds;
    } else if (Array.isArray(exp)) {
      setStep2OK(true);
      list = exp;
    } else if (exp?.pcd && exp?.type) {
      setStep2OK(true);
      list = [exp];
    }

    if (!list.length) {
      throw new Error("Step 2 failed: Unrecognized export format; expected an array of serialized PCDs.");
    }
    return list;
  }

  /** Deserialize and render (step 3) with normalization + per-item per-package fallback. */
    async function renderPCDsFromText(text) {
    const serializedPCDs = parseZupassExport(text);

    // 1) Normalize: convert each entry's `pcd` JSON string -> object
    const normalized = [];
    const dropped = [];
    for (const s of serializedPCDs) {
        const type = s?.type || "(missing type)";
        const raw = s?.pcd;
        if (typeof raw !== "string" || !raw.length) {
        dropped.push({ type, reason: "pcd missing/not a string" });
        continue;
        }
        try {
        const obj = JSON.parse(raw); // make it an object for packages that expect objects
        normalized.push({ ...s, pcd: obj });
        } catch (e) {
        dropped.push({ type, reason: `pcd parse failed: ${(e?.message || e).toString()}` });
        }
    }

    if (!normalized.length) {
        throw new Error(`Step 3 failed: every entry was invalid. Dropped ${dropped.length} item(s).`);
    }

    // Packages map for targeted per-type deserialization
    const pkgByType = new Map([
        ["pod-pcd", PODPCDPackage],
        ["pod-ticket-pcd", PODTicketPCDPackage],
        ["email-pcd", EmailPCDPackage],
        ["eddsa-ticket-pcd", EdDSATicketPCDPackage],
        ["semaphore-identity-pcd", SemaphoreIdentityPCDPackage],
        ["pod-email-pcd", PODEmailPCDPackage]
    ]);

    // 2a) Try bulk with normalized objects first
    try {
        const collection = await PCDCollection.deserialize({
        serializedPCDs: normalized,
        pcdPackages: Array.from(pkgByType.values())
        });
        setPcds(collection.getAllPCDs());
        setStep3OK(true);
        if (dropped.length) setError(`Rendered ${normalized.length} item(s). Skipped ${dropped.length}.`);
        return;
    } catch (e) {
        // fall through to per-item targeted deserialize
    }

    // 2b) Per-item targeted deserialize so one bad item doesn’t block the rest
    const ok = [];
    const bad = [];

    for (let i = 0; i < normalized.length; i++) {
        const one = normalized[i];
        const type = one?.type;
        const pkg = pkgByType.get(type);

        if (!pkg) {
        bad.push({ index: i, type, note: "no package registered for this type" });
        continue;
        }

        try {
        // Each package supports deserializing one serialized PCD. Some expect `pcd` to be an object.
        const col = await PCDCollection.deserialize({
            serializedPCDs: [one],
            pcdPackages: [pkg]
        });
        ok.push(...col.getAllPCDs());
        } catch (e) {
        // Try again with stringified `pcd` (in case this package expects a string, not object)
        try {
            const fallbackOne = { ...one, pcd: JSON.stringify(one.pcd) };
            const col2 = await PCDCollection.deserialize({
            serializedPCDs: [fallbackOne],
            pcdPackages: [pkg]
            });
            ok.push(...col2.getAllPCDs());
        } catch (e2) {
            bad.push({
            index: i,
            type,
            note: (e2?.message || e2 || e)?.toString().slice(0, 160)
            });
        }
        }
    }

    if (ok.length) {
        setPcds(ok);
        setStep3OK(true);
        const skipped = dropped.length + bad.length;
        setError(
        `Rendered ${ok.length} item(s). Skipped ${skipped} invalid item(s).` +
        (bad.length ? ` Examples: ${bad.slice(0, 3).map(b => `${b.type}`).join(", ")}...` : "")
        );
    } else {
        throw new Error(
        `Step 3 failed: couldn't deserialize any PCDs. Example error: ${bad[0]?.note || "(none)"}`
        );
    }
    }

  /** Main Load action */
  async function load() {
    setError("");
    setPcds([]);
    setDebug({ tried: [], used: "", contentType: "", preview: "", textLen: 0 });
    setStep1OK(false);
    setStep2OK(false);
    setStep3OK(false);

    try {
      if (manualJSON.trim().length > 0) {
        await renderPCDsFromText(manualJSON);
        return;
      }
      const text = await fetchFirstGoodText();
      if (!text) throw new Error("Couldn’t fetch any text. See Debug for URLs tried.");
      await renderPCDsFromText(text);
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  /** Render a PCD via the correct UI component for its type. */
  function PodCard({ pcd }) {
    switch (pcd.type) {
      case "pod-pcd":
        return <PODPCDUI pcd={pcd} expanded />;
      case "pod-ticket-pcd":
        return <PODTicketPCDUI pcd={pcd} expanded />;
      case "pod-email-pcd":
        return <PODEmailPCDUI pcd={pcd} expanded />;
      case "email-pcd":
        return <EmailPCDUI pcd={pcd} expanded />;
      case "eddsa-ticket-pcd":
        return <EdDSATicketPCDUI pcd={pcd} expanded />;
      case "semaphore-identity-pcd":
        return <SemaphoreIdentityPCDUI pcd={pcd} expanded />;
      default:
        return <pre className="text-xs overflow-auto">{JSON.stringify(pcd, null, 2)}</pre>;
    }
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">POD Passport</h2>

      {/* Controls */}
      <div className="flex flex-col gap-2">
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
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="border p-2 rounded w-1/3"
            value={pathInCollection}
            onChange={(e) => setPathInCollection(e.target.value)}
            placeholder="(optional) exact filename if manifest"
          />
          <button className="px-3 py-2 rounded bg-black text-white" onClick={load}>
            Load
          </button>
        </div>

        {/* Manual paste fallback */}
        <details>
          <summary className="cursor-pointer select-none">Or paste JSON directly (bypass fetch)</summary>
          <textarea
            className="border p-2 rounded w-full h-40 font-mono text-xs"
            placeholder="Paste the JSON you see in the browser at /bzz/<hash> here, then click Load."
            value={manualJSON}
            onChange={(e) => setManualJSON(e.target.value)}
          />
        </details>
      </div>

      {/* Step indicators */}
      <div className="text-xs space-y-1">
        <div>Step 1 (outer JSON): {step1OK ? <span className="text-green-600">OK</span> : <span className="text-gray-500">pending</span>}</div>
        <div>Step 2 (inner pcds): {step2OK ? <span className="text-green-600">OK</span> : <span className="text-gray-500">pending</span>}</div>
        <div>Step 3 (deserialize): {step3OK ? <span className="text-green-600">OK</span> : <span className="text-gray-500">pending</span>}</div>
      </div>

      {/* Error */}
      {error && <div className="text-red-500 text-sm whitespace-pre-wrap">{error}</div>}

      {/* Debug info */}
      <details className="text-xs text-gray-600" open>
        <summary>Debug</summary>
        <div>Used: {debug.used || "(none)"} </div>
        <div>Content-Type: {debug.contentType || "(none)"} </div>
        <div>Text length: {debug.textLen}</div>
        <div>Also tried:</div>
        <ul className="list-disc ml-5">
          {debug.tried.map((u, i) => (
            <li key={i}>{u}</li>
          ))}
        </ul>
        <div className="mt-2">Preview: {debug.preview}</div>
      </details>

      {/* Rendered PCDs */}
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
