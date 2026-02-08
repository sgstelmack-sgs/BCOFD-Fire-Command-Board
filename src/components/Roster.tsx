import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * CAPTAIN'S NOTES: BCoFD COMMAND ROSTER
 * - Title updated to BCoFD Roster.
 * - Double-Bucket: Battalion -> Service Type (Career/Vol) -> Station.
 * - Dynamic Deployment: Allows adding temporary/reserve units to any station.
 */
export default function Roster() {
  const [hierarchy, setHierarchy] = useState<any>({});
  const [expandedBN, setExpandedBN] = useState<string[]>([]);
  const [expandedType, setExpandedType] = useState<string[]>([]);
  const [expandedST, setExpandedST] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    unitId: string;
    role: string;
  } | null>(null);
  const [dirtyUnits, setDirtyUnits] = useState<string[]>([]);

  const bnLabels: any = {
    B1: "Battalion 1 Central",
    B2: "Battalion 2 West",
    B3: "Battalion 3 East",
  };

  useEffect(() => {
    fetchRosters();
  }, []);

  const fetchRosters = async () => {
    setLoading(true);
    const { data: apparatus } = await supabase.from("apparatus").select("*");
    const { data: rosters } = await supabase.from("rosters").select("*");

    const battalionMap: { [key: string]: string } = {};
    [
      "1",
      "10",
      "11",
      "14",
      "17",
      "29",
      "30",
      "38",
      "39",
      "44",
      "45",
      "47",
      "49",
      "50",
      "53",
      "60",
    ].forEach((s) => (battalionMap[s] = "B1"));
    [
      "2",
      "3",
      "4",
      "5",
      "13",
      "18",
      "19",
      "31",
      "23",
      "33",
      "35",
      "36",
      "37",
      "40",
      "41",
      "42",
      "43",
      "46",
      "56",
      "85",
    ].forEach((s) => (battalionMap[s] = "B2"));
    [
      "6",
      "7",
      "8",
      "9",
      "12",
      "15",
      "16",
      "20",
      "21",
      "22",
      "24",
      "25",
      "26",
      "27",
      "28",
      "48",
      "51",
      "52",
      "54",
      "55",
      "57",
      "58",
      "74",
    ].forEach((s) => (battalionMap[s] = "B3"));

    if (apparatus) {
      const nested: any = {};
      apparatus.forEach((u: any) => {
        const st = String(u.station_id || "MISC").trim();
        const bn =
          battalionMap[st] || String(u.battalion_id || "UNASSIGNED").trim();
        const typeKey = u.is_career ? "Career" : "Volunteer";

        if (!nested[bn]) nested[bn] = {};
        if (!nested[bn][typeKey]) nested[bn][typeKey] = {};
        if (!nested[bn][typeKey][st]) nested[bn][typeKey][st] = [];

        const savedRoster = rosters?.find((r) => r.unit_id === u.id);
        const currentMembers =
          savedRoster?.members ||
          u.roles.map((role: string) => ({ role, name: "" }));
        nested[bn][typeKey][st].push({ ...u, currentMembers });
      });
      setHierarchy(nested);
    }
    setLoading(false);
  };

  const deployNewUnit = (bn: string, type: string, st: string) => {
    const unitId = window.prompt(
      "Enter Unit ID (e.g. E472, RS3, Reserve Truck):"
    );
    if (!unitId) return;

    const newUnit = {
      id: unitId.toUpperCase(),
      station_id: st,
      battalion_id: bn,
      is_career: type === "Career",
      type: "ENGINE",
      roles: ["Officer", "Driver", "Nozzle", "Backup"],
      currentMembers: [
        { role: "Officer", name: "" },
        { role: "Driver", name: "" },
        { role: "Nozzle", name: "" },
        { role: "Backup", name: "" },
      ],
    };

    const next = { ...hierarchy };
    next[bn][type][st].push(newUnit);
    setHierarchy(next);
    if (!dirtyUnits.includes(newUnit.id))
      setDirtyUnits([...dirtyUnits, newUnit.id]);

    const stKey = `${bn}-${type}-${st}`;
    if (!expandedST.includes(stKey)) setExpandedST([...expandedST, stKey]);
  };

  const findAndUpdateUnit = (unitId: string, updater: (u: any) => any) => {
    const next = { ...hierarchy };
    for (let bn in next) {
      for (let type in next[bn]) {
        for (let st in next[bn][type]) {
          next[bn][type][st] = next[bn][type][st].map((u: any) =>
            u.id === unitId ? updater(u) : u
          );
        }
      }
    }
    setHierarchy(next);
    if (!dirtyUnits.includes(unitId)) setDirtyUnits([...dirtyUnits, unitId]);
  };

  const saveUnitRoster = async (unitId: string) => {
    let targetUnit: any = null;
    Object.values(hierarchy).forEach((bn: any) =>
      Object.values(bn).forEach((type: any) =>
        Object.values(type).forEach((st: any) => {
          const found = st.find((u: any) => u.id === unitId);
          if (found) targetUnit = found;
        })
      )
    );

    if (targetUnit) {
      const { error } = await supabase.from("rosters").upsert(
        {
          unit_id: unitId,
          members: targetUnit.currentMembers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "unit_id" }
      );
      if (!error) setDirtyUnits(dirtyUnits.filter((id) => id !== unitId));
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        background: "#060b13",
        minHeight: "100vh",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      {/* UPDATED TITLE HERE */}
      <h2
        style={{ marginBottom: "25px", letterSpacing: "1px", fontWeight: 900 }}
      >
        BCoFD ROSTER
      </h2>

      {Object.keys(hierarchy)
        .sort()
        .map((bn) => (
          <div
            key={bn}
            style={{
              marginBottom: "15px",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              onClick={() =>
                setExpandedBN((prev) =>
                  prev.includes(bn)
                    ? prev.filter((i) => i !== bn)
                    : [...prev, bn]
                )
              }
              style={{
                background: "#1e293b",
                padding: "15px 20px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#facc15",
                  fontWeight: 900,
                  fontSize: "1.1rem",
                }}
              >
                {bnLabels[bn] || bn}
              </span>
              <span>{expandedBN.includes(bn) ? "▼" : "▶"}</span>
            </div>

            {expandedBN.includes(bn) && (
              <div style={{ padding: "10px", background: "#0f172a" }}>
                {["Career", "Volunteer"].map((type) => {
                  if (!hierarchy[bn][type]) return null;
                  const typeKey = `${bn}-${type}`;
                  const isTypeExp = expandedType.includes(typeKey);

                  return (
                    <div
                      key={type}
                      style={{
                        marginBottom: "10px",
                        borderRadius: "6px",
                        border: "1px solid #1e293b",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        onClick={() =>
                          setExpandedType((prev) =>
                            prev.includes(typeKey)
                              ? prev.filter((i) => i !== typeKey)
                              : [...prev, typeKey]
                          )
                        }
                        style={{
                          background: isTypeExp ? "#1e293b" : "#111827",
                          padding: "10px 15px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            color: type === "Career" ? "#38bdf8" : "#94a3b8",
                            fontWeight: 800,
                            fontSize: "11px",
                          }}
                        >
                          {type.toUpperCase()} STATIONS
                        </span>
                        <span>{isTypeExp ? "▼" : "▶"}</span>
                      </div>

                      {isTypeExp && (
                        <div style={{ padding: "10px", background: "#060b13" }}>
                          {Object.keys(hierarchy[bn][type])
                            .sort((a, b) => parseInt(a) - parseInt(b))
                            .map((st) => {
                              const stKey = `${typeKey}-${st}`;
                              const isStExp = expandedST.includes(stKey);

                              return (
                                <div
                                  key={st}
                                  style={{
                                    marginBottom: "8px",
                                    border: "1px solid #334155",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "8px 15px",
                                      background: "#0f172a",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div
                                      onClick={() =>
                                        setExpandedST((prev) =>
                                          prev.includes(stKey)
                                            ? prev.filter((i) => i !== stKey)
                                            : [...prev, stKey]
                                        )
                                      }
                                      style={{
                                        cursor: "pointer",
                                        flex: 1,
                                        fontWeight: 600,
                                        fontSize: "13px",
                                      }}
                                    >
                                      <span style={{ marginRight: "10px" }}>
                                        {isStExp ? "−" : "+"}
                                      </span>
                                      Station {st}
                                    </div>
                                    <button
                                      onClick={() =>
                                        deployNewUnit(bn, type, st)
                                      }
                                      style={{
                                        background: "transparent",
                                        color: "#38bdf8",
                                        border: "1px solid #38bdf8",
                                        borderRadius: "4px",
                                        fontSize: "10px",
                                        padding: "2px 8px",
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      + UNIT
                                    </button>
                                  </div>

                                  {isStExp && (
                                    <div
                                      style={{
                                        padding: "12px",
                                        display: "grid",
                                        gridTemplateColumns:
                                          "repeat(auto-fill, minmax(280px, 1fr))",
                                        gap: "12px",
                                        background: "#111827",
                                      }}
                                    >
                                      {hierarchy[bn][type][st].map(
                                        (unit: any) => (
                                          <div
                                            key={unit.id}
                                            style={{
                                              background: "#060b13",
                                              padding: "12px",
                                              borderRadius: "6px",
                                              border: dirtyUnits.includes(
                                                unit.id
                                              )
                                                ? "1px solid #facc15"
                                                : "1px solid #1e293b",
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                marginBottom: "8px",
                                              }}
                                            >
                                              <strong
                                                style={{ color: "#38bdf8" }}
                                              >
                                                {unit.id}
                                              </strong>
                                              <button
                                                onClick={() =>
                                                  findAndUpdateUnit(
                                                    unit.id,
                                                    (u) => ({
                                                      ...u,
                                                      currentMembers: [
                                                        ...u.currentMembers,
                                                        {
                                                          role: `${u.id} Extra`,
                                                          name: "",
                                                          isExtra: true,
                                                        },
                                                      ],
                                                    })
                                                  )
                                                }
                                                style={{
                                                  background: "#166534",
                                                  color: "white",
                                                  border: "none",
                                                  borderRadius: "50%",
                                                  width: "20px",
                                                  height: "20px",
                                                  cursor: "pointer",
                                                }}
                                              >
                                                +
                                              </button>
                                            </div>
                                            {unit.currentMembers.map(
                                              (m: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  style={{
                                                    fontSize: "11px",
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    marginBottom: "5px",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      gap: "5px",
                                                    }}
                                                  >
                                                    {m.isExtra && (
                                                      <span
                                                        onClick={() =>
                                                          findAndUpdateUnit(
                                                            unit.id,
                                                            (u) => ({
                                                              ...u,
                                                              currentMembers:
                                                                u.currentMembers.filter(
                                                                  (mem: any) =>
                                                                    mem.role !==
                                                                    m.role
                                                                ),
                                                            })
                                                          )
                                                        }
                                                        style={{
                                                          color: "#ef4444",
                                                          cursor: "pointer",
                                                        }}
                                                      >
                                                        🗑️
                                                      </span>
                                                    )}
                                                    <span
                                                      style={{
                                                        color: "#64748b",
                                                        fontWeight: "bold",
                                                      }}
                                                    >
                                                      {m.role}
                                                    </span>
                                                  </div>
                                                  <span
                                                    onClick={() =>
                                                      setEditing({
                                                        unitId: unit.id,
                                                        role: m.role,
                                                      })
                                                    }
                                                    style={{
                                                      color: m.name
                                                        ? "white"
                                                        : "#334155",
                                                      cursor: "pointer",
                                                    }}
                                                  >
                                                    {editing?.unitId ===
                                                      unit.id &&
                                                    editing?.role === m.role ? (
                                                      <input
                                                        autoFocus
                                                        defaultValue={m.name}
                                                        onBlur={(e) => {
                                                          findAndUpdateUnit(
                                                            unit.id,
                                                            (u) => ({
                                                              ...u,
                                                              currentMembers:
                                                                u.currentMembers.map(
                                                                  (mem: any) =>
                                                                    mem.role ===
                                                                    m.role
                                                                      ? {
                                                                          ...mem,
                                                                          name: e
                                                                            .target
                                                                            .value,
                                                                        }
                                                                      : mem
                                                                ),
                                                            })
                                                          );
                                                          setEditing(null);
                                                        }}
                                                        style={{
                                                          background: "#1e293b",
                                                          color: "white",
                                                          border:
                                                            "1px solid #38bdf8",
                                                          width: "80px",
                                                        }}
                                                      />
                                                    ) : (
                                                      m.name || "VACANT"
                                                    )}
                                                  </span>
                                                </div>
                                              )
                                            )}
                                            {dirtyUnits.includes(unit.id) && (
                                              <button
                                                onClick={() =>
                                                  saveUnitRoster(unit.id)
                                                }
                                                style={{
                                                  width: "100%",
                                                  background: "#facc15",
                                                  color: "black",
                                                  border: "none",
                                                  borderRadius: "4px",
                                                  fontSize: "10px",
                                                  padding: "4px",
                                                  marginTop: "5px",
                                                  fontWeight: "bold",
                                                }}
                                              >
                                                SAVE UNIT
                                              </button>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
