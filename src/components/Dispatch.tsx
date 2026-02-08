import React, { useState } from "react";
import { FireUnit, getUnitColor } from "../App";

export default function Dispatch({ incident, units, syncState }: any) {
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);
  const [editingMember, setEditingMember] = useState<{
    unitId: string;
    idx: number;
  } | null>(null);

  const activeUnits = units.filter((u: FireUnit) => !u.isGhosted);
  const ghostedUnits = units.filter((u: FireUnit) => u.isGhosted);

  const updateStatus = (unitId: string, status: string) => {
    const nextUnits = units.map((u: FireUnit) =>
      u.id === unitId ? { ...u, status, isGhosted: false } : u
    );
    syncState({ units: nextUnits });
  };

  // NEW: Function to handle on-the-fly name changes
  const handleNameChange = (unitId: string, idx: number, newName: string) => {
    const nextUnits = units.map((u: FireUnit) => {
      if (u.id === unitId) {
        const nextMembers = [...u.members];
        nextMembers[idx] = { ...nextMembers[idx], name: newName };
        return { ...u, members: nextMembers };
      }
      return u;
    });
    syncState({ units: nextUnits });
    setEditingMember(null);
  };

  const renderUnitCard = (unit: FireUnit) => {
    const isExpanded = expandedUnits.includes(unit.id);
    const unitColor = getUnitColor(unit.type);

    return (
      <div
        key={unit.id}
        style={{
          background: unit.isGhosted ? "rgba(30, 41, 59, 0.4)" : "#1e293b",
          marginBottom: "12px",
          borderRadius: "10px",
          border: "1px solid #334155",
          borderLeft: `12px solid ${unitColor}`,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "15px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                onClick={() =>
                  setExpandedUnits((p) =>
                    p.includes(unit.id)
                      ? p.filter((x) => x !== unit.id)
                      : [...p, unit.id]
                  )
                }
                style={{ cursor: "pointer", fontSize: "18px" }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
              <span
                style={{ fontSize: "26px", fontWeight: 900, color: "#f8fafc" }}
              >
                {unit.displayId} {unit.isGhosted && "👻"}
              </span>
            </div>
            <span
              style={{ fontSize: "11px", fontWeight: "bold", color: unitColor }}
            >
              {unit.type}
            </span>
          </div>

          {isExpanded && (
            <div
              style={{
                background: "#0f172a",
                padding: "10px",
                borderRadius: "6px",
                marginTop: "10px",
                border: "1px solid #1e293b",
              }}
            >
              {unit.members.map((m: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    padding: "6px 0",
                    borderBottom:
                      i === unit.members.length - 1
                        ? "none"
                        : "1px solid #1e293b",
                  }}
                >
                  <span style={{ color: "#64748b", fontWeight: "bold" }}>
                    {m.role}
                  </span>

                  {/* EDITABLE NAME LOGIC */}
                  {editingMember?.unitId === unit.id &&
                  editingMember?.idx === i ? (
                    <input
                      autoFocus
                      defaultValue={m.name}
                      onBlur={(e) =>
                        handleNameChange(unit.id, i, e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        handleNameChange(unit.id, i, (e.target as any).value)
                      }
                      style={{
                        background: "#1e293b",
                        color: "#38bdf8",
                        border: "1px solid #38bdf8",
                        borderRadius: "4px",
                        padding: "0 5px",
                        width: "60%",
                      }}
                    />
                  ) : (
                    <span
                      onClick={() =>
                        setEditingMember({ unitId: unit.id, idx: i })
                      }
                      style={{
                        color: "#38bdf8",
                        cursor: "pointer",
                        borderBottom: "1px dashed #38bdf8",
                      }}
                    >
                      {m.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button
              onClick={() => updateStatus(unit.id, "enroute")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                background: unit.status === "enroute" ? "#1e40af" : "#334151",
                color: "white",
              }}
            >
              ENROUTE
            </button>
            <button
              onClick={() => updateStatus(unit.id, "arrived")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                background: unit.status === "arrived" ? "#166534" : "#334151",
                color: "white",
              }}
            >
              ARRIVED
            </button>
          </div>
        </div>
      </div>
    );
  };

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    incident.address + ", Baltimore County, MD"
  )}&t=k&z=20&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 450px",
        height: "100%",
        background: "#060b13",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "2px solid #1e293b",
        }}
      >
        <div
          style={{
            background: "#111827",
            borderBottom: "4px solid #ef4444",
            padding: "20px",
          }}
        >
          <div
            style={{
              color: "#facc15",
              fontSize: "42px",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {incident.callType}
          </div>
          <div
            style={{
              color: "#38bdf8",
              fontSize: "28px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {incident.address}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "5px" }}>
            BOX {incident.box} | ID: {incident.id}
          </div>
        </div>
        <div style={{ flex: 3 }}>
          <iframe
            title="Map"
            width="100%"
            height="100%"
            src={mapUrl}
            style={{ border: 0 }}
          ></iframe>
        </div>
        <div
          style={{
            flex: 1,
            background: "#0f172a",
            padding: "20px",
            borderTop: "2px solid #ef4444",
            overflowY: "auto",
          }}
        >
          <h4
            style={{
              color: "#ef4444",
              margin: "0 0 10px 0",
              fontSize: "14px",
              textTransform: "uppercase",
            }}
          >
            Narrative
          </h4>
          <p style={{ color: "#cbd5e1", fontSize: "18px", margin: 0 }}>
            {incident.narrative}
          </p>
        </div>
      </div>
      <div
        style={{ padding: "20px", background: "#0f172a", overflowY: "auto" }}
      >
        <h3
          style={{
            borderBottom: "2px solid #1e293b",
            paddingBottom: "10px",
            fontSize: "14px",
            color: "#f8fafc",
          }}
        >
          ACTIVE ASSETS
        </h3>
        {activeUnits.map(renderUnitCard)}
        {ghostedUnits.length > 0 && (
          <h3
            style={{
              borderBottom: "2px solid #1e293b",
              paddingBottom: "10px",
              fontSize: "14px",
              color: "#64748b",
              marginTop: "30px",
            }}
          >
            GHOSTED
          </h3>
        )}
        {ghostedUnits.map(renderUnitCard)}
      </div>
    </div>
  );
}
