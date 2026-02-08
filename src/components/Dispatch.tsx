import React from "react";
import { FireUnit, Incident } from "../App";

export default function Dispatch({
  incident,
  units,
  syncState,
}: {
  incident: Incident;
  units: FireUnit[];
  syncState: any;
}) {
  // Logic: Separate alerted units from ghosted units
  const activeAlerts = units.filter((u: FireUnit) => u.status === "dispatched");
  const ghostedAlerts = units.filter((u: FireUnit) => u.status === "ghosted");

  const renderUnitCard = (u: FireUnit, isGhosted: boolean) => (
    <div
      key={u.id}
      style={{
        background: "#0f172a",
        borderRadius: "8px",
        border: isGhosted ? "1px dashed #334155" : "1px solid #1e293b",
        marginBottom: "20px",
        opacity: isGhosted ? 0.5 : 1,
        filter: isGhosted ? "grayscale(100%)" : "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: isGhosted ? "#1e293b" : "#2d3748",
          padding: "10px 15px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: "bold", color: "white", fontSize: "18px" }}>
          {u.id} {isGhosted && "(GHOSTED)"}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "#94a3b8",
            background: "#060b13",
            padding: "2px 6px",
            borderRadius: "4px",
          }}
        >
          {u.type}
        </span>
      </div>

      <div style={{ padding: "15px" }}>
        {u.members.map((m: any, mIdx: number) => (
          <div key={mIdx} style={{ marginBottom: "12px" }}>
            <label
              style={{
                fontSize: "10px",
                color: "#38bdf8",
                display: "block",
                marginBottom: "4px",
                fontWeight: "bold",
              }}
            >
              {m.role.toUpperCase()}
            </label>
            <input
              type="text"
              value={m.name}
              onChange={(e) => {
                const nextUnits = units.map((unit: FireUnit) => {
                  if (unit.id !== u.id) return unit;
                  const nextM = [...unit.members];
                  nextM[mIdx].name = e.target.value;
                  return { ...unit, members: nextM };
                });
                syncState({ units: nextUnits });
              }}
              style={{
                width: "100%",
                background: "#060b13",
                border: "1px solid #334155",
                borderRadius: "4px",
                padding: "10px",
                color: "white",
                fontSize: "14px",
              }}
            />
          </div>
        ))}

        <button
          onClick={() => {
            const nextUnits = units.map((unit: FireUnit) =>
              unit.id === u.id ? { ...unit, status: "enroute" } : unit
            );
            syncState({ units: nextUnits });
          }}
          style={{
            width: "100%",
            background: isGhosted ? "#4a5568" : "#eab308",
            color: isGhosted ? "white" : "black",
            border: "none",
            padding: "14px",
            borderRadius: "6px",
            fontWeight: "900",
            marginTop: "10px",
            cursor: "pointer",
            fontSize: "14px",
            textTransform: "uppercase",
          }}
        >
          {isGhosted ? "Activate & Respond" : "Responding"}
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 500px",
        height: "calc(100vh - 48px)",
        background: "#060b13",
      }}
    >
      {/* LEFT: MAP & DETAILS */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "2px solid #1f2937",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px",
            background: "#0f172a",
            borderBottom: "1px solid #1f2937",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "bold" }}
            >
              BOX {incident.box} | {incident.timestamp}
            </div>
            <h1 style={{ margin: "5px 0", color: "white", fontSize: "24px" }}>
              {incident.address}
            </h1>
          </div>
          <div
            style={{ textAlign: "right", color: "#94a3b8", fontSize: "11px" }}
          >
            ID: {incident.id}
          </div>
        </div>

        {/* SATELLITE MAP - ZOOM 19 */}
        <div style={{ flex: 2, background: "#000" }}>
          <iframe
            title="Satellite Map"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(
              incident.address
            )}&t=k&z=19&output=embed`}
            allowFullScreen
          />
        </div>

        {/* INFO / COMMENTS BOX */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            background: "#0b121f",
            borderTop: "2px solid #1f2937",
            overflowY: "auto",
          }}
        >
          <h3
            style={{
              color: "#facc15",
              fontSize: "11px",
              marginBottom: "8px",
              textTransform: "uppercase",
            }}
          >
            INFO / COMMENTS
          </h3>
          <div
            style={{
              color: "#f8fafc",
              fontSize: "16px",
              fontWeight: "500",
              fontFamily: "monospace",
              backgroundColor: "#1e293b",
              padding: "15px",
              borderRadius: "6px",
              border: "1px solid #334155",
            }}
          >
            {incident.notes}
          </div>
        </div>
      </section>

      {/* RIGHT: UNIT CARDS */}
      <aside
        style={{ padding: "20px", overflowY: "auto", background: "#060b13" }}
      >
        <h3
          style={{
            color: "#38bdf8",
            fontSize: "12px",
            marginBottom: "20px",
            borderBottom: "1px solid #1e293b",
            paddingBottom: "10px",
          }}
        >
          PRIMARY RESPONSE
        </h3>
        {activeAlerts.map((u: FireUnit) => renderUnitCard(u, false))}

        {ghostedAlerts.length > 0 && (
          <>
            <h3
              style={{
                color: "#64748b",
                fontSize: "12px",
                marginTop: "30px",
                marginBottom: "15px",
                borderTop: "1px solid #1e293b",
                paddingTop: "20px",
              }}
            >
              GHOSTED / INACTIVE
            </h3>
            {ghostedAlerts.map((u: FireUnit) => renderUnitCard(u, true))}
          </>
        )}
      </aside>
    </div>
  );
}
