import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

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
  task?: string;
  members: Member[];
  battalion?: string;
  station?: string;
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
  benchmarks?: { [key: string]: string };
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
            const newState =
              typeof payload.new.state === "string"
                ? JSON.parse(payload.new.state)
                : payload.new.state;
            setUnits(newState.units || []);
            if (newState.incident) setIncident(newState.incident);
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
    let status = "enroute";
    if (rawId.startsWith("G")) {
      status = "dispatched";
      rawId = rawId.substring(1);
    }
    const isEngine = rawId.includes("E") || rawId.includes("ENG");

    // 1. Get Station/Battalion from 'apparatus' table
    const { data: appData } = await supabase
      .from("apparatus")
      .select("battalion, station")
      .eq("id", rawId)
      .maybeSingle();

    // 2. Get Crew from 'rosters' table
    const { data: rosterData } = await supabase
      .from("rosters")
      .select("members")
      .eq("id", rawId)
      .maybeSingle();

    return {
      id: rawId,
      status,
      type: isEngine ? "ENGINE" : "TRUCK",
      assignment: "",
      battalion: appData?.battalion || "UNK",
      station: appData?.station || "UNK",
      members: rosterData?.members
        ? rosterData.members.map((m: any) => ({
            role: m.role,
            name: m.name || "",
            assignment: "Unassigned",
          }))
        : [
            { role: "Officer", name: "", assignment: "Unassigned" },
            { role: "Driver", name: "", assignment: "Unassigned" },
          ],
    };
  };

  const handleStartIncident = async (notes: string) => {
    if (!notes) return;
    const idMatch = notes.match(/ID:\s*([A-Z0-9-]+)/i);
    const boxMatch = notes.match(/BOX:\s*([\d-]+)/i);
    const addrMatch = notes.match(/ADDR:\s*(.*?)\sUNIT:/i);
    const unitMatch = notes.match(/UNIT:\s*(.*?)\s(?:INFO|STA|DATE)/i);

    const incidentId = idMatch ? idMatch[1] : `INC-${Date.now()}`;
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
      benchmarks: {},
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

  const syncState = async (payload: any) => {
    if (!incident?.id) return;
    const nextUnits = payload.units || units;
    const nextIncident = payload.incident || incident;
    setUnits(nextUnits);
    setIncident(nextIncident);
    await supabase
      .from("incidents")
      .update({ state: { units: nextUnits, incident: nextIncident } })
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
          height: "45px",
          borderBottom: "1px solid #1f2937",
        }}
      >
        {["pre-dispatch", "dispatch", "command", "roster"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: view === v ? "#2563eb" : "transparent",
              color: "white",
              border: "none",
              padding: "0 20px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "11px",
            }}
          >
            {v.toUpperCase()}
          </button>
        ))}
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
          />
        )}
        {view === "roster" && <Roster />}
      </main>
    </div>
  );
}
