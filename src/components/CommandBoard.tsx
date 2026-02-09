import React, { useState } from 'react';
import { FireUnit, getUnitColor } from '../App';

const normalize = (str: string) => str?.toLowerCase().replace(/[-\s]/g, "") || "";

export default function CommandBoard({ incident, units, syncState }: any) {
  // --- 1. RIGID BUILDING HIERARCHY ---
  const sortDivisions = (divs: any[]) => {
    const getRank = (name: string) => {
      const norm = normalize(name);
      if (norm.includes("roof")) return 0;
      if (norm.includes("floor5") || norm === "division5") return 1;
      if (norm.includes("floor4") || norm === "division4") return 2;
      if (norm.includes("floor3") || norm === "division3") return 3;
      if (norm.includes("division2") || norm.includes("floor2")) return 4;
      if (norm.includes("division1") || norm.includes("floor1")) return 5;
      if (norm === "basement") return 6;
      if (norm === "basement2") return 7;
      if (norm === "basement3") return 8;
      if (norm.includes("alpha")) return 10;
      if (norm.includes("bravo")) return 11;
      if (norm.includes("charlie")) return 12;
      if (norm.includes("delta")) return 13;
      if (norm.includes("search")) return 20;
      if (norm.includes("rit")) return 30;
      return 99; 
    };
    return [...divs].sort((a, b) => getRank(a.name) - getRank(b.name));
  };

  // --- 2. STATE ---
  const [taskLocations, setTaskLocations] = useState<Record<string, string>>({}); 
  const [activeCommand, setActiveCommand] = useState([{ id: 'ic', name: 'Incident Command' }, { id: 'safety', name: 'Safety Officer' }]);
  const [activeGeneral, setActiveGeneral] = useState([{ id: 'ops-section', name: 'Operations Section' }]);
  const [activeBranches, setActiveBranches] = useState<any[]>([]);
  const [activeDivisions, setActiveDivisions] = useState(sortDivisions([
    { id: 'group-roof', name: 'Roof Group' },
    { id: 'div-2', name: 'Division 2' },
    { id: 'div-1', name: 'Division 1' },
    { id: 'div-basement', name: 'Basement' },
    { id: 'div-a', name: 'Division Alpha' },
    { id: 'div-c', name: 'Division Charlie' },
    { id: 'group-search', name: 'Search and Rescue' },
    { id: 'group-rit', name: 'RIT' }
  ]));
  
  const [allTasks, setAllTasks] = useState([
    { id: 'fire-attack-1', name: 'Fire Attack 1', base: 'Fire Attack' },
    { id: 'search-rescue-1', name: 'Search & Rescue 1', base: 'Search & Rescue' },
    { id: 'ventilation-1', name: 'Ventilation 1', base: 'Ventilation' },
    { id: 'water-supply-1', name: 'Water Supply 1', base: 'Water Supply' },
    { id: 'utilities-1', name: 'Utilities 1', base: 'Utilities' },
    { id: 'rit-task-1', name: 'RIT 1', base: 'RIT' },
  ]);

  const menuOptions = {
    command: ["Public Information Officer", "Safety Officer", "Liaison Officer"],
    general: ["Operations Section Chief", "Planning Section Chief", "Logistics Section Chief", "Finance Section Chief"],
    branches: ["Fire Branch", "Medical Branch", "Hazmat Branch", "Rescue Branch", "RIT Branch"],
    divisions: ["Division 3", "Division 4", "Division Bravo", "Division Delta", "Basement 2", "Basement 3", "Roof Group", "RIT"]
  };

  // --- 3. CORE LOGIC ENGINES ---
  const getAssignmentLabel = (id: string) => {
    if (!id || id === "Unassigned" || id === "STAGING") return null;
    const task = allTasks.find(t => t.id === id);
    if (task) {
      const parentId = taskLocations[id];
      const div = activeDivisions.find(d => d.id === parentId);
      return div ? `${div.name} / ${task.name}` : task.name;
    }
    const other = [...activeCommand, ...activeGeneral, ...activeBranches, ...activeDivisions].find(item => item.id === id);
    return other ? other.name : null;
  };

  const spawnNextDivision = (currentName: string) => {
    const norm = normalize(currentName);
    let nextName = "";
    if (norm === "division1" || norm === "floor1") nextName = "Division 2";
    else if (norm === "division2" || norm === "floor2") nextName = "Division 3";
    else if (norm === "division3" || norm === "floor3") nextName = "Division 4";
    else if (norm === "basement") nextName = "Basement 2";
    else if (norm === "basement2") nextName = "Basement 3";
    else if (norm === "alpha" || norm === "divisionalpha") nextName = "Division Bravo";
    else if (norm === "charlie" || norm === "divisioncharlie") nextName = "Division Delta";

    const isDup = activeDivisions.some(d => normalize(d.name) === normalize(nextName));
    if (!nextName || isDup) nextName = prompt(isDup ? `${nextName} exists. Name unit:` : "New Unit Name:") || "";
    if (nextName) setActiveDivisions(prev => sortDivisions([...prev, { id: `id-${Date.now()}`, name: nextName }]));
  };

  const removeBucket = (id: string, section: string) => {
    const nextUnits = (units || []).map((u: FireUnit) => ({
      ...u,
      members: (u.members || []).map(m => m.assignment === id ? { ...m, assignment: "Unassigned" } : m)
    }));
    syncState({ units: nextUnits });
    setTaskLocations(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k] === id) delete next[k]; });
      return next;
    });
    if (section === 'command') setActiveCommand(p => p.filter(b => b.id !== id));
    else if (section === 'general') setActiveGeneral(p => p.filter(b => b.id !== id));
    else if (section === 'branches') setActiveBranches(p => p.filter(b => b.id !== id));
    else if (section === 'divisions') setActiveDivisions(p => p.filter(b => b.id !== id));
  };

  // --- 4. RENDERERS ---
  const renderPersonnelTag = (unit: FireUnit, member: any, idx: number, context: 'staffing' | 'tactical') => {
    const color = getUnitColor(unit.type);
    const label = getAssignmentLabel(member.assignment);
    return (
      <div key={`${unit.id}-${idx}`} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("type", "personnel"); e.dataTransfer.setData("data", JSON.stringify({ unitId: unit.id, idx })); }}
        style={{ background: '#111827', margin: '2px 0', padding: '6px', borderRadius: '4px', borderLeft: `4px solid ${color}`, fontSize: '11px', display: 'flex', justifyContent: 'space-between', border: '1px solid #1f2937', color: '#f8fafc', cursor: 'grab' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
           <span><strong style={{ color }}>{unit.displayId}</strong> {member.role} {member.name}</span>
           {context === 'staffing' && label && <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 'bold' }}>📍 {label}</span>}
        </div>
        {context === 'tactical' && <button onClick={() => {
            const nextUnits = units.map((u:any) => u.id === unit.id ? {...u, members: u.members.map((m:any, i:number) => i === idx ? {...m, assignment: "Unassigned"} : m)} : u);
            syncState({ units: nextUnits });
        }} style={{ background: '#991b1b', color: 'white', border: 'none', borderRadius: '2px', padding: '0 4px', cursor: 'pointer', height: '16px' }}>-</button>}
      </div>
    );
  };

  const renderTaskCard = (task: any) => {
    const assignedPersonnel = (units || []).flatMap((u: FireUnit) => 
      (u.members || []).map((m, idx) => ({ u, m, idx }))
    ).filter(item => item.m.assignment === task.id);

    return (
      <div key={task.id} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("type", "task"); e.dataTransfer.setData("taskId", task.id); }} onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          const type = e.dataTransfer.getData("type");
          if (type === "personnel") {
            const d = JSON.parse(e.dataTransfer.getData("data"));
            const nextUnits = units.map((u:any) => u.id === d.unitId ? {...u, members: u.members.map((m:any, i:number) => i === d.idx ? {...m, assignment: task.id} : m)} : u);
            syncState({ units: nextUnits });
          } else if (type === "unit") {
            const uId = e.dataTransfer.getData("unitId");
            const nextUnits = units.map((u:any) => u.id === uId ? {...u, members: u.members.map((m:any) => ({...m, assignment: task.id}))} : u);
            syncState({ units: nextUnits });
          }
        }}
        style={{ background: '#020617', borderRadius: '8px', padding: '10px', marginBottom: '10px', border: '1px solid #1e293b', borderLeft: '4px solid #38bdf8', minHeight: '60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '4px', marginBottom: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8' }}>{task.name.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={(e) => { e.stopPropagation(); 
               setAllTasks(prev => {
                const idx = prev.findIndex(t => t.id === task.id);
                if (idx <= 0) return prev;
                const next = [...prev];
                [next[idx], next[idx-1]] = [next[idx-1], next[idx]];
                return next;
               });
            }} style={{ background: '#1e293b', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '10px' }}>▲</button>
            <button onClick={(e) => { e.stopPropagation(); 
               setAllTasks(prev => {
                const idx = prev.findIndex(t => t.id === task.id);
                if (idx === -1 || idx === prev.length - 1) return prev;
                const next = [...prev];
                [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
                return next;
               });
            }} style={{ background: '#1e293b', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '10px' }}>▼</button>
          </div>
        </div>
        {assignedPersonnel.map(item => renderPersonnelTag(item.u, item.m, item.idx, 'tactical'))}
      </div>
    );
  };

  const renderBucket = (bucket: any, sectionKey: string) => {
    const bucketPersonnel = (units || []).flatMap((u: FireUnit) => 
      (u.members || []).map((m, idx) => ({ u, m, idx }))
    ).filter(item => item.m.assignment === bucket.id);

    const bg = sectionKey === 'divisions' ? '#334155' : sectionKey === 'branches' ? '#1e293b' : '#0f172a';

    return (
      <div key={bucket.id} onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          const dT = e.dataTransfer.getData("type");
          if (dT === 'unit') {
            const uId = e.dataTransfer.getData("unitId");
            const nextUnits = units.map((u:any) => u.id === uId ? {...u, members: u.members.map((m:any) => ({...m, assignment: bucket.id}))} : u);
            syncState({ units: nextUnits });
          } else if (dT === 'personnel') {
            const d = JSON.parse(e.dataTransfer.getData("data"));
            const nextUnits = units.map((u:any) => u.id === d.unitId ? {...u, members: u.members.map((m:any, i:number) => i === d.idx ? {...m, assignment: bucket.id} : m)} : u);
            syncState({ units: nextUnits });
          } else if (dT === 'task' && sectionKey === 'divisions') {
            setTaskLocations(p => ({...p, [e.dataTransfer.getData("taskId")]: bucket.id}));
          }
        }}
        style={{ background: bg, padding: '12px', borderRadius: '8px', border: '1px solid #475569', marginTop: '12px', minHeight: '80px', position: 'relative' }}>
        
        <div style={{ position: 'absolute', right: '8px', top: '8px', display: 'flex', gap: '5px' }}>
            {sectionKey === 'divisions' && <button onClick={() => spawnNextDivision(bucket.name)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>}
            <button onClick={() => removeBucket(bucket.id, sectionKey)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ color: '#f1f5f9', fontSize: '11px', fontWeight: 900, marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{bucket.name.toUpperCase()}</div>
        
        {bucketPersonnel.length > 0 && (
          <div style={{ marginBottom: '10px', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 900 }}>SUPERVISOR / COMMAND</div>
            {bucketPersonnel.map(p => renderPersonnelTag(p.u, p.m, p.idx, 'tactical'))}
          </div>
        )}
        {allTasks.filter(t => taskLocations[t.id] === bucket.id).map(renderTaskCard)}
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 1fr', height: '100vh', background: '#060b13', overflow: 'hidden' }}>
      <div style={{ background: '#0f172a', borderRight: '1px solid #1e293b', overflowY: 'auto', padding: '15px' }}>
        <h3 style={{ color: '#38bdf8', borderBottom: '2px solid #38bdf8', paddingBottom: '10px', fontSize: '14px', fontWeight: 900 }}>STAFFING</h3>
        {[...(units || [])].sort((a,b) => {
            const aF = (a.members || []).every((m:any) => m.assignment !== "Unassigned" && m.assignment !== "STAGING");
            const bF = (b.members || []).every((m:any) => m.assignment !== "Unassigned" && m.assignment !== "STAGING");
            return (aF ? 1 : 0) - (bF ? 1 : 0);
        }).map(u => (
          <div key={u.id} draggable onDragStart={(e) => { e.dataTransfer.setData("type", "unit"); e.dataTransfer.setData("unitId", u.id); }}
            style={{ marginBottom: '15px', background: '#1e293b', borderRadius: '8px', borderLeft: `8px solid ${getUnitColor(u.type)}`, padding: '10px', cursor: 'grab', opacity: (u.members || []).every((m:any) => m.assignment !== "Unassigned") ? 0.4 : 1 }}>
            <div style={{ fontWeight: 900, color: '#f8fafc', fontSize: '12px' }}>{u.displayId}</div>
            {(u.members || []).map((m: any, idx: number) => renderPersonnelTag(u, m, idx, 'staffing'))}
          </div>
        ))}
      </div>

      <div style={{ borderRight: '1px solid #1e293b', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <section>{renderHeader("COMMAND STAFF", "#ef4444", "command")}{activeCommand.map(c => renderBucket(c, "command"))}</section>
        <section>{renderHeader("GENERAL STAFF", "#f97316", "general")}{activeGeneral.map(g => renderBucket(g, "general"))}</section>
        <section>{renderHeader("BRANCHES", "#a855f7", "branches")}{activeBranches.map(b => renderBucket(b, "branches"))}</section>
        <section>{renderHeader("DIVISIONS", "#10b981", "divisions")}{sortDivisions(activeDivisions).map(d => renderBucket(d, "divisions"))}</section>
      </div>

      <div style={{ padding: '15px', overflowY: 'auto' }}>
        <h3 style={{ color: '#facc15', borderBottom: '2px solid #facc15', paddingBottom: '10px', fontSize: '14px', fontWeight: 900 }}>AVAILABLE TASKS</h3>
        <div onDragOver={e => e.preventDefault()} onDrop={e => {
            const tId = e.dataTransfer.getData("taskId");
            if (tId) setTaskLocations(p => { const n={...p}; delete n[tId]; return n; });
        }} style={{ minHeight: '100%' }}>
          {allTasks.filter(t => !taskLocations[t.id]).map(renderTaskCard)}
        </div>
      </div>
    </div>
  );

  function renderHeader(title: string, color: string, key: string) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid ${color}`, marginBottom: '10px' }}>
        <h3 style={{ color, fontSize: '13px', fontWeight: 900 }}>{title}</h3>
        <select onChange={(e) => {
          const val = e.target.value; if(!val) return;
          const name = val === "CUSTOM" ? prompt("Name:") : val; if(!name) return;
          const nB = { id: `id-${Date.now()}`, name };
          if(key === 'command') setActiveCommand(p => [...p, nB]);
          else if(key === 'general') setActiveGeneral(p => [...p, nB]);
          else if(key === 'branches') setActiveBranches(p => [...p, nB]);
          else if(key === 'divisions') setActiveDivisions(p => sortDivisions([...p, nB]));
          e.target.value = "";
        }} style={{ background: 'transparent', color, border: 'none', fontWeight: 'bold' }} value="">
          <option value="">+</option>
          <option value="CUSTOM">Blank</option>
          {(menuOptions as any)[key]?.map((opt:string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }
}