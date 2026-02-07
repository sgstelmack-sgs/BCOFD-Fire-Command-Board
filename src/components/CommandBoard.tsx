import React from "react";

// --- TYPES TO MATCH APP.TSX ---
interface Member {
  role: string;
  name: string;
  assignment: string;
}

interface FireUnit {
  id: string;
  status: string;
  type: string;
  assignment: string;
  members: Member[];
}

interface CommandBoardProps {
  incident: any;
  units: FireUnit[];
  setUnits: (units: FireUnit[]) => void;
  syncState: (payload: any) => void;
}

export default function CommandBoard({
  incident,
  units,
  setUnits,
  syncState,
}: CommandBoardProps) {
  const sectors = [
    "Division 1",
    "Division 2",
    "Division 3",
    "Roof",
    "Exp 2",
    "Exp 4",
  ];

  // Explicitly tell TypeScript 'u' is a FireUnit
  const staging = units.filter(
    (u: FireUnit) => u.status === "arrived" && !u.assignment
  );

  const moveUnit = (uid: string, sector: string) => {
    const next = units.map((u: FireUnit) =>
      u.id === uid ? { ...u, assignment: sector } : u
    );
    setUnits(next);
    syncState({ units: next, incident });
  };

  const updateMember = (uid: string, idx: number, val: string) => {
    const next = units.map((u: FireUnit) => {
      if (u.id === uid) {
        const m = [...u.members];
        m[idx].name = val;
        return { ...u, members: m };
      }
      return u;
    });
    setUnits(next);
    syncState({ units: next, incident });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr 250px",
        gap: 20,
        height: "85vh",
      }}
    >
      {/* STAGING */}
      <aside
        style={{
          background: "#1e293b",
          padding: 15,
          borderRadius: 8,
          overflowY: "auto",
        }}
      >
        <h3 style={{ color: "#f97316", borderBottom: "2px solid #f97316" }}>
          STAGING
        </h3>
        {staging.map((u: FireUnit) => (
          <div
            key={u.id}
            style={{
              background: "#0f172a",
              padding: 10,
              marginBottom: 15,
              borderRadius: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <strong>{u.id}</strong>
              <select
                onChange={(e) => moveUnit(u.id, e.target.value)}
                style={{ background: "#334155", color: "white" }}
              >
                <option value="">Assign...</option>
                {sectors.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {u.members.map((m: Member, idx: number) => (
              <input
                key={idx}
                value={m.name}
                onChange={(e) => updateMember(u.id, idx, e.target.value)}
                placeholder={m.role}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid #334155",
                  color: "white",
                  fontSize: 11,
                  marginBottom: 4,
                }}
              />
            ))}
          </div>
        ))}
      </aside>

      {/* TACTICAL GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {sectors.map((s: string) => (
          <div
            key={s}
            style={{
              background: "#1e293b",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #334155",
            }}
          >
            <h4
              style={{
                color: "#38bdf8",
                margin: 0,
                borderBottom: "1px solid #334155",
                textAlign: "center",
              }}
            >
              {s}
            </h4>
            {units
              .filter((u: FireUnit) => u.assignment === s)
              .map((u: FireUnit) => (
                <div
                  key={u.id}
                  style={{
                    background: "#0f172a",
                    padding: 8,
                    marginTop: 8,
                    borderRadius: 4,
                    borderLeft: "4px solid #38bdf8",
                  }}
                >
                  <strong style={{ fontSize: 14 }}>{u.id}</strong>
                  <button
                    onClick={() => moveUnit(u.id, "")}
                    style={{
                      float: "right",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    {u.members
                      .map((m: Member) => m.name || m.role.split(" ")[0])
                      .join(", ")}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </section>

      {/* BENCHMARKS */}
      <aside style={{ background: "#1e293b", padding: 15, borderRadius: 8 }}>
        <h3 style={{ color: "#22c55e" }}>BENCHMARKS</h3>
        {[
          "Primary Search",
          "Secondary Search",
          "Fire Controlled",
          "Utilities",
        ].map((b: string) => (
          <div key={b} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input type="checkbox" /> {b}
          </div>
        ))}
      </aside>
    </div>
  );
}
