import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useMyGroups } from '../hooks/useMyGroups';
import './ThingsPanel.css';

function RequestsPanel({ user, requests, loading, error, onSelectRequest }) {
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all');
  const [requestGroupIds, setRequestGroupIds] = useState({});

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
    return (requests ?? []).filter((request) => {
      const isMyRequest = user?.id && request.user_id === user.id;
      if (!showMyRequests && isMyRequest) return false;
      if (groupFilter === 'all') return true;
      return (requestGroupIds[request.id] ?? []).includes(groupFilter);
    });
  }, [requests, showMyRequests, groupFilter, requestGroupIds, user?.id]);

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
        <div className="things-panel-filters" role="group" aria-label="Filter requests">
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
