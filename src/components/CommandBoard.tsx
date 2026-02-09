import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getUnitColor } from "../App";

const normalize = (str: string) =>
  str?.toLowerCase().replace(/[-\s]/g, "") || "";

export default function CommandBoard({ units, syncState }: any) {
  // --- 1. STATE ---
  const [taskLocations, setTaskLocations] = useState<Record<string, string[]>>(
    {}
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPersonnel, setEditingPersonnel] = useState<{
    unitId: string;
    idx: number;
  } | null>(null);

  const [activeCommand] = useState([
    { id: "ic", name: "Incident Command" },
    { id: "safety", name: "Safety Officer" },
  ]);

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

  const [allTasks, setAllTasks] = useState([
    { id: "fa-1", name: "Fire Attack 1", base: "Fire Attack" },
    { id: "sr-1", name: "Search 1", base: "Search" },
    { id: "vent-1", name: "Ventilation 1", base: "Ventilation" },
    { id: "ws-1", name: "Water Supply 1", base: "Water Supply" },
    { id: "util-1", name: "Utilities 1", base: "Utilities" },
    { id: "rit-1", name: "RIT Task 1", base: "RIT" },
  ]);

  // --- 2. EFFECTS ---
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase
        .from("staff")
        .select("name, rank, id")
        .order("name");
      if (data) setStaff(data);
    };
    fetchStaff();
  }, []);

  // --- 3. LOGIC HANDLERS ---
  const handleNameChange = (unitId: string, idx: number, newName: string) => {
    const nextUnits = units.map((u: any) => {
      if (u.id !== unitId) return u;
      const nextMembers = [...u.members];
      nextMembers[idx] = { ...nextMembers[idx], name: newName };
      return { ...u, members: nextMembers };
    });
    syncState({ units: nextUnits });
    setEditingPersonnel(null);
    setSearchTerm("");
  };

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
    const directBucket = [...activeDivisions, ...activeCommand].find(
      (d) => d.id === assignmentId
    );
    if (directBucket) return directBucket.name;
    const task = allTasks.find((t) => t.id === assignmentId);
    if (task) {
      const bucketId = Object.keys(taskLocations).find((key) =>
        taskLocations[key].includes(assignmentId)
      );
      if (bucketId) {
        const bucket = [...activeDivisions, ...activeCommand].find(
          (b) => b.id === bucketId
        );
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

  const updatePersonnelAssignment = (
    unitId: string,
    memberIdx: number,
    newAssignment: string
  ) => {
    const nextUnits = (units || []).map((u: any) => {
      if (u.id !== unitId) return u;
      const nextMembers = [...u.members];
      nextMembers[memberIdx] = {
        ...nextMembers[memberIdx],
        assignment: newAssignment,
      };

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
        setAllTasks((prev) => [
          ...prev,
          {
            id: newId,
            name: `${deployedTask.base} ${nextNumber}`,
            base: deployedTask.base,
          },
        ]);
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

  // --- 4. RENDERERS ---
  const renderPersonnelTag = (
    unit: any,
    member: any,
    idx: number,
    context: "staffing" | "tactical" | "supervisor"
  ) => {
    const label = getAssignmentLabel(member.assignment);
    const isSup = isSupervisor(unit.id, idx, member.assignment);
    const isEditing =
      editingPersonnel?.unitId === unit.id && editingPersonnel?.idx === idx;
    const filteredStaff = staff
      .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 6);

    return (
      <div key={`${unit.id}-${idx}`} style={{ position: "relative" }}>
        <div
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
            background: context === "supervisor" ? "#450a0a" : "#111827",
            margin: "1px 0",
            padding: "4px 6px",
            borderRadius: "3px",
            borderLeft: `3px solid ${getUnitColor(unit.type)}`,
            fontSize: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border:
              context === "supervisor"
                ? "1px solid #ef4444"
                : "1px solid #1f2937",
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
                color: context === "supervisor" ? "#ef4444" : "inherit",
              }}
            >
              {unit.displayId}
            </strong>
            <span
              onClick={() => {
                setEditingPersonnel({ unitId: unit.id, idx });
                setSearchTerm(member.name || "");
              }}
              style={{ cursor: "pointer" }}
            >
              {member.name || member.role}
            </span>
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
          {context !== "staffing" && (
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

        {isEditing && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 100,
              width: "100%",
            }}
          >
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => setTimeout(() => setEditingPersonnel(null), 200)}
              style={{
                width: "100%",
                background: "#1e293b",
                color: "white",
                border: "1px solid #38bdf8",
                fontSize: "10px",
                padding: "2px",
              }}
            />
            {searchTerm && (
              <div
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "2px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.4)",
                  marginTop: "2px",
                }}
              >
                {filteredStaff.map((s) => (
                  <div
                    key={s.id}
                    onMouseDown={() => handleNameChange(unit.id, idx, s.name)}
                    style={{
                      padding: "4px 8px",
                      cursor: "pointer",
                      borderBottom: "1px solid #0f172a",
                      fontSize: "9px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#334155")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {s.rank} {s.name}
                  </div>
                ))}
                <div
                  onMouseDown={() => handleNameChange(unit.id, idx, searchTerm)}
                  style={{
                    padding: "4px 8px",
                    color: "#38bdf8",
                    fontSize: "9px",
                    fontStyle: "italic",
                    cursor: "pointer",
                  }}
                >
                  Use: "{searchTerm}"
                </div>
              </div>
            )}
          </div>
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
            if (unit)
              unit.members.forEach((_: any, i: number) =>
                updatePersonnelAssignment(uId, i, task.id)
              );
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
                onClick={() => {
                  setTaskLocations((prev) => {
                    const next = { ...prev };
                    next[currentBucketId] = next[currentBucketId].filter(
                      (id) => id !== task.id
                    );
                    return next;
                  });
                }}
                style={{
                  background: "#991b1b",
                  border: "none",
                  color: "white",
                  fontSize: "8px",
                  cursor: "pointer",
                  padding: "0 4px",
                  borderRadius: "2px",
                }}
              >
                ✕
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
            if (unit)
              unit.members.forEach((_: any, i: number) =>
                updatePersonnelAssignment(uId, i, bucket.id)
              );
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
            <div style={{ fontSize: "7px", color: "#ef4444", fontWeight: 900 }}>
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
          <div style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 900 }}>
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

  // --- APPARATUS BAY COMPONENT ---
  const renderApparatusCard = (u: any) => (
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
        marginBottom: "8px",
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
        <div style={{ display: "flex", gap: "4px" }}>
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
      </div>
      {(u.members || []).map((m: any, idx: number) =>
        renderPersonnelTag(u, m, idx, "staffing")
      )}
    </div>
  );

  // Categorization
  const arrivedUnits = units?.filter((u: any) => normalize(u.status).includes("arrive")) || [];
  const enrouteUnits = units?.filter((u: any) => 
    !normalize(u.status).includes("arrive") && 
    (normalize(u.status).includes("route") || normalize(u.status).includes("dispatch"))
  ) || [];

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
      {/* Filtering Navbar */}
      <div
        style={{
          background: "#0f172a",
          padding: "8px 15px",
          display: "flex",
          gap: "6px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        {["Engine", "Truck", "Squad", "Staff", "EMS", "Arrived"].map((f) => (
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
        {/* Apparatus Bay */}
        <div
          style={{
            background: "#0f172a",
            padding: "10px",
            overflowY: "auto",
            borderRight: "1px solid #1e293b",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <div style={{ color: "#38bdf8", fontSize: "10px", fontWeight: 900, borderBottom: "1px solid #38bdf8", marginBottom: "10px", paddingBottom: "2px" }}>ARRIVED</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {arrivedUnits.map(renderApparatusCard)}
            </div>
          </div>

          <div>
            <div style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 900, borderBottom: "1px solid #334155", marginBottom: "10px", paddingBottom: "2px" }}>ENROUTE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {enrouteUnits.map(renderApparatusCard)}
            </div>
          </div>
        </div>

        {/* Tactical Center */}
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
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
            }}
          >
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
          </div>
        </div>

        {/* Task Pool */}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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