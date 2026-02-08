import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Roster() {
  const [hierarchy, setHierarchy] = useState<any>({});
  const [expandedBN, setExpandedBN] = useState<string[]>([]);
  const [expandedST, setExpandedST] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const bnLabels: any = {
    B1: "Battalion 1 Central",
    B2: "Battalion 2 West",
    B3: "Battalion 3 East",
  };

  useEffect(() => {
    fetchRosters();
  }, []);

  const fetchRosters = async () => {
    setLoading(true);
    const { data } = await supabase.from("apparatus").select("*");
    if (data) {
      const nested: any = {};
      data.forEach((u: any) => {
        const bn = u.battalion_id || "UNASSIGNED";
        const st = u.station_id || "Misc";
        if (!nested[bn]) nested[bn] = {};
        if (!nested[bn][st]) nested[bn][st] = [];
        nested[bn][st].push(u);
      });
      setHierarchy(nested);
    }
    setLoading(false);
  };

  const toggleMedicalMode = async (unitId: string, current: string) => {
    const next = current === "ALS" ? "BLS" : "ALS";
    await supabase
      .from("apparatus")
      .update({ medical_mode: next })
      .eq("id", unitId);
    fetchRosters(); // Refresh to show change
  };

  if (loading)
    return (
      <div style={{ padding: "50px", color: "#38bdf8" }}>
        Loading BCFD Hierarchy...
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
      {Object.keys(hierarchy)
        .sort()
        .map((bn) => (
          <div
            key={bn}
            style={{
              marginBottom: "15px",
              border: "1px solid #1e293b",
              borderRadius: "8px",
            }}
          >
            <div
              onClick={() =>
                setExpandedBN((prev) =>
                  prev.includes(bn)
                    ? prev.filter((i) => i !== bn)
                    : [...prev, bn]
                )
              }
              style={{
                background: "#1e293b",
                padding: "15px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#facc15", fontWeight: "bold" }}>
                {bnLabels[bn] || bn}
              </span>
            </div>
            {expandedBN.includes(bn) && (
              <div style={{ padding: "10px", background: "#0f172a" }}>
                {Object.keys(hierarchy[bn])
                  .sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true })
                  )
                  .map((st) => (
                    <div
                      key={st}
                      style={{
                        marginBottom: "10px",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                      }}
                    >
                      <div
                        onClick={() =>
                          setExpandedST((prev) =>
                            prev.includes(`${bn}-${st}`)
                              ? prev.filter((i) => i !== `${bn}-${st}`)
                              : [...prev, `${bn}-${st}`]
                          )
                        }
                        style={{
                          padding: "10px",
                          cursor: "pointer",
                          color: "#38bdf8",
                        }}
                      >
                        Station {st}
                      </div>
                      {expandedST.includes(`${bn}-${st}`) && (
                        <div
                          style={{
                            padding: "15px",
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          {hierarchy[bn][st].map((unit: any) => (
                            <div
                              key={unit.id}
                              style={{
                                background: "#111827",
                                padding: "10px",
                                borderRadius: "4px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <strong>{unit.id}</strong>
                                {unit.type === "MEDIC" && (
                                  <button
                                    onClick={() =>
                                      toggleMedicalMode(
                                        unit.id,
                                        unit.medical_mode
                                      )
                                    }
                                    style={{
                                      background:
                                        unit.medical_mode === "ALS"
                                          ? "#ef4444"
                                          : "#22c55e",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontSize: "10px",
                                    }}
                                  >
                                    {unit.medical_mode}
                                  </button>
                                )}
                              </div>
                              {unit.roles?.map((r: string, i: number) => (
                                <div
                                  key={i}
                                  style={{ fontSize: "11px", color: "#94a3b8" }}
                                >
                                  {r}
                                </div>
                              ))}
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
