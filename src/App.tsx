import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

// --- GLOBAL INTERFACES ---
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
  narrative?: string;
  date?: string;
  time?: string;
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

  // --- UNIT BUILDER WITH DATABASE ROSTER LOOKUP ---
  const createUnitInstance = async (unitId: string): Promise<FireUnit> => {
    let rawId = unitId.toUpperCase().replace(/\s+/g, "");
    let status = "enroute";
    if (rawId.startsWith("G")) {
      status = "dispatched";
      rawId = rawId.substring(1);
    }

    const isEngine = rawId.includes("E") || rawId.includes("ENG");

    // Fetch staffing from the 'apparatus' table
    const { data: rosterData } = await supabase
      .from("apparatus")
      .select("roles")
      .eq("id", rawId)
      .single();

    let members: Member[] = [];
    if (rosterData && rosterData.roles) {
      members = rosterData.roles.map((r: any) => ({
        role: r.role,
        name: r.name || "",
        assignment: "Unassigned",
      }));
    } else {
      const roles = isEngine
        ? ["Officer (P1)", "Driver (P4)", "Nozzle (P3)", "Backup (P2)"]
        : ["Officer (P1)", "Driver (P4)", "Search (P2)", "OV (P3)"];
      members = roles.map((r) => ({
        role: r,
        name: "",
        assignment: "Unassigned",
      }));
    }

    return {
      id: rawId,
      status,
      type: isEngine ? "ENGINE" : "TRUCK",
      assignment: "",
      members,
    };
  };

  // --- INCIDENT PARSER & STARTER ---
  const handleStartIncident = async (notes: string) => {
    if (!notes) return;

    // 1. Define Regex Matches
    const idMatch = notes.match(/ID:\s*([A-Z0-9-]+)/i);
    const boxMatch = notes.match(/BOX:\s*([\d-]+)/i);
    const addrMatch = notes.match(/ADDR:\s*(.*?)\sUNIT:/i);
    const unitMatch = notes.match(/UNIT:\s*(.*?)\s(?:INFO|STA|DATE)/i); // This creates the raw unit string
    const narrativeMatch = notes.match(/INFO:\s*(.*?)\sDATE:/i);
    const dateMatch = notes.match(/DATE:\s*([\d-]+)/i);
    const timeMatch = notes.match(/TIME:\s*([\d:]+)/i);

    // 2. Extract Data
    const incidentId = idMatch ? idMatch[1] : `INC-${Date.now()}`;
    const box = boxMatch ? boxMatch[1] : "---";
    const address = addrMatch ? addrMatch[1].trim() : "Address Found";

    // 3. Process Units (Handle unitRaw context)
    const rawUnitString = unitMatch ? unitMatch[1].trim() : "";
    const unitList = rawUnitString.split(/\s+/).filter((id) => id);

    // Await all database roster lookups
    const initialUnits = await Promise.all(
      unitList.map((id) => createUnitInstance(id))
    );

    const initialIncident: Incident = {
      id: incidentId,
      box,
      address,
      active: true,
      callNotes: notes,
      narrative: narrativeMatch ? narrativeMatch[1].trim() : "WORKING",
      date: dateMatch ? dateMatch[1] : "",
      time: timeMatch ? timeMatch[1] : "",
    };

    // 4. Update State & DB
    setIncident(initialIncident);
    setUnits(initialUnits);
    setRunningIncidents((prev) => [initialIncident, ...prev.slice(0, 4)]);
    setView("dispatch");

    await supabase.from("incidents").upsert([
      {
        id: incidentId,
        box_number: box,
        address,
        state: { units: initialUnits, incident: initialIncident },
      },
    ]);
  };

  const handleEndIncident = async () => {
    if (!incident?.id) return;
    if (!window.confirm("End this incident?")) return;
    const closed = { ...incident, active: false };
    await supabase
      .from("incidents")
      .update({ state: { units, incident: closed } })
      .eq("id", incident.id);
    setIncident(null);
    setUnits([]);
    setView("pre-dispatch");
  };

  const syncState = async (payload: any) => {
    if (!incident?.id) return;
    if (payload.units) setUnits(payload.units);
    await supabase
      .from("incidents")
      .update({ state: { ...payload, incident } })
      .eq("id", incident.id);
  };

  const navStyle = (active: boolean, color: string) => ({
    background: active ? color : "transparent",
    color: "white",
    border: "none",
    padding: "0 25px",
    cursor: "pointer",
    fontWeight: "bold" as const,
    fontSize: "11px",
    textTransform: "uppercase" as const,
  });

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
          style={navStyle(view === "pre-dispatch", "#374151")}
        >
          MONITOR
        </button>
        <button
          onClick={() => setView("dispatch")}
          style={navStyle(view === "dispatch", "#2563eb")}
        >
          DISPATCH
        </button>
        <button
          onClick={() => setView("command")}
          style={navStyle(view === "command", "#ea580c")}
        >
          COMMAND
        </button>
        <button
          onClick={() => setView("roster")}
          style={navStyle(view === "roster", "#8b5cf6")}
        >
          ROSTER
        </button>
        <div style={{ flexGrow: 1 }} />
        {incident && (
          <button
            onClick={handleEndIncident}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "0 15px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "11px",
            }}
          >
            END CALL
          </button>
        )}
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
        {view === "roster" && <Roster />}
      </main>
    </div>
  );
}
