import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Roster() {
  const [battalions, setBattalions] = useState<any>({});
  const [expandedBats, setExpandedBats] = useState<string[]>([]);
  const [expandedStats, setExpandedStats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAndGroupApparatus = async () => {
    const { data } = await supabase
      .from("apparatus")
      .select("*")
      .order("station", { ascending: true });

    if (data) {
      const grouped = data.reduce((acc: any, unit: any) => {
        // Explicitly label the Battalion
        const batLabel = unit.battalion
          ? `BATTALION: ${unit.battalion}`
          : "BATTALION: UNASSIGNED";
        const sta = `STATION ${unit.station}`;

        if (!acc[batLabel]) acc[batLabel] = {};
        if (!acc[batLabel][sta]) acc[batLabel][sta] = [];

        acc[batLabel][sta].push(unit);
        return acc;
      }, {});

      setBattalions(grouped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAndGroupApparatus();
  }, []);

  const toggleBat = (bat: string) =>
    setExpandedBats((prev) =>
      prev.indexOf(bat) !== -1 ? prev.filter((b) => b !== bat) : [...prev, bat]
    );

  const toggleSta = (sta: string) =>
    setExpandedStats((prev) =>
      prev.indexOf(sta) !== -1 ? prev.filter((s) => s !== sta) : [...prev, sta]
    );

  const saveRoster = async (id: string, roles: any) => {
    await supabase.from("apparatus").update({ roles }).eq("id", id);
  };

  if (loading)
    return (
      <div
        style={{
          padding: 40,
          color: "#94a3b8",
          textAlign: "center",
          fontSize: "18px",
        }}
      >
        Loading Roster Hierarchy...
      </div>
    );

  return (
    <div
      style={{
        padding: "30px",
        background: "#060b13",
        minHeight: "100vh",
        color: "white",
      }}
    >
      <header
        style={{
          marginBottom: "30px",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "15px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            color: "#8b5cf6",
            letterSpacing: "1px",
          }}
        >
          REGIONAL APPARATUS ROSTER
        </h1>
        <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "12px" }}>
          DAILY STAFFING & PERSONNEL MANAGEMENT
        </p>
      </header>

      {Object.keys(battalions)
        .sort()
        .map((bat) => (
          <div
            key={bat}
            style={{
              marginBottom: "15px",
              background: "#0f172a",
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid #1e293b",
            }}
          >
            {/* BATTALION HEADER */}
            <div
              onClick={() => toggleBat(bat)}
              style={{
                background: "#1e293b",
                padding: "15px 25px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#e2e8f0",
                borderLeft: "4px solid #8b5cf6",
              }}
            >
              <span style={{ letterSpacing: "1.5px" }}>{bat}</span>
              <span style={{ color: "#8b5cf6" }}>
                {expandedBats.indexOf(bat) !== -1 ? "▲" : "▼"}
              </span>
            </div>

            {expandedBats.indexOf(bat) !== -1 && (
              <div
                style={{
                  padding: "15px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {Object.keys(battalions[bat]).map((sta) => (
                  <div
                    key={sta}
                    style={{
                      border: "1px solid #334155",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    {/* STATION HEADER */}
                    <div
                      onClick={() => toggleSta(sta)}
                      style={{
                        background: "#020617",
                        padding: "10px 20px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        justifyContent: "space-between",
                        color: "#94a3b8",
                      }}
                    >
                      <span>{sta}</span>
                      <span style={{ fontSize: "10px", color: "#475569" }}>
                        {expandedStats.indexOf(sta) !== -1 ? "CLOSE" : "OPEN"}
                      </span>
                    </div>

                    {expandedStats.indexOf(sta) !== -1 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(260px, 1fr))",
                          gap: "12px",
                          padding: "15px",
                          background: "#060b13",
                        }}
                      >
                        {battalions[bat][sta].map((unit: any) => (
                          <div
                            key={unit.id}
                            style={{
                              background: "#0f172a",
                              border: "1px solid #1e293b",
                              borderRadius: "4px",
                            }}
                          >
                            <div
                              style={{
                                background:
                                  unit.type === "ENGINE"
                                    ? "#450a0a"
                                    : "#064e3b",
                                padding: "6px 12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                color:
                                  unit.type === "ENGINE"
                                    ? "#fecaca"
                                    : "#d1fae5",
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>{unit.id}</span>
                              <span style={{ fontSize: "9px", opacity: 0.8 }}>
                                {unit.type}
                              </span>
                            </div>
                            <div style={{ padding: "12px" }}>
                              {unit.roles.map((r: any, idx: number) => (
                                <div key={idx} style={{ marginBottom: "8px" }}>
                                  <div
                                    style={{
                                      fontSize: "8px",
                                      color: "#64748b",
                                      textTransform: "uppercase",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    {r.role}
                                  </div>
                                  <input
                                    defaultValue={r.name}
                                    onBlur={(e) => {
                                      const newRoles = [...unit.roles];
                                      newRoles[idx].name = e.target.value;
                                      saveRoster(unit.id, newRoles);
                                    }}
                                    placeholder="VACANT"
                                    style={{
                                      width: "100%",
                                      background: "#020617",
                                      border: "1px solid #1e293b",
                                      color: "white",
                                      padding: "6px 8px",
                                      fontSize: "12px",
                                      borderRadius: "3px",
                                      outline: "none",
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
