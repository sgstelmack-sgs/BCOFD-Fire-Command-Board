import { useState } from "react";
import { getUnitColor } from "../App";

const normalize = (str: string) =>
  str?.toLowerCase().replace(/[-\s]/g, "") || "";

export default function CommandBoard({ units, syncState }: any) {
  // --- 1. STATE ---
  const [taskLocations, setTaskLocations] = useState<Record<string, string[]>>(
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

  const sortDivisions = (divs: any[]) => {
    const getRank = (name: string) => {
      const norm = normalize(name);
      if (norm.includes("roof")) return 0;
      const floorMatch = norm.match(/(?:division|floor)(\d+)/);
      if (floorMatch) return 20 - parseInt(floorMatch[1]);
      const baseMatch = norm.match(/basement(\d+)/);
      if (baseMatch) return 30 + parseInt(baseMatch[1]);
      if (norm === "basement") return 30;
      if (norm.includes("medical")) return 40;
      if (norm.includes("alpha")) return 50;
      return 99;
    };
    return [...divs].sort((a, b) => getRank(a.name) - getRank(b.name));
  };

  const sortTasks = (tasks: any[]) => {
    const order: Record<string, number> = {
      "Fire Attack": 1,
      Search: 2,
      Ventilation: 3,
      "Water Supply": 4,
      Utilities: 5,
      RIT: 6,
    };
    return [...tasks].sort((a, b) => {
      const rankA = order[a.base] || 99;
      const rankB = order[b.base] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  };

  const [activeDivisions, setActiveDivisions] = useState(
    sortDivisions([
      { id: "group-roof", name: "Roof Group", side: "left" },
      { id: "div-2", name: "Division 2", side: "left" },
      { id: "div-1", name: "Division 1", side: "left" },
      { id: "div-basement", name: "Basement", side: "left" },
      { id: "div-medical", name: "Medical Division", side: "right" },
      { id: "div-a", name: "Division Alpha", side: "right" },
      { id: "div-c", name: "Division Charlie", side: "right" },
      { id: "group-search", name: "Search & Rescue", side: "right" },
      { id: "group-rit", name: "RIT Group", side: "right" },
    ])
  );

  const [allTasks, setAllTasks] = useState(
    sortTasks([
      { id: "fa-1", name: "Fire Attack 1", base: "Fire Attack" },
      { id: "sr-1", name: "Search 1", base: "Search" },
      { id: "vent-1", name: "Ventilation 1", base: "Ventilation" },
      { id: "ws-1", name: "Water Supply 1", base: "Water Supply" },
      { id: "util-1", name: "Utilities 1", base: "Utilities" },
      { id: "rit-1", name: "RIT Task 1", base: "RIT" },
    ])
  );

  // --- 2. LOGIC HANDLERS ---
  const isSupervisor = (
    unitId: string,
    memberIdx: number,
    assignmentId: string
  ) => {
    if (!assignmentId || assignmentId === "Unassigned") return false;
    const isDivision = activeDivisions.some((d) => d.id === assignmentId);
    if (!isDivision) return false;

    const assignedMembers = (units || [])
      .flatMap((u: any) =>
        (u.members || []).map((m: any, idx: number) => ({
          uId: u.id,
          mIdx: idx,
          assignment: m.assignment,
        }))
      )
      .filter((item: any) => item.assignment === assignmentId);
    return (
      assignedMembers[0]?.uId === unitId &&
      assignedMembers[0]?.mIdx === memberIdx
    );
  };

  const getAssignmentLabel = (assignmentId: string) => {
    if (!assignmentId || assignmentId === "Unassigned") return null;
    const directBucket = [
      ...activeDivisions,
      ...activeCommand,
      ...activeGeneral,
    ].find((d) => d.id === assignmentId);
    if (directBucket) return directBucket.name;
    const task = allTasks.find((t) => t.id === assignmentId);
    if (task) {
      const bucketId = Object.keys(taskLocations).find((key) =>
        taskLocations[key].includes(assignmentId)
      );
      if (bucketId) {
        const bucket = [
          ...activeDivisions,
          ...activeCommand,
          ...activeGeneral,
        ].find((b) => b.id === bucketId);
        if (bucket) return `${bucket.name} / ${task.name}`;
      }
      return task.name;
    }
    return null;
  };

  const spawnNextDivision = (currentName: string, side: string) => {
    const norm = normalize(currentName);
    let nextName = "";
    const basementMatch = norm.match(/basement(\d*)/);
    if (basementMatch) {
      const currentNum = basementMatch[1] ? parseInt(basementMatch[1]) : 1;
      nextName = `Basement ${currentNum + 1}`;
    } else {
      const floorMatch = norm.match(/(?:division|floor)(\d+)/);
      if (floorMatch) nextName = `Division ${parseInt(floorMatch[1]) + 1}`;
      else if (norm === "division1") nextName = "Division 2";
      else if (norm.includes("alpha")) nextName = "Division Bravo";
    }
    if (!nextName) nextName = prompt("New Division/Group Name:") || "";
    if (activeDivisions.some((d) => normalize(d.name) === normalize(nextName)))
      return;
    if (nextName)
      setActiveDivisions((prev) =>
        sortDivisions([
          ...prev,
          { id: `id-${Date.now()}`, name: nextName, side },
        ])
      );
  };

  // RESTORED: Tethering Engine for linkedPairs
  const updatePersonnelAssignment = (
    unitId: string,
    memberIdx: number,
    newAssignment: string
  ) => {
    const nextUnits = (units || []).map((u: any) => {
      if (u.id !== unitId) return u;
      const nextMembers = [...(u.members || [])];

      // Assign the dragged member
      nextMembers[memberIdx] = {
        ...nextMembers[memberIdx],
        assignment: newAssignment,
      };

      // Partner logic
      const roleNorm = normalize(nextMembers[memberIdx].role);
      const pair = u.linkedPairs?.find((p: string[]) =>
        p.some((r: string) => roleNorm.includes(normalize(r)))
      );

      if (pair) {
        const partnerRolePart = pair.find(
          (r: string) => !roleNorm.includes(normalize(r))
        );
        const pIdx = nextMembers.findIndex((m) =>
          normalize(m.role).includes(
            partnerRolePart ? normalize(partnerRolePart) : ""
          )
        );

        // Partner follows if unassigned
        if (
          pIdx !== -1 &&
          (nextMembers[pIdx].assignment === "Unassigned" ||
            nextMembers[pIdx].assignment === "STAGING")
        ) {
          nextMembers[pIdx] = {
            ...nextMembers[pIdx],
            assignment: newAssignment,
          };
        }
      }
      return { ...u, members: nextMembers };
    });
    syncState({ units: nextUnits });
  };

  const handleTaskDeployment = (taskId: string, bucketId: string) => {
    setTaskLocations((prev) => {
      const cleaned = { ...prev };
      Object.keys(cleaned).forEach((key) => {
        cleaned[key] = cleaned[key].filter((id) => id !== taskId);
      });
      const currentTasks = cleaned[bucketId] || [];
      if (!currentTasks.includes(taskId))
        cleaned[bucketId] = [...currentTasks, taskId];
      return cleaned;
    });

    const deployedTask = allTasks.find((t) => t.id === taskId);
    if (deployedTask && deployedTask.base) {
      const tasksOfSameType = allTasks.filter(
        (t) => t.base === deployedTask.base
      );
      const nextNumber = tasksOfSameType.length + 1;
      const newId = `${normalize(deployedTask.base)}-${nextNumber}`;

      if (!allTasks.find((t) => t.id === newId)) {
        setAllTasks((prev) =>
          sortTasks([
            ...prev,
            {
              id: newId,
              name: `${deployedTask.base} ${nextNumber}`,
              base: deployedTask.base,
            },
          ])
        );
      }
    }
  };

  const moveTask = (
    taskId: string,
    bucketId: string,
    direction: "up" | "down"
  ) => {
    setTaskLocations((prev) => {
      const bucketTasks = [...(prev[bucketId] || [])];
      const index = bucketTasks.indexOf(taskId);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= bucketTasks.length) return prev;
      const nextTasks = [...bucketTasks];
      [nextTasks[index], nextTasks[newIndex]] = [
        nextTasks[newIndex],
        nextTasks[index],
      ];
      return { ...prev, [bucketId]: nextTasks };
    });
  };

  // --- 3. FILTER ENGINE ---
  const filteredUnits = (units || []).filter((u: any) => {
    const s = normalize(u.status || "");
    const id = (u.displayId || "").toUpperCase();
    const t = normalize(u.type || "");
    const isEnRoute = s.includes("route") || s.includes("dispatch");
    const isArrived = s.includes("arrive") || s.includes("scene");
    if (!isEnRoute && !isArrived) return false;
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
            id.startsWith("M") ||
            id.startsWith("A") ||
            id.includes("EMSDO") ||
            id.includes("MEDIC") ||
            t.includes("ems")
          );
        if (f === "Engine") return t.includes("engine") || id.startsWith("E");
        if (f === "Truck")
          return (
            t.includes("truck") ||
            t.includes("tow") ||
            t.includes("ladder") ||
            id.startsWith("T") ||
            id.startsWith("L")
          );
        if (f === "Squad")
          return (
            t.includes("squad") ||
            t.includes("rescue") ||
            id.startsWith("SQ") ||
            id.startsWith("R")
          );
        return false;
      });
    let matchesStatus =
      statusFilters.length === 0 ||
      statusFilters.some((f) => (f === "Arrived" ? isArrived : isEnRoute));
    return matchesType && matchesStatus;
  });

  // --- 4. RENDERERS ---
  const renderPersonnelTag = (
    unit: any,
    member: any,
    idx: number,
    context: "staffing" | "tactical" | "supervisor"
  ) => {
    const label = getAssignmentLabel(member.assignment);
    const isSup = isSupervisor(unit.id, idx, member.assignment);
    const useSupStyle = context === "supervisor";

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
          background: useSupStyle ? "#450a0a" : "#111827",
          margin: "1px 0",
          padding: "4px 6px",
          borderRadius: "3px",
          borderLeft: `3px solid ${getUnitColor(unit.type)}`,
          fontSize: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: useSupStyle ? "1px solid #ef4444" : "1px solid #1f2937",
          color: "#f8fafc",
          cursor: "grab",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "5px",
            alignItems: "center",
            overflow: "hidden",
            flex: 1,
          }}
        >
          <strong
            style={{
              minWidth: "fit-content",
              color: useSupStyle ? "#ef4444" : "inherit",
            }}
          >
            {unit.displayId}
          </strong>
          <span>{member.name || member.role}</span>
          {context === "staffing" && label && (
            <span
              style={{
                fontSize: "8px",
                background: isSup ? "#ef4444" : "#38bdf8",
                color: isSup ? "#fff" : "#000",
                padding: "0 4px",
                borderRadius: "2px",
                fontWeight: 900,
              }}
            >
              {label.toUpperCase()}
            </span>
          )}
        </div>
        {(context === "tactical" || context === "supervisor") && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updatePersonnelAssignment(unit.id, idx, "Unassigned");
            }}
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

  const renderTaskCard = (task: any, currentBucketId?: string) => {
    const assigned = (units || [])
      .flatMap((u: any) =>
        (u.members || []).map((m: any, idx: number) => ({ u, m, idx }))
      )
      .filter((item: any) => item.m.assignment === task.id);
    const isPool = !currentBucketId;

    return (
      <div
        key={task.id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dT = e.dataTransfer.getData("type");
          if (dT === "personnel") {
            const d = JSON.parse(e.dataTransfer.getData("data"));
            updatePersonnelAssignment(d.unitId, d.idx, task.id);
          } else if (dT === "unit") {
            const uId = e.dataTransfer.getData("unitId");
            const unit = units.find((un: any) => un.id === uId);
            if (unit) {
              unit.members.forEach((_: any, i: number) =>
                updatePersonnelAssignment(uId, i, task.id)
              );
            }
          }
        }}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("type", "task");
          e.dataTransfer.setData("taskId", task.id);
        }}
        style={{
          background: "#020617",
          borderRadius: "4px",
          padding: isPool ? "10px 8px" : "6px",
          marginBottom: "6px",
          border: "1px solid #1e293b",
          borderLeft: `4px solid ${isPool ? "#facc15" : "#38bdf8"}`,
          cursor: "grab",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: assigned.length > 0 ? "4px" : "0",
          }}
        >
          <div
            style={{
              fontSize: isPool ? "11px" : "9px",
              fontWeight: 900,
              color: isPool ? "#facc15" : "#38bdf8",
            }}
          >
            {task.name.toUpperCase()}
          </div>
          {currentBucketId && (
            <div style={{ display: "flex", gap: "2px" }}>
              <button
                onClick={() => moveTask(task.id, currentBucketId, "up")}
                style={{
                  background: "#334155",
                  border: "none",
                  color: "white",
                  fontSize: "8px",
                  cursor: "pointer",
                  padding: "0 4px",
                  borderRadius: "2px",
                }}
              >
                ▲
              </button>
              <button
                onClick={() => moveTask(task.id, currentBucketId, "down")}
                style={{
                  background: "#334155",
                  border: "none",
                  color: "white",
                  fontSize: "8px",
                  cursor: "pointer",
                  padding: "0 4px",
                  borderRadius: "2px",
                }}
              >
                ▼
              </button>
            </div>
          )}
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
    const bucketTaskIds = taskLocations[bucket.id] || [];
    const orderedTasks = bucketTaskIds
      .map((id) => allTasks.find((t) => t.id === id))
      .filter(Boolean);

    const isDivision = sectionKey === "divisions";
    const supervisor = isDivision ? personnel[0] : null;
    const workers = isDivision ? personnel.slice(1) : personnel;

    return (
      <div
        key={bucket.id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dT = e.dataTransfer.getData("type");
          if (dT === "unit") {
            const uId = e.dataTransfer.getData("unitId");
            const unit = units.find((un: any) => un.id === uId);
            if (unit) {
              unit.members.forEach((_: any, i: number) =>
                updatePersonnelAssignment(uId, i, bucket.id)
              );
            }
          } else if (dT === "personnel") {
            const d = JSON.parse(e.dataTransfer.getData("data"));
            updatePersonnelAssignment(d.unitId, d.idx, bucket.id);
          } else if (dT === "task") {
            handleTaskDeployment(e.dataTransfer.getData("taskId"), bucket.id);
          }
        }}
        style={{
          background: isDivision ? "#1e293b" : "#0f172a",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #334155",
          marginBottom: "8px",
          minHeight: "80px",
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
          {isDivision && (
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
                cursor: "pointer",
              }}
            >
              +
            </button>
          )}
          <button
            onClick={() => {
              syncState({
                units: (units || []).map((u: any) => ({
                  ...u,
                  members: (u.members || []).map((m: any) =>
                    m.assignment === bucket.id
                      ? { ...m, assignment: "Unassigned" }
                      : m
                  ),
                })),
              });
              if (isDivision)
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
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            color: "#f1f5f9",
            fontSize: "9px",
            fontWeight: 900,
            marginBottom: "6px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {bucket.name.toUpperCase()}
        </div>

        {isDivision && (
          <div style={{ marginBottom: "8px" }}>
            <div
              style={{
                fontSize: "7px",
                color: "#ef4444",
                fontWeight: 900,
                marginBottom: "2px",
              }}
            >
              SUPERVISOR
            </div>
            {supervisor ? (
              renderPersonnelTag(
                supervisor.u,
                supervisor.m,
                supervisor.idx,
                "supervisor"
              )
            ) : (
              <div
                style={{
                  height: "20px",
                  border: "1px dashed #450a0a",
                  borderRadius: "3px",
                }}
              />
            )}
          </div>
        )}

        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              fontSize: "7px",
              color: "#94a3b8",
              fontWeight: 900,
              marginBottom: "2px",
            }}
          >
            {isDivision ? "ASSIGNED CREW" : "PERSONNEL"}
          </div>
          {workers.map((p: any) =>
            renderPersonnelTag(p.u, p.m, p.idx, "tactical")
          )}
        </div>
        <div style={{ marginTop: "4px" }}>
          {orderedTasks.map((task: any) => renderTaskCard(task, bucket.id))}
        </div>
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
                    cursor: "pointer",
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
                cursor: "pointer",
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
                cursor: "pointer",
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
                setTaskLocations((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((k) => {
                    next[k] = next[k].filter((id) => id !== tId);
                  });
                  return next;
                });
            }}
            style={{
              minHeight: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {allTasks
              .filter(
                (t) => !Object.values(taskLocations).flat().includes(t.id)
              )
              .map((task) => renderTaskCard(task))}
          </div>
        </div>
      </div>
    </div>
  );
}
