import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

interface RosterMember {
  role: string;
  name: string;
  rank: string;
}

interface UnitRoster {
  id: string;
  members: RosterMember[];
}

export default function Roster() {
  const [rosters, setRosters] = useState<UnitRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRosters();
  }, []);

  const fetchRosters = async () => {
    setLoading(true);
    try {
      // Fetch apparatus to get roles and rosters to get names
      const { data: appData } = await supabase
        .from("apparatus")
        .select("id, roles");
      const { data: rosterData } = await supabase.from("rosters").select("*");

      if (appData) {
        const combined = appData.map((app) => {
          const existing = rosterData?.find((r) => r.id === app.id);

          // Fallback logic for members
          let membersArray = [];
          if (existing && Array.isArray(existing.members)) {
            membersArray = existing.members;
          } else {
            // Build from apparatus roles if no roster saved
            const rolesList = Array.isArray(app.roles) ? app.roles : [];
            membersArray = rolesList.map((r: string) => ({
              role: r,
              name: "",
              rank: "",
            }));
          }

          return { id: app.id, members: membersArray };
        });

        // Simple alphabetical sort - very stable
        setRosters(combined.sort((a, b) => a.id.localeCompare(b.id)));
      }
    } catch (err) {
      console.error("Roster Load Error:", err);
    }
    setLoading(false);
  };

  const updateRoster = async (
    unitId: string,
    memberIdx: number,
    field: string,
    value: string
  ) => {
    const nextRosters = rosters.map((r) => {
      if (r.id !== unitId) return r;
      const nextMembers = [...r.members];
      nextMembers[memberIdx] = { ...nextMembers[memberIdx], [field]: value };
      return { ...r, members: nextMembers };
    });

    setRosters(nextRosters);

    const updatedUnit = nextRosters.find((r) => r.id === unitId);
    if (updatedUnit) {
      await supabase.from("rosters").upsert({
        id: unitId,
        members: updatedUnit.members,
        updated_at: new Date(),
      });
    }
  };

  const filteredRosters = rosters.filter((r) =>
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading)
    return (
      <div style={{ padding: "50px", color: "white" }}>
        Loading Personnel Database...
      </div>
    );

  return (
    <div style={{ padding: "30px", background: "#060b13", minHeight: "100vh" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h2 style={{ color: "white", margin: 0 }}>Apparatus Rosters</h2>
        <input
          type="text"
          placeholder="Filter units..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "10px 15px",
            borderRadius: "8px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            color: "white",
            width: "300px",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px",
        }}
      >
        {filteredRosters.map((roster) => (
          <div
            key={roster.id}
            style={{
              background: "#0f172a",
              borderRadius: "12px",
              border: "1px solid #1e293b",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#1e293b",
                padding: "12px 20px",
                fontWeight: "bold",
                color: "#38bdf8",
              }}
            >
              {roster.id}
            </div>

            <div style={{ padding: "20px" }}>
              {roster.members.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      alignSelf: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {m.role?.toUpperCase()}
                  </div>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <select
                      value={m.rank || ""}
                      onChange={(e) =>
                        updateRoster(roster.id, idx, "rank", e.target.value)
                      }
                      style={{
                        background: "#060b13",
                        border: "1px solid #334155",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "11px",
                      }}
                    >
                      <option value="">Rank</option>
                      <option value="CHIEF">Chief</option>
                      <option value="CAPTAIN">Capt</option>
                      <option value="LT">Lt</option>
                      <option value="PM">PM</option>
                      <option value="FF">FF</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Name"
                      value={m.name || ""}
                      onChange={(e) =>
                        updateRoster(roster.id, idx, "name", e.target.value)
                      }
                      style={{
                        flex: 1,
                        background: "#060b13",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        padding: "8px",
                        color: "white",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
