import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Roster() {
  const [hierarchy, setHierarchy] = useState<any>({});
  const [expandedBN, setExpandedBN] = useState<string[]>([]);
  const [expandedST, setExpandedST] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const bnLabels: any = { 
    "B1": "Battalion 1 Central", 
    "B2": "Battalion 2 West", 
    "B3": "Battalion 3 East" 
  };

  useEffect(() => { fetchRosters(); }, []);

  const fetchRosters = async () => {
    setLoading(true);
    const { data } = await supabase.from("apparatus").select("*");
    if (data) {
      const nested: any = {};
      data.forEach((u: any) => {
        const bn = u.battalion_id || "UNASSIGNED";
        const st = u.station_id || "Misc";
        if (!nested[bn]) nested[bn] = {};
        if (!nested[bn][st]) nested[bn][st] = [];
        nested[bn][st].push(u);
      });
      setHierarchy(nested);
    }
    setLoading(false);
  };

  const toggleMedicalMode = async (unitId: string, current: string) => {
    const next = current === "ALS" ? "BLS" : "ALS";
    await supabase.from("apparatus").update({ medical_mode: next }).eq("id", unitId);
    fetchRosters();
  };

  if (loading) return <div style={{ padding: "50px", color: "#38bdf8", textAlign: 'center' }}>Loading BCFD Command Roster...</div>;

  return (
    <div style={{ padding: "30px", background: "#060b13", minHeight: "100vh", color: "white", fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '25px', color: '#f8fafc', letterSpacing: '1px' }}>BCFD Command Roster</h2>

      {Object.keys(hierarchy).sort().map(bn => (
        <div key={bn} style={{ marginBottom: "15px", border: "1px solid #1e293b", borderRadius: "8px", overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
          {/* Battalion Header */}
          <div 
            onClick={() => setExpandedBN(prev => prev.includes(bn) ? prev.filter(i => i !== bn) : [...prev, bn])} 
            style={{ background: "#1e293b", padding: "15px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: 'center' }}
          >
            <span style={{ color: "#facc15", fontWeight: "bold", fontSize: '1.1rem' }}>{bnLabels[bn] || bn}</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{expandedBN.includes(bn) ? "▼" : "▶"}</span>
          </div>

          {expandedBN.includes(bn) && (
            <div style={{ padding: "12px", background: "#0f172a" }}>
              {Object.keys(hierarchy[bn]).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(st => {
                const stKey = `${bn}-${st}`;
                return (
                  <div key={st} style={{ marginBottom: "10px", border: "1px solid #334155", borderRadius: "6px", overflow: 'hidden' }}>
                    {/* Station Header */}
                    <div 
                      onClick={() => setExpandedST(prev => prev.includes(stKey) ? prev.filter(i => i !== stKey) : [...prev, stKey])} 
                      style={{ padding: "12px 18px", cursor: "pointer", color: "#38bdf8", background: '#060b13', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ fontWeight: '600' }}>Station {st}</span>
                      <span style={{ fontSize: '16px' }}>{expandedST.includes(stKey) ? "−" : "+"}</span>
                    </div>

                    {/* Apparatus Grid */}
                    {expandedST.includes(stKey) && (
                      <div style={{ padding: "15px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", background: '#0f172a' }}>
                        {hierarchy[bn][st].map((unit: any) => {
                          // THE ID SWAP LOGIC
                          const displayId = (unit.type === 'MEDIC' && unit.medical_mode === 'BLS') 
                            ? unit.id.replace('M', 'A') 
                            : unit.id;

                          return (
                            <div key={unit.id} style={{ background: "#111827", padding: "15px", borderRadius: "8px", border: '1px solid #1e293b' }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                                <strong style={{ fontSize: '1.2rem', color: '#f8fafc' }}>{displayId}</strong>
                                {unit.type === 'MEDIC' && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleMedicalMode(unit.id, unit.medical_mode); }} 
                                    style={{ 
                                      background: unit.medical_mode === 'ALS' ? '#991b1b' : '#166534', 
                                      color: 'white', border: '1px solid #451a03', borderRadius: '4px', 
                                      cursor: 'pointer', fontSize: '10px', padding: '4px 8px', fontWeight: 'bold' 
                                    }}
                                  >
                                    {unit.medical_mode}
                                  </button>
                                )}
                              </div>
                              {unit.roles?.map((r: string, i: number) => (
                                <div key={i} style={{ fontSize: "11px", color: "#94a3b8", display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ textTransform: 'uppercase', fontWeight: '500' }}>{r}</span>
                                  <span style={{ color: '#334155' }}>—</span>
                                </div>
                              ))}
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