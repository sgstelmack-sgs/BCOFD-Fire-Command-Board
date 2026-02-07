import React, { useState } from "react";
import { FireUnit, Member } from "../App";

export default function Dispatch({
  incident,
  units,
  setUnits,
  syncState,
  createUnitInstance,
}: any) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    incident.address
  )}&t=k&z=19&output=embed`;

  const isExpanded = (id: string) => expanded.indexOf(id) !== -1;
  const toggleExpand = (id: string) =>
    isExpanded(id)
      ? setExpanded(expanded.filter((i) => i !== id))
      : setExpanded([...expanded, id]);

  const setStatus = (uid: string, newStatus: string) => {
    const next = units.map((u: FireUnit) =>
      u.id === uid ? { ...u, status: newStatus } : u
    );
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
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            background: "#0f172a",
            padding: "15px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div style={{ color: "#f97316", fontWeight: "bold" }}>
            BOX {incident.box}
          </div>
          <div style={{ fontSize: "20px", fontWeight: "bold" }}>
            {incident.address}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            src={mapUrl}
            style={{ filter: "brightness(0.7)" }}
          />
        </div>
      </div>

      <aside
        style={{ background: "#020617", padding: "10px", overflowY: "auto" }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#facc15",
            fontWeight: "bold",
            marginBottom: "10px",
          }}
        >
          UNITS EN ROUTE
        </div>
        {units
          .filter((u: FireUnit) => u.status === "enroute")
          .map((u: FireUnit) => (
            <div
              key={u.id}
              style={{
                background: "#111827",
                marginBottom: "8px",
                border: "1px solid #1e293b",
              }}
            >
              <div
                onClick={() => toggleExpand(u.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px",
                  cursor: "pointer",
                  alignItems: "center",
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
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                    }}
                  >
                    {getTypeIndex(u)}
                  </span>
                  <div>
                    <div style={{ fontWeight: "bold", color: "white" }}>
                      {u.id}
                    </div>
                    {u.station && (
                      <div style={{ fontSize: "9px", color: "#64748b" }}>
                        STA {u.station} | BAT {u.battalion}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatus(u.id, "arrived");
                  }}
                  style={{
                    background: "#22c55e",
                    color: "black",
                    border: "none",
                    padding: "4px 8px",
                    fontWeight: "bold",
                    fontSize: "10px",
                  }}
                >
                  ARRIVE
                </button>
              </div>
              {isExpanded(u.id) && (
                <div
                  style={{
                    padding: "10px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "5px",
                  }}
                >
                  {u.members.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#060b13",
                        padding: "5px",
                        border: "1px solid #334155",
                      }}
                    >
                      <div style={{ fontSize: "8px", color: "#64748b" }}>
                        {m.role}
                      </div>
                      <div style={{ fontSize: "11px" }}>{m.name || "---"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </aside>
    </div>
  );
}
