import React, { useState } from "react";
import { FireUnit, Member, Incident } from "../App";

interface CommandBoardProps {
  incident: Incident;
  units: FireUnit[];
  setUnits: (units: FireUnit[]) => void;
  syncState: (payload: { units?: FireUnit[]; incident?: Incident }) => void;
}

export default function CommandBoard({
  incident,
  units,
  setUnits,
  syncState,
}: CommandBoardProps) {
  // FIXED: Variable name is now 'newSectorName' to match the input
  const [sectors, setSectors] = useState<string[]>([
    "DIVISION 1",
    "DIVISION 2",
    "ROOF",
    "MEDICAL",
    "STAGING",
  ]);
  const [newSectorName, setNewSectorName] = useState("");
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);

  const isExpanded = (id: string) => expandedUnits.indexOf(id) !== -1;

  const addSector = () => {
    if (newSectorName && sectors.indexOf(newSectorName.toUpperCase()) === -1) {
      setSectors([...sectors, newSectorName.toUpperCase()]);
      setNewSectorName("");
    }
  };

  const moveUnit = (unitId: string, targetSector: string) => {
    const nextUnits = units.map((u) =>
      u.id === unitId ? { ...u, assignment: targetSector } : u
    );
    syncState({ units: nextUnits });
  };

  const updateTask = (unitId: string, task: string) => {
    const nextUnits = units.map((u) =>
      u.id === unitId ? { ...u, task: task.toUpperCase() } : u
    );
    syncState({ units: nextUnits });
  };

  const handleBenchmark = (label: string) => {
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const currentBenchmarks = { ...(incident.benchmarks || {}) };

    if (currentBenchmarks[label]) {
      delete currentBenchmarks[label];
    } else {
      currentBenchmarks[label] = now;
    }

    syncState({ incident: { ...incident, benchmarks: currentBenchmarks } });
  };

  const unassignedUnits = units.filter(
    (u) =>
      u.status === "arrived" && (!u.assignment || u.assignment === "STAGING")
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr 300px",
        gap: "15px",
        height: "calc(100vh - 50px)",
        background: "#060b13",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      {/* COLUMN 1: STAGING & UTILITIES */}
      <aside style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div
          style={{
            background: "#1e293b",
            padding: "15px",
            borderRadius: "6px",
            border: "1px solid #334155",
          }}
        >
          <h3
            style={{
              color: "#f97316",
              margin: "0 0 12px 0",
              fontSize: "14px",
              borderBottom: "1px solid #334155",
              paddingBottom: "5px",
            }}
          >
            STAGING / UNASSIGNED
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {unassignedUnits.map((u) => (
              <div
                key={u.id}
                style={{
                  background: "#0f172a",
                  padding: "10px",
                  borderRadius: "4px",
                  borderLeft: "4px solid #f97316",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                    {u.id}
                  </span>
                  <select
                    onChange={(e) => moveUnit(u.id, e.target.value)}
                    style={{
                      background: "#334155",
                      color: "white",
                      border: "none",
                      padding: "4px",
                      borderRadius: "2px",
                      fontSize: "11px",
                    }}
                  >
                    <option value="">ASSIGN...</option>
                    {sectors
                      .filter((s) => s !== "STAGING")
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                </div>
                {u.station && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      marginTop: "4px",
                    }}
                  >
                    STA {u.station} | BAT {u.battalion}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#1e293b",
            padding: "15px",
            borderRadius: "6px",
          }}
        >
          <h4
            style={{ color: "#94a3b8", fontSize: "11px", margin: "0 0 8px 0" }}
          >
            CREATE NEW SECTOR
          </h4>
          <div style={{ display: "flex", gap: "5px" }}>
            <input
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              placeholder="e.g. DIV 3"
              style={{
                flex: 1,
                background: "#0f172a",
                border: "1px solid #334155",
                color: "white",
                padding: "8px",
                borderRadius: "4px",
              }}
            />
            <button
              onClick={addSector}
              style={{
                background: "#38bdf8",
                border: "none",
                color: "black",
                padding: "0 15px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              +
            </button>
          </div>
        </div>
      </aside>

      {/* COLUMN 2: TACTICAL GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "10px",
          overflowY: "auto",
        }}
      >
        {sectors
          .filter((s) => s !== "STAGING")
          .map((s) => (
            <div
              key={s}
              style={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  background: "#1e293b",
                  padding: "8px",
                  textAlign: "center",
                  color: "#38bdf8",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                {s}
              </div>
              <div
                style={{
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {units
                  .filter((u) => u.assignment === s)
                  .map((u) => (
                    <div
                      key={u.id}
                      style={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        padding: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: "bold", color: "white" }}>
                          {u.id}
                        </span>
                        <button
                          onClick={() => moveUnit(u.id, "STAGING")}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            fontSize: "14px",
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <input
                        placeholder="TASK"
                        defaultValue={u.task || ""}
                        onBlur={(e) => updateTask(u.id, e.target.value)}
                        style={{
                          width: "100%",
                          background: "#020617",
                          border: "1px solid #1e293b",
                          color: "#4ade80",
                          fontSize: "11px",
                          padding: "6px",
                          marginTop: "8px",
                        }}
                      />
                      <div
                        onClick={() =>
                          setExpandedUnits(
                            isExpanded(u.id)
                              ? expandedUnits.filter((i) => i !== u.id)
                              : [...expandedUnits, u.id]
                          )
                        }
                        style={{
                          fontSize: "9px",
                          color: "#475569",
                          marginTop: "8px",
                          cursor: "pointer",
                          textAlign: "right",
                        }}
                      >
                        {isExpanded(u.id) ? "HIDE CREW ▲" : "SHOW CREW ▼"}
                      </div>
                      {isExpanded(u.id) && (
                        <div
                          style={{
                            marginTop: "5px",
                            borderTop: "1px solid #1e293b",
                            paddingTop: "5px",
                          }}
                        >
                          {u.members.map((m, idx) => (
                            <div
                              key={idx}
                              style={{ fontSize: "10px", color: "#94a3b8" }}
                            >
                              {m.role}: {m.name || "---"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </section>

      {/* COLUMN 3: BENCHMARKS */}
      <aside>
        <div
          style={{
            background: "#1e293b",
            padding: "20px",
            borderRadius: "6px",
            border: "1px solid #334155",
          }}
        >
          <h3
            style={{
              color: "#22c55e",
              margin: "0 0 15px 0",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            BENCHMARKS
          </h3>
          {[
            "PRIMARY SEARCH",
            "SECONDARY SEARCH",
            "FIRE CONTROLLED",
            "UTILITIES SECURED",
            "PAR CHECK",
          ].map((b) => {
            const time = incident.benchmarks?.[b];
            return (
              <div
                key={b}
                onClick={() => handleBenchmark(b)}
                style={{
                  padding: "12px",
                  marginBottom: "10px",
                  background: time ? "#064e3b" : "#0f172a",
                  border: `1px solid ${time ? "#22c55e" : "#334155"}`,
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: time ? "white" : "#94a3b8",
                  }}
                >
                  {b}
                </span>
                {time && (
                  <span style={{ color: "#4ade80", fontFamily: "monospace" }}>
                    {time}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
