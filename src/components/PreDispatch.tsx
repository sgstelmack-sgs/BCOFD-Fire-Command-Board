import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// Define types to satisfy TypeScript
interface Incident {
  id: string;
  box: string;
  address: string;
  active: boolean;
  callNotes?: string;
}

interface PreDispatchProps {
  onStart: (notes: string) => void;
  setIncident: (incident: Incident) => void;
  setUnits: (units: any[]) => void;
  setView: (view: string) => void;
  runningIncidents: Incident[];
}

export default function PreDispatch({
  onStart,
  setIncident,
  setUnits,
  setView,
}: PreDispatchProps) {
  const [raw, setRaw] = useState("");
  const [ongoing, setOngoing] = useState<any[]>([]);

  // Fetch active incidents from Supabase
  const fetchCalls = async () => {
    const { data } = await supabase
      .from("incidents")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(5);
    if (data) setOngoing(data);
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 450px",
        gap: 20,
        height: "85vh",
      }}
    >
      {/* LEFT: LIVE CAD FEED */}
      <div
        style={{
          background: "#1e293b",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #334155",
        }}
      >
        <iframe
          src="https://dev.codemessaging.net/rc/DF5Z4H3Z4VP.php"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "white",
          }}
          title="CAD Monitor"
        />
      </div>

      {/* RIGHT: CONTROLS */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* QUICK LAUNCH SECTION */}
        <div
          style={{
            background: "#1e293b",
            padding: 20,
            borderRadius: 8,
            border: "1px solid #f97316",
          }}
        >
          <h3 style={{ color: "#f97316", marginTop: 0, fontSize: "14px" }}>
            QUICK LAUNCH
          </h3>
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
              fontSize: "12px",
            }}
          />
          <button
            onClick={() => onStart(raw)}
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

        {/* ONGOING CALLS SECTION */}
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
              marginBottom: 15,
            }}
          >
            <h3 style={{ color: "#38bdf8", margin: 0, fontSize: "14px" }}>
              ONGOING CALLS
            </h3>
            <button
              onClick={fetchCalls}
              style={{
                background: "none",
                border: "none",
                color: "#38bdf8",
                cursor: "pointer",
              }}
            >
              ↻ Refresh
            </button>
          </div>

          {ongoing.map((inc: any) => (
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
              <div style={{ fontWeight: "bold", color: "white" }}>
                BOX {inc.state?.incident?.box || "---"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                {inc.state?.incident?.address || "No Address Found"}
              </div>

              <button
                onClick={() => {
                  // These functions must match the props passed in App.tsx
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
                  fontSize: "12px",
                }}
              >
                JOIN INCIDENT
              </button>
            </div>
          ))}

          {ongoing.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#475569",
                marginTop: 20,
                fontSize: "12px",
              }}
            >
              No active incidents found in database.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
