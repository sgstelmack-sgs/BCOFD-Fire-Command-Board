import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getUnitColor } from "../App";

export default function Dispatch({ incident, units, syncState }) {
  const [expandedUnits, setExpandedUnits] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch staff table for the autocomplete picker
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase
        .from("staff")
        .select("name, rank, id")
        .order("name");
      if (data) setStaff(data);
    };
    fetchStaff();
  }, []);

  // Filter logic based on your requirements:
  // Active units are those already alerted/involved in the incident (Dispatched, Enroute, Arrived)
  // Ghosted units remain "Available" until specifically acted upon
  const activeUnits = units.filter((u) => !u.isGhosted);
  const availableUnits = units.filter((u) => u.isGhosted);

  const updateStatus = (unitId, status) => {
    const nextUnits = units.map((u) => {
      if (u.id === unitId) {
        // If moving from ghosted/available to a response state, unghost them
        const isNowActive = status === "enroute" || status === "arrived" || status === "dispatched";
        return { ...u, status, isGhosted: !isNowActive };
      }
      return u;
    });
    syncState({ units: nextUnits });
  };

  const handleNameChange = (unitId, idx, newName) => {
    const nextUnits = units.map((u) => {
      if (u.id === unitId) {
        const nextMembers = [...u.members];
        nextMembers[idx] = { ...nextMembers[idx], name: newName };
        return { ...u, members: nextMembers };
      }
      return u;
    });
    syncState({ units: nextUnits });
    setEditingMember(null);
    setSearchTerm("");
  };

  const filteredStaff = staff
    .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 6);

  const renderUnitCard = (unit) => {
    const isExpanded = expandedUnits.includes(unit.id);
    const unitColor = getUnitColor(unit.type);
    const statusLabel = unit.status?.toUpperCase() || "AVAILABLE";

    return (
      <div
        key={unit.id}
        style={{
          background: unit.isGhosted ? "rgba(30, 41, 59, 0.4)" : "#1e293b",
          marginBottom: "12px",
          borderRadius: "10px",
          border: "1px solid #334155",
          borderLeft: `12px solid ${unitColor}`,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "15px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                onClick={() =>
                  setExpandedUnits((p) =>
                    p.includes(unit.id)
                      ? p.filter((x) => x !== unit.id)
                      : [...p, unit.id]
                  )
                }
                style={{ cursor: "pointer", fontSize: "18px" }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
              <span
                style={{ fontSize: "26px", fontWeight: 900, color: "#f8fafc" }}
              >
                {unit.displayId}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#94a3b8" }}>{statusLabel}</div>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: unitColor }}>
                {unit.type}
              </span>
            </div>
          </div>

          {isExpanded && (
            <div
              style={{
                background: "#0f172a",
                padding: "10px",
                borderRadius: "6px",
                marginTop: "10px",
                border: "1px solid #1e293b",
              }}
            >
              {unit.members.map((m, i) => {
                const isEditing =
                  editingMember?.unitId === unit.id && editingMember?.idx === i;
                const defaultPlaceholder = `${unit.displayId} ${m.role}`;

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "13px",
                      padding: "6px 0",
                      borderBottom:
                        i === unit.members.length - 1
                          ? "none"
                          : "1px solid #1e293b",
                      position: "relative",
                    }}
                  >
                    <span style={{ color: "#64748b", fontWeight: "bold" }}>
                      {m.role}
                    </span>

                    {!isEditing ? (
                      <span
                        onClick={() => {
                          setEditingMember({ unitId: unit.id, idx: i });
                          setSearchTerm(m.name || "");
                        }}
                        style={{
                          color: m.name ? "#38bdf8" : "#475569",
                          cursor: "pointer",
                          borderBottom: "1px dashed #38bdf8",
                        }}
                      >
                        {m.name || defaultPlaceholder}
                      </span>
                    ) : (
                      <div style={{ position: "relative", width: "65%" }}>
                        <input
                          autoFocus
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onBlur={() => setTimeout(() => setEditingMember(null), 200)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleNameChange(unit.id, i, searchTerm);
                            if (e.key === "Escape") setEditingMember(null);
                          }}
                          style={{
                            background: "#1e293b",
                            color: "#38bdf8",
                            border: "1px solid #38bdf8",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            width: "100%",
                            outline: "none",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#1e293b",
                            zIndex: 100,
                            border: "1px solid #334155",
                            borderRadius: "0 0 4px 4px",
                            boxShadow: "0 10px 15px rgba(0,0,0,0.5)",
                            maxHeight: "150px",
                            overflowY: "auto",
                          }}
                        >
                          {filteredStaff.map((person) => (
                            <div
                              key={person.id}
                              onMouseDown={() =>
                                handleNameChange(unit.id, i, person.name)
                              }
                              style={{
                                padding: "8px",
                                cursor: "pointer",
                                borderBottom: "1px solid #0f172a",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "11px",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#334155")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "transparent")
                              }
                            >
                              <span>{person.name}</span>
                              <span style={{ color: "#38bdf8", fontSize: "9px" }}>
                                {person.rank}
                              </span>
                            </div>
                          ))}
                          {searchTerm && (
                            <div
                              onMouseDown={() =>
                                handleNameChange(unit.id, i, searchTerm)
                              }
                              style={{
                                padding: "8px",
                                color: "#10b981",
                                fontSize: "10px",
                                fontStyle: "italic",
                                cursor: "pointer",
                                background: "#020617",
                                textAlign: "center",
                              }}
                            >
                              + Use Custom: "{searchTerm}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button
              onClick={() => updateStatus(unit.id, "enroute")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                background: unit.status === "enroute" ? "#1e40af" : "#334151",
                color: "white",
              }}
            >
              ENROUTE
            </button>
            <button
              onClick={() => updateStatus(unit.id, "arrived")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                background: unit.status === "arrived" ? "#166534" : "#334151",
                color: "white",
              }}
            >
              ARRIVED
            </button>
          </div>
        </div>
      </div>
    );
  };

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    incident.address + ", Baltimore County, MD"
  )}&t=k&z=20&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 450px",
        height: "100%",
        background: "#060b13",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "2px solid #1e293b",
        }}
      >
        <div
          style={{
            background: "#111827",
            borderBottom: "4px solid #ef4444",
            padding: "20px",
          }}
        >
          <div
            style={{
              color: "#facc15",
              fontSize: "42px",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {incident.callType}
          </div>
          <div
            style={{
              color: "#38bdf8",
              fontSize: "28px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {incident.address}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "5px" }}>
            BOX {incident.box} | ID: {incident.id}
          </div>
        </div>
        <div style={{ flex: 3 }}>
          <iframe
            title="Map"
            width="100%"
            height="100%"
            src={mapUrl}
            style={{ border: 0 }}
          ></iframe>
        </div>
        <div
          style={{
            flex: 1,
            background: "#0f172a",
            padding: "20px",
            borderTop: "2px solid #ef4444",
            overflowY: "auto",
          }}
        >
          <h4
            style={{
              color: "#ef4444",
              margin: "0 0 10px 0",
              fontSize: "14px",
              textTransform: "uppercase",
            }}
          >
            Narrative
          </h4>
          <p style={{ color: "#cbd5e1", fontSize: "18px", margin: 0 }}>
            {incident.narrative}
          </p>
        </div>
      </div>
      <div style={{ padding: "20px", background: "#0f172a", overflowY: "auto" }}>
        <h3
          style={{
            borderBottom: "2px solid #1e293b",
            paddingBottom: "10px",
            fontSize: "14px",
            color: "#f8fafc",
          }}
        >
          ACTIVE ASSETS
        </h3>
        {activeUnits.map(renderUnitCard)}
        {availableUnits.length > 0 && (
          <h3
            style={{
              borderBottom: "2px solid #1e293b",
              paddingBottom: "10px",
              fontSize: "14px",
              color: "#64748b",
              marginTop: "30px",
            }}
          >
            AVAILABLE (GHOSTED)
          </h3>
        )}
        {availableUnits.map(renderUnitCard)}
      </div>
    </div>
  );
}