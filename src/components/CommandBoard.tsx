import React, { useState } from "react";
import { UNIT_COLORS } from "../SharedConfig";

export default function CommandBoard({
  incident,
  units,
  setUnits,
  syncState,
}: any) {
  // Use the logic from our previous conversation for handleAddAndRename
  // and ensure the staging filter is as follows:

  const stagingUnits = units.filter((u: any) => u.status === "arrived");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr 250px",
        gap: 20,
      }}
    >
      <aside>
        <h3 style={{ color: "#f97316" }}>STAGING</h3>
        {stagingUnits.map((u: any) => (
          <div
            key={u.id}
            style={{ background: "#1e293b", padding: 10, marginBottom: 10 }}
          >
            {/* Personnel assignment logic here */}
          </div>
        ))}
      </aside>

      {/* Grid and Benchmarks logic remains the same */}
    </div>
  );
}
