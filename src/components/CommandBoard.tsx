import React, { useState } from 'react';
import { FireUnit, getUnitColor } from '../App';

const normalize = (str: string) => str?.toLowerCase().replace(/[-\s]/g, "") || "";

export default function CommandBoard({ incident, units, syncState, handleEndIncident }: any) {
  const [taskLocations, setTaskLocations] = useState<Record<string, string>>({});

  const commandStaff = [
    { id: 'ic', name: 'Incident Command' },
    { id: 'safety', name: 'Safety Officer' },
  ];

  const divisions = [
    { id: 'div-1', name: 'Division 1' },
    { id: 'div-2', name: 'Division 2' },
    { id: 'rit-div', name: 'RIT' },
  ];

  const allTasks = [
    { id: 'fire-attack', name: 'Fire Attack' },
    { id: 'search', name: 'Search & Rescue' },
    { id: 'vent', name: 'Ventilation' },
    { id: 'water', name: 'Water Supply' },
  ];

  // --- REFINED TETHERING ENGINE ---
  const updateAssignment = (unitId: string, memberIdx: number, newAssignment: string) => {
    const nextUnits = units.map((u: FireUnit) => {
      if (u.id === unitId) {
        const nextMembers = [...u.members];
        const dragged = nextMembers[memberIdx];
        nextMembers[memberIdx] = { ...dragged, assignment: newAssignment };

        const draggedRoleNorm = normalize(dragged.role);
        const pair = u.linkedPairs?.find(p => p.some(r => draggedRoleNorm.includes(normalize(r))));
        const isBroken = (u.brokenLinks || []).some(p => p.includes(dragged.role));

        if (pair && !isBroken) {
          const partnerRoleKey = pair.find(r => !draggedRoleNorm.includes(normalize(r)));
          const partnerRoleKeyNorm = normalize(partnerRoleKey || "");
          const pIdx = nextMembers.findIndex(m => normalize(m.role).includes(partnerRoleKeyNorm));
          
          if (pIdx !== -1 && (nextMembers[pIdx].assignment === "Unassigned" || nextMembers[pIdx].assignment === "STAGING")) {
            nextMembers[pIdx] = { ...nextMembers[pIdx], assignment: newAssignment };
          }
        }
        return { ...u, members: nextMembers };
      }
      return u;
    });
    syncState({ units: nextUnits });
  };

  const onDropTask = (taskId: string, locationId: string) => {
    setTaskLocations(prev => ({ ...prev, [taskId]: locationId }));
  };

  const toggleLink = (unitId: string, pair: string[]) => {
    const nextUnits = units.map((u: FireUnit) => {
      if (u.id === unitId) {
        const broken = u.brokenLinks || [];
        const exists = broken.some(p => p.includes(pair[0]));
        return { ...u, brokenLinks: exists ? broken.filter(p => !p.includes(pair[0])) : [...broken, pair] };
      }
      return u;
    });
    syncState({ units: nextUnits });
  };

  const renderPersonnelTag = (unit: FireUnit, member: any, idx: number, context: 'staffing' | 'tactical') => {
    const unitColor = getUnitColor(unit.type);
    const pair = unit.linkedPairs?.find(p => p.some(r => normalize(member.role).includes(normalize(r))));
    const isBroken = (unit.brokenLinks || []).some(p => p.includes(member.role));

    return (
      <div 
        key={`${unit.id}-${idx}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("type", "personnel");
          e.dataTransfer.setData("data", JSON.stringify({ unitId: unit.id, idx }));
        }}
        style={{
          background: '#0f172a', margin: '3px 0', padding: '6px', borderRadius: '4px',
          borderLeft: `4px solid ${unitColor}`, fontSize: '11px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', cursor: 'grab', border: '1px solid #1e293b', color: '#f8fafc'
        }}
      >
        <span>
          <strong style={{ color: unitColor }}>{unit.displayId}</strong> 
          <span style={{ color: '#94a3b8', margin: '0 5px' }}>{member.role}</span> 
          {member.name}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {context === 'staffing' && pair && (
            <span onClick={() => toggleLink(unit.id, pair)} style={{ cursor: 'pointer', opacity: isBroken ? 0.3 : 1 }}>
              {isBroken ? '🔓' : '🔗'}
            </span>
          )}
          {context === 'tactical' && (
            <button 
              onClick={() => updateAssignment(unit.id, idx, "Unassigned")}
              style={{ background: '#991b1b', border: 'none', color: 'white', borderRadius: '2px', padding: '0 4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              -
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTaskCard = (task: any) => {
    const assigned = [];
    units.forEach(u => u.members.forEach((m, idx) => {
      if (m.assignment === task.id) assigned.push({ unit: u, member: m, idx });
    }));

    return (
      <div 
        key={task.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("type", "task");
          e.dataTransfer.setData("taskId", task.id);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          const type = e.dataTransfer.getData("type");
          if (type === "personnel") {
            const data = JSON.parse(e.dataTransfer.getData("data"));
            updateAssignment(data.unitId, data.idx, task.id);
          }
        }}
        style={{
          background: '#1e293b', borderRadius: '8px', padding: '10px', marginBottom: '8px',
          border: '1px solid #334155', cursor: 'grab', minHeight: '60px'
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8', marginBottom: '5px' }}>{task.name.toUpperCase()}</div>
        {assigned.map(p => renderPersonnelTag(p.unit, p.member, p.idx, 'tactical'))}
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 1fr', height: '100%', background: '#060b13', overflow: 'hidden' }}>
      
      {/* COLUMN 1: STAFFING */}
      <div style={{ background: '#0f172a', borderRight: '1px solid #1e293b', overflowY: 'auto', padding: '15px' }}>
        <h3 style={{ color: '#38bdf8', borderBottom: '2px solid #38bdf8', paddingBottom: '10px', fontSize: '14px', fontWeight: 900 }}>STAFFING</h3>
        {units.map(u => (
          <div key={u.id} style={{ marginBottom: '15px', background: '#1e293b', borderRadius: '8px', borderLeft: `8px solid ${getUnitColor(u.type)}`, padding: '10px' }}>
            <div style={{ fontWeight: 900, marginBottom: '5px' }}>{u.displayId}</div>
            {u.members.map((m, idx) => (m.assignment === "Unassigned" || m.assignment === "STAGING") && renderPersonnelTag(u, m, idx, 'staffing'))}
          </div>
        ))}
      </div>

      {/* COLUMN 2: COMMAND & OPERATIONS */}
      <div style={{ borderRight: '1px solid #1e293b', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* TOP SECTION: COMMAND STAFF */}
        <div>
          <h3 style={{ color: '#ef4444', borderBottom: '2px solid #ef4444', paddingBottom: '10px', fontSize: '14px', fontWeight: 900 }}>COMMAND STAFF</h3>
          {commandStaff.map(role => {
            const personnel = [];
            units.forEach(u => u.members.forEach((m, idx) => {
              if (m.assignment === role.id) personnel.push({ unit: u, member: m, idx });
            }));

            return (
              <div 
                key={role.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const type = e.dataTransfer.getData("type");
                  if (type === "personnel") {
                    const data = JSON.parse(e.dataTransfer.getData("data"));
                    updateAssignment(data.unitId, data.idx, role.id);
                  }
                }}
                style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b', marginTop: '10px', minHeight: '60px' }}
              >
                <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 900, marginBottom: '8px' }}>{role.name.toUpperCase()}</div>
                {personnel.map(p => renderPersonnelTag(p.unit, p.member, p.idx, 'tactical'))}
              </div>
            );
          })}
        </div>

        {/* BOTTOM SECTION: OPERATIONS (DIVISIONS) */}
        <div>
          <h3 style={{ color: '#10b981', borderBottom: '2px solid #10b981', paddingBottom: '10px', fontSize: '14px', fontWeight: 900 }}>OPERATIONS / DIVISIONS</h3>
          {divisions.map(div => {
            const divPersonnel = [];
            units.forEach(u => u.members.forEach((m, idx) => {
              if (m.assignment === div.id) divPersonnel.push({ unit: u, member: m, idx });
            }));

            return (
              <div 
                key={div.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const type = e.dataTransfer.getData("type");
                  if (type === "task") onDropTask(e.dataTransfer.getData("taskId"), div.id);
                  else if (type === "personnel") {
                    const data = JSON.parse(e.dataTransfer.getData("data"));
                    updateAssignment(data.unitId, data.idx, div.id);
                  }
                }}
                style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b', marginTop: '10px', minHeight: '100px' }}
              >
                <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 900, marginBottom: '10px' }}>{div.name.toUpperCase()}</div>
                {allTasks.filter(t => taskLocations[t.id] === div.id).map(renderTaskCard)}
                {divPersonnel.length > 0 && (
                  <div style={{ marginTop: '5px' }}>
                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}>SUPERVISOR(S)</div>
                    {divPersonnel.map(p => renderPersonnelTag(p.unit, p.member, p.idx, 'tactical'))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUMN 3: TASKS / GROUPS */}
      <div style={{ padding: '15px', overflowY: 'auto' }}>
        <h3 style={{ color: '#facc15', borderBottom: '2px solid #facc15', paddingBottom: '10px', fontSize: '14px', fontWeight: 900 }}>TASKS / GROUPS</h3>
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const type = e.dataTransfer.getData("type");
            if (type === "task") onDropTask(e.dataTransfer.getData("taskId"), "");
          }}
          style={{ minHeight: '100%' }}
        >
          {allTasks.filter(t => !taskLocations[t.id]).map(renderTaskCard)}
        </div>
      </div>
    </div>
  );
}