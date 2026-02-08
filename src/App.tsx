import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

/**
 * CAPTAIN'S NOTES: ROSTER-FIRST ARCHITECTURE
 * - Roster Boss: If a roster exists, it defines the crew size and roles (Fixes Medic 2-spot vs 4-spot issue).
 * - Partial Match: Bridges the gap between "Officer" and "Officer (P1)".
 * - Real-time: Syncs state across all incident tablets.
 */

export interface FireUnit {
  id: string;
  displayId: string;
  status: string;
  type: string;
  assignment: string;
  members: any[];
  isGhosted: boolean;
}

export interface Incident {
  id: string;
  box: string;
  callType: string;
  address: string;
  date: string;
  time: string;
  narrative: string;
  active: boolean;
}

export const getUnitColor = (type: string) => {
  const t = type?.toUpperCase() || "";
  if (t.includes("ENGINE") || t.startsWith("E")) return "#1e40af"; // Blue
  if (t.includes("TRUCK") || t.includes("TOWER") || t.startsWith("T"))
    return "#991b1b"; // Red
  if (
    t.includes("SQUAD") ||
    t.includes("RESCUE") ||
    t.startsWith("SQ") ||
    t.startsWith("R")
  )
    return "#166534"; // Green
  if (
    t.includes("CHIEF") ||
    t.includes("BC") ||
    t.includes("DC") ||
    t.startsWith("B")
  )
    return "#ca8a04"; // Gold
  if (
    t.includes("MEDIC") ||
    t.includes("AMBULANCE") ||
    t.startsWith("M") ||
    t.startsWith("A")
  )
    return "#c2410c"; // Orange
  return "#475569";
};

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [units, setUnits] = useState<FireUnit[]>([]);

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
            setUnits([...(parsedState.units || [])]);
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

  const handleStartIncident = async (notes: string) => {
    try {
      const clean = notes.replace(/\n/g, " ").replace(/\s\s+/g, " ");
      const callRawMatch = clean.match(
        /CALL:\s*\S+\s*-\s*(.*?)(?=\s*(ADDR:|UNIT:|$))/i
      );
      const boxMatch = clean.match(/BOX:\s*([\d-]+)/i);
      const addrMatch = clean.match(
        /ADDR:\s*(.*?)(?=\s*(UNIT:|INFO:|DATE:|STA:|$))/i
      );
      const idMatch = clean.match(/ID:\s*([A-Z0-9-]+)/i);
      const unitMatch = clean.match(
        /UNIT:\s*(.*?)(?=\s*(INFO:|STA:|DATE:|$))/i
      );
      const commMatch = clean.match(/INFO:\s*(.*?)(?=\s*DATE:|$)/i);

      const unitList = (unitMatch ? unitMatch[1] : "")
        .split(/[\s,]+/)
        .filter((u) => u.length > 1 && !u.toUpperCase().startsWith("STA"));

      const initialUnits = await Promise.all(
        unitList.map(async (u) => {
          let lookupId = u.toUpperCase().replace(/\s+/g, "");
          const isGhost = lookupId.startsWith("G") && lookupId.length > 2;
          if (isGhost) lookupId = lookupId.substring(1);

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

          // Logging missing units
          if (!appData && !isGhost) {
            supabase
              .from("missing_apparatus")
              .upsert(
                {
                  id: lookupId,
                  last_incident_id: idMatch ? idMatch[1] : "UNKNOWN",
                  suggested_type: /^E\d/.test(lookupId)
                    ? "ENGINE"
                    : /^A\d|^M\d/.test(lookupId)
                    ? "MEDIC"
                    : "OTHER",
                },
                { onConflict: "id" }
              )
              .then();
          }

          let tacticalType = appData?.type || "OTHER";
          if (tacticalType === "OTHER") {
            if (/^E\d/.test(lookupId)) tacticalType = "ENGINE";
            else if (/^T\d|^TW\d|^L\d/.test(lookupId)) tacticalType = "TRUCK";
            else if (/^M\d|^A\d/.test(lookupId)) tacticalType = "MEDIC";
          }

          // --- THE ROSTER-FIRST INJECTOR ---
          let members = [];
          if (rosterData?.members && rosterData.members.length > 0) {
            // ROSTER IS BOSS: Show exactly what is saved, no extra spots.
            members = rosterData.members.map((m: any) => ({
              role: m.role,
              name: m.name || `${lookupId} ${m.role}`,
              assignment: "Unassigned",
            }));
          } else {
            // FALLBACK: Use apparatus defaults if no roster is set.
            const defaultRoles = appData?.roles || [
              "Officer",
              "Driver",
              "Nozzle",
              "Backup",
            ];
            members = defaultRoles.map((role: string) => ({
              role: role,
              name: `${lookupId} ${role}`,
              assignment: "Unassigned",
            }));
          }

          return {
            id: lookupId,
            displayId: lookupId,
            status: "dispatched",
            type: tacticalType,
            assignment: "STAGING",
            isGhosted: isGhost,
            members,
          };
        })
      );

      const incidentData: Incident = {
        id: idMatch ? idMatch[1] : `INC-${Date.now()}`,
        box: boxMatch ? boxMatch[1].replace(/^0+/, "") : "---",
        callType: callRawMatch ? callRawMatch[1].trim() : "UNKNOWN",
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
    } catch (e) {
      console.error(e);
    }
  };

  const syncState = async (p: { units?: FireUnit[] }) => {
    if (!incident) return;
    const nextUnits = p.units || units;
    setUnits([...nextUnits]);
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
            BCoFD
          </span>
          <span
            style={{
              color: "#f8fafc",
              fontWeight: 600,
              fontSize: "14px",
              marginLeft: "10px",
              opacity: 0.8,
            }}
          >
            Command
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
            Command Board
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
