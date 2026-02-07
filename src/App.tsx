import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";

export interface Member {
  role: string;
  name: string;
  assignment: string;
}
export interface FireUnit {
  id: string;
  status: string;
  type: string;
  assignment: string;
  members: Member[];
}
export interface Incident {
  id: string;
  box: string;
  address: string;
  active: boolean;
  callNotes?: string;
}

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [units, setUnits] = useState<FireUnit[]>([]);
  const [runningIncidents, setRunningIncidents] = useState<Incident[]>([]);

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
          if (payload.new.state) {
            setUnits(payload.new.state.units || []);
            if (payload.new.state.incident)
              setIncident(payload.new.state.incident);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [incident?.id]);

  const createUnitInstance = (unitId: string): FireUnit => {
    let rawId = unitId.toUpperCase().replace(/\s+/g, "");
    let status = "arrived"; // DEFAULT: NO "G" = ON SCENE

    // FIXED LOGIC: If starts with G, it is EN ROUTE (GHOSTED)
    if (rawId.startsWith("G")) {
      status = "dispatched";
      rawId = rawId.substring(1); // Strip 'G' for display
    }

    const isEngine = rawId.includes("E") || rawId.includes("ENG");
    const roles = isEngine
      ? ["Officer (P1)", "Driver (P4)", "Nozzle (P3)", "Backup (P2)"]
      : ["Officer (P1)", "Driver (P4)", "Search (P2)", "OV (P3)"];

    return {
      id: rawId,
      status,
      type: isEngine ? "ENGINE" : "TRUCK",
      assignment: "",
      members: roles.map((r) => ({
        role: r,
        name: "",
        assignment: "Unassigned",
      })),
    };
  };

  const handleStartIncident = async (notes: string) => {
    if (!notes) return;
    const boxMatch = notes.match(/BOX:\s*([\d-]+)/i);
    const addrMatch = notes.match(/ADDR:\s*(.*?)\sUNIT:/i);
    const unitRaw = notes.match(/UNIT:\s*(.*?)\s(?:INFO|STA|DATE)/i);
    const box = boxMatch ? boxMatch[1] : "---";
    const address = addrMatch ? addrMatch[1].trim() : "Address Found";
    const unitList = unitRaw ? unitRaw[1].trim().split(/\s+/) : [];
    const newId = `INC-${Date.now()}`;
    const initialIncident = {
      id: newId,
      box,
      address,
      active: true,
      callNotes: notes,
    };
    const initialUnits = unitList
      .filter((id) => id)
      .map((id) => createUnitInstance(id));
    setIncident(initialIncident);
    setUnits(initialUnits);
    setView("dispatch");
    await supabase
      .from("incidents")
      .insert([
        {
          id: newId,
          box_number: box,
          address: address,
          state: { units: initialUnits, incident: initialIncident },
        },
      ]);
  };

  const syncState = async (payload: any) => {
    if (!incident?.id) return;
    if (payload.units) setUnits(payload.units);
    await supabase
      .from("incidents")
      .update({ state: { ...payload, incident } })
      .eq("id", incident.id);
  };

  return (
    <div
      style={{
        backgroundColor: "#060b13",
        minHeight: "100vh",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <nav
        style={{
          display: "flex",
          background: "#111827",
          borderBottom: "1px solid #1f2937",
          height: "45px",
        }}
      >
        <button
          onClick={() => setView("pre-dispatch")}
          style={tabStyle(view === "pre-dispatch", "#374151")}
        >
          MONITOR
        </button>
        <button
          onClick={() => setView("dispatch")}
          style={tabStyle(view === "dispatch", "#2563eb")}
        >
          DISPATCH
        </button>
        <button
          onClick={() => setView("command")}
          style={tabStyle(view === "command", "#ea580c")}
        >
          COMMAND
        </button>
      </nav>
      <main style={{ padding: 0 }}>
        {view === "pre-dispatch" && (
          <PreDispatch
            onStart={handleStartIncident}
            setIncident={setIncident}
            setUnits={setUnits}
            setView={setView}
            runningIncidents={runningIncidents}
          />
        )}
        {incident && view === "dispatch" && (
          <Dispatch
            incident={incident}
            units={units}
            setUnits={setUnits}
            syncState={syncState}
            createUnitInstance={createUnitInstance}
          />
        )}
        {incident && view === "command" && (
          <CommandBoard
            incident={incident}
            units={units}
            setUnits={setUnits}
            syncState={syncState}
          />
        )}
      </main>
    </div>
  );
}

const tabStyle = (active: boolean, color: string) => ({
  background: active ? color : "transparent",
  color: "white",
  border: "none",
  padding: "0 25px",
  cursor: "pointer",
  fontWeight: "bold" as const,
  fontSize: "11px",
  textTransform: "uppercase" as const,
});
