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
  station_id: string;
  battalion_id: string;
}

export default function Roster() {
  const [rosters, setRosters] = useState<UnitRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRosters();
  }, []);

  const fetchRosters = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Fetch apparatus with the new ID columns
      const { data: appData, error: appError } = await supabase
        .from("apparatus")
        .select("id, roles, station_id, battalion_id");

      if (appError) throw appError;

      // 2. Fetch saved rosters
      const { data: rosterData, error: rosterError } = await supabase
        .from("rosters")
        .select("id, members");

      if (rosterError) throw rosterError;

      if (appData) {
        const combined = appData.map((app) => {
          const existing = rosterData?.find((r) => r.id === app.id);

          let membersArray: RosterMember[] = [];

          if (existing && Array.isArray(existing.members)) {
            membersArray = existing.members;
          } else {
            // Build from apparatus roles if no roster saved
            const rawRoles = app.roles;
            const rolesList = Array.isArray(rawRoles)
              ? rawRoles
              : typeof rawRoles === "string"
              ? JSON.parse(rawRoles)
              : [];

            membersArray = rolesList.map((r: string) => ({
              role: r || "Member",
              name: "",
              rank: "",
            }));
          }

          return {
            id: app.id || "Unknown",
            members: membersArray,
            station_id: app.station_id || "99", // Fallback for sorting
            battalion_id: app.battalion_id || "UNASSIGNED",
          };
        });

        // 3. MULTI-LEVEL SORT: Battalion -> Station -> Unit ID
        const sorted = combined.sort((a, b) => {
          // Sort by Battalion (B1, B2, etc.)
          const bSort = a.battalion_id.localeCompare(b.battalion_id);
          if (bSort !== 0) return bSort;

          // Sort by Station Number (Numeric)
          const sSort = a.station_id.localeCompare(b.station_id, undefined, {
            numeric: true,
          });
          if (sSort !== 0) return sSort;

          // Final sort by Unit ID
          return a.id.localeCompare(b.id, undefined, { numeric: true });
        });

        setRosters(sorted);
      }
    } catch (err: any) {
      console.error("Critical Roster Error:", err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
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

  const filteredRosters = (rosters || []).filter(
    (r) =>
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.station_id.includes(searchTerm)
  );

  if (errorMsg)
    return (
      <div
        style={{
          padding: "50px",
          color: "#f87171",
          textAlign: "center",
          background: "#060b13",
          minHeight: "100vh",
        }}
      >
        <h2>Roster Error</h2>
        <p>{errorMsg}</p>
        <button
          onClick={fetchRosters}
          style={{ padding: "10px 20px", cursor: "pointer" }}
        >
          Retry Load
        </button>
      </div>
    );

  if (loading)
    return (
      <div
        style={{
          padding: "50px",
          color: "#38bdf8",
          textAlign: "center",
          background: "#060b13",
          minHeight: "100vh",
        }}
      >
        Loading Personnel Database...
      </div>
    );

  return (
    <div style={{ padding: "30px", background: "#060b13", minHeight: "100vh" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "30px",
        }}
      >
        <div>
          <h2 style={{ color: "white", margin: 0 }}>Apparatus Rosters</h2>
          <p
            style={{
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: "bold",
              marginTop: "5px",
            }}
          >
            ORGANIZED BY BATTALION & STATION
          </p>
        </div>
        <input
          type="text"
          placeholder="Filter Unit or Station..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "12px 20px",
            borderRadius: "8px",
            border: "1px solid #1e293b",
            background: "#0f172a",
            color: "white",
            width: "350px",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "20px",
        }}
      >
        {filteredRosters.map((roster) => (
          <div
            key={roster.id}
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              border: "1px solid #1e293b",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#1e293b",
                padding: "10px 15px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: "bold",
                    color: "#38bdf8",
                    fontSize: "18px",
                  }}
                >
                  {roster.id}
                </span>
                <span
                  style={{
                    color: "#64748b",
                    fontSize: "10px",
                    marginLeft: "10px",
                  }}
                >
                  STATION {roster.station_id}
                </span>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  color: "#facc15",
                  fontWeight: "bold",
                  background: "#060b13",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {roster.battalion_id}
              </span>
            </div>

            <div style={{ padding: "15px" }}>
              {roster.members.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      alignSelf: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {(m.role || "Member").toUpperCase()}
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
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
                      <option value="">RANK</option>
                      <option value="CHIEF">CHIEF</option>
                      <option value="CAPTAIN">CAPT</option>
                      <option value="LT">LT</option>
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
                        fontSize: "13px",
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
