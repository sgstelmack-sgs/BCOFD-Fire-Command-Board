import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

/**
 * GLOBAL INTERFACES
 * Strict data structures to ensure the fireground state is consistent.
 */
export interface FireUnit {
  id: string; // Primary key (e.g., M47)
  displayId: string; // User-facing ID (e.g., A47)
  status: string; // 'dispatched', 'enroute', 'arrived'
  type: string; // Apparatus type (ENGINE, TRUCK, etc.)
  assignment: string; // Tactical seat on Command Board
  members: any[]; // Crew array [{role: string, name: string}]
  isGhosted: boolean; // Notified/Standby status
}

export interface Incident {
  id: string; // CAD Incident Number
  box: string; // Physical Box Area
  callType: string; // Nature of call (extracted between CALL: and ADDR:)
  address: string; // Dispatch address
  date: string;
  time: string;
  narrative: string; // Cleaned dispatch comments
  active: boolean; // Operational status
}

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [units, setUnits] = useState<FireUnit[]>([]);

  /**
   * SUPABASE REAL-TIME LISTENER
   * Keeps multiple command tablets in sync. If one person changes a status,
   * every other device on the fireground updates automatically.
   */
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

  /**
   * UNIT FACTORY
   * 1. Strips 'G' prefix for database lookups.
   * 2. Checks Supabase for saved shift rosters.
   * 3. Defaults to 'Unit + Role' names if no roster exists.
   */
  const createUnitInstance = async (
    unitId: string,
    forceGhost: boolean
  ): Promise<FireUnit> => {
    let rawId = unitId.toUpperCase().replace(/\s+/g, "");
    let lookupId = rawId;

    // BCoFD Notified Logic: Strip 'G' to find the actual asset in the DB
    if (rawId.startsWith("G") && rawId.length > 2)
      lookupId = rawId.substring(1);

    const { data: appData } = await supabase
      .from("apparatus")
      .select("*")
      .eq("id", lookupId)
      .maybeSingle();
    const { data: rosterData } = await supabase
      .from("rosters")
      .select("*")
      .eq("unit_id", lookupId)
      .maybeSingle();

    return {
      id: lookupId,
      displayId: lookupId,
      status: "dispatched",
      type: appData?.type || "ENGINE",
      assignment: "STAGING",
      isGhosted: forceGhost,
      members: (
        appData?.roles || ["Officer", "Driver", "Nozzle", "Backup"]
      ).map((role: string) => {
        const saved = rosterData?.members?.find((m: any) => m.role === role);
        return {
          role,
          name: saved?.name || `${lookupId} ${role}`,
          assignment: "Unassigned",
        };
      }),
    };
  };

  /**
   * CAD PARSER
   * Extracts data from the CAD dump using non-greedy Regex patterns.
   * Excludes 'STA' units and handles 'G' notified prefixes.
   */
  const handleStartIncident = async (notes: string) => {
    const clean = notes.replace(/\n/g, " ").replace(/\s\s+/g, " ");

    // Field Mapping
    const callMatch = clean.match(/CALL:\s*(.*?)(?=\s*(ADDR:|UNIT:|$))/i);
    const boxMatch = clean.match(/BOX:\s*([\d-]+)/i);
    const addrMatch = clean.match(
      /ADDR:\s*(.*?)(?=\s*(UNIT:|INFO:|DATE:|STA:|$))/i
    );
    const idMatch = clean.match(/ID:\s*([A-Z0-9-]+)/i);
    const unitMatch = clean.match(/UNIT:\s*(.*?)(?=\s*(INFO:|STA:|DATE:|$))/i);
    const commMatch = clean.match(/INFO:\s*(.*?)(?=\s*DATE:|$)/i);

    const unitList = (unitMatch ? unitMatch[1] : "")
      .split(/[\s,]+/)
      .filter((u) => u.length > 1 && !u.toUpperCase().startsWith("STA"));

    const initialUnits = await Promise.all(
      unitList.map((u) => {
        const isGhost = u.toUpperCase().startsWith("G") && u.length > 2;
        return createUnitInstance(u, isGhost);
      })
    );

    const incidentData: Incident = {
      id: idMatch ? idMatch[1] : `INC-${Date.now()}`,
      box: boxMatch ? boxMatch[1] : "---",
      callType: callMatch ? callMatch[1].trim() : "UNKNOWN",
      address: addrMatch ? addrMatch[1].trim() : "Unknown Address",
      date: "",
      time: "",
      narrative: commMatch ? commMatch[1].trim() : "No comments.",
      active: true,
    };

    setUnits(initialUnits);
    setIncident(incidentData);
    setView("dispatch");
    await supabase.from("incidents").insert([
      {
        id: incidentData.id,
        active: true,
        state: { units: initialUnits, incident: incidentData },
      },
    ]);
  };

  const syncState = async (p: { units?: FireUnit[] }) => {
    if (!incident) return;
    const nextUnits = p.units || units;
    setUnits(nextUnits);
    await supabase
      .from("incidents")
      .update({ state: { units: nextUnits, incident } })
      .eq("id", incident.id);
  };

  const getTabStyle = (tab: string): React.CSSProperties => ({
    padding: "0 20px",
    height: "100%",
    border: "none",
    cursor: "pointer",
    background: view === tab ? "rgba(56, 189, 248, 0.1)" : "transparent",
    color: view === tab ? "#38bdf8" : "#94a3b8",
    borderBottom: view === tab ? "3px solid #38bdf8" : "3px solid transparent",
    fontSize: "12px",
    fontWeight: "bold",
    textTransform: "uppercase",
  });

  return (
    <div
      style={{
        background: "#060b13",
        minHeight: "100vh",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <nav
        style={{
          display: "flex",
          background: "#0f172a",
          height: "56px",
          borderBottom: "1px solid #1e293b",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            padding: "0 25px",
            borderRight: "1px solid #1e293b",
            marginRight: "10px",
          }}
        >
          <span style={{ color: "#ef4444", fontWeight: 900, fontSize: "20px" }}>
            BC
          </span>
          <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "16px" }}>
            o
          </span>
          <span style={{ color: "#ef4444", fontWeight: 900, fontSize: "20px" }}>
            FD
          </span>
          <span
            style={{
              color: "white",
              fontWeight: 300,
              fontSize: "16px",
              marginLeft: "10px",
              opacity: 0.6,
            }}
          >
            OPS
          </span>
        </div>
        <button
          style={getTabStyle("pre-dispatch")}
          onClick={() => setView("pre-dispatch")}
        >
          Monitor
        </button>
        {incident && (
          <button
            style={getTabStyle("dispatch")}
            onClick={() => setView("dispatch")}
          >
            Dispatch
          </button>
        )}
        {incident && (
          <button
            style={getTabStyle("command")}
            onClick={() => setView("command")}
          >
            Command
          </button>
        )}
        <button style={getTabStyle("roster")} onClick={() => setView("roster")}>
          Roster
        </button>
      </nav>
      <main style={{ height: "calc(100vh - 56px)" }}>
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
            handleEndIncident={() => {
              setIncident(null);
              setView("pre-dispatch");
            }}
          />
        )}
        {view === "roster" && <Roster />}
      </main>
    </div>
  );
}
