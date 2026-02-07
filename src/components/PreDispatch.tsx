import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function PreDispatch({
  onStart,
  setIncident,
  setUnits,
  setView,
}: any) {
  const [raw, setRaw] = useState("");
  const [ongoing, setOngoing] = useState<any[]>([]);

  const fetchCalls = async () => {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (data) {
      const activeCalls = data.filter((inc) => {
        try {
          const state =
            typeof inc.state === "string" ? JSON.parse(inc.state) : inc.state;
          // If 'active' isn't explicitly false, we show it in ongoing
          return state?.incident?.active !== false;
        } catch (e) {
          return false;
        }
      });
      setOngoing(activeCalls);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 450px",
        gap: 20,
        height: "calc(100vh - 45px)",
        background: "#060b13",
        padding: "15px",
      }}
    >
      <iframe
        src="https://dev.codemessaging.net/rc/DF5Z4H3Z4VP.php"
        style={{
          width: "100%",
          height: "100%",
          border: "1px solid #1e293b",
          borderRadius: 8,
        }}
        title="CAD"
      />
      <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            background: "#1e293b",
            padding: 20,
            borderRadius: 8,
            border: "1px solid #f97316",
          }}
        >
          <h3 style={{ color: "#f97316", margin: "0 0 10px 0" }}>
            QUICK LAUNCH
          </h3>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            style={{
              width: "100%",
              height: 100,
              background: "#0f172a",
              color: "#4ade80",
              border: "1px solid #334155",
            }}
          />
          <button
            onClick={() => onStart(raw)}
            style={{
              width: "100%",
              background: "#f97316",
              color: "white",
              padding: 10,
              marginTop: 10,
              border: "none",
              fontWeight: "bold",
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
          }}
        >
          <h3 style={{ color: "#38bdf8", margin: "0 0 10px 0" }}>
            ONGOING CALLS
          </h3>
          {ongoing.map((inc) => {
            const state =
              typeof inc.state === "string" ? JSON.parse(inc.state) : inc.state;
            return (
              <div
                key={inc.id}
                style={{
                  background: "#0f172a",
                  padding: 15,
                  marginBottom: 10,
                  borderLeft: "5px solid #38bdf8",
                }}
              >
                <div style={{ color: "white", fontWeight: "bold" }}>
                  BOX {state?.incident?.box}
                </div>
                <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                  {state?.incident?.address}
                </div>
                <button
                  onClick={() => {
                    setIncident(state.incident);
                    setUnits(state.units);
                    setView("dispatch");
                  }}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    background: "#38bdf8",
                    border: "none",
                    fontWeight: "bold",
                    padding: 5,
                  }}
                >
                  JOIN
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
