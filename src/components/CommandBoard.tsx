import React, { useState } from "react";
import { FireUnit, Incident, getUnitColor } from "../App";

/**
 * CAPTAIN'S NOTES: COMMAND BOARD (V3)
 * 1. LAYOUT: Staffing (Left) | Divisions (Middle) | Tasks (Right).
 * 2. TASK DRAGGING: Tasks can be assigned to report to a specific Division.
 * 3. PERSONNEL COLOR: Members show [Unit ID | Name] with the Unit's tactical color.
 */

export default function CommandBoard({
  incident,
  units,
  syncState,
  handleEndIncident,
}: any) {
  // We track which Task reports to which Division
  const [taskAssignments, setTaskAssignments] = useState<
    Record<string, string>
  >({});

  const divisions = [
    { id: "ic", name: "Incident Command" },
    { id: "safety", name: "Safety Officer" },
    { id: "div-1", name: "Division 1" },
    { id: "div-2", name: "Division 2" },
    { id: "div-alpha", name: "Division Alpha" },
    { id: "div-charlie", name: "Division Charlie" },
    { id: "rit", name: "RIT" },
  ];

  const taskList = [
    { id: "fire-attack", name: "Fire Attack" },
    { id: "search-rescue", name: "Search & Rescue" },
    { id: "ventilation", name: "Ventilation" },
    { id: "primary-water", name: "Primary Water Supply" },
    { id: "secondary-water", name: "Secondary Water Supply" },
    { id: "utilities", name: "Utilities" },
    { id: "medical", name: "Medical / Triage" },
    { id: "rehab", name: "Rehab" },
    { id: "staging-mgr", name: "Staging Manager" },
  ];

  const onDropPersonnel = (
    unitId: string,
    memberIdx: number,
    taskId: string
  ) => {
    const nextUnits = units.map((u: FireUnit) => {
      if (u.id === unitId) {
        const nextMembers = [...u.members];
        nextMembers[memberIdx] = {
          ...nextMembers[memberIdx],
          assignment: taskId,
        };
        return { ...u, members: nextMembers };
      }
      return u;
    });
    syncState({ units: nextUnits });
  };

  const handleTaskReportTo = (taskId: string, divisionId: string) => {
    setTaskAssignments((prev) => ({ ...prev, [taskId]: divisionId }));
    // This could also be synced to Supabase if needed
  };

  const renderPersonnel = (unit: FireUnit, member: any, idx: number) => {
    const unitColor = getUnitColor(unit.type);
    return (
      <div
        key={`${unit.id}-${idx}`}
        draggable
        onDragStart={(e) =>
          e.dataTransfer.setData(
            "member",
            JSON.stringify({ unitId: unit.id, idx })
          )
        }
        style={{
          background: "rgba(15, 23, 42, 0.8)",
          margin: "2px 0",
          padding: "4px 8px",
          borderRadius: "4px",
          borderLeft: `4px solid ${unitColor}`,
          fontSize: "11px",
          display: "flex",
          justifyContent: "space-between",
          cursor: "grab",
          border: "1px solid #1e293b",
          color: "#f8fafc",
        }}
      >
        <span>
          <strong style={{ color: unitColor }}>{unit.displayId}</strong> |{" "}
          {member.name}
        </span>
      </div>
    );
  };

  const renderTaskCard = (task: any) => {
    const assignedPersonnel: any[] = [];
    units.forEach((u: FireUnit) => {
      u.members.forEach((m, idx) => {
        if (m.assignment === task.id)
          assignedPersonnel.push({ unit: u, member: m, idx });
      });
    });

    return (
      <div
        key={task.id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const data = JSON.parse(e.dataTransfer.getData("member"));
          onDropPersonnel(data.unitId, data.idx, task.id);
        }}
        style={{
          background: "#1e293b",
          borderRadius: "6px",
          padding: "10px",
          marginBottom: "8px",
          border: "1px solid #334155",
          minHeight: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "5px",
          }}
        >
          <span
            style={{ fontSize: "12px", fontWeight: "bold", color: "#38bdf8" }}
          >
            {task.name.toUpperCase()}
          </span>
          <select
            value={taskAssignments[task.id] || ""}
            onChange={(e) => handleTaskReportTo(task.id, e.target.value)}
            style={{
              background: "#0f172a",
              color: "#94a3b8",
              border: "none",
              fontSize: "10px",
              borderRadius: "4px",
            }}
          >
            <option value="">Report to...</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {assignedPersonnel.map((p) => renderPersonnel(p.unit, p.member, p.idx))}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr 1fr",
        height: "100%",
        background: "#060b13",
        overflow: "hidden",
      }}
    >
      {/* COLUMN 1: STAGING / STAFFING */}
      <div
        style={{
          background: "#0f172a",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "15px",
            borderBottom: "2px solid #38bdf8",
            color: "#38bdf8",
            fontWeight: 900,
          }}
        >
          STAGING / STAFFING
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "15px" }}>
          {units.map((u: FireUnit) => (
            <div
              key={u.id}
              style={{
                marginBottom: "20px",
                background: "#1e293b",
                padding: "10px",
                borderRadius: "8px",
                borderLeft: `8px solid ${getUnitColor(u.type)}`,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: "8px" }}>
                {u.displayId}
              </div>
              {u.members.map(
                (m, idx) =>
                  m.assignment === "Unassigned" && renderPersonnel(u, m, idx)
              )}
            </div>
          ))}
        </div>
      </div>

      {/* COLUMN 2: DIVISIONS / IC */}
      <div
        style={{
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "15px",
            borderBottom: "2px solid #10b981",
            color: "#10b981",
            fontWeight: 900,
          }}
        >
          IC / DIVISIONS
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "15px" }}>
          {divisions.map((div) => (
            <div
              key={div.id}
              style={{
                background: "#0f172a",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #1e293b",
                marginBottom: "12px",
                minHeight: "100px",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "10px",
                  borderBottom: "1px solid #1e293b",
                }}
              >
                {div.name.toUpperCase()}
              </div>
              {/* Show tasks reporting to this division */}
              {taskList
                .filter((t) => taskAssignments[t.id] === div.id)
                .map((t) => (
                  <div
                    style={{
                      padding: "5px",
                      background: "rgba(56, 189, 248, 0.1)",
                      borderRadius: "4px",
                      marginBottom: "4px",
                      fontSize: "11px",
                      color: "#38bdf8",
                    }}
                  >
                    → {t.name}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* COLUMN 3: GROUP TASKS */}
      <div
        style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div
          style={{
            padding: "15px",
            borderBottom: "2px solid #facc15",
            color: "#facc15",
            fontWeight: 900,
          }}
        >
          GROUP TASKS
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "15px" }}>
          {taskList.map((task) => renderTaskCard(task))}
        </div>
      </div>
    </div>
  );
}
