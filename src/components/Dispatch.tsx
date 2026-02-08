import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { FireUnit } from "../App";

/**
 * DISPATCH SCREEN
 * Layout:
 * - Top Header: Row 1 (Call Type), Row 2 (Box, Address, Incident ID)
 * - Main: Left (Map & Narrative), Right (Unit Accountability Sidebar)
 */
export default function Dispatch({ incident, units, syncState }: any) {
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);
  const [editingMember, setEditingMember] = useState<{
    unitId: string;
    idx: number;
  } | null>(null);

  // Grouping logic for the unit sidebar
  const activeUnits = units.filter((u: FireUnit) => !u.isGhosted);
  const ghostedUnits = units.filter((u: FireUnit) => u.isGhosted);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  const toggleGhost = (unitId: string) => {
    const nextUnits = units.map((u: FireUnit) =>
      u.id === unitId ? { ...u, isGhosted: !u.isGhosted } : u
    );
    syncState({ units: nextUnits });
  };

  const updateStatus = (unitId: string, status: string) => {
    const nextUnits = units.map((u: FireUnit) =>
      u.id === unitId ? { ...u, status, isGhosted: false } : u
    );
    syncState({ units: nextUnits });
  };

  const handleNameChange = async (
    unitId: string,
    idx: number,
    newName: string
  ) => {
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
    const isGhosted = unit.isGhosted;

    return (
      <div
        key={unit.id}
        style={{
          background: isGhosted ? "rgba(30, 41, 59, 0.3)" : "#1e293b",
          marginBottom: "12px",
          borderRadius: "10px",
          border: isGhosted ? "1px dashed #334151" : "1px solid #334151",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "15px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: isExpanded ? "15px" : "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                onClick={() => toggleUnit(unit.id)}
                style={{
                  fontSize: "18px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: isGhosted ? "#64748b" : "#f8fafc",
                }}
              >
                {unit.displayId}
              </span>
              {isGhosted && (
                <span
                  onClick={() => toggleGhost(unit.id)}
                  style={{
                    cursor: "pointer",
                    fontSize: "18px",
                    background: "#334151",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  👻
                </span>
              )}
            </div>
            <span
              style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}
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
                marginBottom: "15px",
                border: "1px solid #1e293b",
              }}
            >
              {unit.members.map((m: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom:
                      idx === unit.members.length - 1
                        ? "none"
                        : "1px solid #1e293b",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    {m.role}
                  </span>
                  {editingMember?.unitId === unit.id &&
                  editingMember?.idx === idx ? (
                    <input
                      autoFocus
                      defaultValue={m.name}
                      onBlur={(e) =>
                        handleNameChange(unit.id, idx, e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        handleNameChange(
                          unit.id,
                          idx,
                          (e.target as HTMLInputElement).value
                        )
                      }
                      style={{
                        background: "#334151",
                        color: "white",
                        border: "1px solid #38bdf8",
                        borderRadius: "3px",
                        fontSize: "13px",
                        padding: "0 5px",
                        width: "60%",
                      }}
                    />
                  ) : (
                    <span
                      onClick={() =>
                        !isGhosted && setEditingMember({ unitId: unit.id, idx })
                      }
                      style={{
                        fontSize: "13px",
                        color: isGhosted ? "#475569" : "#38bdf8",
                        cursor: isGhosted ? "default" : "pointer",
                      }}
                    >
                      {m.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            {["enroute", "arrived"].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(unit.id, s)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  fontSize: "12px",
                  fontWeight: "bold",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background:
                    unit.status === s
                      ? s === "arrived"
                        ? "#166534"
                        : "#1e40af"
                      : "#334151",
                  color: unit.status === s ? "white" : "#94a3b8",
                }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    incident.address + ", Baltimore County, MD"
  )}&t=k&z=19&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 420px",
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
        {/* --- STACKED HEADER START --- */}
        <div
          style={{ background: "#111827", borderBottom: "4px solid #ef4444" }}
        >
          {/* ROW 1: CALL TYPE */}
          <div
            style={{
              padding: "15px 30px",
              borderBottom: "1px solid #1e293b",
              background: "rgba(250, 204, 21, 0.05)",
            }}
          >
            <small
              style={{
                color: "#94a3b8",
                fontSize: "12px",
                fontWeight: "bold",
                letterSpacing: "1px",
              }}
            >
              CALL TYPE
            </small>
            <div
              style={{
                fontSize: "42px",
                fontWeight: 900,
                color: "#facc15",
                lineHeight: "1",
              }}
            >
              {incident.callType}
            </div>
          </div>

          {/* ROW 2: BOX, ADDRESS, INCIDENT # */}
          <div
            style={{
              padding: "15px 30px",
              display: "flex",
              gap: "40px",
              alignItems: "center",
            }}
          >
            <div>
              <small
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                BOX
              </small>
              <div
                style={{ fontSize: "32px", fontWeight: 900, color: "#f8fafc" }}
              >
                {incident.box}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <small
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                ADDRESS
              </small>
              <div
                style={{ fontSize: "32px", fontWeight: 900, color: "#38bdf8" }}
              >
                {incident.address}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <small
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                INCIDENT #
              </small>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#f8fafc",
                  opacity: 0.8,
                }}
              >
                {incident.id}
              </div>
            </div>
          </div>
        </div>
        {/* --- STACKED HEADER END --- */}

        <div style={{ flex: 1 }}>
          <iframe
            title="Map"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            src={mapUrl}
            allowFullScreen
          ></iframe>
        </div>

        <div
          style={{
            height: "250px",
            padding: "25px",
            overflowY: "auto",
            borderTop: "2px solid #1e293b",
          }}
        >
          <h4
            style={{
              color: "#ef4444",
              marginTop: 0,
              textTransform: "uppercase",
              fontSize: "14px",
            }}
          >
            Comments
          </h4>
          <p style={{ color: "#cbd5e1", fontSize: "18px" }}>
            {incident.narrative}
          </p>
        </div>
      </div>

      <div
        style={{ padding: "20px", background: "#0f172a", overflowY: "auto" }}
      >
        <h3
          style={{
            color: "#f8fafc",
            borderBottom: "2px solid #1e293b",
            paddingBottom: "10px",
            fontSize: "14px",
          }}
        >
          ASSIGNED UNITS ({activeUnits.length})
        </h3>
        <div style={{ marginBottom: "30px" }}>
          {activeUnits.map((unit: FireUnit) => renderUnitCard(unit))}
        </div>
        {ghostedUnits.length > 0 && (
          <>
            <h3
              style={{
                color: "#64748b",
                borderBottom: "2px solid #1e293b",
                paddingBottom: "10px",
                fontSize: "14px",
                textTransform: "uppercase",
              }}
            >
              Ghosted / Notified ({ghostedUnits.length})
            </h3>
            <div>
              {ghostedUnits.map((unit: FireUnit) => renderUnitCard(unit))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
