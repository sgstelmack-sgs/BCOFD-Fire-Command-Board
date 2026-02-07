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
  const fallbackMap = `https://maps.google.com/maps?q=${encodeURIComponent(
    incident.address
  )}&t=k&z=19&ie=UTF8&iwloc=&output=embed`;

  // Status Toggles
  const setStatus = (uid: string, newStatus: string) => {
    const next = units.map((u: FireUnit) =>
      u.id === uid ? { ...u, status: newStatus } : u
    );
    setUnits(next);
    syncState({ units: next, incident });
  };

  const updateMemberName = (
    unitId: string,
    memberIdx: number,
    name: string
  ) => {
    const next = units.map((u: FireUnit) => {
      if (u.id === unitId) {
        const newMembers = [...u.members];
        newMembers[memberIdx] = { ...newMembers[memberIdx], name };
        return { ...u, members: newMembers };
      }
      return u;
    });
    setUnits(next);
    syncState({ units: next, incident });
  };

  const addUnit = () => {
    if (!manual) return;
    const next = [...units, createUnitInstance(manual)];
    setUnits(next);
    syncState({ units: next, incident });
    setManual("");
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
      {/* LEFT: HEADER & MAP */}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  color: "#f97316",
                  fontWeight: "bold",
                  fontSize: "20px",
                }}
              >
                BOX {incident.box}
              </div>
              <div
                style={{ color: "white", fontSize: "24px", fontWeight: "bold" }}
              >
                {incident.address}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: "12px",
              border: "1px solid #1e293b",
              padding: "8px 12px",
              background: "#020617",
              color: "#4ade80",
              fontWeight: "bold",
            }}
          >
            {incident.callNotes?.split("INFO:")[1] || "WORKING FIRE"}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            src={fallbackMap}
            style={{ filter: "brightness(0.7) contrast(1.2)" }}
          />
        </div>
      </div>

      {/* RIGHT: APPARATUS SIDEBAR */}
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#020617",
          padding: "12px",
          overflowY: "auto",
        }}
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
            onClick={addUnit}
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

        {/* EN ROUTE / GHOSTED SECTION */}
        {units
          .filter(
            (u: FireUnit) => u.status === "dispatched" || u.status === "enroute"
          )
          .map((u: FireUnit, index: number) => (
            <div
              key={u.id}
              style={{
                background: "#111827",
                marginBottom: "12px",
                border: "1px solid #1e293b",
                borderRadius: "3px",
                opacity: u.status === "dispatched" ? 0.5 : 1, // Ghosted effect
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: "#1e293b",
                  padding: "6px 12px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span
                    style={{
                      background: "#f97316",
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
                    {index + 1}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: "18px",
                    }}
                  >
                    {u.id}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  {u.status === "dispatched" && (
                    <button
                      onClick={() => setStatus(u.id, "enroute")}
                      style={{
                        background: "#facc15",
                        color: "black",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: "2px",
                        fontWeight: "bold",
                        fontSize: "10px",
                        cursor: "pointer",
                      }}
                    >
                      EN ROUTE
                    </button>
                  )}
                  <button
                    onClick={() => setStatus(u.id, "arrived")}
                    style={{
                      background: "#22c55e",
                      color: "black",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: "2px",
                      fontWeight: "bold",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    ARRIVE
                  </button>
                </div>
              </div>

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
                      height: "45px",
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
                        updateMemberName(u.id, idx, e.target.value)
                      }
                      placeholder="..."
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        fontWeight: "bold",
                        fontSize: "12px",
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

        {/* ON SCENE SECTION */}
        <div
          style={{
            borderTop: "2px solid #1e293b",
            marginTop: "10px",
            paddingTop: "15px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "#22c55e",
              fontWeight: "bold",
              marginBottom: "10px",
              textAlign: "center",
            }}
          >
            ON SCENE
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {units
              .filter((u: FireUnit) => u.status === "arrived")
              .map((u: FireUnit) => (
                <div
                  key={u.id}
                  style={{
                    padding: "10px 15px",
                    background: "#0f172a",
                    borderLeft: "4px solid #22c55e",
                    fontWeight: "bold",
                    fontSize: "15px",
                    color: "white",
                  }}
                >
                  {u.id}
                </div>
              ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
