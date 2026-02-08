import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

// --- INTERFACES ---
export interface FireUnit { 
  id: string; 
  displayId: string;
  status: string; 
  type: string; 
  assignment: string; 
  medical_mode?: "ALS" | "BLS";
  members: any[];
  linked_logic: string[][];
  station_id: string;
  battalion_id: string;
}

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [incident, setIncident] = useState<any>(null);
  const [units, setUnits] = useState<FireUnit[]>([]);

  // Real-time Database Sync
  useEffect(() => {
    if (!incident?.id) return;
    const channel = supabase.channel(`incident-${incident.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "incidents", filter: `id=eq.${incident.id}` }, 
      (payload: any) => {
        const newState = payload.new.state;
        const parsedState = typeof newState === 'string' ? JSON.parse(newState) : newState;
        if (parsedState) {
          setUnits(parsedState.units || []);
          if (payload.new.active === false) { setIncident(null); setView("pre-dispatch"); }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [incident?.id]);

  // --- CAD HANDLER (Hardened against STA codes) ---
  const handleStartIncident = async (notes: string) => {
    // 1. Scrub "STA" codes immediately
    const clean = notes.replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
    
    // 2. Unit extraction with STA exclusion
    const unitMatch = clean.match(/UNIT:\s*(.*?)(?=\s*(INFO:|STA:|DATE:|$))/i);
    const rawUnits = unitMatch ? unitMatch[1] : "";
    const unitList = rawUnits.split(/[\s,]+/)
      .filter(u => u.length > 1) 
      .filter(u => !u.toUpperCase().startsWith("STA")); // Ignore STA55, STA55A, etc.

    const initialUnits = await Promise.all(unitList.map(id => createUnitInstance(id)));
    const incidentId = `INC-${Date.now()}`;

    const initialIncident = { id: incidentId, active: true, notes: clean };
    setUnits(initialUnits);
    setIncident(initialIncident);
    setView("dispatch");

    await supabase.from("incidents").insert([{ 
      id: incidentId, 
      active: true,
      state: { units: initialUnits, incident: initialIncident } 
    }]);
  };

  const createUnitInstance = async (unitId: string): Promise<FireUnit> => {
    let rawId = unitId.toUpperCase().replace(/\s+/g, "");
    let mode: "ALS" | "BLS" = "ALS";

    if (rawId.startsWith("A") && !isNaN(parseInt(rawId.charAt(1)))) {
      mode = "BLS";
      rawId = "M" + rawId.substring(1); 
    }

    const { data: appData } = await supabase.from("apparatus").select("*").eq("id", rawId).maybeSingle();
    const displayId = mode === "BLS" ? rawId.replace("M", "A") : rawId;

    return { 
      id: rawId, 
      displayId: displayId,
      status: "dispatched", 
      type: appData?.type || "ENGINE", 
      assignment: "STAGING",
      medical_mode: mode,
      station_id: appData?.station_id || "",
      battalion_id: appData?.battalion_id || "",
      linked_logic: appData?.linked_pairs || [],
      members: (appData?.roles || ["Officer", "Driver", "Nozzle", "Backup"]).map((role: string) => ({
        role, name: `${displayId} ${role}`, assignment: "Unassigned"
      }))
    };
  };

  // --- STYLING ---
  const getTabStyle = (tab: string) => ({
    padding: "0 25px",
    height: "100%",
    border: "none",
    background: view === tab ? "#1e293b" : "transparent",
    color: view === tab ? "#38bdf8" : "#94a3b8",
    borderBottom: view === tab ? "3px solid #38bdf8" : "3px solid transparent",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold" as const,
    textTransform: "uppercase" as const,
    transition: "all 0.2s ease"
  });

  return (
    <div style={{ background: "#060b13", minHeight: "100vh", color: "white", fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", background: "#0f172a", height: "52px", borderBottom: "1px solid #1e293b", padding: "0 10px" }}>
        <div style={{ alignSelf: "center", padding: "0 20px", fontWeight: 900, color: "#38bdf8", borderRight: "1px solid #1e293b", marginRight: "10px" }}>BCFD CMD</div>
        <button style={getTabStyle("pre-dispatch")} onClick={() => setView("pre-dispatch")}>Monitor</button>
        {incident && <button style={getTabStyle("dispatch")} onClick={() => setView("dispatch")}>Dispatch</button>}
        {incident && <button style={getTabStyle("command")} onClick={() => setView("command")}>Command</button>}
        <button style={getTabStyle("roster")} onClick={() => setView("roster")}>Roster</button>
      </nav>
      <main>
        {view === "pre-dispatch" && <PreDispatch onStart={handleStartIncident} setIncident={setIncident} setUnits={setUnits} setView={setView} />}
        {incident && view === "dispatch" && <Dispatch incident={incident} units={units} syncState={(p:any) => setUnits(p.units)} />}
        {view === "roster" && <Roster />}
      </main>
    </div>
  );
}