import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

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

  // Updated with the specific CodeMessaging Cisco Secure URL
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
        height: "calc(100vh - 48px)",
        background: "#060b13",
      }}
    >
      {/* LEFT COLUMN: THE CODE MESSAGING WEB FRAME */}
      <section
        style={{
          borderRight: "2px solid #1f2937",
          background: "#000",
          position: "relative",
        }}
      >
        <iframe
          src={dispatchWebUrl}
          title="Code Messaging Monitor"
          allow="autoplay; fullscreen"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#000",
          }}
        />
      </section>

      {/* RIGHT COLUMN: TOOLS & ACTIVE CALLS */}
      <aside
        style={{
          padding: "20px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "25px",
        }}
      >
        {/* CAD ENTRY BOX */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ color: "#38bdf8", fontSize: "14px", margin: 0 }}>
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
              height: "220px",
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
              transition: "background 0.2s",
            }}
          >
            START NEW INCIDENT
          </button>
        </section>

        <hr
          style={{ border: "0", borderTop: "1px solid #1f2937", width: "100%" }}
        />

        {/* ONGOING CALLS LIST */}
        <section>
          <h3
            style={{ color: "#facc15", fontSize: "14px", marginBottom: "15px" }}
          >
            ACTIVE INCIDENTS
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {ongoingCalls.length === 0 ? (
              <div
                style={{
                  color: "#475569",
                  fontSize: "13px",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No active calls currently in progress.
              </div>
            ) : (
              ongoingCalls.map((call) => (
                <div
                  key={call.id}
                  onClick={() => resumeIncident(call)}
                  style={{
                    background: "#1e293b",
                    padding: "15px",
                    borderRadius: "8px",
                    borderLeft: "5px solid #ef4444",
                    cursor: "pointer",
                    transition: "transform 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateX(5px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateX(0)")
                  }
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "15px",
                      color: "white",
                    }}
                  >
                    {call.address}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      marginTop: "4px",
                    }}
                  >
                    BOX: {call.box} | ID: {call.id}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#38bdf8",
                      marginTop: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    RESUME INCIDENT →
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
