import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * PRE-DISPATCH (MONITOR) VIEW
 * - Left: Masked CodeMessaging Iframe to hide their embedded header
 * - Right: Tactical Board Entry and Active Incident Cards
 */

interface PreDispatchProps {
  onStart: (notes: string) => void;
  setIncident: (incident: any) => void;
  setUnits: (units: any[]) => void;
  setView: (view: string) => void;
}

export default function PreDispatch({
  onStart,
  setIncident,
  setUnits,
  setView,
}: PreDispatchProps) {
  const [cadNotes, setCadNotes] = useState("");
  const [ongoingCalls, setOngoingCalls] = useState<any[]>([]);

  const dispatchWebUrl =
    "https://secure-web.cisco.com/1MzA3_rL7WXltWsSP_9VAun4qgYernnv_gLtuwwzyQUT4uBNizlFS7I8iEgoZ6PAYD0S3tjVhWvMGCiLZSa8rGJQRKphW3Euuccb6s76GCtsI8yNUlGGDr2FiPyjhYi7IJYscHbv5KJ5AAgdSykL0BFRTfe2gi431HqDZJpywv2a2C98wzUyfech3O_OqBdmFwMkjJjdIrydRqeORdYqiBaYa5GtdFbfKAGZftbruJdLQ1R-lICMhbqpJkIXT9K7DmVBxLfvG3ZnX7cxeGFE83OxzQXURM2NHdT062e1XvrQ_MhXx3ag8iJv1z-h3uGxJPqGEhALSi_sw2sil0iJh8-EPocf9XEVjcP_0Afg0qGJ2lY_A79MbddBREETReoGgCWHwU-I_UyzoxC95_FPj9_HMGo87SgiRg8Dw758xDgMQri3gghiFpYRFTqp2qofR/https%3A%2F%2Fdev.codemessaging.net%2Frc%2FDF5Z4H3Z4VP.php";

  useEffect(() => {
    fetchActiveIncidents();
    const channel = supabase
      .channel("monitor-view")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => {
          fetchActiveIncidents();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveIncidents = async () => {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("active", true)
      .order("updated_at", { ascending: false });
    if (!error && data) setOngoingCalls(data);
  };

  const resumeIncident = (record: any) => {
    const state =
      typeof record.state === "string"
        ? JSON.parse(record.state)
        : record.state;
    setIncident(state.incident);
    setUnits(state.units);
    const allArrived = state.units.every((u: any) => u.status === "arrived");
    setView(allArrived ? "command" : "dispatch");
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 450px",
        height: "calc(100vh - 56px)",
        background: "#060b13",
        overflow: "hidden",
      }}
    >
      {/* LEFT COLUMN: LIVE DISPATCH MONITOR */}
      <section
        style={{
          borderRight: "2px solid #1f2937",
          background: "#000",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <iframe
          src={dispatchWebUrl}
          title="Code Messaging Monitor"
          allow="autoplay; fullscreen"
          style={{
            width: "100%",
            height: "calc(100% + 85px)", // Extra height to account for the shift
            border: "none",
            backgroundColor: "#000",
            marginTop: "-85px", // THIS SLIDES THE IFRAME UP TO HIDE THEIR HEADER
          }}
        />
      </section>

      {/* RIGHT COLUMN: TOOLS & CARDS */}
      <aside
        style={{
          padding: "20px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "25px",
          borderLeft: "1px solid #1f2937",
        }}
      >
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h3
              style={{
                color: "#38bdf8",
                fontSize: "12px",
                fontWeight: "bold",
                margin: 0,
                letterSpacing: "1px",
              }}
            >
              CAD INCIDENT ENTRY
            </h3>
            <button
              onClick={() => setCadNotes("")}
              style={{
                background: "transparent",
                color: "#475569",
                border: "none",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLEAR
            </button>
          </div>
          <textarea
            value={cadNotes}
            onChange={(e) => setCadNotes(e.target.value)}
            placeholder="Paste CAD text here..."
            style={{
              width: "100%",
              height: "180px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "12px",
              color: "white",
              fontSize: "14px",
              outline: "none",
              fontFamily: "monospace",
              lineHeight: "1.4",
            }}
          />
          <button
            onClick={() => {
              if (cadNotes) onStart(cadNotes);
            }}
            style={{
              marginTop: "10px",
              width: "100%",
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "14px",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            START NEW INCIDENT
          </button>
        </section>

        <hr
          style={{ border: "0", borderTop: "1px solid #1f2937", width: "100%" }}
        />

        <section>
          <h3
            style={{
              color: "#facc15",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "15px",
              letterSpacing: "1px",
            }}
          >
            ACTIVE TACTICAL BOARDS
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {ongoingCalls.map((call) => {
              const state =
                typeof call.state === "string"
                  ? JSON.parse(call.state)
                  : call.state;
              const detail = state.incident;
              return (
                <div
                  key={call.id}
                  onClick={() => resumeIncident(call)}
                  style={{
                    background: "#111827",
                    padding: "18px",
                    borderRadius: "10px",
                    border: "1px solid #1e293b",
                    borderLeft: "6px solid #ef4444",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#38bdf8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#1e293b")
                  }
                >
                  <div style={{ marginBottom: "10px" }}>
                    <small
                      style={{
                        color: "#64748b",
                        fontWeight: "bold",
                        fontSize: "9px",
                        textTransform: "uppercase",
                      }}
                    >
                      CALL TYPE
                    </small>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 900,
                        color: "#facc15",
                        lineHeight: "1.1",
                      }}
                    >
                      {detail.callType}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ minWidth: "80px" }}>
                      <small
                        style={{
                          color: "#64748b",
                          fontWeight: "bold",
                          fontSize: "9px",
                          textTransform: "uppercase",
                        }}
                      >
                        BOX
                      </small>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 900,
                          color: "#f8fafc",
                        }}
                      >
                        {detail.box}
                      </div>
                    </div>
                    <div>
                      <small
                        style={{
                          color: "#64748b",
                          fontWeight: "bold",
                          fontSize: "9px",
                          textTransform: "uppercase",
                        }}
                      >
                        ADDRESS
                      </small>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 800,
                          color: "#38bdf8",
                        }}
                      >
                        {detail.address}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      borderTop: "1px solid #1e293b",
                      paddingTop: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <div>
                      <small
                        style={{
                          color: "#64748b",
                          fontWeight: "bold",
                          fontSize: "9px",
                          textTransform: "uppercase",
                        }}
                      >
                        Incident ID
                      </small>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#94a3b8",
                        }}
                      >
                        {call.id}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#ef4444",
                        fontWeight: "bold",
                        fontSize: "11px",
                      }}
                    >
                      OPEN →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}
