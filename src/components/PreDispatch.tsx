import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// 1. Define the rules for the data being passed in
interface PreDispatchProps {
  onStart: (notes: string) => void;
  setIncident: (incident: any) => void;
  setUnits: (units: any[]) => void;
  setView: (view: string) => void;
  runningIncidents: any[];
}

// 2. The "export default" makes this file a module
export default function PreDispatch({
  onStart,
  setIncident,
  setUnits,
  setView,
  runningIncidents,
}: PreDispatchProps) {
  const [raw, setRaw] = useState("");
  const [ongoing, setOngoing] = useState<any[]>([]);

  const fetchCalls = async () => {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) console.error("Fetch Error:", error);

    if (data) {
      // Filter locally for active calls to ensure reliability
      const activeCalls = data.filter(
        (inc) => inc.state?.incident?.active === true
      );
      setOngoing(activeCalls);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 450px",
        gap: 20,
        height: "85vh",
        background: "#060b13",
        padding: "10px",
      }}
    >
      {/* LEFT: LIVE CAD FEED */}
      <iframe
        src="https://dev.codemessaging.net/rc/DF5Z4H3Z4VP.php"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
          border: "1px solid #334155",
          background: "white",
        }}
        title="CAD Monitor"
      />

      {/* RIGHT: CONTROLS */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            background: "#1e293b",
            padding: 20,
            borderRadius: 8,
            border: "1px solid #f97316",
          }}
        >
          <h3 style={{ color: "#f97316", marginTop: 0 }}>QUICK LAUNCH</h3>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste BOX: ADDR: UNIT:..."
            style={{
              width: "100%",
              height: 120,
              background: "#0f172a",
              color: "#4ade80",
              padding: 10,
              borderRadius: 4,
              fontFamily: "monospace",
              border: "1px solid #334155",
            }}
          />
          <button
            onClick={() => {
              onStart(raw);
              setRaw("");
            }}
            style={{
              width: "100%",
              background: "#f97316",
              padding: 12,
              border: "none",
              color: "white",
              fontWeight: "bold",
              marginTop: 10,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            START INCIDENT
          </button>
        </div>

        <div
          style={{
            background: "#1e293b",
            padding: 20,
            borderRadius: 8,
            flex: 1,
            overflowY: "auto",
            border: "1px solid #334155",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ color: "#38bdf8", margin: 0 }}>ONGOING CALLS</h3>
            <button
              onClick={fetchCalls}
              style={{
                background: "#334155",
                color: "white",
                border: "none",
                padding: "5px 10px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: "10px",
              }}
            >
              REFRESH
            </button>
          </div>

          {ongoing.map((inc) => (
            <div
              key={inc.id}
              style={{
                background: "#0f172a",
                padding: 15,
                marginBottom: 10,
                borderLeft: "6px solid #38bdf8",
                borderRadius: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ color: "white" }}>
                  BOX {inc.state?.incident?.box}
                </strong>
                <span style={{ fontSize: "10px", color: "#64748b" }}>
                  {inc.id}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", margin: "5px 0" }}>
                {inc.state?.incident?.address}
              </div>
              <button
                onClick={() => {
                  setIncident(inc.state.incident);
                  setUnits(inc.state.units || []);
                  setView("dispatch");
                }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  background: "#38bdf8",
                  color: "black",
                  fontWeight: "bold",
                  padding: 8,
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                JOIN INCIDENT
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
