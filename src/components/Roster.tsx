import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

interface RosterMember {
  role: string;
  name: string;
  rank: string;
}

interface ApparatusRoster {
  id: string; // e.g., "E471"
  members: RosterMember[];
}

export default function Roster() {
  const [rosters, setRosters] = useState<ApparatusRoster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRosters();
  }, []);

  const fetchRosters = async () => {
    setLoading(true);
    // Pulls from the 'rosters' table
    const { data, error } = await supabase.from("rosters").select("*").order("id", { ascending: true });
    if (error) {
      console.error("Error fetching rosters:", error);
    } else {
      setRosters(data || []);
    }
    setLoading(false);
  };

  const handleUpdateName = (unitId: string, role: string, newName: string) => {
    setRosters((prev) =>
      prev.map((r) => {
        if (r.id !== unitId) return r;
        return {
          ...r,
          members: r.members.map((m) => (m.role === role ? { ...m, name: newName } : m)),
        };
      })
    );
  };

  const saveRoster = async (unitId: string) => {
    const rosterToSave = rosters.find((r) => r.id === unitId);
    if (!rosterToSave) return;

    const { error } = await supabase
      .from("rosters")
      .upsert({ id: unitId, members: rosterToSave.members });

    if (error) {
      alert(`Error saving ${unitId}: ` + error.message);
    } else {
      alert(`${unitId} Roster Updated Locally & In Database`);
    }
  };

  if (loading) return <div style={{ padding: "40px", color: "#94a3b8" }}>Loading Department Roster...</div>;

  return (
    <div style={{ padding: "30px", background: "#060b13", minHeight: "calc(100vh - 48px)" }}>
      <header style={{ marginBottom: "30px", borderBottom: "1px solid #1f2937", paddingBottom: "15px" }}>
        <h2 style={{ color: "#8b5cf6", margin: 0 }}>Station Roster Management</h2>
        <p style={{ color: "#94a3b8", margin: "5px 0 0 0" }}>
          Set the permanent daily riding list. These names will auto-populate during a CAD alert.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" }}>
        {rosters.map((unit) => (
          <div 
            key={unit.id} 
            style={{ 
              background: "#0f172a", 
              borderRadius: "12px", 
              border: "1px solid #1e293b", 
              display: "flex", 
              flexDirection: "column" 
            }}
          >
            <div style={{ background: "#1e293b", padding: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "white" }}>{unit.id}</span>
              <button 
                onClick={() => saveRoster(unit.id)}
                style={{ background: "#8b5cf6", color: "white", border: "none", padding: "5px 12px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
              >
                SAVE CHANGES
              </button>
            </div>

            <div style={{ padding: "15px" }}>
              {unit.members.map((m, idx) => (
                <div key={idx} style={{ marginBottom: "12px", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "10px", color: "#8b5cf6", fontWeight: "bold" }}>{m.role.toUpperCase()}</span>
                    <span style={{ fontSize: "10px", color: "#475569" }}>{m.rank}</span>
                  </div>
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => handleUpdateName(unit.id, m.role, e.target.value)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      color: "white",
                      fontSize: "15px",
                      outline: "none",
                    }}
                    placeholder="Vacant"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}