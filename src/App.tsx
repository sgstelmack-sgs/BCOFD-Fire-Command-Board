import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

// --- INTERFACES ---
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
  linked_logic: string[][];
  station_id?: string;
  battalion_id?: string;
}

export interface Incident {
  id: string;
  box: string;
  address: string;
  active: boolean;
  call?: string;
  notes?: string;
  timestamp?: string;
}

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [units, setUnits] = useState<FireUnit[]>([]);

  // 1. REAL-TIME SUBSCRIPTION
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
          const newState = payload.new.state;
          const parsedState =
            typeof newState === "string" ? JSON.parse(newState) : newState;
          if (parsedState) {
            setUnits(parsedState.units || []);
            if (parsedState.incident) setIncident(parsedState.incident);
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

  // 2. UNIT CREATION LOGIC
  const createUnitInstance = async (unitId: string): Promise<FireUnit> => {
    let rawId = unitId.toUpperCase().replace(/\s+/g, "");
    let status = "dispatched";

    if (rawId.startsWith("G")) {
      status = "ghosted";
      rawId = rawId.substring(1);
    }

    const { data: appData } = await supabase
      .from("apparatus")
      .select("id, roles, type, linked_pairs, station_id, battalion_id")
      .eq("id", rawId)
      .maybeSingle();

    const { data: rosterData } = await supabase
      .from("rosters")
      .select("*")
      .eq("id", rawId)
      .maybeSingle();

    const isTruck = /^(T|Q|S|TW|TK|RS)/.test(rawId);
    const isMedic = /^(M|A|PM)/.test(rawId);
    const isChief = /^(BC|DC|CH|B|STA|EMS)/.test(rawId);

    const dbRoles: string[] = Array.isArray(appData?.roles)
      ? appData.roles
      : isMedic
      ? ["AIC", "Driver"]
      : ["Officer", "Driver", "Nozzle", "Backup"];

    return {
      id: rawId,
      status,
      type:
        appData?.type ||
        (isMedic ? "MEDIC" : isTruck ? "TRUCK" : isChief ? "CHIEF" : "ENGINE"),
      assignment: "STAGING",
      station_id: appData?.station_id || "",
      battalion_id: appData?.battalion_id || "",
      linked_logic: Array.isArray(appData?.linked_pairs)
        ? appData.linked_pairs
        : [],
      members: dbRoles.map((role: string) => {
        const p = rosterData?.members?.find((m: any) => m.role === role);
        return {
          role,
          name: p?.name || `${rawId} ${role}`,
          rank: p?.rank || "",
          assignment: "Unassigned",
        };
      }),
    };
  };

  // 3. DISPATCH HANDLER
  const handleStartIncident = async (notes: string) => {
    const clean = notes.replace(/\n/g, " ").replace(/\s\s+/g, " ");
    const boxMatch = clean.match(/BOX:\s*([\d-]+)/i);
    const callMatch = clean.match(/CALL:\s*(.*?)(?=\s*(ADDR:|UNIT:|INFO:|$))/i);
    const addrMatch = clean.match(
      /ADDR:\s*(.*?)(?=\s*(UNIT:|INFO:|DATE:|STA:|$))/i
    );
    const unitMatch = clean.match(
      /UNIT:\s*(.*?)(?=\s*(INFO:|STA:|DATE:|TIME:|GPS:|$))/i
    );
    const idMatch = clean.match(/ID:\s*([A-Z0-9-]+)/i);

    const rawUnits = unitMatch ? unitMatch[1] : "";
    const unitList = rawUnits
      .split(/[\s,]+/)
      .filter((u) => u.length > 1 && !/^STA\d/i.test(u));

    const initialUnits = await Promise.all(
      unitList.map((id) => createUnitInstance(id))
    );
    const incidentId = idMatch ? idMatch[1] : `INC-${Date.now()}`;

    const initialIncident: Incident = {
      id: incidentId,
      box: boxMatch ? boxMatch[1] : "---",
      call: callMatch ? callMatch[1].trim() : "Unknown Call",
      address: addrMatch ? addrMatch[1].trim() : "Unknown Address",
      active: true,
      notes: clean,
    };

    setUnits(initialUnits);
    setIncident(initialIncident);
    setView("dispatch");

    await supabase.from("incidents").insert([
      {
        id: incidentId,
        address: initialIncident.address,
        box: initialIncident.box,
        active: true,
        state: { units: initialUnits, incident: initialIncident },
      },
    ]);
  };

  const handleEndIncident = async () => {
    if (!incident) return;
    await supabase
      .from("incidents")
      .update({ active: false })
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
      .update({ state: { units: nextUnits, incident } })
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
