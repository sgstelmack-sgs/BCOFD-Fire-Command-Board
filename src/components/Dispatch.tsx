import React from "react";

export default function Dispatch({
  incident,
  units,
  setUnits,
  syncState,
}: any) {
  const handleArrive = (unitId: string) => {
    const updatedUnits = units.map((u: any) =>
      u.id === unitId ? { ...u, status: "arrived" } : u
    );
    setUnits(updatedUnits);
    syncState({ units: updatedUnits });
  };

  // Google Maps URL with the parsed address
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(
    incident.address
  )}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 400px",
        gap: "20px",
        height: "calc(100vh - 120px)",
      }}
    >
      {/* LEFT SIDE: MAP & INCIDENT DATA */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div
          style={{
            background: "#1e293b",
            padding: "15px",
            borderRadius: "8px",
            borderLeft: "6px solid #38bdf8",
          }}
        >
          <div
            style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "bold" }}
          >
            INCIDENT LOCATION
          </div>
          <h1 style={{ margin: "5px 0", color: "#fff", fontSize: "24px" }}>
            {incident.address}
          </h1>
          <div style={{ fontSize: "14px", color: "#facc15" }}>
            BOX {incident.box}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            background: "#0f172a",
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid #334155",
          }}
        >
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={mapUrl}
            allowFullScreen
          ></iframe>
        </div>
      </div>

      {/* RIGHT SIDE: APPARATUS MANAGEMENT */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* EN ROUTE / GHOSTED SECTION */}
        <div
          style={{
            background: "#1e293b",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #334155",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              fontSize: "14px",
              color: "#94a3b8",
              borderBottom: "1px solid #475569",
              paddingBottom: "10px",
            }}
          >
            EN ROUTE (GHOSTED)
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginTop: "10px",
            }}
          >
            {units
              .filter((u: any) => u.status === "dispatched")
              .map((unit: any) => (
                <div
                  key={unit.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(15, 23, 42, 0.6)",
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px dashed #475569",
                    opacity: 0.7,
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#fff" }}>
                    {unit.id}
                  </span>
                  <button
                    onClick={() => handleArrive(unit.id)}
                    style={{
                      background: "#38bdf8",
                      color: "black",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "3px",
                      fontWeight: "bold",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    ARRIVED
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* ON SCENE SECTION */}
        <div
          style={{
            background: "#1e293b",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #334155",
            flex: 1,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              fontSize: "14px",
              color: "#22c55e",
              borderBottom: "1px solid #475569",
              paddingBottom: "10px",
            }}
          >
            ON SCENE
          </h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            {units
              .filter((u: any) => u.status === "arrived")
              .map((unit: any) => (
                <div
                  key={unit.id}
                  style={{
                    background: "#22c55e",
                    color: "black",
                    padding: "10px 15px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                >
                  {unit.id}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
