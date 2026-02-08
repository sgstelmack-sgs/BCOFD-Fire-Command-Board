import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Roster() {
  // --- STATE ---
  const [hierarchy, setHierarchy] = useState<any>({});
  const [expandedBN, setExpandedBN] = useState<string[]>([]);
  const [expandedST, setExpandedST] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Mapping for Battalion Labels
  const bnLabels: Record<string, string> = {
    B1: "Battalion 1 Central",
    B2: "Battalion 2 West",
    B3: "Battalion 3 East",
    B4: "Battalion 4 North",
    B5: "Battalion 5 Southeast",
  };

  useEffect(() => {
    fetchRosters();
  }, []);

  // --- DATA FETCHING ---
  const fetchRosters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("apparatus")
        .select("id, roles, station_id, battalion_id");

      if (error) throw error;

      if (data) {
        const nested: any = {};

        data.forEach((unit: any) => {
          // Fallbacks to prevent crashes
          const bn = unit.battalion_id || "UNASSIGNED";
          const st = unit.station_id || "Misc";

          if (!nested[bn]) nested[bn] = {};
          if (!nested[bn][st]) nested[bn][st] = [];

          nested[bn][st].push({
            ...unit,
            roles: Array.isArray(unit.roles) ? unit.roles : [],
          });
        });

        // Sort units inside the station buckets
        Object.keys(nested).forEach((bn) => {
          Object.keys(nested[bn]).forEach((st) => {
            nested[bn][st].sort((a: any, b: any) =>
              a.id.localeCompare(b.id, undefined, { numeric: true })
            );
          });
        });

        setHierarchy(nested);
      }
    } catch (err) {
      console.error("Error building roster hierarchy:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- TOGGLE HANDLERS ---
  const toggleBN = (bn: string) => {
    setExpandedBN((prev) =>
      prev.includes(bn) ? prev.filter((i) => i !== bn) : [...prev, bn]
    );
  };

  const toggleST = (stKey: string) => {
    setExpandedST((prev) =>
      prev.includes(stKey) ? prev.filter((i) => i !== stKey) : [...prev, stKey]
    );
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "50px",
          color: "#38bdf8",
          textAlign: "center",
          background: "#060b13",
          minHeight: "100vh",
        }}
      >
        Organizing Station Buckets...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "30px",
        background: "#060b13",
        minHeight: "100vh",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h2 style={{ margin: 0 }}>BCFD Command Roster</h2>
        <div style={{ color: "#64748b", fontSize: "12px" }}>
          8:40 AM | Morning Shift
        </div>
      </div>

      {Object.keys(hierarchy)
        .sort()
        .map((bn) => (
          <div
            key={bn}
            style={{
              marginBottom: "20px",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {/* BATTALION LEVEL HEADER */}
            <div
              onClick={() => toggleBN(bn)}
              style={{
                background: "#1e293b",
                padding: "15px 20px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  color: "#facc15",
                  fontSize: "1.1rem",
                }}
              >
                {bnLabels[bn] || bn}
              </span>
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                {expandedBN.includes(bn) ? "▼ COLLAPSE" : "▶ EXPAND"}
              </span>
            </div>

            {/* STATION LEVEL (Only shows if Battalion is expanded) */}
            {expandedBN.includes(bn) && (
              <div style={{ padding: "10px", background: "#0f172a" }}>
                {Object.keys(hierarchy[bn])
                  .sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true })
                  )
                  .map((st) => {
                    const stKey = `${bn}-${st}`;
                    return (
                      <div
                        key={stKey}
                        style={{
                          marginBottom: "10px",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          onClick={() => toggleST(stKey)}
                          style={{
                            background: "#060b13",
                            padding: "10px 15px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "14px",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{ color: "#38bdf8", fontWeight: "bold" }}
                          >
                            Station {st}
                          </span>
                          <span style={{ fontSize: "14px", color: "#334155" }}>
                            {expandedST.includes(stKey) ? "−" : "+"}
                          </span>
                        </div>

                        {/* APPARATUS LEVEL (Only shows if Station is expanded) */}
                        {expandedST.includes(stKey) && (
                          <div
                            style={{
                              padding: "15px",
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(280px, 1fr))",
                              gap: "12px",
                              background: "#0f172a",
                            }}
                          >
                            {hierarchy[bn][st].map((unit: any) => (
                              <div
                                key={unit.id}
                                style={{
                                  background: "#111827",
                                  border: "1px solid #1e293b",
                                  padding: "12px",
                                  borderRadius: "6px",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "bold",
                                    color: "white",
                                    borderBottom: "1px solid #1e293b",
                                    marginBottom: "8px",
                                    paddingBottom: "4px",
                                    fontSize: "16px",
                                  }}
                                >
                                  {unit.id}
                                </div>
                                {unit.roles?.map((role: string, i: number) => (
                                  <div
                                    key={i}
                                    style={{
                                      fontSize: "11px",
                                      color: "#94a3b8",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    <span
                                      style={{ textTransform: "uppercase" }}
                                    >
                                      {role}
                                    </span>
                                    <span style={{ color: "#334155" }}>
                                      [Unassigned]
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ))}

      {Object.keys(hierarchy).length === 0 && (
        <div
          style={{ textAlign: "center", marginTop: "50px", color: "#64748b" }}
        >
          No units found. Add rows to the 'apparatus' table to begin.
        </div>
      )}
    </div>
  );
}
