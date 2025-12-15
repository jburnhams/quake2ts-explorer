
import React, { useState, useEffect, useMemo } from 'react';
import { PakService } from '../services/pakService';
import { EntityService, EntityRecord } from '../services/entityService';
import { EntityInspector } from './EntityInspector';
import './EntityDatabase.css';

interface EntityDatabaseProps {
  pakService: PakService;
}

type SortField = 'classname' | 'targetname' | 'mapName' | 'index';
type SortOrder = 'asc' | 'desc';

export const EntityDatabase: React.FC<EntityDatabaseProps> = ({ pakService }) => {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('classname');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedEntity, setSelectedEntity] = useState<EntityRecord | null>(null);

  const entityService = useMemo(() => new EntityService(pakService.getVfs()), [pakService]);

  // Initial load
  useEffect(() => {
    const loadEntities = async () => {
      setLoading(true);
      try {
        const results = await entityService.scanAllMaps((current, total, map) => {
          setLoadingProgress(`Scanning ${map} (${current}/${total})...`);
        });
        setEntities(results);
      } catch (err) {
        console.error('Failed to load entities:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEntities();
  }, [entityService]);

  // Derived data
  const uniqueMaps = useMemo(() => {
    const maps = new Set(entities.map(e => e.mapName));
    return Array.from(maps).sort();
  }, [entities]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(entities.map(e => e.classname));
    return Array.from(classes).sort();
  }, [entities]);

  const filteredEntities = useMemo(() => {
    return entities.filter(ent => {
      // Filter by Map
      if (selectedMap !== 'all' && ent.mapName !== selectedMap) return false;

      // Filter by Classname (Dropdown)
      if (selectedClass !== 'all' && ent.classname !== selectedClass) return false;

      // Filter by Search Query (General search)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const inClass = ent.classname.toLowerCase().includes(query);
        const inTarget = ent.targetname && ent.targetname.toLowerCase().includes(query);
        const inMap = ent.mapName.toLowerCase().includes(query);
        // Also search properties keys/values
        const inProps = Object.entries(ent.properties).some(([k, v]) =>
          k.toLowerCase().includes(query) || v.toLowerCase().includes(query)
        );

        return inClass || inTarget || inMap || inProps;
      }

      return true;
    });
  }, [entities, selectedMap, selectedClass, searchQuery]);

  const sortedEntities = useMemo(() => {
    return [...filteredEntities].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Handle undefined/nulls
      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEntities, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortClass = (field: SortField) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? 'sort-asc' : 'sort-desc';
  };

  return (
    <div className="entity-database-container">
      {loading && (
        <div className="entity-loading-overlay">
          <div style={{color: 'white', marginBottom: 10}}>Loading Entities...</div>
          <div style={{color: '#ccc'}}>{loadingProgress}</div>
        </div>
      )}

      <div className="entity-database-toolbar">
        <input
          type="text"
          className="entity-database-search"
          placeholder="Search entities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="entity-database-filter"
          value={selectedMap}
          onChange={(e) => setSelectedMap(e.target.value)}
        >
          <option value="all">All Maps</option>
          {uniqueMaps.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          className="entity-database-filter"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="all">All Classes</option>
          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="entity-database-status">
           {sortedEntities.length} entities
        </div>
        <button className="inspector-btn" onClick={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sortedEntities, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "entities.json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }}>Export JSON</button>
      </div>

      <div className="entity-database-content">
        <div className="entity-database-list">
          <div className="entity-table-header">
            <div
              className={`entity-table-header-cell cell-classname ${getSortClass('classname')}`}
              onClick={() => handleSort('classname')}
            >
              Classname
            </div>
            <div
              className={`entity-table-header-cell cell-targetname ${getSortClass('targetname')}`}
              onClick={() => handleSort('targetname')}
            >
              Targetname
            </div>
            <div className="entity-table-header-cell cell-origin">
              Origin
            </div>
            <div
              className={`entity-table-header-cell cell-map ${getSortClass('mapName')}`}
              onClick={() => handleSort('mapName')}
            >
              Map
            </div>
          </div>

          <div className="entity-table-body">
            {sortedEntities.length === 0 ? (
               <div className="empty-state">No entities found matching criteria</div>
            ) : (
              sortedEntities.map(ent => (
                <div
                  key={ent.id}
                  className={`entity-row ${selectedEntity?.id === ent.id ? 'selected' : ''}`}
                  onClick={() => setSelectedEntity(ent)}
                >
                  <div className="entity-cell cell-classname" title={ent.classname}>{ent.classname}</div>
                  <div className="entity-cell cell-targetname" title={ent.targetname || ''}>{ent.targetname || '-'}</div>
                  <div className="entity-cell cell-origin">
                    {ent.origin
                      ? `${ent.origin.x.toFixed(0)}, ${ent.origin.y.toFixed(0)}, ${ent.origin.z.toFixed(0)}`
                      : '-'}
                  </div>
                  <div className="entity-cell cell-map" title={ent.mapName}>{ent.mapName}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <EntityInspector entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
      </div>
    </div>
  );
};
