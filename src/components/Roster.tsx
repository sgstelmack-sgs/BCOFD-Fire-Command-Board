import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * CAPTAIN'S NOTES: BCFD COMMAND ROSTER
 * - Strict Sorting: Uses database columns 'battalion_id' and 'station_id'
 * to prevent rigs like M118 from ghosting into Station 11.
 * - Local State: Changes stay in the card (turning the border yellow)
 * until 'SAVE UNIT' is pressed.
 * - Extra Personnel: Instant green '+' adds "[Unit] Extra" with trash can deletion.
 */
export default function Roster() {
  const [hierarchy, setHierarchy] = useState<any>({});
  const [expandedBN, setExpandedBN] = useState<string[]>([]);
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

    if (apparatus) {
      const nested: any = {};

      apparatus.forEach((u: any) => {
        // FORCE database column values and trim whitespace
        const bn = String(u.battalion_id || "UNASSIGNED").trim();
        const st = String(u.station_id || "MISC").trim();

        const savedRoster = rosters?.find((r) => r.unit_id === u.id);
        const currentMembers =
          savedRoster?.members ||
          u.roles.map((role: string) => ({
            role,
            name: "",
          }));

        if (!nested[bn]) nested[bn] = {};
        if (!nested[bn][st]) nested[bn][st] = [];

        nested[bn][st].push({ ...u, currentMembers });
      });
      setHierarchy(nested);
    }
    setLoading(false);
    setDirtyUnits([]);
  };

  const handleLocalUpdate = (unitId: string, role: string, newName: string) => {
    const newHierarchy = { ...hierarchy };
    for (const bn in newHierarchy) {
      for (const st in newHierarchy[bn]) {
        newHierarchy[bn][st] = newHierarchy[bn][st].map((u: any) => {
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
    setHierarchy(newHierarchy);
    if (!dirtyUnits.includes(unitId)) setDirtyUnits([...dirtyUnits, unitId]);
    setEditing(null);
  };

  const addExtraMember = (unitId: string) => {
    const newHierarchy = { ...hierarchy };
    for (const bn in newHierarchy) {
      for (const st in newHierarchy[bn]) {
        newHierarchy[bn][st] = newHierarchy[bn][st].map((u: any) => {
          if (u.id === unitId) {
            const extraCount =
              u.currentMembers.filter((m: any) => m.role.includes("Extra"))
                .length + 1;
            const roleName = `${unitId} Extra ${
              extraCount > 1 ? extraCount : ""
            }`.trim();
            return {
              ...u,
              currentMembers: [
                ...u.currentMembers,
                { role: roleName, name: "", isExtra: true },
              ],
            };
          }
          return u;
        });
      }
    }
    setHierarchy(newHierarchy);
    if (!dirtyUnits.includes(unitId)) setDirtyUnits([...dirtyUnits, unitId]);
  };

  const removeMember = (unitId: string, role: string) => {
    const newHierarchy = { ...hierarchy };
    for (const bn in newHierarchy) {
      for (const st in newHierarchy[bn]) {
        newHierarchy[bn][st] = newHierarchy[bn][st].map((u: any) => {
          if (u.id === unitId) {
            return {
              ...u,
              currentMembers: u.currentMembers.filter(
                (m: any) => m.role !== role
              ),
            };
          }
          return u;
        });
      }
    }
    setHierarchy(newHierarchy);
    if (!dirtyUnits.includes(unitId)) setDirtyUnits([...dirtyUnits, unitId]);
  };

  const saveUnitRoster = async (unitId: string) => {
    let targetUnit: any = null;
    for (const bn in hierarchy) {
      for (const st in hierarchy[bn]) {
        const found = hierarchy[bn][st].find((u: any) => u.id === unitId);
        if (found) targetUnit = found;
      }
    }

    if (targetUnit) {
      const { error } = await supabase.from("rosters").upsert(
        {
          unit_id: unitId,
          members: targetUnit.currentMembers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "unit_id" }
      );

      if (!error) {
        setDirtyUnits(dirtyUnits.filter((id) => id !== unitId));
      } else {
        alert("Check Console: Save Failed");
        console.error(error);
      }
    }
  };

  const toggleMedicalMode = async (unitId: string, current: string) => {
    const next = current === "ALS" ? "BLS" : "ALS";
    await supabase
      .from("apparatus")
      .update({ medical_mode: next })
      .eq("id", unitId);
    fetchRosters();
  };

  if (loading)
    return (
      <div style={{ padding: "50px", color: "#38bdf8", textAlign: "center" }}>
        Loading Roster...
      </div>
    );

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
      <h2
        style={{ marginBottom: "25px", color: "#f8fafc", letterSpacing: "1px" }}
      >
        BCFD Command Roster
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
            {/* Battalion Header */}
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
              <span style={{ color: "#facc15", fontWeight: "bold" }}>
                {bnLabels[bn] || bn}
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                {expandedBN.includes(bn) ? "▼" : "▶"}
              </span>
            </div>

            {expandedBN.includes(bn) && (
              <div style={{ padding: "12px", background: "#0f172a" }}>
                {Object.keys(hierarchy[bn])
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((st) => {
                    const stKey = `${bn}-${st}`;
                    return (
                      <div
                        key={st}
                        style={{
                          marginBottom: "10px",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        {/* Station Header */}
                        <div
                          onClick={() =>
                            setExpandedST((prev) =>
                              prev.includes(stKey)
                                ? prev.filter((i) => i !== stKey)
                                : [...prev, stKey]
                            )
                          }
                          style={{
                            padding: "12px 18px",
                            cursor: "pointer",
                            color: "#38bdf8",
                            background: "#060b13",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontWeight: "600" }}>
                            Station {st}
                          </span>
                          <span>{expandedST.includes(stKey) ? "−" : "+"}</span>
                        </div>

                        {/* Apparatus Grid */}
                        {expandedST.includes(stKey) && (
                          <div
                            style={{
                              padding: "15px",
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(320px, 1fr))",
                              gap: "15px",
                              background: "#0f172a",
                            }}
                          >
                            {hierarchy[bn][st].map((unit: any) => {
                              const displayId =
                                unit.type === "MEDIC" &&
                                unit.medical_mode === "BLS"
                                  ? unit.id.replace("M", "A")
                                  : unit.id;

                              return (
                                <div
                                  key={unit.id}
                                  style={{
                                    background: "#111827",
                                    padding: "15px",
                                    borderRadius: "8px",
                                    border: dirtyUnits.includes(unit.id)
                                      ? "1px solid #facc15"
                                      : "1px solid #1e293b",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "10px",
                                      borderBottom: "1px solid #1e293b",
                                      paddingBottom: "8px",
                                    }}
                                  >
                                    <strong
                                      style={{
                                        color: "#f8fafc",
                                        fontSize: "1.2rem",
                                      }}
                                    >
                                      {displayId}
                                    </strong>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "8px",
                                        alignItems: "center",
                                      }}
                                    >
                                      {unit.type === "MEDIC" && (
                                        <button
                                          onClick={() =>
                                            toggleMedicalMode(
                                              unit.id,
                                              unit.medical_mode
                                            )
                                          }
                                          style={{
                                            background:
                                              unit.medical_mode === "ALS"
                                                ? "#991b1b"
                                                : "#166534",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "10px",
                                            padding: "4px 8px",
                                          }}
                                        >
                                          {unit.medical_mode}
                                        </button>
                                      )}
                                      <button
                                        onClick={() => addExtraMember(unit.id)}
                                        style={{
                                          background: "#166534",
                                          color: "white",
                                          border: "none",
                                          borderRadius: "50%",
                                          width: "24px",
                                          height: "24px",
                                          fontSize: "16px",
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {unit.currentMembers.map(
                                    (m: any, i: number) => (
                                      <div
                                        key={i}
                                        style={{
                                          fontSize: "12px",
                                          color: "#94a3b8",
                                          display: "flex",
                                          justifyContent: "space-between",
                                          marginBottom: "8px",
                                          alignItems: "center",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                          }}
                                        >
                                          {(m.isExtra ||
                                            m.role.includes("Extra")) && (
                                            <span
                                              onClick={() =>
                                                removeMember(unit.id, m.role)
                                              }
                                              style={{
                                                color: "#ef4444",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                              }}
                                            >
                                              🗑️
                                            </span>
                                          )}
                                          <span
                                            style={{
                                              fontWeight: "bold",
                                              fontSize: "10px",
                                              textTransform: "uppercase",
                                            }}
                                          >
                                            {m.role}
                                          </span>
                                        </div>
                                        {editing?.unitId === unit.id &&
                                        editing?.role === m.role ? (
                                          <input
                                            autoFocus
                                            defaultValue={m.name}
                                            onBlur={(e) =>
                                              handleLocalUpdate(
                                                unit.id,
                                                m.role,
                                                e.target.value
                                              )
                                            }
                                            onKeyDown={(e) =>
                                              e.key === "Enter" &&
                                              handleLocalUpdate(
                                                unit.id,
                                                m.role,
                                                (e.target as HTMLInputElement)
                                                  .value
                                              )
                                            }
                                            style={{
                                              background: "#1e293b",
                                              color: "#38bdf8",
                                              border: "1px solid #38bdf8",
                                              borderRadius: "3px",
                                              width: "60%",
                                              padding: "2px 5px",
                                            }}
                                          />
                                        ) : (
                                          <span
                                            onClick={() =>
                                              setEditing({
                                                unitId: unit.id,
                                                role: m.role,
                                              })
                                            }
                                            style={{
                                              color: m.name
                                                ? "#f8fafc"
                                                : "#334155",
                                              cursor: "pointer",
                                              borderBottom:
                                                "1px dashed #334155",
                                            }}
                                          >
                                            {m.name || "VACANT"}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  )}

                                  {dirtyUnits.includes(unit.id) && (
                                    <button
                                      onClick={() => saveUnitRoster(unit.id)}
                                      style={{
                                        width: "100%",
                                        marginTop: "10px",
                                        background: "#facc15",
                                        color: "#060b13",
                                        border: "none",
                                        borderRadius: "4px",
                                        padding: "8px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                      }}
                                    >
                                      SAVE UNIT
                                    </button>
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
