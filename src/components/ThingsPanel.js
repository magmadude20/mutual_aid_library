import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useMyGroups } from '../hooks/useMyGroups';
import './ThingsPanel.css';

function ThingsPanel({ user, things, loading, error, onSelectThing }) {
  const [showMyThings, setShowMyThings] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all');
  const [thingGroupIds, setThingGroupIds] = useState({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

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
    const list = (things ?? []).filter((thing) => {
      const isMyThing = user?.id && thing.user_id === user.id;
      if (!showMyThings && isMyThing) return false;
      if (groupFilter === 'all') return true;
      return (thingGroupIds[thing.id] ?? []).includes(groupFilter);
    });
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'newest') {
        const aAt = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bAt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bAt - aAt;
      }
      if (sortBy === 'oldest') {
        const aAt = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bAt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aAt - bAt;
      }
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      if (sortBy === 'a-z') return aName.localeCompare(bName);
      return bName.localeCompare(aName); // z-a
    });
    return sorted;
  }, [things, showMyThings, groupFilter, thingGroupIds, user?.id, sortBy]);

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
        <div
          className="things-panel-filters"
          role="group"
          aria-label={filtersExpanded ? 'Filter things' : 'Sort and filter'}
        >
          <button
            type="button"
            className="things-panel-filters-toggle"
            onClick={() => setFiltersExpanded((v) => !v)}
            aria-expanded={filtersExpanded}
            aria-controls="things-panel-filters-content"
          >
            <span className="things-panel-filters-toggle-label">Sort and filter</span>
            <span className="things-panel-filters-toggle-icon" aria-hidden="true">
              {filtersExpanded ? '▼' : '▶'}
            </span>
          </button>
          <div
            id="things-panel-filters-content"
            className="things-panel-filters-content"
            hidden={!filtersExpanded}
          >
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
            <div className="things-panel-filter-row">
              <label htmlFor="things-panel-sort" className="things-panel-filter-label">
                Sort by
              </label>
              <select
                id="things-panel-sort"
                className="things-panel-group-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort order"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="a-z">Name A–Z</option>
                <option value="z-a">Name Z–A</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && things.length === 0 && (
        <p className="status">
          No things yet. Join a group to see things, or add your own from My profile.
        </p>
      )}
      {!loading && !error && things.length > 0 && (
        <ul className="things-list" aria-label="Things">
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
    </div>
  );
}

export default ThingsPanel;
