import React, { useState } from "react";
import { FireUnit, Incident } from "../App";

export default function CommandBoard({ incident, units, syncState, handleEndIncident }: any) {
  const [divisions, setDivisions] = useState(["Incident Command", "Safety Officer", "Division 1", "RIT Group"]);
  const [tasks, setTasks] = useState(["Fire Attack", "Search & Rescue", "Ventilation", "Water Supply"]);
  const [selectedMember, setSelectedMember] = useState<{ unitId: string; idx: number } | null>(null);

  const getRankIcon = (rank: string) => {
    const r = rank?.toUpperCase();
    if (r === "CHIEF" || r === "BC" || r === "DC") return "⛑️";
    if (r === "CAPTAIN") return "🚨";
    if (r === "LIEUTENANT" || r === "LT") return "🪖";
    return null;
  };

  const getUnitColor = (type: string) => type === "ENGINE" ? "#ef4444" : "#f97316";

  const setStatus = (unitId: string, newStatus: string) => {
    const nextUnits = units.map((u: FireUnit) => u.id === unitId ? { ...u, status: newStatus } : u);
    syncState({ units: nextUnits });
  };

  const assignMember = (target: string) => {
    if (!selectedMember) return;
    const nextUnits = units.map((u: any) => {
      if (u.id !== selectedMember.unitId) return u;
      if (u.status !== "arrived") { alert("Unit must be ARRIVED to assign personnel."); return u; }
      
      const m = [...u.members];
      const selectedRole = m[selectedMember.idx].role;
      m[selectedMember.idx].assignment = target;

      // DB Tethering
      const pairs = u.linked_logic || [];
      pairs.forEach((pair: string[]) => {
        if (pair.includes(selectedRole)) {
          const partnerRole = pair.find(r => r !== selectedRole);
          const pIdx = m.findIndex(mem => mem.role === partnerRole);
          if (pIdx !== -1 && (!m[pIdx].assignment || m[pIdx].assignment === "Unassigned")) {
            m[pIdx].assignment = target;
          }
        }
      });
      return { ...u, members: m };
    });
    syncState({ units: nextUnits });
    setSelectedMember(null);
  };

  const clearMember = (uId: string, idx: number) => {
    const next = units.map((u: any) => {
      if (u.id !== uId) return u;
      const m = [...u.members];
      m[idx].assignment = "Unassigned";
      return { ...u, members: m };
    });
    syncState({ units: next });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", height: "calc(100vh - 48px)", background: "#060b13" }}>
      <aside style={{ background: "#0b121f", padding: "15px", overflowY: "auto", borderRight: "1px solid #1f2937" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ color: "#38bdf8", fontSize: "12px", margin: 0 }}>INCIDENT STAFFING</h3>
          <button onClick={handleEndIncident} style={{ background: "#ef4444", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>END INCIDENT</button>
        </div>

        {/* EN ROUTE SECTION */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ color: "#facc15", fontSize: "10px", borderBottom: "1px solid #334155" }}>EN ROUTE</h4>
          {units.filter((u: any) => u.status === "enroute").map((u: any) => (
            <div key={u.id} style={{ background: "#1e293b", padding: "10px", borderRadius: "6px", marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "bold" }}>{u.id}</span>
              <button onClick={() => setStatus(u.id, "arrived")} style={{ background: "#22c55e", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}>ARRIVED</button>
            </div>
          ))}
        </div>

        {/* STAGING SECTION */}
        <h4 style={{ color: "#22c55e", fontSize: "10px", borderBottom: "1px solid #334155" }}>STAGING / ARRIVED</h4>
        {units.filter((u: any) => u.status === "arrived").map((u: any) => (
          <div key={u.id} style={{ background: "#111827", borderRadius: "8px", marginBottom: "12px", borderLeft: `6px solid ${getUnitColor(u.type)}`, marginTop: "10px" }}>
            <div style={{ padding: "8px 12px", fontWeight: "bold" }}>{u.id}</div>
            <div style={{ padding: "8px" }}>
              {u.members.map((m: any, mIdx: number) => {
                const isSelected = selectedMember?.unitId === u.id && selectedMember?.idx === mIdx;
                return (
                  <div key={mIdx} onClick={() => setSelectedMember({ unitId: u.id, idx: mIdx })} 
                    style={{ padding: "6px", marginBottom: "4px", borderRadius: "4px", cursor: "pointer", background: isSelected ? "#1e3a8a" : m.assignment !== "Unassigned" ? "#064e3b" : "#0f172a", border: isSelected ? "1px solid #38bdf8" : "1px solid transparent" }}>
                    <div style={{ fontSize: "12px" }}>{getRankIcon(m.rank)} {m.name || m.role} {m.assignment !== "Unassigned" && <span style={{ float: "right", color: "#facc15", fontSize: "10px" }}>{m.assignment}</span>}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", padding: "20px", overflowY: "auto" }}>
        {/* DIVISIONS */}
        <div>
          <h3 style={{ color: "#22c55e", fontSize: "12px", marginBottom: "15px" }}>DIVISIONS</h3>
          {divisions.map(div => (
            <div key={div} onClick={() => assignMember(div)} style={{ background: "#111827", border: selectedMember ? "1px solid #22c55e" : "1px solid #1e293b", borderRadius: "8px", marginBottom: "15px", minHeight: "100px" }}>
              <div style={{ background: "#1e293b", padding: "6px 12px", fontSize: "11px", color: "#94a3b8" }}>{div.toUpperCase()}</div>
              <div style={{ padding: "10px" }}>
                {units.map((u: any) => u.members.map((m: any, mi: number) => m.assignment === div && (
                  <div key={mi} onClick={(e) => { e.stopPropagation(); clearMember(u.id, mi); }} 
                    style={{ background: getUnitColor(u.type), color: "white", padding: "6px", marginBottom: "4px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
                    <span>{getRankIcon(m.rank)} {u.id}: {m.name || m.role}</span>
                    <span>×</span>
                  </div>
                )))}
              </div>
            </div>
          ))}
        </div>

        {/* TASKS */}
        <div>
          <h3 style={{ color: "#38bdf8", fontSize: "12px", marginBottom: "15px" }}>TASKS</h3>
          {tasks.map(task => (
            <div key={task} onClick={() => assignMember(task)} style={{ background: "#111827", border: selectedMember ? "1px solid #38bdf8" : "1px solid #1e293b", borderRadius: "8px", marginBottom: "15px", minHeight: "100px" }}>
              <div style={{ background: "#1e293b", padding: "8px 12px", fontSize: "11px" }}>{task.toUpperCase()}</div>
              <div style={{ padding: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {units.map((u: any) => u.members.map((m: any, mi: number) => m.assignment === task && (
                  <div key={mi} onClick={(e) => { e.stopPropagation(); clearMember(u.id, mi); }} 
                    style={{ background: getUnitColor(u.type), padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", color: "white" }}>
                    {getRankIcon(m.rank)} {u.id}
                  </div>
                )))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}