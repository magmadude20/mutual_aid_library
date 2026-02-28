import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useMyGroups } from '../hooks/useMyGroups';
import './ThingsPanel.css';

function RequestsPanel({ user, requests, loading, error, onSelectRequest }) {
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all');
  const [requestGroupIds, setRequestGroupIds] = useState({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const { groups: myGroups } = useMyGroups(user?.id);

  useEffect(() => {
    if (!requests?.length) {
      setRequestGroupIds({});
      return;
    }
    const requestIds = requests.map((r) => r.id);
    let isMounted = true;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('things_to_groups')
          .select('thing_id, group_id')
          .in('thing_id', requestIds);
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        const map = {};
        (data ?? []).forEach((row) => {
          if (!map[row.thing_id]) map[row.thing_id] = [];
          map[row.thing_id].push(row.group_id);
        });
        setRequestGroupIds(map);
      } catch {
        if (isMounted) setRequestGroupIds({});
      }
    })();
    return () => { isMounted = false; };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const list = (requests ?? []).filter((request) => {
      const isMyRequest = user?.id && request.user_id === user.id;
      if (!showMyRequests && isMyRequest) return false;
      if (groupFilter === 'all') return true;
      return (requestGroupIds[request.id] ?? []).includes(groupFilter);
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
  }, [requests, showMyRequests, groupFilter, requestGroupIds, user?.id, sortBy]);

  return (
    <div
      id="requests-panel"
      role="tabpanel"
      aria-labelledby="requests-tab"
      className="tab-panel"
    >
      {loading && <p className="status">Loading requests…</p>}
      {error && (
        <p className="status error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (requests?.length ?? 0) > 0 && (
        <div
          className="things-panel-filters"
          role="group"
          aria-label={filtersExpanded ? 'Filter requests' : 'Sort and filter'}
        >
          <button
            type="button"
            className="things-panel-filters-toggle"
            onClick={() => setFiltersExpanded((v) => !v)}
            aria-expanded={filtersExpanded}
            aria-controls="requests-panel-filters-content"
          >
            <span className="things-panel-filters-toggle-label">Sort and filter</span>
            <span className="things-panel-filters-toggle-icon" aria-hidden="true">
              {filtersExpanded ? '▼' : '▶'}
            </span>
          </button>
          <div
            id="requests-panel-filters-content"
            className="things-panel-filters-content"
            hidden={!filtersExpanded}
          >
            <div className="things-panel-filter-row">
              <label className="things-panel-filter-checkbox">
                <input
                  type="checkbox"
                  checked={showMyRequests}
                  onChange={(e) => setShowMyRequests(e.target.checked)}
                  aria-label="Show my requests"
                />
                <span>Show my requests</span>
              </label>
            </div>
            <div className="things-panel-filter-row">
              <label htmlFor="requests-panel-group-filter" className="things-panel-filter-label">
                Requests shared in group
              </label>
              <select
                id="requests-panel-group-filter"
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
              <label htmlFor="requests-panel-sort" className="things-panel-filter-label">
                Sort by
              </label>
              <select
                id="requests-panel-sort"
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

      {!loading && !error && (requests?.length ?? 0) === 0 && (
        <p className="status">
          No requests yet. Join a group to see requests, or add your own from My profile.
        </p>
      )}
      {!loading && !error && (requests?.length ?? 0) > 0 && (
        <ul className="things-list" aria-label="Requests">
          {filteredRequests.map((request) => (
            <li key={request.id}>
              <button
                type="button"
                className="thing-card thing-card-clickable"
                onClick={() => onSelectRequest(request)}
              >
                <div className="thing-name">{request.name}</div>
                {request.description && (
                  <div className="thing-description">{request.description}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && (requests?.length ?? 0) > 0 && filteredRequests.length === 0 && (
        <p className="status">No requests match the current filters.</p>
      )}
    </div>
  );
}

export default RequestsPanel;
