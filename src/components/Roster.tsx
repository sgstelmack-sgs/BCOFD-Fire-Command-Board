import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Roster() {
  const [battalions, setBattalions] = useState<any>({});
  const [expandedBats, setExpandedBats] = useState<string[]>([]);
  const [expandedStats, setExpandedStats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAndGroup = async () => {
    // 1. Get the structure from apparatus
    const { data: appData } = await supabase.from("apparatus").select("*");
    // 2. Get the personnel from rosters
    const { data: rosData } = await supabase.from("rosters").select("*");

    if (appData) {
      const grouped = appData.reduce((acc: any, unit: any) => {
        const bat = `BATTALION: ${unit.battalion || "UNK"}`;
        const sta = `STATION ${unit.station || "UNK"}`;
        
        // Find matching crew in rosters data
        const crew = rosData?.find(r => r.id === unit.id);
        const unitWithCrew = { ...unit, members: crew?.members || [] };

        if (!acc[bat]) acc[bat] = {};
        if (!acc[bat][sta]) acc[bat][sta] = [];
        acc[bat][sta].push(unitWithCrew);
        return acc;
      }, {});
      setBattalions(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAndGroup(); }, []);

  const isBatExpanded = (bat: string) => expandedBats.indexOf(bat) !== -1;
  const isStaExpanded = (sta: string) => expandedStats.indexOf(sta) !== -1;

  const toggleBat = (bat: string) => 
    isBatExpanded(bat) ? setExpandedBats(expandedBats.filter(b => b !== bat)) : setExpandedBats([...expandedBats, bat]);
  
  const toggleSta = (sta: string) => 
    isStaExpanded(sta) ? setExpandedStats(expandedStats.filter(s => s !== sta)) : setExpandedStats([...expandedStats, sta]);

  const saveMemberChange = async (id: string, members: any) => {
    // Always upsert to 'rosters' to ensure personnel data is saved
    await supabase.from("rosters").upsert({ id, members });
  };

  if (loading) return <div style={{ padding: 40, color: "#94a3b8" }}>Loading Regional Roster...</div>;

  return (
    <div style={{ padding: "30px", background: "#060b13", minHeight: "100vh", color: "white" }}>
      <h1 style={{ color: "#8b5cf6", fontSize: "22px", borderBottom: "1px solid #1e293b", paddingBottom: "10px", marginBottom: "20px" }}>REGIONAL APPARATUS ROSTER</h1>
      {Object.keys(battalions).sort().map(bat => {
        const expanded = isBatExpanded(bat);
        return (
          <div key={bat} style={{ marginBottom: "15px", border: "1px solid #1e293b" }}>
            <div onClick={() => toggleBat(bat)} style={{ padding: "15px", cursor: "pointer", background: "#1e293b", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
              <span>{bat}</span>
              <span>{expanded ? "▲" : "▼"}</span>
            </div>
            {expanded && (
              <div style={{ padding: "15px" }}>
                {Object.keys(battalions[bat]).map(sta => {
                  const sExpanded = isStaExpanded(sta);
                  return (
                    <div key={sta} style={{ marginBottom: "10px", border: "1px solid #334155" }}>
                      <div onClick={() => toggleSta(sta)} style={{ background: "#020617", padding: "10px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span>{sta}</span>
                        <span>{sExpanded ? "CLOSE" : "OPEN"}</span>
                      </div>
                      {sExpanded && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", padding: "15px" }}>
                          {battalions[bat][sta].map((unit: any) => (
                            <div key={unit.id} style={{ background: "#0f172a", border: "1px solid #1e293b" }}>
                              <div style={{ background: unit.type === "ENGINE" ? "#450a0a" : "#064e3b", padding: "8px", fontSize: "11px", fontWeight: "bold" }}>{unit.id}</div>
                              <div style={{ padding: "10px" }}>
                                {(unit.members.length > 0 ? unit.members : [{role: "Officer", name: ""}, {role: "Driver", name: ""}]).map((m: any, idx: number) => (
                                  <div key={idx} style={{ marginBottom: "8px" }}>
                                    <div style={{ fontSize: "8px", color: "#64748b" }}>{m.role}</div>
                                    <input defaultValue={m.name} onBlur={(e) => {
                                      const newMems = [...unit.members];
                                      if(!newMems[idx]) newMems[idx] = {role: m.role, name: ""};
                                      newMems[idx].name = e.target.value;
                                      saveMemberChange(unit.id, newMems);
                                    }} style={{ width: "100%", background: "#020617", border: "1px solid #1e293b", color: "white", padding: "6px", fontSize: "12px" }} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
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
  );
}