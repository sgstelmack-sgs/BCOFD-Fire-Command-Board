import React, { useState, useEffect } from "react";
import PreDispatch from "./components/PreDispatch";
import Dispatch from "./components/Dispatch";
import CommandBoard from "./components/CommandBoard";
import { supabase } from "./supabaseClient";

export default function App() {
  const [view, setView] = useState("pre-dispatch");
  const [units, setUnits] = useState<any[]>([]);
  const [runningIncidents, setRunningIncidents] = useState<any[]>([]);
  const [incident, setIncident] = useState({
    id: "",
    box: "",
    address: "",
    callNotes: "",
    active: false,
  });

  // Helper to build unit data with default roles
  const createUnitInstance = (unitId: string) => {
    const id = unitId.toUpperCase();
    const isEngine = id.startsWith("E");
    const roles = isEngine
      ? ["Officer (P1)", "Driver (P4)", "Nozzle (P3)", "Backup (P2)"]
      : ["Officer (P1)", "Driver (P4)", "Search (P2)", "OV (P3)", "Roof (P4)"];

    return {
      id: id,
      status: "dispatched",
      type: isEngine ? "ENGINE" : "TRUCK",
      members: roles.map((r) => ({
        role: r,
        name: "",
        assignment: "Unassigned",
      })),
    };
  };

  // THE PARSER: Extracts info from pasted CAD text
  const startIncident = async (notes: string) => {
    // Parse Box (e.g., Box 47-01)
    const boxMatch = notes.match(/Box\s*(\d+[-\d]*)/i);
    const box = boxMatch ? boxMatch[1] : "47-01";

    // Parse Address (looks for text after Loc: or Address:)
    const addrMatch = notes.match(/(?:Loc|Address|At):\s*(.*)/i);
    const address = addrMatch ? addrMatch[1].trim() : "Address Not Found";

    // Parse Units (scans for E14, T1, BC1, etc.)
    const unitMatches =
      notes.match(/(E|T|R|BC|M|TW|QT|SQ|RS)\s*\d+[A-Z]?/g) || [];
    const uniqueUnits = unitMatches
      .map((u) => u.replace(/\s+/g, "")) // Remove spaces
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    const dispatchedUnits = uniqueUnits.map((id) => createUnitInstance(id));
    const newId = `INC-${Date.now()}`;

    const newInc = {
      id: newId,
      box,
      address,
      callNotes: notes,
      active: true,
    };

    setIncident(newInc);
    setUnits(dispatchedUnits);
    setRunningIncidents((prev) => [newInc, ...prev]);
    setView("dispatch"); // Auto-transition to Dispatch screen

    // Sync to Supabase
    await supabase.from("incidents").insert([
      {
        id: newId,
        box_number: box,
        address: address,
        state: { units: dispatchedUnits, incident: newInc },
      },
    ]);
  };

  const syncState = async (payload: any) => {
    if (!incident.id) return;
    if (payload.units) setUnits(payload.units);

    await supabase
      .from("incidents")
      .update({ state: { ...payload, incident } })
      .eq("id", incident.id);
  };

  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        minHeight: "100vh",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      {/* GLOBAL NAV */}
      <nav
        style={{
          display: "flex",
          background: "#1e293b",
          borderBottom: "3px solid #334155",
          height: "50px",
        }}
      >
        <button
          onClick={() => setView("pre-dispatch")}
          style={tabStyle(view === "pre-dispatch", "#94a3b8")}
        >
          MONITOR
        </button>
        <button
          onClick={() => setView("dispatch")}
          style={tabStyle(view === "dispatch", "#38bdf8")}
        >
          DISPATCH
        </button>
        <button
          onClick={() => setView("command")}
          style={tabStyle(view === "command", "#f97316")}
        >
          COMMAND
        </button>

        <div style={{ flexGrow: 1 }} />

        {incident.active && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 20px",
              color: "#facc15",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            ACTIVE: BOX {incident.box} — {incident.address}
          </div>
        )}
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ padding: "15px" }}>
        {view === "pre-dispatch" && (
          <PreDispatch
            onStart={startIncident}
            incident={incident}
            runningIncidents={runningIncidents}
          />
        )}
        {view === "dispatch" && (
          <Dispatch
            incident={incident}
            units={units}
            setUnits={setUnits}
            syncState={syncState}
          />
        )}
        {view === "command" && (
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
  color: active ? "black" : "white",
  border: "none",
  padding: "0 30px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "bold" as const,
  borderRight: "1px solid #334155",
  transition: "all 0.1s",
});
