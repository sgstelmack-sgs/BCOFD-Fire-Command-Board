import React, { useState } from "react";
import { FireUnit, Incident, Member } from "../App";

export default function CommandBoard({
  incident,
  units,
  syncState,
  handleEndIncident,
}: any) {
  const [divisions, setDivisions] = useState([
    "Incident Command",
    "Safety Officer",
    "Division 1",
    "Division Alpha",
    "RIT Group",
  ]);
  const [tasks, setTasks] = useState([
    "Fire Attack",
    "Search & Rescue",
    "Ventilation",
    "Water Supply",
    "RIT",
  ]);
  const [selectedMember, setSelectedMember] = useState<{
    unitId: string;
    idx: number;
  } | null>(null);
  const [taskAssignments, setTaskAssignments] = useState<{
    [key: string]: string;
  }>({});

  // --- HELPER: GET APPARATUS COLORS ---
  const getUnitColor = (type: string) => {
    const t = type?.toUpperCase();
    if (t === "ENGINE") return "#ef4444"; // Red
    if (t === "TRUCK" || t === "SQUAD" || t === "TOWER") return "#f97316"; // Orange
    if (t === "BC" || t === "DC") return "#ffffff"; // White for Command
    return "#334155"; // Default Slate
  };

  // --- HELPER: RANK ICONS ---
  const getRankIcon = (role: string, unitId: string) => {
    const r = role.toLowerCase();
    if (
      r.includes("officer") ||
      r.includes("commander") ||
      r.includes("command")
    ) {
      return unitId.includes("BC") || unitId.includes("DC") ? "⛑️" : "🪖";
    }
    return null;
  };

  // --- CORE LOGIC: ASSIGN WITH TETHERING ---
  const assignMember = (target: string) => {
    if (!selectedMember) return;

    const nextUnits = units.map((u: any) => {
      if (u.id !== selectedMember.unitId) return u;

      const m = [...u.members];
      const selectedRole = m[selectedMember.idx].role;

      // 1. Assign the selected person
      m[selectedMember.idx].assignment = target;

      // 2. DYNAMIC TETHERING (Using DB linked_pairs)
      // Check the pairs defined in your apparatus table
      const pairs = u.linked_logic || []; // Ensure this is passed from App.tsx
      pairs.forEach((pair: string[]) => {
        if (pair.includes(selectedRole)) {
          const partnerRole = pair.find((r) => r !== selectedRole);
          const pIdx = m.findIndex((mem) => mem.role === partnerRole);
          // Only move the partner if they aren't already assigned somewhere else
          if (
            pIdx !== -1 &&
            (!m[pIdx].assignment || m[pIdx].assignment === "Unassigned")
          ) {
            m[pIdx].assignment = target;
          }
        }
      });

      return { ...u, members: m };
    });

    syncState({ units: nextUnits });
    setSelectedMember(null);
  };

  const clearMember = (unitId: string, mIdx: number) => {
    const nextUnits = units.map((u: any) => {
      if (u.id !== unitId) return u;
      const m = [...u.members];
      m[mIdx].assignment = "Unassigned";
      return { ...u, members: m };
    });
    syncState({ units: nextUnits });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "380px 1fr",
        height: "calc(100vh - 48px)",
        background: "#060b13",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR: STAGING */}
      <aside
        style={{
          background: "#0b121f",
          padding: "15px",
          overflowY: "auto",
          borderRight: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ color: "#38bdf8", fontSize: "12px", margin: 0 }}>
            STAGING / STAFFING
          </h3>
          <button
            onClick={() => handleEndIncident()}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            END INCIDENT
          </button>
        </div>

        {units.map((u: any) => (
          <div
            key={u.id}
            style={{
              background: "#1e293b",
              borderRadius: "8px",
              marginBottom: "15px",
              borderLeft: `6px solid ${getUnitColor(u.type)}`,
            }}
          >
            <div
              style={{
                padding: "10px",
                fontWeight: "bold",
                borderBottom: "1px solid #334155",
              }}
            >
              {u.id}
            </div>
            <div style={{ padding: "10px" }}>
              {u.members.map((m: any, mIdx: number) => {
                const isSelected =
                  selectedMember?.unitId === u.id &&
                  selectedMember?.idx === mIdx;
                const isAssigned =
                  m.assignment && m.assignment !== "Unassigned";
                return (
                  <div
                    key={mIdx}
                    onClick={() =>
                      setSelectedMember(
                        isSelected ? null : { unitId: u.id, idx: mIdx }
                      )
                    }
                    style={{
                      padding: "8px",
                      marginBottom: "4px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: isSelected
                        ? "#1e3a8a"
                        : isAssigned
                        ? "#064e3b"
                        : "#0f172a",
                      border: isSelected
                        ? "1px solid #38bdf8"
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "8px",
                        color: "#38bdf8",
                        fontWeight: "bold",
                      }}
                    >
                      {getRankIcon(m.role, u.id)} {m.role.toUpperCase()}
                    </div>
                    <div style={{ fontSize: "13px", color: "white" }}>
                      {m.name || "---"}
                      {isAssigned && (
                        <span
                          style={{
                            color: "#facc15",
                            float: "right",
                            fontSize: "10px",
                          }}
                        >
                          {m.assignment}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      {/* TACTICAL GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          padding: "20px",
          overflowY: "auto",
        }}
      >
        {/* COLUMN 1: DIVISIONS */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ color: "#22c55e", fontSize: "12px" }}>
              ICS / DIVISIONS
            </h3>
            <button
              onClick={() =>
                setDivisions([...divisions, prompt("Name:") || ""])
              }
              style={{
                background: "transparent",
                border: "1px solid #22c55e",
                color: "#22c55e",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
              }}
            >
              +
            </button>
          </div>
          {divisions.map((div) => (
            <div
              key={div}
              onClick={() => assignMember(div)}
              style={{
                background: "#111827",
                border: selectedMember
                  ? "2px solid #22c55e"
                  : "1px solid #1e293b",
                borderRadius: "8px",
                marginBottom: "15px",
                minHeight: "100px",
              }}
            >
              <div
                style={{
                  background: "#1e293b",
                  padding: "6px 12px",
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: "bold",
                }}
              >
                {div.toUpperCase()}
              </div>
              <div style={{ padding: "10px" }}>
                {units.map((u: any) =>
                  u.members.map(
                    (m: any, mi: number) =>
                      m.assignment === div && (
                        <div
                          key={mi}
                          onClick={(e) => {
                            e.stopPropagation();
                            clearMember(u.id, mi);
                          }}
                          style={{
                            background: getUnitColor(u.type),
                            color: u.type === "BC" ? "black" : "white",
                            padding: "8px",
                            marginBottom: "5px",
                            borderRadius: "4px",
                            fontSize: "13px",
                            fontWeight: "bold",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            {getRankIcon(m.role, u.id)} {u.id}:{" "}
                            {m.name || m.role}
                          </span>
                          <span style={{ opacity: 0.5 }}>×</span>
                        </div>
                      )
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* COLUMN 2: TASKS */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ color: "#38bdf8", fontSize: "12px" }}>
              INCIDENT TASKS
            </h3>
            <button
              onClick={() => setTasks([...tasks, prompt("Name:") || ""])}
              style={{
                background: "transparent",
                border: "1px solid #38bdf8",
                color: "#38bdf8",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
              }}
            >
              +
            </button>
          </div>
          {tasks.map((task) => (
            <div
              key={task}
              onClick={() => assignMember(task)}
              style={{
                background: "#111827",
                border: selectedMember
                  ? "2px solid #38bdf8"
                  : "1px solid #1e293b",
                borderRadius: "8px",
                marginBottom: "15px",
                minHeight: "100px",
              }}
            >
              <div
                style={{
                  background: "#1e293b",
                  padding: "8px 12px",
                  fontSize: "11px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontWeight: "bold" }}>{task.toUpperCase()}</span>
                <select
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setTaskAssignments({
                      ...taskAssignments,
                      [task]: e.target.value,
                    })
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#facc15",
                    fontSize: "9px",
                  }}
                >
                  <option value="">REPORTS TO...</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  padding: "10px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                {units.map((u: any) =>
                  u.members.map(
                    (m: any, mi: number) =>
                      m.assignment === task && (
                        <div
                          key={mi}
                          onClick={(e) => {
                            e.stopPropagation();
                            clearMember(u.id, mi);
                          }}
                          style={{
                            background: getUnitColor(u.type),
                            padding: "5px 10px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: u.type === "BC" ? "black" : "white",
                          }}
                        >
                          {getRankIcon(m.role, u.id)} {u.id}
                        </div>
                      )
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
