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

// UI renderers for each PCD type (note: these export UI *objects* with renderCardBody)
import { PODPCDUI } from "@pcd/pod-pcd-ui";
import { PODTicketPCDUI } from "@pcd/pod-ticket-pcd-ui";
import { EmailPCDUI } from "@pcd/email-pcd-ui";
import { EdDSATicketPCDUI } from "@pcd/eddsa-ticket-pcd-ui";
import { SemaphoreIdentityPCDUI } from "@pcd/semaphore-identity-pcd-ui";
import { PODEmailPCDUI } from "@pcd/pod-email-pcd-ui";

export default function PodPassportViewer() {
  const { state } = useLocation();

  // Packages list (kept for reference / potential future use)
  const PCD_PACKAGES = [
    PODPCDPackage,
    PODTicketPCDPackage,
    EmailPCDPackage,
    EdDSATicketPCDPackage,
    SemaphoreIdentityPCDPackage,
    PODEmailPCDPackage
  ];

  // Map PCD type -> package (used for signature verification)
  const PACKAGE_BY_TYPE = {
    "pod-pcd": PODPCDPackage,
    "pod-ticket-pcd": PODTicketPCDPackage,
    "pod-email-pcd": PODEmailPCDPackage,
    "email-pcd": EmailPCDPackage,
    "eddsa-ticket-pcd": EdDSATicketPCDPackage,
    "semaphore-identity-pcd": SemaphoreIdentityPCDPackage
  };

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

  // Signature verify results
  const [verifyResults, setVerifyResults] = useState([]);
  const [verifying, setVerifying] = useState(false);

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
      const text = await resp.text(); // keep raw for preview
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
      const innerStr = exp.pcds; // parse as-is
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

  // Fix "Invalid datetime" in some pod-ticket-pcd exports: add "Z" if missing
  function normalizePodTicketPCDJSONString(pcdStr) {
    try {
      const obj = JSON.parse(pcdStr);
      const maybeDate = obj?.claim?.ticket?.eventStartDate;
      if (typeof maybeDate === "string") {
        // If it has no timezone info (no 'Z' and no +/− offset), append 'Z'
        const hasTZ = /Z|[+\-]\d{2}:\d{2}$/.test(maybeDate);
        if (!hasTZ) {
          obj.claim.ticket.eventStartDate = `${maybeDate}Z`;
        }
      }
      return JSON.stringify(obj);
    } catch {
      // If parse fails, just return the original string; per-type code will handle errors.
      return pcdStr;
    }
  }

  /** Deserialize and render (step 3) by calling each package directly. */
  async function renderPCDsFromText(text) {
    const serializedPCDs = parseZupassExport(text);

    const ok = [];
    const bad = [];

    // ensure we always pass a string to the package
    function asStr(x) {
      return typeof x === "string" ? x : JSON.stringify(x);
    }

    for (let i = 0; i < serializedPCDs.length; i++) {
      const s = serializedPCDs[i];
      const type = s?.type || "(missing type)";
      const pcdStr = asStr(s?.pcd);

      try {
        let pcd;
        switch (type) {
          case "pod-pcd":
            pcd = await PODPCDPackage.deserialize(pcdStr);
            break;
          case "pod-ticket-pcd": {
            const fixed = normalizePodTicketPCDJSONString(pcdStr);
            pcd = await PODTicketPCDPackage.deserialize(fixed);
            break;
          }
          case "pod-email-pcd":
            pcd = await PODEmailPCDPackage.deserialize(pcdStr);
            break;
          case "email-pcd":
            pcd = await EmailPCDPackage.deserialize(pcdStr);
            break;
          case "eddsa-ticket-pcd":
            pcd = await EdDSATicketPCDPackage.deserialize(pcdStr);
            break;
          case "semaphore-identity-pcd":
            pcd = await SemaphoreIdentityPCDPackage.deserialize(pcdStr);
            break;
          default:
            bad.push({ index: i, type, note: "no package registered" });
            continue;
        }
        ok.push(pcd);
      } catch (e) {
        bad.push({
          index: i,
          type,
          note: String(e?.message || e),
          snippet: pcdStr.slice(0, 120)
        });
      }
    }

    if (ok.length) {
      setPcds(ok);
      setStep3OK(true);
      if (bad.length) {
        setError(
          `Rendered ${ok.length} item(s). Skipped ${bad.length}. ` +
          `First skipped: type=${bad[0].type}, err=${bad[0].note}, pcd starts: ${bad[0].snippet}`
        );
      }
    } else {
      throw new Error(
        `Step 3 failed: none deserialized. ` +
        `Example: type=${bad[0]?.type || "(unknown)"} err=${bad[0]?.note || "(none)"} ` +
        `pcd starts: ${bad[0]?.snippet || ""}`
      );
    }
  }

  /** Verify all PCD signatures using their packages */
  async function verifyAll() {
    if (!pcds.length) return;
    setVerifying(true);
    setVerifyResults([]);

    const results = [];
    for (let i = 0; i < pcds.length; i++) {
      const pcd = pcds[i];
      const pkg = PACKAGE_BY_TYPE[pcd.type];
      try {
        let ok = false;
        if (pkg && typeof pkg.verify === "function") {
          ok = await pkg.verify(pcd);
        } else if (typeof pcd.verify === "function") {
          ok = await pcd.verify();
        } else {
          throw new Error("no verify() available for this type");
        }
        results.push({ index: i, type: pcd.type, ok, note: ok ? "" : "verify() returned false" });
      } catch (e) {
        results.push({ index: i, type: pcd.type, ok: false, note: String(e?.message || e) });
      }
    }

    setVerifyResults(results);
    setVerifying(false);
  }

  /** Main Load action */
  async function load() {
    setError("");
    setPcds([]);
    setDebug({ tried: [], used: "", contentType: "", preview: "", textLen: 0 });
    setStep1OK(false);
    setStep2OK(false);
    setStep3OK(false);
    setVerifyResults([]);

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

  /** Render a PCD via the correct UI object */
  function PodCard({ pcd }) {
    const uiByType = {
      "pod-pcd": PODPCDUI,
      "pod-ticket-pcd": PODTicketPCDUI,
      "pod-email-pcd": PODEmailPCDUI,
      "email-pcd": EmailPCDUI,
      "eddsa-ticket-pcd": EdDSATicketPCDUI,
      "semaphore-identity-pcd": SemaphoreIdentityPCDUI
    };

    const ui = uiByType[pcd.type];

    if (ui && typeof ui.renderCardBody === "function") {
      return ui.renderCardBody({
        pcd,
        expanded: true,
        setExpanded: () => {},
        // hide QR if you prefer: { showQRCode: false }
        displayOptions: {}
      });
    }

    // Fallback if we don't have a UI for this type
    return <pre className="text-xs overflow-auto">{JSON.stringify(pcd, null, 2)}</pre>;
  }

  // Host styles to make Zupass cards feel tighter (kept intentionally simple)
  const hostStyles = `
    .pcd-host { font-size: 14px; line-height: 1.35; }
    .pcd-host .rounded.border.p-3 { max-width: 720px; margin-inline: auto; }
    .pcd-host img { max-width: 100%; height: auto; border-radius: 8px; }
    .pcd-host h1, .pcd-host h2, .pcd-host h3 { line-height: 1.2; }
  `;

  return (
    <>
      {/* inject host styles */}
      <style>{hostStyles}</style>

      <div className="pcd-host p-4 space-y-3">
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
            <button
              className="px-3 py-2 rounded border"
              onClick={verifyAll}
              disabled={!pcds.length || verifying}
              title={!pcds.length ? "Load PCDs first" : "Verify signatures"}
            >
              {verifying ? "Verifying..." : "Verify signatures"}
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

        {/* Signature verification results */}
        {verifyResults.length > 0 && (
          <div className="text-xs mt-2">
            <div className="font-semibold mb-1">Signature checks</div>
            <ul className="space-y-1">
              {verifyResults.map((r, i) => (
                <li key={i}>
                  #{r.index + 1} – <code>{r.type}</code> :{" "}
                  <span className={r.ok ? "text-green-600" : "text-red-600"}>
                    {r.ok ? "PASS" : `FAIL${r.note ? ` — ${r.note}` : ""}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rendered PCDs */}
        <div className="grid gap-3">
          {pcds.map((pcd, i) => (
            <div key={i} className="rounded border p-3">
              <PodCard pcd={pcd} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
