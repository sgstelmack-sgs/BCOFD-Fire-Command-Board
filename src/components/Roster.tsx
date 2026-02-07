import React, { useState, useEffect } from "react";
import { supabase } from "../App";
import { UNIT_COLORS } from "../SharedConfig";

export default function Roster() {
  const [apparatusDB, setApparatusDB] = useState<any[]>([]);
  const [presets, setPresets] = useState<any>({});
  const [staffList, setStaffList] = useState<any[]>([]);

  // Unit Builder State
  const [newUnit, setNewUnit] = useState({
    id: "",
    type: "ENGINE",
    station: "",
    battalion: "",
    roles: "",
  });

  const loadData = async () => {
    const { data: appData } = await supabase
      .from("apparatus")
      .select("*")
      .order("id");
    const { data: rosterData } = await supabase.from("rosters").select("*");
    const { data: staffData } = await supabase.from("staff").select("*");

    if (appData) setApparatusDB(appData);
    if (staffData) setStaffList(staffData);
    if (rosterData) {
      setPresets(
        rosterData.reduce((acc, r) => ({ ...acc, [r.id]: r.members }), {})
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- UNIT BUILDER LOGIC ---
  const handleAddApparatus = async () => {
    if (!newUnit.id || !newUnit.station)
      return alert("Unit ID and Station are required.");

    // Auto-generate linking logic based on type and roles
    let linked_pairs: string[][] = [];
    const rolesArray = newUnit.roles.split(",").map((r) => r.trim());

    if (newUnit.type === "ENGINE") linked_pairs = [["Nozzle", "Backup"]];
    if (newUnit.type === "TRUCK")
      linked_pairs = [
        ["Officer", "Search"],
        ["Outside Vent", "Roof"],
      ];
    if (newUnit.type === "SQUAD") linked_pairs = [["Officer", "Search"]];

    const { error } = await supabase.from("apparatus").insert([
      {
        id: newUnit.id.toUpperCase(),
        type: newUnit.type,
        station: newUnit.station,
        battalion: newUnit.battalion,
        roles:
          rolesArray.length > 1
            ? rolesArray
            : newUnit.type === "EMS"
            ? ["Officer"]
            : ["Officer", "Driver", "Member", "Member"],
        linked_pairs: linked_pairs,
      },
    ]);

    if (error) alert("Error: " + error.message);
    else {
      alert("Unit Added!");
      setNewUnit({
        id: "",
        type: "ENGINE",
        station: "",
        battalion: "",
        roles: "",
      });
      loadData();
    }
  };

  // --- GROUPING LOGIC ---
  const battalions = apparatusDB.reduce((acc: any, unit: any) => {
    const b = unit.battalion || "Unassigned";
    if (!acc[b]) acc[b] = {};
    const s = unit.station || "Unknown";
    if (!acc[b][s]) acc[b][s] = [];
    acc[b][s].push(unit);
    return acc;
  }, {});

  const sortedBattalions = Object.keys(battalions).sort((a, b) => {
    if (a === "Unassigned") return 1;
    return parseInt(a) - parseInt(b);
  });

  const saveToRoster = async (id: string, members: any) => {
    await supabase.from("rosters").upsert({ id, members });
    alert(`${id} Staffing Saved.`);
  };

  return (
    <div>
      <datalist id="staff-suggestions">
        {staffList.map((s) => (
          <option key={s.id} value={s.name}>{`${s.rank || ""} | Sta: ${
            s.station || "??"
          }`}</option>
        ))}
      </datalist>

      {/* UNIT BUILDER FORM */}
      <div
        style={{
          background: "#1e293b",
          padding: 20,
          borderRadius: 8,
          border: "1px solid #f97316",
          marginBottom: 30,
        }}
      >
        <h3 style={{ color: "#f97316", marginTop: 0 }}>Add New Apparatus</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          <input
            placeholder="Unit ID (e.g. E472)"
            value={newUnit.id}
            onChange={(e) => setNewUnit({ ...newUnit, id: e.target.value })}
            style={inputStyle}
          />
          <select
            value={newUnit.type}
            onChange={(e) => setNewUnit({ ...newUnit, type: e.target.value })}
            style={inputStyle}
          >
            {Object.keys(UNIT_COLORS).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            placeholder="Station #"
            value={newUnit.station}
            onChange={(e) =>
              setNewUnit({ ...newUnit, station: e.target.value })
            }
            style={inputStyle}
          />
          <input
            placeholder="Battalion #"
            value={newUnit.battalion}
            onChange={(e) =>
              setNewUnit({ ...newUnit, battalion: e.target.value })
            }
            style={inputStyle}
          />
          <input
            placeholder="Roles (comma separated)"
            value={newUnit.roles}
            onChange={(e) => setNewUnit({ ...newUnit, roles: e.target.value })}
            style={inputStyle}
          />
          <button
            onClick={handleAddApparatus}
            style={{
              background: "#f97316",
              color: "white",
              fontWeight: "bold",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            ADD UNIT
          </button>
        </div>
      </div>

      {/* HIERARCHICAL ROSTER LIST */}
      {sortedBattalions.map((bName) => (
        <div
          key={bName}
          style={{
            marginBottom: 40,
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 20,
            background: "#0f172a",
          }}
        >
          <h2
            style={{
              color: "#f97316",
              marginTop: 0,
              borderBottom: "2px solid #f97316",
              display: "inline-block",
              paddingRight: 20,
            }}
          >
            BATTALION {bName}
          </h2>
          {Object.keys(battalions[bName])
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((sName) => (
              <div key={sName} style={{ marginTop: 20 }}>
                <h3 style={{ color: "#38bdf8", fontSize: 16 }}>
                  STATION {sName}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 15,
                  }}
                >
                  {battalions[bName][sName].map((unit: any) => (
                    <UnitPresetCard
                      key={unit.id}
                      unit={unit}
                      preset={
                        presets[unit.id] ||
                        unit.roles.map((r: string) => ({ role: r, name: "" }))
                      }
                      onSave={saveToRoster}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

const inputStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "white",
  padding: "10px",
  borderRadius: 4,
};

function UnitPresetCard({ unit, preset, onSave }: any) {
  const [localMembers, setLocalMembers] = useState(preset);
  useEffect(() => {
    setLocalMembers(preset);
  }, [preset]);
  const updateMember = (idx: number, val: string) => {
    const n = [...localMembers];
    n[idx].name = val;
    setLocalMembers(n);
  };
  return (
    <div
      style={{
        background: "#1e293b",
        padding: 15,
        borderRadius: 8,
        borderLeft: `6px solid ${UNIT_COLORS[unit.type] || "#64748b"}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <strong>{unit.id}</strong>
        <button
          onClick={() => onSave(unit.id, localMembers)}
          style={{
            background: "#22c55e",
            color: "black",
            fontWeight: "bold",
            fontSize: 10,
            padding: "4px 8px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
          }}
        >
          SAVE
        </button>
      </div>
      {localMembers.map((m: any, i: number) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: "#94a3b8" }}>{m.role}</div>
          <input
            list="staff-suggestions"
            value={m.name}
            onChange={(e) => updateMember(i, e.target.value)}
            style={{
              width: "100%",
              background: "#0f172a",
              border: "1px solid #334155",
              color: "white",
              padding: "4px",
              fontSize: 12,
              borderRadius: 4,
            }}
          />
        </div>
      ))}
    </div>
  );
}
