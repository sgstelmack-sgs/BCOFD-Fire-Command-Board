import React, { useState } from 'react';
import { FireUnit, getUnitColor } from '../App';

const normalize = (str: string) => str?.toLowerCase().replace(/[-\s]/g, "") || "";

export default function CommandBoard({ incident, units, syncState }: any) {
  const [taskLocations, setTaskLocations] = useState<Record<string, string>>({}); 
  const [activeTab, setActiveTab] = useState<'tactical' | 'strategic'>('tactical');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  const [activeCommand, setActiveCommand] = useState([{ id: 'ic', name: 'Incident Command' }, { id: 'safety', name: 'Safety Officer' }]);
  const [activeGeneral, setActiveGeneral] = useState([{ id: 'ops-section', name: 'Operations Section' }]);
  const [activeBranches, setActiveBranches] = useState<any[]>([]);

  // --- 1. HIERARCHY ENGINE ---
  const sortDivisions = (divs: any[]) => {
    const getRank = (name: string) => {
      const norm = normalize(name);
      if (norm.includes("roof")) return 0;
      const floorMatch = norm.match(/(?:division|floor)(\d+)/);
      if (floorMatch) return 20 - parseInt(floorMatch[1]);
      if (norm.includes("division1") || norm.includes("floor1")) return 21;
      const baseMatch = norm.match(/basement(\d+)/);
      if (baseMatch) return 30 + parseInt(baseMatch[1]);
      if (norm === "basement") return 30;
      if (norm.includes("alpha")) return 50;
      if (norm.includes("bravo")) return 51;
      if (norm.includes("charlie")) return 52;
      if (norm.includes("delta")) return 53;
      return 99; 
    };
    return [...divs].sort((a, b) => getRank(a.name) - getRank(b.name));
  };

  const [activeDivisions, setActiveDivisions] = useState(sortDivisions([
    { id: 'group-roof', name: 'Roof Group', side: 'left' },
    { id: 'div-2', name: 'Division 2', side: 'left' },
    { id: 'div-1', name: 'Division 1', side: 'left' },
    { id: 'div-basement', name: 'Basement', side: 'left' },
    { id: 'div-a', name: 'Division Alpha', side: 'right' },
    { id: 'div-c', name: 'Division Charlie', side: 'right' },
    { id: 'group-search', name: 'Search & Rescue', side: 'right' },
    { id: 'group-rit', name: 'RIT Group', side: 'right' }
  ]));

  const [allTasks, setAllTasks] = useState([
    { id: 'fa-1', name: 'Fire Attack 1', base: 'Fire Attack' },
    { id: 'sr-1', name: 'Search 1', base: 'Search' },
    { id: 'vent-1', name: 'Ventilation 1', base: 'Ventilation' },
    { id: 'ws-1', name: 'Water Supply 1', base: 'Water Supply' },
    { id: 'util-1', name: 'Utilities 1', base: 'Utilities' },
    { id: 'rit-1', name: 'RIT Task 1', base: 'RIT' },
  ]);

  // --- 2. THE RIGID FILTER ENGINE (Fixed EMS & Ghosting) ---
  const filteredUnits = (units || []).filter(u => {
    const s = normalize(u.status || "");
    const t = normalize(u.type || "");
    const id = (u.displayId || "").toUpperCase();
    
    // GHOSTING PROTECTION: Unit must have an active incident status
    const isOnCall = s.includes("route") || s.includes("arrive") || s.includes("scene") || s.includes("dispatch");
    if (!isOnCall) return false;
    
    if (activeFilters.length === 0) return true;

    const typeFilters = activeFilters.filter(f => !["Arrived", "En Route"].includes(f));
    const statusFilters = activeFilters.filter(f => ["Arrived", "En Route"].includes(f));

    let matchesType = typeFilters.length === 0;
    if (typeFilters.length > 0) {
      matchesType = typeFilters.some(f => {
        if (f === "Staff") return t.includes("chief") || id.includes("SAFE6");
        // Fixed EMS logic: "M" prefix for Medics/Ambulances
        if (f === "EMS") return id.startsWith("M") || id.includes("EMSDO") || id.includes("MEDIC") || t.includes("ems");
        if (f === "Engine") return t.includes("engine") || id.startsWith("E");
        // Fixed Truck/Tow logic: TOW323 specifically mapped here
        if (f === "Truck") return t.includes("truck") || t.includes("tow") || t.includes("ladder") || id.startsWith("T") || id.startsWith("L");
        if (f === "Squad") return t.includes("squad") || t.includes("rescue") || id.startsWith("SQ") || id.startsWith("R");
        if (f === "Other") {
          const isStandard = t.includes("engine") || id.startsWith("E") ||
                             t.includes("truck") || t.includes("tow") || t.includes("ladder") || id.startsWith("T") || id.startsWith("L") ||
                             t.includes("squad") || t.includes("rescue") || id.startsWith("SQ") || id.startsWith("R") ||
                             t.includes("chief") || id.includes("SAFE6") || 
                             id.startsWith("M") || id.includes("EMSDO") || id.includes("MEDIC");
          return !isStandard;
        }
        return false;
      });
    }

    let matchesStatus = statusFilters.length === 0;
    if (statusFilters.length > 0) {
      matchesStatus = statusFilters.some(f => s.includes(normalize(f)));
    }

    return matchesType && matchesStatus;
  });

  // --- 3. DYNAMIC SPAWNING & RENAMING ---
  const spawnNextDivision = (currentName: string, side: string) => {
    const norm = normalize(currentName);
    let nextName = "";
    const floorMatch = norm.match(/(?:division|floor)(\d+)/);
    const baseMatch = norm.match(/basement(\d+)/);

    if (floorMatch) nextName = `Division ${parseInt(floorMatch[1]) + 1}`;
    else if (norm === "division1" || norm === "floor1") nextName = "Division 2";
    else if (baseMatch) nextName = `Basement ${parseInt(baseMatch[1]) + 1}`;
    else if (norm === "basement") nextName = "Basement 2";
    else if (norm.includes("alpha")) nextName = "Division Bravo";
    else if (norm.includes("charlie")) nextName = "Division Delta";
    
    if (!nextName) nextName = prompt("New Division/Group Name:") || "";
    if (activeDivisions.some(d => normalize(d.name) === normalize(nextName))) {
        nextName = prompt("Name exists. Custom Name:", nextName) || "";
    }
    if (nextName) setActiveDivisions(prev => sortDivisions([...prev, { id: `id-${Date.now()}`, name: nextName, side }]));
  };

  const renameItem = (id: string, currentName: string, type: 'div' | 'task') => {
    const newName = prompt(`Rename "${currentName}" to:`, currentName);
    if (!newName || newName === currentName) return;
    if (type === 'div') setActiveDivisions(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
    else setAllTasks(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
  };

  const handleTaskDeployment = (taskId: string, newLocation: string) => {
    setTaskLocations(prev => ({ ...prev, [taskId]: newLocation }));
    if (!newLocation) return;
    const task = allTasks.find(t => t.id === taskId);
    if (task?.base) {
      const count = allTasks.filter(t => t.base === task.base).length + 1;
      const newId = `${normalize(task.base)}-${count}`;
      if (!allTasks.find(t => t.id === newId)) {
        setAllTasks(prev => [...prev, { id: newId, name: `${task.base} ${count}`, base: task.base }]);
      }
    }
  };

  // --- 4. RENDERERS ---
  const renderPersonnelTag = (unit: FireUnit, member: any, idx: number, context: 'staffing' | 'tactical') => {
    const color = getUnitColor(unit.type);
    return (
      <div key={`${unit.id}-${idx}`} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("type", "personnel"); e.dataTransfer.setData("data", JSON.stringify({ unitId: unit.id, idx })); }}
        style={{ background: '#111827', margin: '1px 0', padding: '4px 6px', borderRadius: '3px', borderLeft: `3px solid ${color}`, fontSize: '10px', display: 'flex', justifyContent: 'space-between', border: '1px solid #1f2937', color: '#f8fafc', cursor: 'grab' }}>
        <span><strong>{unit.displayId}</strong> {member.name || member.role}</span>
        {context === 'tactical' && <button onClick={() => syncState({ units: units.map((u_m:any) => u_m.id === unit.id ? {...u_m, members: u_m.members.map((m:any, i:number) => i === idx ? {...m, assignment: "Unassigned"} : m)} : u_m)})} style={{ background: '#991b1b', color: 'white', border: 'none', borderRadius: '2px', padding: '0 3px', cursor: 'pointer' }}>-</button>}
      </div>
    );
  };

  const renderTaskCard = (task: any) => {
    const assigned = (units || []).flatMap((u: FireUnit) => (u.members || []).map((m, idx) => ({ u, m, idx }))).filter(item => item.m.assignment === task.id);
    return (
      <div key={task.id} onDoubleClick={() => renameItem(task.id, task.name, 'task')} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("type", "task"); e.dataTransfer.setData("taskId", task.id); }} onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          const dT = e.dataTransfer.getData("type");
          if (dT === "personnel") {
            const d = JSON.parse(e.dataTransfer.getData("data"));
            syncState({ units: units.map((un_p:any) => un_p.id === d.unitId ? {...un_p, members: un_p.members.map((m:any, i:number) => i === d.idx ? {...m, assignment: task.id} : m)} : un_p) });
          } else if (dT === "unit") {
            syncState({ units: units.map((un_u:any) => un_u.id === e.dataTransfer.getData("unitId") ? {...un_u, members: un_u.members.map((m:any) => ({...m, assignment: task.id}))} : un_u) });
          }
        }}
        style={{ background: '#020617', borderRadius: '4px', padding: '6px', marginBottom: '4px', border: '1px solid #1e293b', borderLeft: '3px solid #38bdf8', cursor: 'pointer' }}>
        <div style={{ fontSize: '9px', fontWeight: 900, color: '#38bdf8', marginBottom: '4px' }}>{task.name.toUpperCase()}</div>
        {assigned.map(item => renderPersonnelTag(item.u, item.m, item.idx, 'tactical'))}
      </div>
    );
  };

  const renderBucket = (bucket: any, sectionKey: string) => {
    const personnel = (units || []).flatMap((u: FireUnit) => (u.members || []).map((m, idx) => ({ u, m, idx }))).filter(item => item.m.assignment === bucket.id);
    return (
      <div key={bucket.id} onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          const dT = e.dataTransfer.getData("type");
          if (dT === 'unit') syncState({ units: units.map((u_b:any) => u_b.id === e.dataTransfer.getData("unitId") ? {...u_b, members: u_b.members.map((m:any) => ({...m, assignment: bucket.id}))} : u_b) });
          else if (dT === 'personnel') { const d = JSON.parse(e.dataTransfer.getData("data")); syncState({ units: units.map((un_b:any) => un_b.id === d.unitId ? {...un_b, members: un_b.members.map((m:any, i:number) => i === d.idx ? {...m, assignment: bucket.id} : m)} : un_b) }); }
          else if (dT === 'task') handleTaskDeployment(e.dataTransfer.getData("taskId"), bucket.id);
        }}
        style={{ background: sectionKey === 'divisions' ? '#1e293b' : '#0f172a', padding: '8px', borderRadius: '4px', border: '1px solid #334155', marginBottom: '8px', minHeight: '60px', position: 'relative' }}>
        
        <div style={{ position: 'absolute', right: '4px', top: '4px', display: 'flex', gap: '4px' }}>
          {sectionKey === 'divisions' && <button onClick={() => spawnNextDivision(bucket.name, bucket.side)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '10px', cursor: 'pointer' }}>+</button>}
          <button onClick={() => {
             const nextUnits = units.map((u: FireUnit) => ({...u, members: (u.members || []).map(m => m.assignment === bucket.id ? { ...m, assignment: "Unassigned" } : m)}));
             syncState({ units: nextUnits });
             if (sectionKey === 'divisions') setActiveDivisions(prev => prev.filter(d => d.id !== bucket.id));
          }} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', cursor: 'pointer' }}>✕</button>
        </div>

        <div onDoubleClick={() => renameItem(bucket.id, bucket.name, 'div')} style={{ color: '#f1f5f9', fontSize: '9px', fontWeight: 900, marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingRight: '30px', cursor: 'pointer' }}>{bucket.name.toUpperCase()}</div>
        {personnel.map(p => renderPersonnelTag(p.u, p.m, p.idx, 'tactical'))}
        {allTasks.filter(t => taskLocations[t.id] === bucket.id).map(renderTaskCard)}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#060b13', overflow: 'hidden' }}>
      {/* FILTER BAR */}
      <div style={{ background: '#0f172a', padding: '8px 15px', display: 'flex', gap: '6px', borderBottom: '1px solid #1e293b' }}>
        {["Engine", "Truck", "Squad", "Staff", "EMS", "Other", "Arrived", "En Route"].map(f => (
          <button key={f} onClick={() => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '9px', fontWeight: 900, background: activeFilters.includes(f) ? '#38bdf8' : '#1e293b', color: activeFilters.includes(f) ? '#020617' : '#94a3b8' }}>{f.toUpperCase()}</button>
        ))}
        <button onClick={() => setActiveFilters([])} style={{ padding: '4px 10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', marginLeft: 'auto' }}>RESET</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr 220px', flex: 1, overflow: 'hidden' }}>
        {/* APPARATUS BAY */}
        <div style={{ background: '#0f172a', padding: '10px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderRight: '1px solid #1e293b' }}>
          {filteredUnits.map(u => (
            <div key={u.id} draggable onDragStart={(e) => { e.dataTransfer.setData("type", "unit"); e.dataTransfer.setData("unitId", u.id); }}
              style={{ background: '#1e293b', borderRadius: '6px', borderLeft: `6px solid ${getUnitColor(u.type)}`, padding: '8px', height: 'fit-content' }}>
              <div style={{ fontWeight: 900, color: '#f8fafc', fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>{u.displayId}</span>
                <button onClick={() => syncState({ units: units.map((un:any) => un.id === u.id ? {...un, status: normalize(un.status).includes('arrive') ? 'Available' : 'Arrived'} : un) })}
                  style={{ fontSize: '8px', padding: '2px 5px', borderRadius: '3px', background: normalize(u.status).includes('arrive') ? '#991b1b' : '#854d0e', color: 'white', border: 'none' }}>{normalize(u.status).includes('arrive') ? 'CLEAR' : 'ARRIVE'}</button>
              </div>
              {(u.members || []).map((m: any, idx: number) => renderPersonnelTag(u, m, idx, 'staffing'))}
            </div>
          ))}
        </div>

        {/* STRUCTURE COLUMN */}
        <div style={{ padding: '10px', overflowY: 'auto', borderRight: '1px solid #1e293b' }}>
          <section style={{ marginBottom: '15px' }}>
             <div style={{ color: '#ef4444', fontSize: '10px', fontWeight: 900, borderBottom: '1px solid #ef4444', marginBottom: '8px' }}>COMMAND STAFF</div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>{activeCommand.map(c => renderBucket(c, "command"))}</div>
          </section>

          <div style={{ display: 'flex', background: '#1e293b', padding: '2px', borderRadius: '4px', marginBottom: '10px' }}>
            <button onClick={() => setActiveTab('tactical')} style={{ flex: 1, fontSize: '10px', padding: '6px', border: 'none', borderRadius: '3px', color: 'white', background: activeTab === 'tactical' ? '#10b981' : 'transparent' }}>TACTICAL</button>
            <button onClick={() => setActiveTab('strategic')} style={{ flex: 1, fontSize: '10px', padding: '6px', border: 'none', borderRadius: '3px', color: 'white', background: activeTab === 'strategic' ? '#a855f7' : 'transparent' }}>STRATEGIC</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {activeTab === 'tactical' ? (
              <>
                <div>{sortDivisions(activeDivisions).filter(d => d.side === 'left').map(d => renderBucket(d, 'divisions'))}</div>
                <div>{sortDivisions(activeDivisions).filter(d => d.side === 'right').map(d => renderBucket(d, 'divisions'))}</div>
              </>
            ) : (
              <>
                <div>{activeGeneral.map(g => renderBucket(g, 'general'))}</div>
                <div>{activeBranches.map(b => renderBucket(b, 'branches'))}</div>
              </>
            )}
          </div>
        </div>

        {/* TASK POOL */}
        <div style={{ padding: '10px', background: '#020617', overflowY: 'auto' }}>
           <div style={{ color: '#facc15', fontSize: '10px', fontWeight: 900, borderBottom: '1px solid #facc15', marginBottom: '10px' }}>AVAILABLE TASKS</div>
           <div onDragOver={e => e.preventDefault()} onDrop={e => { const tId = e.dataTransfer.getData("taskId"); if (tId) setTaskLocations(p => { const n = {...p}; delete n[tId]; return n; }); }} style={{ minHeight: '100%' }}>
             {allTasks.filter(t => !taskLocations[t.id]).map(renderTaskCard)}
           </div>
        </div>
      </div>
    </div>
  );
}