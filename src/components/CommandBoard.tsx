import { useState } from "react";
import { FireUnit, getUnitColor } from "../App";

const normalize = (str: string) =>
  str?.toLowerCase().replace(/[-\s]/g, "") || "";

export default function CommandBoard({ units, syncState }: any) {
  // --- 1. STATE ---
  const [taskLocations, setTaskLocations] = useState<Record<string, string>>(
    {}
  );
  const [activeTab, setActiveTab] = useState<"tactical" | "strategic">(
    "tactical"
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const [activeCommand] = useState([
    { id: "ic", name: "Incident Command" },
    { id: "safety", name: "Safety Officer" },
  ]);
  const [activeGeneral] = useState([
    { id: "ops-section", name: "Operations Section" },
  ]);
  const [activeBranches] = useState<any[]>([]);

  const [activeDivisions, setActiveDivisions] = useState([
    { id: "group-roof", name: "Roof Group", side: "left" },
    { id: "div-2", name: "Division 2", side: "left" },
    { id: "div-1", name: "Division 1", side: "left" },
    { id: "div-basement", name: "Basement", side: "left" },
    { id: "div-a", name: "Division Alpha", side: "right" },
    { id: "div-c", name: "Division Charlie", side: "right" },
    { id: "group-search", name: "Search & Rescue", side: "right" },
    { id: "group-rit", name: "RIT Group", side: "right" },
  ]);

  const [allTasks, setAllTasks] = useState([
    { id: "fa-1", name: "Fire Attack 1", base: "Fire Attack" },
    { id: "sr-1", name: "Search 1", base: "Search" },
    { id: "vent-1", name: "Ventilation 1", base: "Ventilation" },
    { id: "ws-1", name: "Water Supply 1", base: "Water Supply" },
    { id: "util-1", name: "Utilities 1", base: "Utilities" },
    { id: "rit-1", name: "RIT Task 1", base: "RIT" },
  ]);

  // --- 2. HIERARCHY ENGINE ---
  const sortDivisions = (divs: any[]) => {
    const getRank = (name: string) => {
      const norm = normalize(name);
      if (norm.includes("roof")) return 0;
      const floorMatch = norm.match(/(?:division|floor)(\d+)/);
      if (floorMatch) return 20 - parseInt(floorMatch[1]);
      if (norm.includes("division1") || norm.includes("floor1")) return 21;
      const baseMatch = norm.match(/basement(\d+)/);
      if (baseMatch) return 30 + parseInt(baseMatch[1]);
      if (norm === "basement") return 30;
      if (norm.includes("alpha")) return 50;
      if (norm.includes("bravo")) return 51;
      if (norm.includes("charlie")) return 52;
      if (norm.includes("delta")) return 53;
      return 99;
    };
    return [...divs].sort((a, b) => getRank(a.name) - getRank(b.name));
  };

  // --- 3. FILTER ENGINE (Fixed Implicit Any) ---
  const filteredUnits = (units || []).filter((u: any) => {
    const s = normalize(u.status || "");
    const t = normalize(u.type || "");
    const id = (u.displayId || "").toUpperCase();

    const isOnCall =
      s.includes("route") ||
      s.includes("arrive") ||
      s.includes("scene") ||
      s.includes("dispatch");
    if (!isOnCall) return false;

    if (activeFilters.length === 0) return true;
    const typeFilters = activeFilters.filter(
      (f) => !["Arrived", "En Route"].includes(f)
    );
    const statusFilters = activeFilters.filter((f) =>
      ["Arrived", "En Route"].includes(f)
    );

    let matchesType =
      typeFilters.length === 0 ||
      typeFilters.some((f) => {
        if (f === "Staff") return t.includes("chief") || id.includes("SAFE6");
        if (f === "EMS")
          return (
            id.includes("EMSDO") ||
            id.includes("MEDIC") ||
            t.includes("ems") ||
            t.includes("medic")
          );
        if (f === "Engine") return t.includes("engine");
        if (f === "Truck")
          return (
            t.includes("truck") || t.includes("tow") || t.includes("ladder")
          );
        if (f === "Squad") return t.includes("squad") || t.includes("rescue");
        if (f === "Other")
          return ![
            t.includes("engine"),
            t.includes("truck"),
            t.includes("tow"),
            t.includes("ladder"),
            t.includes("squad"),
            t.includes("rescue"),
            t.includes("chief"),
            id.includes("SAFE6"),
            id.includes("EMSDO"),
            id.includes("MEDIC"),
            t.includes("ems"),
          ].some(Boolean);
        return false;
      });
    let matchesStatus =
      statusFilters.length === 0 ||
      statusFilters.some((f) => s.includes(normalize(f)));
    return matchesType && matchesStatus;
  });

  // --- 4. TETHERED UPDATES ---
  const updatePersonnelAssignment = (
    unitId: string,
    memberIdx: number,
    newAssignment: string
  ) => {
    const nextUnits = units.map((u: any) => {
      if (u.id !== unitId) return u;
      const nextMembers = [...(u.members || [])];
      nextMembers[memberIdx] = {
        ...nextMembers[memberIdx],
        assignment: newAssignment,
      };

      const roleNorm = normalize(nextMembers[memberIdx].role);
      const pair = u.linkedPairs?.find((p: string[]) =>
        p.some((r) => roleNorm.includes(normalize(r)))
      );
      if (pair) {
        const partnerRolePart = pair.find(
          (r: string) => !roleNorm.includes(normalize(r))
        );
        const partnerIdx = nextMembers.findIndex((m) =>
          normalize(m.role).includes(
            partnerRolePart ? normalize(partnerRolePart) : ""
          )
        );
        if (
          partnerIdx !== -1 &&
          (nextMembers[partnerIdx].assignment === "Unassigned" ||
            nextMembers[partnerIdx].assignment === "STAGING")
        ) {
          nextMembers[partnerIdx] = {
            ...nextMembers[partnerIdx],
            assignment: newAssignment,
          };
        }
      }
      return { ...u, members: nextMembers };
    });
    syncState({ units: nextUnits });
  };

  const spawnNextDivision = (currentName: string, side: string) => {
    const norm = normalize(currentName);
    let nextName = "";
    const floorMatch = norm.match(/(?:division|floor)(\d+)/);
    const baseMatch = norm.match(/basement(\d+)/);

    if (floorMatch) nextName = `Division ${parseInt(floorMatch[1]) + 1}`;
    else if (norm === "division1" || norm === "floor1") nextName = "Division 2";
    else if (baseMatch) nextName = `Basement ${parseInt(baseMatch[1]) + 1}`;
    else if (norm === "basement") nextName = "Basement 2";
    else if (norm.includes("alpha")) nextName = "Division Bravo";
    else if (norm.includes("charlie")) nextName = "Division Delta";

    if (!nextName) nextName = prompt("New Division/Group Name:") || "";
    if (
      nextName &&
      !activeDivisions.some((d) => normalize(d.name) === normalize(nextName))
    ) {
      setActiveDivisions((prev) =>
        sortDivisions([
          ...prev,
          { id: `id-${Date.now()}`, name: nextName, side },
        ])
      );
    }
  };

  const renameItem = (
    id: string,
    currentName: string,
    type: "div" | "task"
  ) => {
    const newName = prompt(`Rename "${currentName}" to:`, currentName);
    if (!newName || newName === currentName) return;
    if (type === "div")
      setActiveDivisions((p) =>
        p.map((d) => (d.id === id ? { ...d, name: newName } : d))
      );
    else
      setAllTasks((p) =>
        p.map((t) => (t.id === id ? { ...t, name: newName } : t))
      );
  };

  const handleTaskDeployment = (taskId: string, newLocation: string) => {
    setTaskLocations((prev) => ({ ...prev, [taskId]: newLocation }));
    if (!newLocation) return;
    const task = allTasks.find((t) => t.id === taskId);
    if (task?.base) {
      const count = allTasks.filter((t) => t.base === task.base).length + 1;
      const newId = `${normalize(task.base)}-${count}`;
      if (!allTasks.find((t) => t.id === newId)) {
        setAllTasks((prev) => [
          ...prev,
          { id: newId, name: `${task.base} ${count}`, base: task.base },
        ]);
      }
    }
  };

  // --- 5. RENDERERS ---
  const renderPersonnelTag = (
    unit: FireUnit,
    member: any,
    idx: number,
    context: "staffing" | "tactical"
  ) => {
    const color = getUnitColor(unit.type);
    return (
      <div
        key={`${unit.id}-${idx}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("type", "personnel");
          e.dataTransfer.setData(
            "data",
            JSON.stringify({ unitId: unit.id, idx })
          );
        }}
        style={{
          background: "#111827",
          margin: "1px 0",
          padding: "4px 6px",
          borderRadius: "3px",
          borderLeft: `3px solid ${color}`,
          fontSize: "10px",
          display: "flex",
          justifyContent: "space-between",
          border: "1px solid #1f2937",
          color: "#f8fafc",
          cursor: "grab",
        }}
      >
        <span>
          <strong>{unit.displayId}</strong> {member.name || member.role}
        </span>
        {context === "tactical" && (
          <button
            onClick={() =>
              updatePersonnelAssignment(unit.id, idx, "Unassigned")
            }
            style={{
              background: "#991b1b",
              color: "white",
              border: "none",
              borderRadius: "2px",
              padding: "0 3px",
              cursor: "pointer",
            }}
          >
            -
          </button>
        )}
      </div>
    );
  };

  const renderTaskCard = (task: any) => {
    const assigned = (units || [])
      .flatMap((u: any) =>
        (u.members || []).map((m: any, idx: number) => ({ u, m, idx }))
      )
      .filter((item: any) => item.m.assignment === task.id);
    return (
      <div
        key={task.id}
        onDoubleClick={() => renameItem(task.id, task.name, "task")}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("type", "task");
          e.dataTransfer.setData("taskId", task.id);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dT = e.dataTransfer.getData("type");
          if (dT === "personnel") {
            const d = JSON.parse(e.dataTransfer.getData("data"));
            updatePersonnelAssignment(d.unitId, d.idx, task.id);
          } else if (dT === "unit") {
            syncState({
              units: units.map((u: any) =>
                u.id === e.dataTransfer.getData("unitId")
                  ? {
                      ...u,
                      members: u.members.map((m: any) => ({
                        ...m,
                        assignment: task.id,
                      })),
                    }
                  : u
              ),
            });
          }
        }}
        style={{
          background: "#020617",
          borderRadius: "4px",
          padding: "6px",
          marginBottom: "4px",
          border: "1px solid #1e293b",
          borderLeft: "3px solid #38bdf8",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            fontWeight: 900,
            color: "#38bdf8",
            marginBottom: "4px",
          }}
        >
          {task.name.toUpperCase()}
        </div>
        {assigned.map((item: any) =>
          renderPersonnelTag(item.u, item.m, item.idx, "tactical")
        )}
      </div>
    );
  };

  const renderBucket = (bucket: any, sectionKey: string) => {
    const personnel = (units || [])
      .flatMap((u: any) =>
        (u.members || []).map((m: any, idx: number) => ({ u, m, idx }))
      )
      .filter((item: any) => item.m.assignment === bucket.id);
    return (
      <div
        key={bucket.id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dT = e.dataTransfer.getData("type");
          if (dT === "unit")
            syncState({
              units: units.map((u: any) =>
                u.id === e.dataTransfer.getData("unitId")
                  ? {
                      ...u,
                      members: u.members.map((m: any) => ({
                        ...m,
                        assignment: bucket.id,
                      })),
                    }
                  : u
              ),
            });
          else if (dT === "personnel") {
            const d = JSON.parse(e.dataTransfer.getData("data"));
            updatePersonnelAssignment(d.unitId, d.idx, bucket.id);
          } else if (dT === "task")
            handleTaskDeployment(e.dataTransfer.getData("taskId"), bucket.id);
        }}
        style={{
          background: sectionKey === "divisions" ? "#1e293b" : "#0f172a",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #334155",
          marginBottom: "8px",
          minHeight: "60px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "4px",
            top: "4px",
            display: "flex",
            gap: "4px",
          }}
        >
          {sectionKey === "divisions" && (
            <button
              onClick={() => spawnNextDivision(bucket.name, bucket.side)}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "14px",
                height: "14px",
                fontSize: "10px",
              }}
            >
              +
            </button>
          )}
          <button
            onClick={() => {
              syncState({
                units: units.map((u: any) => ({
                  ...u,
                  members: u.members.map((m: any) =>
                    m.assignment === bucket.id
                      ? { ...m, assignment: "Unassigned" }
                      : m
                  ),
                })),
              });
              if (sectionKey === "divisions")
                setActiveDivisions((prev) =>
                  prev.filter((d) => d.id !== bucket.id)
                );
            }}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "14px",
              height: "14px",
              fontSize: "8px",
            }}
          >
            ✕
          </button>
        </div>
        <div
          onDoubleClick={() => renameItem(bucket.id, bucket.name, "div")}
          style={{
            color: "#f1f5f9",
            fontSize: "9px",
            fontWeight: 900,
            marginBottom: "6px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingRight: "30px",
            cursor: "pointer",
          }}
        >
          {bucket.name.toUpperCase()}
        </div>
        {personnel.map((p: any) =>
          renderPersonnelTag(p.u, p.m, p.idx, "tactical")
        )}
        {allTasks
          .filter((t) => taskLocations[t.id] === bucket.id)
          .map(renderTaskCard)}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#060b13",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          padding: "8px 15px",
          display: "flex",
          gap: "6px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        {[
          "Engine",
          "Truck",
          "Squad",
          "Staff",
          "EMS",
          "Other",
          "Arrived",
          "En Route",
        ].map((f) => (
          <button
            key={f}
            onClick={() =>
              setActiveFilters((prev) =>
                prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
              )
            }
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              fontSize: "9px",
              fontWeight: 900,
              background: activeFilters.includes(f) ? "#38bdf8" : "#1e293b",
              color: activeFilters.includes(f) ? "#020617" : "#94a3b8",
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => setActiveFilters([])}
          style={{
            padding: "4px 10px",
            background: "transparent",
            color: "#ef4444",
            border: "1px solid #ef4444",
            borderRadius: "4px",
            fontSize: "9px",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          RESET
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "480px 1fr 220px",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            padding: "10px",
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            borderRight: "1px solid #1e293b",
          }}
        >
          {filteredUnits.map((u: any) => (
            <div
              key={u.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("type", "unit");
                e.dataTransfer.setData("unitId", u.id);
              }}
              style={{
                background: "#1e293b",
                borderRadius: "6px",
                borderLeft: `6px solid ${getUnitColor(u.type)}`,
                padding: "8px",
                height: "fit-content",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  color: "#f8fafc",
                  fontSize: "11px",
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span>{u.displayId}</span>
                <button
                  onClick={() =>
                    syncState({
                      units: units.map((un: any) =>
                        un.id === u.id
                          ? {
                              ...un,
                              status: normalize(un.status).includes("arrive")
                                ? "Available"
                                : "Arrived",
                            }
                          : un
                      ),
                    })
                  }
                  style={{
                    fontSize: "8px",
                    padding: "2px 5px",
                    borderRadius: "3px",
                    background: normalize(u.status).includes("arrive")
                      ? "#991b1b"
                      : "#854d0e",
                    color: "white",
                    border: "none",
                  }}
                >
                  {normalize(u.status).includes("arrive") ? "CLEAR" : "ARRIVE"}
                </button>
              </div>
              {(u.members || []).map((m: any, idx: number) =>
                renderPersonnelTag(u, m, idx, "staffing")
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "10px",
            overflowY: "auto",
            borderRight: "1px solid #1e293b",
          }}
        >
          <section style={{ marginBottom: "15px" }}>
            <div
              style={{
                color: "#ef4444",
                fontSize: "10px",
                fontWeight: 900,
                borderBottom: "1px solid #ef4444",
                marginBottom: "8px",
              }}
            >
              COMMAND STAFF
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {activeCommand.map((c) => renderBucket(c, "command"))}
            </div>
          </section>

          <div
            style={{
              display: "flex",
              background: "#1e293b",
              padding: "2px",
              borderRadius: "4px",
              marginBottom: "10px",
            }}
          >
            <button
              onClick={() => setActiveTab("tactical")}
              style={{
                flex: 1,
                fontSize: "10px",
                padding: "6px",
                border: "none",
                borderRadius: "3px",
                color: "white",
                background:
                  activeTab === "tactical" ? "#10b981" : "transparent",
              }}
            >
              TACTICAL
            </button>
            <button
              onClick={() => setActiveTab("strategic")}
              style={{
                flex: 1,
                fontSize: "10px",
                padding: "6px",
                border: "none",
                borderRadius: "3px",
                color: "white",
                background:
                  activeTab === "strategic" ? "#a855f7" : "transparent",
              }}
            >
              STRATEGIC
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
            }}
          >
            {activeTab === "tactical" ? (
              <>
                <div>
                  {sortDivisions(activeDivisions)
                    .filter((d) => d.side === "left")
                    .map((d) => renderBucket(d, "divisions"))}
                </div>
                <div>
                  {sortDivisions(activeDivisions)
                    .filter((d) => d.side === "right")
                    .map((d) => renderBucket(d, "divisions"))}
                </div>
              </>
            ) : (
              <>
                <div>
                  {activeGeneral.map((g) => renderBucket(g, "general"))}
                </div>
                <div>
                  {activeBranches.map((b) => renderBucket(b, "branches"))}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          style={{ padding: "10px", background: "#020617", overflowY: "auto" }}
        >
          <div
            style={{
              color: "#facc15",
              fontSize: "10px",
              fontWeight: 900,
              borderBottom: "1px solid #facc15",
              marginBottom: "10px",
            }}
          >
            AVAILABLE TASKS
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const tId = e.dataTransfer.getData("taskId");
              if (tId)
                setTaskLocations((p) => {
                  const n = { ...p };
                  delete n[tId];
                  return n;
                });
            }}
            style={{ minHeight: "100%" }}
          >
            {allTasks.filter((t) => !taskLocations[t.id]).map(renderTaskCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
