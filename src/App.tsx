import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import Roster from "./components/Roster";

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

// MASTER TACTICAL COLORS
export const getUnitColor = (type: string) => {
  const t = type?.toUpperCase() || "";
  if (t === "ENGINE") return "#1e40af"; // Blue
  if (t === "TRUCK" || t === "TOWER") return "#991b1b"; // Red
  if (t === "SQUAD" || t === "RESCUE") return "#166534"; // Green
  if (t === "CHIEF" || t === "BC") return "#ca8a04"; // Gold
  if (t === "MEDIC" || t === "AMBULANCE") return "#c2410c"; // Orange
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

          // LOG MISSING UNIT
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

          // TIGHTER SHORTHAND LOGIC
          let tacticalType = appData?.type || "OTHER";
          if (tacticalType === "OTHER") {
            if (/^E\d/.test(lookupId)) tacticalType = "ENGINE";
            else if (/^T\d|^TW\d|^L\d/.test(lookupId)) tacticalType = "TRUCK";
            else if (/^M\d|^A\d/.test(lookupId)) tacticalType = "MEDIC";
            else if (/^SQ\d|^R\d/.test(lookupId)) tacticalType = "SQUAD";
            else if (/^B\d|^D\d|^CH\d/.test(lookupId)) tacticalType = "CHIEF";
          }

          return {
            id: lookupId,
            displayId: lookupId,
            status: "dispatched",
            type: tacticalType,
            assignment: "STAGING",
            isGhosted: isGhost,
            members: (
              appData?.roles || ["Officer", "Driver", "Nozzle", "Backup"]
            ).map((role: string) => {
              const saved = rosterData?.members?.find(
                (m: any) => m.role === role
              );
              return {
                role,
                name: saved?.name || `${lookupId} ${role}`,
                assignment: "Unassigned",
              };
            }),
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
        {view === "dispatch" && incident && (
          <Dispatch incident={incident} units={units} syncState={syncState} />
        )}
        {view === "command" && incident && (
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
