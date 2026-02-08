import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

/**
 * CAPTAIN'S NOTES: STANDARDIZED TETHERING
 * 1. BACK-UP: Standardized naming across all fallbacks and logic.
 * 2. ROSTER SUPREMACY: Roster data is the source of truth for crew size.
 * 3. REAL-TIME: Global state sync for multi-tablet command.
 */

export interface FireUnit { 
  id: string; 
  displayId: string;
  status: string; 
  type: string; 
  assignment: string; 
  members: any[];
  isGhosted: boolean;
  linkedPairs: string[][]; 
  brokenLinks?: string[][]; 
}

export interface Incident {
  id: string; box: string; callType: string; address: string; 
  date: string; time: string; narrative: string; active: boolean;
}

export const getUnitColor = (type: string) => {
  const t = type?.toUpperCase() || "";
  if (t.includes('ENGINE') || t.startsWith('E')) return '#1e40af'; 
  if (t.includes('TRUCK') || t.includes('TOWER') || t.startsWith('T')) return '#991b1b'; 
  if (t.includes('SQUAD') || t.includes('RESCUE') || t.startsWith('SQ') || t.startsWith('R')) return '#166534'; 
  if (t.includes('CHIEF') || t.includes('BC') || t.includes('DC') || t.startsWith('B')) return '#ca8a04'; 
  if (t.includes('MEDIC') || t.includes('AMBULANCE') || t.startsWith('M') || t.startsWith('A')) return '#c2410c'; 
  return '#475569'; 
};

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [units, setUnits] = useState<FireUnit[]>([]);

  useEffect(() => {
    if (!incident?.id) return;
    const channel = supabase.channel(`incident-${incident.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "incidents", filter: `id=eq.${incident.id}` }, 
      (payload: any) => {
        const newState = payload.new.state;
        const parsedState = typeof newState === 'string' ? JSON.parse(newState) : newState;
        if (parsedState) {
          setUnits([...(parsedState.units || [])]);
          if (payload.new.active === false) { setIncident(null); setView("pre-dispatch"); }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [incident?.id]);

  const handleStartIncident = async (notes: string) => {
    try {
      const clean = notes.replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
      const idMatch = clean.match(/ID:\s*([A-Z0-9-]+)/i);
      const unitMatch = clean.match(/UNIT:\s*(.*?)(?=\s*(INFO:|STA:|DATE:|$))/i);
      const callRawMatch = clean.match(/CALL:\s*\S+\s*-\s*(.*?)(?=\s*(ADDR:|UNIT:|$))/i);
      const boxMatch = clean.match(/BOX:\s*([\d-]+)/i);
      const addrMatch = clean.match(/ADDR:\s*(.*?)(?=\s*(UNIT:|INFO:|DATE:|STA:|$))/i);
      const commMatch = clean.match(/INFO:\s*(.*?)(?=\s*DATE:|$)/i);

      const unitList = (unitMatch ? unitMatch[1] : "").split(/[\s,]+/).filter(u => u.length > 1 && !u.toUpperCase().startsWith("STA"));

      const initialUnits = await Promise.all(unitList.map(async (u) => {
        let lookupId = u.toUpperCase().replace(/\s+/g, "");
        const isGhost = lookupId.startsWith("G") && lookupId.length > 2;
        if (isGhost) lookupId = lookupId.substring(1);

        const { data: appData } = await supabase.from("apparatus").select("*").eq("id", lookupId).maybeSingle();
        const { data: rosterData } = await supabase.from("rosters").select("*").eq("unit_id", lookupId).maybeSingle();

        let tacticalType = appData?.type || "OTHER";
        if (tacticalType === "OTHER") {
          if (/^E\d/.test(lookupId)) tacticalType = "ENGINE";
          else if (/^T\d|^L\d/.test(lookupId)) tacticalType = "TRUCK";
          else if (/^M\d|^A\d/.test(lookupId)) tacticalType = "MEDIC";
        }

        let members = [];
        if (rosterData?.members && rosterData.members.length > 0) {
          members = rosterData.members.map((m: any) => ({
            role: m.role === "Backup" ? "Back-up" : m.role,
            name: m.name || `${lookupId} ${m.role}`,
            assignment: "Unassigned"
          }));
        } else {
          const defaultRoles = appData?.roles || ["Officer", "Driver", "Nozzle", "Back-up"];
          members = defaultRoles.map((role: string) => ({
            role: role === "Backup" ? "Back-up" : role,
            name: `${lookupId} ${role}`,
            assignment: "Unassigned"
          }));
        }

        return { 
          id: lookupId, displayId: lookupId, status: "dispatched", type: tacticalType, 
          assignment: "STAGING", isGhosted: isGhost, 
          linkedPairs: appData?.linked_pairs || [], 
          members 
        };
      }));
      
      const incidentData: Incident = {
        id: idMatch ? idMatch[1] : `INC-${Date.now()}`,
        box: boxMatch ? boxMatch[1].replace(/^0+/, '') : "---",
        callType: callRawMatch ? callRawMatch[1].trim() : "UNKNOWN",
        address: addrMatch ? addrMatch[1].trim() : "Unknown Address",
        date: "", time: "", narrative: commMatch ? commMatch[1].trim() : "No comments.", active: true
      };

      setUnits(initialUnits);
      setIncident(incidentData);
      setView("dispatch");

      await supabase.from("incidents").insert([{ id: incidentData.id, active: true, state: { units: initialUnits, incident: incidentData } }]);
    } catch (e) { console.error(e); }
  };

  const syncState = async (p: { units?: FireUnit[] }) => {
    if (!incident) return;
    const nextUnits = p.units || units;
    setUnits([...nextUnits]);
    await supabase.from("incidents").update({ state: { units: nextUnits, incident } }).eq("id", incident.id);
  };

  return (
    <div style={{ background: "#060b13", minHeight: "100vh", color: "white", fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", background: "#0f172a", height: "56px", borderBottom: "1px solid #1e293b", alignItems: "center" }}>
        <div style={{ padding: "0 25px", fontWeight: 900, color: "#ef4444" }}>BCoFD Command</div>
        <button style={{ background: 'none', border: 'none', color: view === 'pre-dispatch' ? '#38bdf8' : '#94a3b8', padding: '0 20px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setView("pre-dispatch")}>Monitor</button>
        {incident && <button style={{ background: 'none', border: 'none', color: view === 'dispatch' ? '#38bdf8' : '#94a3b8', padding: '0 20px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setView("dispatch")}>Dispatch</button>}
        {incident && <button style={{ background: 'none', border: 'none', color: view === 'command' ? '#38bdf8' : '#94a3b8', padding: '0 20px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setView("command")}>Command</button>}
        <button style={{ background: 'none', border: 'none', color: view === 'roster' ? '#38bdf8' : '#94a3b8', padding: '0 20px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setView("roster")}>Roster</button>
      </nav>
      <main style={{ height: "calc(100vh - 56px)" }}>
        {view === "pre-dispatch" && <PreDispatch onStart={handleStartIncident} setIncident={setIncident} setUnits={setUnits} setView={setView} />}
        {incident && view === "dispatch" && <Dispatch incident={incident} units={units} syncState={syncState} />}
        {incident && view === "command" && <CommandBoard incident={incident} units={units} syncState={syncState} handleEndIncident={() => { setIncident(null); setView("pre-dispatch"); }} />}
        {view === "roster" && <Roster />}
      </main>
    </div>
  );
}