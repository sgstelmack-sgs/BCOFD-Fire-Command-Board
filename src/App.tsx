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
  rank?: string;
}

export interface FireUnit {
  id: string;
  status: string;
  type: string;
  assignment: string;
  members: Member[];
  battalion?: string;
  station?: string;
  linked_logic: any[];
}

export interface Incident {
  id: string;
  box: string;
  address: string;
  active: boolean;
  notes?: string;
  timestamp?: string;
}

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [units, setUnits] = useState<FireUnit[]>([]);

  // REAL-TIME SYNC
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

  // --- UNIT BUILDER (Apparatus Card Logic) ---
  const createUnitInstance = async (unitId: string): Promise<FireUnit> => {
    const rawId = unitId.toUpperCase().replace(/\s+/g, "");

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

    const isTruck =
      rawId.includes("T") ||
      rawId.includes("Q") ||
      rawId.includes("S") ||
      rawId.includes("TW");
    const defaultRoles = isTruck
      ? ["Officer", "Driver", "Left Jump", "Right Jump"]
      : ["Officer", "Driver", "Nozzle", "Backup"];

    const dbRoles = appData?.roles || defaultRoles;

    return {
      id: rawId,
      status: "dispatched",
      type: appData?.type || (isTruck ? "TRUCK" : "ENGINE"),
      assignment: "STAGING",
      linked_logic: appData?.linked_pairs
        ? typeof appData.linked_pairs === "string"
          ? JSON.parse(appData.linked_pairs)
          : appData.linked_pairs
        : [],
      members: dbRoles.map((role: string) => {
        const person = rosterData?.members?.find((m: any) => m.role === role);
        return {
          role,
          // FALLBACK: Roster Name -> "E8 Officer" Default
          name: person?.name || `${rawId} ${role}`,
          rank: person?.rank || "",
          assignment: "Unassigned",
        };
      }),
    };
  };

  // --- CAD PARSING & INCIDENT START ---
  const handleStartIncident = async (notes: string) => {
    const clean = notes.replace(/\n/g, " ").replace(/\s\s+/g, " ");

    const boxMatch = clean.match(/BOX:\s*([\d-]+)/i);
    const addrMatch = clean.match(
      /ADDR:\s*(.*?)(?=\s*(UNIT:|INFO:|DATE:|STA:|$))/i
    );
    const unitMatch = clean.match(
      /UNIT:\s*(.*?)(?=\s*(INFO:|STA:|DATE:|TIME:|GPS:|$))/i
    );
    const infoMatch = clean.match(
      /INFO:\s*(.*?)(?=\s*(DATE:|TIME:|GPS:|ID:|$))/i
    );
    const dateMatch = clean.match(/DATE:\s*([\d-]+)/i);
    const timeMatch = clean.match(/TIME:\s*([\d:]+)/i);
    const idMatch = clean.match(/ID:\s*([A-Z0-9-]+)/i);

    const rawUnits = unitMatch ? unitMatch[1] : "";
    const unitList = rawUnits.split(/[\s,]+/).filter((u) => u.length > 1);
    const initialUnits = await Promise.all(
      unitList.map((id) => createUnitInstance(id))
    );

    const incidentId = idMatch ? idMatch[1] : `INC-${Date.now()}`;
    const initialIncident: Incident = {
      id: incidentId,
      box: boxMatch ? boxMatch[1] : "---",
      address: addrMatch ? addrMatch[1].trim() : "Unknown Address",
      active: true,
      notes: infoMatch ? infoMatch[1].trim() : "No additional comments",
      timestamp: `${dateMatch ? dateMatch[1] : ""} ${
        timeMatch ? timeMatch[1] : ""
      }`.trim(),
    };

    setUnits(initialUnits);
    setIncident(initialIncident);
    setView("dispatch");

    // FIXED: Removed duplicate properties to resolve TS1117
    await supabase.from("incidents").insert([
      {
        id: incidentId,
        address: initialIncident.address,
        box: initialIncident.box,
        active: true,
        state: {
          units: initialUnits,
          incident: initialIncident,
        },
      },
    ]);
  };

  const handleEndIncident = async () => {
    if (!incident || !window.confirm("End incident?")) return;
    const closed = { ...incident, active: false };

    await supabase
      .from("incidents")
      .update({
        active: false,
        state: { units: [], incident: closed },
      })
      .eq("id", incident.id);

    setIncident(null);
    setUnits([]);
    setView("pre-dispatch");
  };

  const syncState = async (payload: {
    units?: FireUnit[];
    incident?: Incident | null;
  }) => {
    if (!incident) return;
    const nextUnits = payload.units || units;
    setUnits(nextUnits);
    await supabase
      .from("incidents")
      .update({
        state: { units: nextUnits, incident },
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
          <Dispatch incident={incident} units={units} syncState={syncState} />
        )}
        {incident && view === "command" && (
          <CommandBoard
            incident={incident}
            units={units}
            syncState={syncState}
            handleEndIncident={handleEndIncident}
          />
        )}
        {view === "roster" && <Roster />}
      </main>
    </div>
  );
}
