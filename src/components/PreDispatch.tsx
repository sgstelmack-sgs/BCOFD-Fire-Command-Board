import React, { useState } from "react";

export default function PreDispatch({
  onStart,
  incident,
  runningIncidents = [],
}: any) {
  const [localNotes, setLocalNotes] = useState(incident.callNotes || "");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 450px", // Left is larger for the monitor
        gap: "20px",
        height: "calc(100vh - 100px)",
      }}
    >
      {/* LEFT HALF: CODEMESSENGER MONITOR */}
      <div
        style={{
          background: "#000",
          borderRadius: "8px",
          overflow: "hidden",
          border: "2px solid #334155",
        }}
      >
        <div
          style={{
            background: "#334155",
            padding: "8px 12px",
            fontSize: "11px",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          STATION MONITOR (LIVE FEED)
        </div>
        <iframe
          src="https://dev.codemessaging.net/rc/DF5Z4H3Z4VP.php"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "white",
          }}
        />
      </div>

      {/* RIGHT SIDE: TOOLS & HISTORY */}
      <div
        style={{ display: "grid", gridTemplateRows: "1fr 2fr", gap: "20px" }}
      >
        {/* TOP RIGHT: PASTE & START (Approx 1/3 height) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label
            style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold" }}
          >
            PASTE DISPATCH NARRATIVE:
          </label>
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Paste CAD data..."
            style={{
              flex: 1,
              background: "#0f172a",
              color: "#fff",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "10px",
              fontSize: "14px",
              fontFamily: "monospace",
              resize: "none",
            }}
          />
          <button
            onClick={() => onStart(localNotes)}
            style={{
              background: "#22c55e",
              color: "black",
              border: "none",
              padding: "12px",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            START INCIDENT
          </button>
        </div>

        {/* BOTTOM RIGHT: RUNNING INCIDENTS */}
        <div
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "15px",
            border: "1px solid #334155",
            overflowY: "auto",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              fontSize: "14px",
              color: "#facc15",
              borderBottom: "1px solid #334155",
              paddingBottom: "10px",
            }}
          >
            RUNNING INCIDENTS
          </h3>
          {runningIncidents.length === 0 ? (
            <p
              style={{
                color: "#475569",
                fontSize: "12px",
                textAlign: "center",
                marginTop: "20px",
              }}
            >
              No active calls in progress.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {runningIncidents.map((inc: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: "#0f172a",
                    padding: "10px",
                    borderRadius: "4px",
                    borderLeft: "4px solid #22c55e",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "13px" }}>
                    {inc.box}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {inc.address}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
