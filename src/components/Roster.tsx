import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getUnitColor } from "../App";

export default function Roster() {
  const [hierarchy, setHierarchy] = useState<any>({});
  const [staff, setStaff] = useState<any[]>([]); // New: Staff table data
  const [searchTerm, setSearchTerm] = useState(""); // New: Search string
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

  const typePriority: { [key: string]: number } = {
    CHIEF: 1,
    BC: 1,
    ENGINE: 2,
    TRUCK: 3,
    TOWER: 3,
    SQUAD: 4,
    RESCUE: 4,
    MEDIC: 5,
    AMBULANCE: 5,
  };

  useEffect(() => {
    fetchRosters();
    fetchStaff(); // Fetch staff for autocomplete
  }, []);

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("staff")
      .select("name, rank, id")
      .order("name");
    if (data) setStaff(data);
  };

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

      for (let bn in nested) {
        for (let type in nested[bn]) {
          for (let st in nested[bn][type]) {
            nested[bn][type][st].sort((a: any, b: any) => {
              const valA = typePriority[a.type.toUpperCase()] || 99;
              const valB = typePriority[b.type.toUpperCase()] || 99;
              if (valA !== valB) return valA - valB;
              return a.id.localeCompare(b.id, undefined, {
                numeric: true,
                sensitivity: "base",
              });
            });
          }
        }
      }
      setHierarchy(nested);
    }
    setLoading(false);
  };

  const handleMemberChange = (
    unitId: string,
    role: string,
    newName: string
  ) => {
    const next = { ...hierarchy };
    for (let bn in next) {
      for (let type in next[bn]) {
        for (let st in next[bn][type]) {
          next[bn][type][st] = next[bn][type][st].map((u: any) => {
            if (u.id === unitId) {
              return {
                ...u,
                currentMembers: u.currentMembers.map((m: any) =>
                  m.role === role ? { ...m, name: newName } : m
                ),
              };
            }
            return u;
          });
        }
      }
    }
    setHierarchy(next);
    if (!dirtyUnits.includes(unitId)) setDirtyUnits([...dirtyUnits, unitId]);
    setEditing(null);
    setSearchTerm("");
  };

  const saveUnit = async (unitId: string) => {
    let unit: any;
    Object.values(hierarchy).forEach((bn: any) =>
      Object.values(bn).forEach((ty: any) =>
        Object.values(ty).forEach((st: any) => {
          const found = st.find((u: any) => u.id === unitId);
          if (found) unit = found;
        })
      )
    );
    if (unit) {
      await supabase
        .from("rosters")
        .upsert(
          { unit_id: unitId, members: unit.currentMembers },
          { onConflict: "unit_id" }
        );
      setDirtyUnits(dirtyUnits.filter((id) => id !== unitId));
    }
  };

  const filteredStaff = staff
    .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 8);

  if (loading)
    return (
      <div style={{ padding: "50px", textAlign: "center", color: "#38bdf8" }}>
        Loading BCoFD Roster...
      </div>
    );

  return (
    <div
      style={{
        padding: "30px",
        background: "#060b13",
        minHeight: "100vh",
        color: "white",
      }}
    >
      <h2 style={{ marginBottom: "25px", fontWeight: 900 }}>BCoFD ROSTER</h2>

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
                setExpandedBN((p) =>
                  p.includes(bn) ? p.filter((i) => i !== bn) : [...p, bn]
                )
              }
              style={{
                background: "#1e293b",
                padding: "15px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#facc15", fontWeight: 900 }}>
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
                        border: "1px solid #1e293b",
                        borderRadius: "6px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        onClick={() =>
                          setExpandedType((p) =>
                            p.includes(typeKey)
                              ? p.filter((i) => i !== typeKey)
                              : [...p, typeKey]
                          )
                        }
                        style={{
                          background: isTypeExp ? "#1e293b" : "#111827",
                          padding: "10px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            color: type === "Career" ? "#38bdf8" : "#94a3b8",
                            fontSize: "11px",
                            fontWeight: 800,
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
                                    onClick={() =>
                                      setExpandedST((p) =>
                                        p.includes(stKey)
                                          ? p.filter((i) => i !== stKey)
                                          : [...p, stKey]
                                      )
                                    }
                                    style={{
                                      padding: "8px 15px",
                                      background: "#0f172a",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      cursor: "pointer",
                                      alignItems: "center",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        fontSize: "14px",
                                      }}
                                    >
                                      Station {st}
                                    </span>
                                    <span>{isStExp ? "−" : "+"}</span>
                                  </div>

                                  {isStExp && (
                                    <div
                                      style={{
                                        padding: "12px",
                                        display: "grid",
                                        gridTemplateColumns:
                                          "repeat(auto-fill, minmax(280px, 1fr))",
                                        gap: "12px",
                                      }}
                                    >
                                      {hierarchy[bn][type][st].map(
                                        (unit: any) => (
                                          <div
                                            key={unit.id}
                                            style={{
                                              background: "#111827",
                                              padding: "12px",
                                              borderRadius: "8px",
                                              border: dirtyUnits.includes(
                                                unit.id
                                              )
                                                ? "1px solid #facc15"
                                                : "1px solid #1e293b",
                                              borderLeft: `10px solid ${getUnitColor(
                                                unit.type
                                              )}`,
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
                                                style={{
                                                  color: "#f8fafc",
                                                  fontSize: "1.2rem",
                                                }}
                                              >
                                                {unit.id}
                                              </strong>
                                            </div>
                                            {unit.currentMembers.map(
                                              (m: any, idx: number) => {
                                                const isEditing =
                                                  editing?.unitId === unit.id &&
                                                  editing?.role === m.role;
                                                return (
                                                  <div
                                                    key={idx}
                                                    style={{
                                                      fontSize: "11px",
                                                      display: "flex",
                                                      justifyContent:
                                                        "space-between",
                                                      marginBottom: "4px",
                                                      position: "relative",
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        color: "#64748b",
                                                        fontWeight: "bold",
                                                        textTransform:
                                                          "uppercase",
                                                      }}
                                                    >
                                                      {m.role}
                                                    </span>

                                                    {!isEditing ? (
                                                      <span
                                                        onClick={() => {
                                                          setEditing({
                                                            unitId: unit.id,
                                                            role: m.role,
                                                          });
                                                          setSearchTerm(
                                                            m.name || ""
                                                          );
                                                        }}
                                                        style={{
                                                          cursor: "pointer",
                                                          color: m.name
                                                            ? "white"
                                                            : "#475569",
                                                        }}
                                                      >
                                                        {m.name ||
                                                          `${unit.id} ${m.role}`}
                                                      </span>
                                                    ) : (
                                                      <div
                                                        style={{
                                                          position: "relative",
                                                        }}
                                                      >
                                                        <input
                                                          autoFocus
                                                          placeholder="Search..."
                                                          value={searchTerm}
                                                          onChange={(e) =>
                                                            setSearchTerm(
                                                              e.target.value
                                                            )
                                                          }
                                                          onKeyDown={(e) =>
                                                            e.key ===
                                                              "Escape" &&
                                                            setEditing(null)
                                                          }
                                                          onBlur={() =>
                                                            setTimeout(
                                                              () =>
                                                                setEditing(
                                                                  null
                                                                ),
                                                              200
                                                            )
                                                          }
                                                          style={{
                                                            background:
                                                              "#1e293b",
                                                            color: "white",
                                                            width: "140px",
                                                            border:
                                                              "1px solid #38bdf8",
                                                            padding: "0 4px",
                                                          }}
                                                        />
                                                        {searchTerm && (
                                                          <div
                                                            style={{
                                                              position:
                                                                "absolute",
                                                              top: "100%",
                                                              right: 0,
                                                              width: "200px",
                                                              background:
                                                                "#1e293b",
                                                              zIndex: 100,
                                                              border:
                                                                "1px solid #334155",
                                                              borderRadius:
                                                                "4px",
                                                              boxShadow:
                                                                "0 4px 6px rgba(0,0,0,0.3)",
                                                            }}
                                                          >
                                                            {filteredStaff.map(
                                                              (s) => (
                                                                <div
                                                                  key={s.id}
                                                                  onMouseDown={() =>
                                                                    handleMemberChange(
                                                                      unit.id,
                                                                      m.role,
                                                                      s.name
                                                                    )
                                                                  }
                                                                  style={{
                                                                    padding:
                                                                      "6px",
                                                                    cursor:
                                                                      "pointer",
                                                                    borderBottom:
                                                                      "1px solid #0f172a",
                                                                    fontSize:
                                                                      "10px",
                                                                  }}
                                                                  onMouseEnter={(
                                                                    e
                                                                  ) =>
                                                                    (e.currentTarget.style.background =
                                                                      "#334155")
                                                                  }
                                                                  onMouseLeave={(
                                                                    e
                                                                  ) =>
                                                                    (e.currentTarget.style.background =
                                                                      "transparent")
                                                                  }
                                                                >
                                                                  {s.rank}{" "}
                                                                  {s.name}
                                                                </div>
                                                              )
                                                            )}
                                                            <div
                                                              onMouseDown={() =>
                                                                handleMemberChange(
                                                                  unit.id,
                                                                  m.role,
                                                                  searchTerm
                                                                )
                                                              }
                                                              style={{
                                                                padding: "6px",
                                                                color:
                                                                  "#38bdf8",
                                                                fontSize: "9px",
                                                                fontStyle:
                                                                  "italic",
                                                                cursor:
                                                                  "pointer",
                                                              }}
                                                            >
                                                              Use Custom: "
                                                              {searchTerm}"
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              }
                                            )}
                                            {dirtyUnits.includes(unit.id) && (
                                              <button
                                                onClick={() =>
                                                  saveUnit(unit.id)
                                                }
                                                style={{
                                                  width: "100%",
                                                  background: "#facc15",
                                                  color: "black",
                                                  fontSize: "10px",
                                                  fontWeight: "bold",
                                                  marginTop: "5px",
                                                  padding: "5px",
                                                  borderRadius: "4px",
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
