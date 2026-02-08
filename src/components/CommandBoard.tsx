import React, { useState } from 'react';
import { FireUnit, getUnitColor } from '../App';

const normalize = (str: string) => str?.toLowerCase().replace(/[-\s]/g, "") || "";

export default function CommandBoard({ incident, units, syncState }: any) {
  // --- HIERARCHY STATE ---
  const [taskLocations, setTaskLocations] = useState<Record<string, string>>({}); 
  const [divLocations, setDivLocations] = useState<Record<string, string>>({});   
  const [branchLocations, setBranchLocations] = useState<Record<string, string>>({}); 

  // --- BUCKET STATE ---
  const [activeCommand, setActiveCommand] = useState([{ id: 'ic', name: 'Incident Command' }, { id: 'safety', name: 'Safety Officer' }]);
  const [activeGeneral, setActiveGeneral] = useState([{ id: 'ops-section', name: 'Operations Section' }]);
  const [activeBranches, setActiveBranches] = useState<any[]>([]);
  const [activeDivisions, setActiveDivisions] = useState([{ id: 'div-1', name: 'Division 1' }]);
  
  // --- TASK FACTORY STATE ---
  const [allTasks, setAllTasks] = useState([
    { id: 'fire-attack-1', name: 'Fire Attack 1', base: 'Fire Attack' },
    { id: 'search-rescue-1', name: 'Search & Rescue 1', base: 'Search & Rescue' },
    { id: 'ventilation-1', name: 'Ventilation 1', base: 'Ventilation' },
    { id: 'water-supply-1', name: 'Water Supply 1', base: 'Water Supply' },
  ]);

  const [visible, setVisible] = useState({ command: true, general: true, branches: true, divisions: true });

  // --- TACTICAL LOGIC ---
  const updateAssignment = (unitId: string, memberIdx: number, newAssignment: string) => {
    const nextUnits = units.map((u: FireUnit) => {
      if (u.id === unitId) {
        const nextMembers = [...u.members];
        const dragged = nextMembers[memberIdx];
        nextMembers[memberIdx] = { ...dragged, assignment: newAssignment };

        // Tethering logic
        const draggedRoleNorm = normalize(dragged.role);
        const pair = u.linkedPairs?.find(p => p.some(r => draggedRoleNorm.includes(normalize(r))));
        const isBroken = (u.brokenLinks || []).some(p => p.includes(dragged.role));

        if (pair && !isBroken) {
          const partnerKey = pair.find(r => !draggedRoleNorm.includes(normalize(r)));
          const pIdx = nextMembers.findIndex(m => normalize(m.role).includes(normalize(partnerKey || "")));
          if (pIdx !== -1 && (nextMembers[pIdx].assignment === "Unassigned" || nextMembers[pIdx].assignment === "STAGING")) {
            nextMembers[pIdx].assignment = newAssignment;
          }
        }
        return { ...u, members: nextMembers };
      }
      return u;
    });
    syncState({ units: nextUnits });
  };

  const handleTaskDeployment = (taskId: string, newLocation: string) => {
    setTaskLocations(prev => ({ ...prev, [taskId]: newLocation }));

    if (newLocation !== "") {
      const deployedTask = allTasks.find(t => t.id === taskId);
      if (deployedTask?.base) {
        const count = allTasks.filter(t => t.base === deployedTask.base).length;
        const nextNum = count + 1;
        const newId = `${deployedTask.base.toLowerCase().replace(/\s+/g, '-')}-${nextNum}`;
        
        // Safety check to prevent duplicate IDs which cause white screens
        if (!allTasks.find(t => t.id === newId)) {
          setAllTasks(prev => [...prev, { 
            id: newId, 
            name: `${deployedTask.base} ${nextNum}`, 
            base: deployedTask.base 
          }]);
        }
      }
    }
  };

  const moveTask = (taskId: string, direction: 'up' | 'down') => {
    const index = allTasks.findIndex(t => t.id === taskId);
    if (index === -1) return;
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === allTasks.length - 1)) return;
    
    const newTasks = [...allTasks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newTasks[index], newTasks[swapIndex]] = [newTasks[swapIndex], newTasks[index]];
    setAllTasks(newTasks);
  };

  // --- RENDERING HELPERS ---
  const renderPersonnelTag = (unit: FireUnit, member: any, idx: number, context: 'staffing' | 'tactical') => {
    const unitColor = getUnitColor(unit.type);
    return (
      <div 
        key={`${unit.id}-${idx}`} draggable
        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("type", "personnel"); e.dataTransfer.setData("data", JSON.stringify({ unitId: unit.id, idx })); }}
        style={{ background: '#0f172a', margin: '2px 0', padding: '6px', borderRadius: '4px', borderLeft: `4px solid ${unitColor}`, fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'grab', border: '1px solid #1e293b', color: '#f8fafc' }}
      >
        <span><strong style={{ color: unitColor }}>{unit.displayId}</strong> <span style={{ color: '#94a3b8', fontSize: '10px' }}>{member.role}</span> {member.name}</span>
        {context === 'tactical' && <button onClick={() => updateAssignment(unit.id, idx, "Unassigned")} style={{ background: '#991b1b', border: 'none', color: 'white', borderRadius: '2px', padding: '0 4px', cursor: 'pointer' }}>-</button>}
      </div>
    );
  };

  const renderTaskCard = (task: any) => {
    const assigned = [];
    units?.forEach(u => u.members?.forEach((m, idx) => { if (m.assignment === task.id) assigned.push({ unit: u, member: m, idx }); }));

    return (
      <div 
        key={task.id} draggable
        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("type", "task"); e.dataTransfer.setData("taskId", task.id); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (e.dataTransfer.getData("type") === "personnel") {
            const data = JSON.parse(e.dataTransfer.getData("data"));
            updateAssignment(data.unitId, data.idx, task.id);
          }
        }}
        style={{ background: '#1e293b', borderRadius: '8px', padding: '10px', marginBottom: '8px', border: '1px solid #475569', minHeight: '60px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8' }}>{task.name.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => moveTask(task.id, 'up')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '10px' }}>▲</button>
            <button onClick={() => moveTask(task.id, 'down')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '10px' }}>▼</button>
          </div>
        </div>
        {assigned.map(p => renderPersonnelTag(p.unit, p.member, p.idx, 'tactical'))}
      </div>
    );
  };

  const renderBucket = (bucket: any, type: 'division' | 'branch' | 'section') => {
    const supervisors = [];
    units?.forEach(u => u.members?.forEach((m, idx) => { if (m.assignment === bucket.id) supervisors.push({ unit: u, member: m, idx }); }));
    const isCommand = activeCommand.some(c => c.id === bucket.id);

    return (
      <div 
        key={bucket.id} draggable={type !== 'section'}
        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("type", type); e.dataTransfer.setData("id", bucket.id); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          const dropType = e.dataTransfer.getData("type");
          if (dropType === 'personnel') {
            const data = JSON.parse(e.dataTransfer.getData("data"));
            updateAssignment(data.unitId, data.idx, bucket.id);
          } else if (dropType === 'task' && type === 'division') {
            handleTaskDeployment(e.dataTransfer.getData("taskId"), bucket.id);
          } else if (dropType === 'division' && type === 'branch') {
            setDivLocations(prev => ({ ...prev, [e.dataTransfer.getData("id")]: bucket.id }));
          } else if (dropType === 'branch' && type === 'section') {
            setBranchLocations(prev => ({ ...prev, [e.dataTransfer.getData("id")]: bucket.id }));
          }
        }}
        style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', marginTop: '10px', minHeight: '80px', position: 'relative' }}
      >
        <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 900, marginBottom: '8px', borderBottom: '1px solid #334155' }}>{bucket.name.toUpperCase()}</div>
        
        {supervisors.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            {!isCommand && <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 900 }}>SUPERVISOR / COMMAND</div>}
            {supervisors.map(p => renderPersonnelTag(p.unit, p.member, p.idx, 'tactical'))}
          </div>
        )}

        {type === 'section' && activeBranches.filter(b => branchLocations[b.id] === bucket.id).map(b => renderBucket(b, 'branch'))}
        {type === 'branch' && activeDivisions.filter(d => divLocations[d.id] === bucket.id).map(d => renderBucket(d, 'division'))}
        {type === 'division' && allTasks.filter(t => taskLocations[t.id] === bucket.id).map(t => renderTaskCard(t))}
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 1fr', height: '100%', background: '#060b13', overflow: 'hidden' }}>
      
      {/* COLUMN 1: STAFFING */}
      <div style={{ background: '#0f172a', borderRight: '1px solid #1e293b', overflowY: 'auto', padding: '15px' }}>
        <h3 style={{ color: '#38bdf8', borderBottom: '2px solid #38bdf8', paddingBottom: '10px', fontSize: '14px', fontWeight: 900 }}>STAFFING</h3>
        {units?.map((u: FireUnit) => (
          <div key={u.id} style={{ marginBottom: '15px', background: '#1e293b', borderRadius: '8px', borderLeft: `8px solid ${getUnitColor(u.type)}`, padding: '10px' }}>
            <div style={{ fontWeight: 900 }}>{u.displayId}</div>
            {u.members?.map((m: any, idx: number) => (m.assignment === "Unassigned" || m.assignment === "STAGING") && renderPersonnelTag(u, m, idx, 'staffing'))}
          </div>
        ))}
      </div>

      {/* COLUMN 2: STRUCTURE */}
      <div style={{ borderRight: '1px solid #1e293b', padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <section>{activeCommand.map(c => renderBucket(c, 'section'))}</section>
        <section>{activeGeneral.map(g => renderBucket(g, 'section'))}</section>
        <section>
          <div style={{ color: '#a855f7', fontWeight: 900, borderBottom: '2px solid #a855f7', paddingBottom: '5px' }}>BRANCHES</div>
          {activeBranches.filter(b => !branchLocations[b.id]).map(b => renderBucket(b, 'branch'))}
        </section>
        <section>
          <div style={{ color: '#10b981', fontWeight: 900, borderBottom: '2px solid #10b981', paddingBottom: '5px' }}>DIVISIONS / GROUPS</div>
          {activeDivisions.filter(d => !divLocations[d.id]).map(d => renderBucket(d, 'division'))}
        </section>
      </div>

      {/* COLUMN 3: TASKS */}
      <div style={{ padding: '15px', overflowY: 'auto' }}>
        <h3 style={{ color: '#facc15', borderBottom: '2px solid #facc15', paddingBottom: '10px', fontSize: '14px', fontWeight: 900 }}>AVAILABLE TASKS</h3>
        <div onDragOver={e => e.preventDefault()} onDrop={e => e.dataTransfer.getData("type") === "task" && handleTaskDeployment(e.dataTransfer.getData("taskId"), "")} style={{ minHeight: '100%' }}>
          {allTasks.filter(t => !taskLocations[t.id]).map(renderTaskCard)}
        </div>
      </div>
    </div>
  );
}