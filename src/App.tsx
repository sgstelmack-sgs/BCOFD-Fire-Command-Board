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
  battalion?: string;
  station?: string;
}

export interface Incident {
  id: string;
  box: string;
  address: string;
  active: boolean;
  benchmarks?: { [key: string]: string };
}

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [units, setUnits] = useState<FireUnit[]>([]);

  // REAL-TIME SYNC: Listen for updates from other tablets
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
            if (newState.incident) setIncident(newState.incident);
            // If the incident is marked inactive by someone else, kick to monitor
            if (newState.incident?.active === false) {
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

  // --- UNIT BUILDER (Apparatus & Roster Lookup) ---
  const createUnitInstance = async (unitId: string): Promise<FireUnit> => {
    let rawId = unitId.toUpperCase().replace(/\s+/g, "");
    let status = "enroute";
    if (rawId.startsWith("G")) {
      status = "dispatched";
      rawId = rawId.substring(1);
    }

    const isEngine = rawId.includes("E") || rawId.includes("ENG");

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
      status,
      type: isEngine ? "ENGINE" : "TRUCK",
      assignment: "STAGING",
      battalion: appData?.battalion || "UNK",
      station: appData?.station || "UNK",
      members: rosterData?.members
        ? rosterData.members.map((m: any) => ({
            ...m,
            assignment: "Unassigned",
          }))
        : [
            { role: "Officer", name: "", assignment: "Unassigned" },
            { role: "Driver", name: "", assignment: "Unassigned" },
            {
              role: isEngine ? "Nozzle" : "Search",
              name: "",
              assignment: "Unassigned",
            },
            {
              role: isEngine ? "Backup" : "OV",
              name: "",
              assignment: "Unassigned",
            },
          ],
    };
  };

  // --- INCIDENT LIFECYCLE ---
  const handleStartIncident = async (notes: string) => {
    const boxMatch = notes.match(/BOX:\s*([\d-]+)/i);
    const addrMatch = notes.match(/ADDR:\s*(.*?)\sUNIT:/i);
    const unitMatch = notes.match(/UNIT:\s*(.*?)\s(?:INFO|STA|DATE)/i);

    const incidentId = `INC-${Date.now()}`;
    const unitList = unitMatch
      ? unitMatch[1]
          .trim()
          .split(/\s+/)
          .filter((id) => id)
      : [];
    const initialUnits = await Promise.all(
      unitList.map((id) => createUnitInstance(id))
    );

    const initialIncident: Incident = {
      id: incidentId,
      box: boxMatch ? boxMatch[1] : "---",
      address: addrMatch ? addrMatch[1].trim() : "Unknown",
      active: true,
    };

    setIncident(initialIncident);
    setUnits(initialUnits);
    setView("dispatch");

    await supabase.from("incidents").upsert([
      {
        id: incidentId,
        address: initialIncident.address,
        state: { units: initialUnits, incident: initialIncident },
      },
    ]);
  };

  const handleEndIncident = async () => {
    if (!incident?.id) return;
    if (!window.confirm("End incident and archive?")) return;

    const closedIncident = { ...incident, active: false };

    // Update DB to notify all other tablets
    await supabase
      .from("incidents")
      .update({
        state: { units: [], incident: closedIncident },
      })
      .eq("id", incident.id);

    // Reset Local State
    setIncident(null);
    setUnits([]);
    setView("pre-dispatch");
  };

  const syncState = async (payload: {
    units?: FireUnit[];
    incident?: Incident | null;
  }) => {
    if (!incident?.id) return;
    const nextUnits = payload.units || units;
    const nextIncident = payload.incident || incident;

    setUnits(nextUnits);
    setIncident(nextIncident);

    await supabase
      .from("incidents")
      .update({
        state: { units: nextUnits, incident: nextIncident },
      })
      .eq("id", incident.id);
  };

  return (
    <div
      style={{ backgroundColor: "#060b13", minHeight: "100vh", color: "white" }}
    >
      <nav
        style={{
          display: "flex",
          background: "#111827",
          height: "48px",
          borderBottom: "1px solid #1f2937",
        }}
      >
        <button
          onClick={() => setView("pre-dispatch")}
          style={{
            background: view === "pre-dispatch" ? "#374151" : "transparent",
            color: "white",
            border: "none",
            padding: "0 20px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          MONITOR
        </button>
        {incident && (
          <>
            <button
              onClick={() => setView("dispatch")}
              style={{
                background: view === "dispatch" ? "#2563eb" : "transparent",
                color: "white",
                border: "none",
                padding: "0 20px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              DISPATCH
            </button>
            <button
              onClick={() => setView("command")}
              style={{
                background: view === "command" ? "#ea580c" : "transparent",
                color: "white",
                border: "none",
                padding: "0 20px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              COMMAND
            </button>
          </>
        )}
        <button
          onClick={() => setView("roster")}
          style={{
            background: view === "roster" ? "#8b5cf6" : "transparent",
            color: "white",
            border: "none",
            padding: "0 20px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ROSTER
        </button>
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
          <Dispatch
            incident={incident}
            units={units}
            setUnits={setUnits}
            syncState={syncState}
          />
        )}
        {incident && view === "command" && (
          <CommandBoard
            incident={incident}
            units={units}
            setUnits={setUnits}
            syncState={syncState}
            handleEndIncident={handleEndIncident}
          />
        )}
        {view === "roster" && <Roster />}
      </main>
    </div>
  );
}
