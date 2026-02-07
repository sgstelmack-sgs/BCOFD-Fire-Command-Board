import React, { useState } from "react";
import { FireUnit, Member } from "../App";

export default function Dispatch({
  incident,
  units,
  setUnits,
  syncState,
  createUnitInstance,
}: any) {
  const [manual, setManual] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    incident.address
  )}&t=k&z=19&output=embed`;

  const isExpanded = (id: string) => expanded.indexOf(id) !== -1;

  const toggleExpand = (id: string) => {
    if (isExpanded(id)) {
      setExpanded(expanded.filter((i) => i !== id));
    } else {
      setExpanded([...expanded, id]);
    }
  };

  const setStatus = (uid: string, newStatus: string) => {
    const next = units.map((u: FireUnit) =>
      u.id === uid ? { ...u, status: newStatus } : u
    );
    setUnits(next);
    syncState({ units: next, incident });
  };

  const updateMember = (unitId: string, idx: number, name: string) => {
    const next = units.map((u: FireUnit) => {
      if (u.id === unitId) {
        const m = [...u.members];
        m[idx].name = name;
        return { ...u, members: m };
      }
      return u;
    });
    setUnits(next);
    syncState({ units: next, incident });
  };

  const getTypeIndex = (unit: FireUnit) => {
    const sameType = units.filter(
      (u: FireUnit) => u.type === unit.type && u.status !== "dispatched"
    );
    return sameType.findIndex((u: FireUnit) => u.id === unit.id) + 1;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 450px",
        height: "calc(100vh - 45px)",
        background: "#060b13",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            padding: "15px 30px",
            borderBottom: "2px solid #1e293b",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  color: "#f97316",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                BOX {incident.box}
              </div>
              <div
                style={{ color: "white", fontSize: "22px", fontWeight: "bold" }}
              >
                {incident.address}
              </div>
            </div>
            <div
              style={{ textAlign: "right", color: "#64748b", fontSize: "11px" }}
            >
              ID: <span style={{ color: "white" }}>{incident.id}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <div
              style={{
                flex: 1,
                border: "1px solid #1e293b",
                padding: "8px",
                background: "#020617",
              }}
            >
              <span
                style={{
                  color: "#22c55e",
                  fontWeight: "bold",
                  fontSize: "9px",
                }}
              >
                NARRATIVE:
              </span>
              <div
                style={{
                  color: "#4ade80",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                {incident.narrative}
              </div>
            </div>
            <div
              style={{
                width: "180px",
                border: "1px solid #1e293b",
                padding: "8px",
                background: "#020617",
                fontSize: "11px",
                color: "white",
              }}
            >
              {incident.date} | {incident.time}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            src={mapUrl}
            style={{ filter: "brightness(0.7) contrast(1.2)", border: "none" }}
          />
        </div>
      </div>

      <aside
        style={{ background: "#020617", padding: "12px", overflowY: "auto" }}
      >
        <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder="ADD UNIT..."
            style={{
              flex: 1,
              padding: "12px",
              background: "#0f172a",
              color: "white",
              border: "1px solid #1f2937",
              fontWeight: "bold",
            }}
          />
          <button
            onClick={() => {
              if (manual) setUnits([...units, createUnitInstance(manual)]);
              setManual("");
            }}
            style={{
              background: "#22c55e",
              border: "none",
              width: "45px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            +
          </button>
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "#facc15",
            fontWeight: "bold",
            marginBottom: "10px",
            textTransform: "uppercase",
          }}
        >
          Units En Route
        </div>
        {/* ONLY SHOW EN ROUTE UNITS HERE */}
        {units
          .filter((u: FireUnit) => u.status === "enroute")
          .map((u: FireUnit) => (
            <div
              key={u.id}
              style={{
                background: "#111827",
                marginBottom: "8px",
                border: "1px solid #1e293b",
                borderRadius: "3px",
              }}
            >
              <div
                onClick={() => toggleExpand(u.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: "#1e293b",
                  padding: "8px 12px",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span
                    style={{
                      background: u.type === "ENGINE" ? "#ef4444" : "#22c55e",
                      color: "white",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    {getTypeIndex(u)}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    {u.id}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatus(u.id, "arrived");
                    }}
                    style={{
                      background: "#22c55e",
                      color: "black",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "2px",
                      fontWeight: "bold",
                      fontSize: "10px",
                    }}
                  >
                    ARRIVE
                  </button>
                  <span style={{ color: "#475569", fontSize: "10px" }}>
                    {isExpanded(u.id) ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {isExpanded(u.id) && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "4px",
                    padding: "8px",
                  }}
                >
                  {u.members.map((m: Member, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        background: "#060b13",
                        padding: "5px 8px",
                        border: "1px solid #1f2937",
                        height: "40px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "8px",
                          color: "#475569",
                          textTransform: "uppercase",
                        }}
                      >
                        {m.role}
                      </div>
                      <input
                        value={m.name}
                        onChange={(e) =>
                          updateMember(u.id, idx, e.target.value)
                        }
                        placeholder="..."
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#94a3b8",
                          fontWeight: "bold",
                          fontSize: "11px",
                          width: "100%",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              fontWeight: "bold",
              marginBottom: "10px",
              textTransform: "uppercase",
            }}
          >
            Inactive / Ghosted Units
          </div>
          {units
            .filter((u: FireUnit) => u.status === "dispatched")
            .map((u: FireUnit) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#0f172a",
                  border: "1px dashed #334155",
                  padding: "10px 15px",
                  borderRadius: "4px",
                  marginBottom: "5px",
                }}
              >
                <span style={{ color: "#94a3b8", fontWeight: "bold" }}>
                  G{u.id}
                </span>
                <button
                  onClick={() => setStatus(u.id, "enroute")}
                  style={{
                    background: "#334155",
                    color: "white",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: "3px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  ACTIVATE
                </button>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}
