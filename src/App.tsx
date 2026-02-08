import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

export interface FireUnit {
  id: string;
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

  // Real-time listener
  useEffect(() => {
    if (!incident?.id) return;
    const channel = supabase
      .channel(`incident-${incident.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "incidents",
          filter: `id=eq.${incident.id}`,
        },
        (payload: any) => {
          const newState =
            typeof payload.new.state === "string"
              ? JSON.parse(payload.new.state)
              : payload.new.state;
          if (newState) {
            setUnits(newState.units || []);
            if (payload.new.active === false) {
              setIncident(null);
              setView("pre-dispatch");
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [incident?.id]);

  const createUnitInstance = async (unitId: string): Promise<FireUnit> => {
    let rawId = unitId.toUpperCase().replace(/\s+/g, "");
    let mode: "ALS" | "BLS" = "ALS";

    // Medic/Ambo logic: If dispatched as A7, look up M7 but set mode to BLS
    if (rawId.startsWith("A") && !isNaN(parseInt(rawId.charAt(1)))) {
      mode = "BLS";
      rawId = "M" + rawId.substring(1);
    }

    const { data: appData } = await supabase
      .from("apparatus")
      .select("*")
      .eq("id", rawId)
      .maybeSingle();
    const { data: rosterData } = await supabase
      .from("rosters")
      .select("*")
      .eq("id", rawId)
      .maybeSingle();

    return {
      id: rawId,
      status: "dispatched",
      type: appData?.type || "ENGINE",
      assignment: "STAGING",
      medical_mode: mode,
      station_id: appData?.station_id || "",
      battalion_id: appData?.battalion_id || "",
      linked_logic: appData?.linked_pairs || [],
      members: (
        appData?.roles || ["Officer", "Driver", "Nozzle", "Backup"]
      ).map((role: string) => {
        const p = rosterData?.members?.find((m: any) => m.role === role);
        return {
          role,
          name: p?.name || `${rawId} ${role}`,
          assignment: "Unassigned",
        };
      }),
    };
  };

  const handleStartIncident = async (notes: string) => {
    const unitMatch = notes.match(/UNIT:\s*(.*?)(?=\s*(INFO:|STA:|$))/i);
    const unitList = unitMatch
      ? unitMatch[1].split(/[\s,]+/).filter((u) => u.length > 1)
      : [];
    const initialUnits = await Promise.all(
      unitList.map((id) => createUnitInstance(id))
    );

    const newInc = { id: `INC-${Date.now()}`, active: true, notes };
    setUnits(initialUnits);
    setIncident(newInc);
    setView("dispatch");
    await supabase
      .from("incidents")
      .insert([
        {
          id: newInc.id,
          active: true,
          state: { units: initialUnits, incident: newInc },
        },
      ]);
  };

  const syncState = async (payload: { units?: FireUnit[] }) => {
    if (!incident) return;
    const nextUnits = payload.units || units;
    setUnits(nextUnits);
    await supabase
      .from("incidents")
      .update({ state: { units: nextUnits, incident } })
      .eq("id", incident.id);
  };

  return (
    <div style={{ background: "#060b13", minHeight: "100vh", color: "white" }}>
      <nav style={{ display: "flex", background: "#111827", height: "48px" }}>
        <button onClick={() => setView("pre-dispatch")}>MONITOR</button>
        {incident && (
          <button onClick={() => setView("dispatch")}>DISPATCH</button>
        )}
        <button onClick={() => setView("roster")}>ROSTER</button>
      </nav>
      <main>
        {view === "pre-dispatch" && (
          <PreDispatch
            onStart={handleStartIncident}
            setIncident={setIncident}
            setUnits={setUnits}
            setView={setView}
          />
        )}
        {incident && view === "dispatch" && (
          <Dispatch incident={incident} units={units} syncState={syncState} />
        )}
        {view === "roster" && <Roster />}
      </main>
    </div>
  );
}
