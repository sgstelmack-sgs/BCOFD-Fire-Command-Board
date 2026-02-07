import React, { useState } from "react";
import { FireUnit, Member } from "../App";

export default function CommandBoard({
  incident,
  units,
  setUnits,
  syncState,
}: any) {
  const sectors = [
    "Division 1",
    "Division 2",
    "Division 3",
    "Roof",
    "Exp 2",
    "Exp 4",
  ];
  const [expanded, setExpanded] = useState<string[]>([]);

  // ONLY arrived units that aren't assigned a sector yet appear in Staging
  const staging = units.filter(
    (u: FireUnit) => u.status === "arrived" && !u.assignment
  );

  const isExpanded = (id: string) => expanded.indexOf(id) !== -1;

  const toggleExpand = (id: string) => {
    if (isExpanded(id)) {
      setExpanded(expanded.filter((i) => i !== id));
    } else {
      setExpanded([...expanded, id]);
    }
  };

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
        height: "calc(100vh - 45px)",
        background: "#060b13",
        padding: "10px",
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
        <h3
          style={{
            color: "#f97316",
            borderBottom: "2px solid #f97316",
            marginTop: 0,
          }}
        >
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
              onClick={() => toggleExpand(u.id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
                cursor: "pointer",
              }}
            >
              <strong style={{ color: "white" }}>{u.id}</strong>
              <select
                onChange={(e) => moveUnit(u.id, e.target.value)}
                style={{
                  background: "#334155",
                  color: "white",
                  fontSize: "10px",
                }}
              >
                <option value="">Assign...</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {isExpanded(u.id) &&
              u.members.map((m: Member, idx: number) => (
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
        {sectors.map((s) => (
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
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <strong style={{ fontSize: 14, color: "white" }}>
                      {u.id}
                    </strong>
                    <button
                      onClick={() => moveUnit(u.id, "")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                    {u.members
                      .map((m) => m.name || m.role.split(" ")[0])
                      .join(", ")}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </section>

      {/* BENCHMARKS */}
      <aside style={{ background: "#1e293b", padding: 15, borderRadius: 8 }}>
        <h3 style={{ color: "#22c55e", marginTop: 0 }}>BENCHMARKS</h3>
        {[
          "Primary Search",
          "Secondary Search",
          "Fire Controlled",
          "Utilities",
        ].map((b) => (
          <div
            key={b}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 10,
              color: "white",
              fontSize: "13px",
            }}
          >
            <input type="checkbox" /> {b}
          </div>
        ))}
      </aside>
    </div>
  );
}
