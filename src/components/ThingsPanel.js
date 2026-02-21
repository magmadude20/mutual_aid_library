import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import Map from './Map';
import { useUserLocationMarkers } from '../hooks/useUserLocationMarkers';
import { useMyGroups } from '../hooks/useMyGroups';
import './ThingsPanel.css';

function ThingsPanel({ user, things, loading, error, onSelectThing }) {
  const [showMyThings, setShowMyThings] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all');
  const [thingGroupIds, setThingGroupIds] = useState({});

  const { groups: myGroups } = useMyGroups(user?.id);

  useEffect(() => {
    if (!things?.length) {
      setThingGroupIds({});
      return;
    }
    const thingIds = things.map((t) => t.id);
    let isMounted = true;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('things_to_groups')
          .select('thing_id, group_id')
          .in('thing_id', thingIds);
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        const map = {};
        (data ?? []).forEach((row) => {
          if (!map[row.thing_id]) map[row.thing_id] = [];
          map[row.thing_id].push(row.group_id);
        });
        setThingGroupIds(map);
      } catch {
        if (isMounted) setThingGroupIds({});
      }
    })();
    return () => { isMounted = false; };
  }, [things]);

  const filteredThings = useMemo(() => {
    return (things ?? []).filter((thing) => {
      const isMyThing = user?.id && thing.user_id === user.id;
      if (!showMyThings && isMyThing) return false;
      if (groupFilter === 'all') return true;
      return (thingGroupIds[thing.id] ?? []).includes(groupFilter);
    });
  }, [things, showMyThings, groupFilter, thingGroupIds, user?.id]);

  const { markers } = useUserLocationMarkers(filteredThings);

  return (
    <div
      id="things-panel"
      role="tabpanel"
      aria-labelledby="things-tab"
      className="tab-panel"
    >
      {loading && <p className="status">Loading things…</p>}
      {error && (
        <p className="status error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && things.length > 0 && (
        <div className="things-panel-filters" role="group" aria-label="Filter library">
          <div className="things-panel-filter-row">
            <label className="things-panel-filter-checkbox">
              <input
                type="checkbox"
                checked={showMyThings}
                onChange={(e) => setShowMyThings(e.target.checked)}
                aria-label="Show my things"
              />
              <span>Show my things</span>
            </label>
          </div>
          <div className="things-panel-filter-row">
            <label htmlFor="things-panel-group-filter" className="things-panel-filter-label">
              Things shared in group
            </label>
            <select
              id="things-panel-group-filter"
              className="things-panel-group-select"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              aria-label="Filter by group"
            >
              <option value="all">All</option>
              {myGroups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!loading && !error && things.length === 0 && (
        <p className="status">
          No things returned. If you have rows in the table, check{' '}
          <strong>Row Level Security (RLS)</strong> in Supabase for authenticated users.
        </p>
      )}
      {!loading && !error && things.length > 0 && (
        <ul className="things-list" aria-label="Inventory things">
          {filteredThings.map((thing) => (
            <li key={thing.id}>
              <button
                type="button"
                className="thing-card thing-card-clickable"
                onClick={() => onSelectThing(thing)}
              >
                <div className="thing-name">{thing.name}</div>
                {thing.description && (
                  <div className="thing-description">{thing.description}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && things.length > 0 && filteredThings.length === 0 && (
        <p className="status">No things match the current filters.</p>
      )}

      <section className="map-section" aria-label="Map of things">
        <h2 className="map-section-title">Map</h2>
        <p className="map-section-hint">People who share things appear at their profile location.</p>
        <div className="map-wrapper">
          <Map markers={markers} />
        </div>
      </section>
    </div>
  );
}

export default ThingsPanel;
