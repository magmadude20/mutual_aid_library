import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { useAdminGroups } from '../hooks/useAdminGroups';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAdminItems } from '../hooks/useAdminItems';
import { useAdminRequests } from '../hooks/useAdminRequests';
import NotFoundPage from './NotFoundPage';
import './AdminPage.css';

function AdminPage({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, loading: profileLoading, error: profileError } = useCurrentProfile(user?.id);
  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam === 'users' || tabParam === 'things' || tabParam === 'requests' || tabParam === 'groups'
      ? tabParam
      : 'groups'; // 'groups' | 'users' | 'things' | 'requests'

  const { groups, memberCountByGroupId, thingCountByGroupId, loading: groupsLoading, error: groupsError } =
    useAdminGroups();
  const { users, statsByUserId, loading: usersLoading, error: usersError } = useAdminUsers();
  const { items, groupCountByItemId, loading: itemsLoading, error: itemsError } = useAdminItems();
  const {
    requests,
    groupCountByRequestId,
    loading: requestsLoading,
    error: requestsError,
  } = useAdminRequests();

  if (!user) {
    return <NotFoundPage />;
  }

  if (profileLoading) {
    return <p className="status">Checking admin access…</p>;
  }

  if (profileError || !profile || profile.role !== 'admin') {
    return <NotFoundPage />;
  }

  return (
    <div className="admin-page">
      <h2 className="tab-panel-title">Admin</h2>
      <p className="admin-subtitle">
        Read-only overview of all groups, users, things, and requests. Only admin users can see this page.
      </p>
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'groups'}
          className={`admin-tab ${activeTab === 'groups' ? 'admin-tab-active' : ''}`}
          onClick={() => setSearchParams({ tab: 'groups' })}
        >
          Groups
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          className={`admin-tab ${activeTab === 'users' ? 'admin-tab-active' : ''}`}
          onClick={() => setSearchParams({ tab: 'users' })}
        >
          Users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'things'}
          className={`admin-tab ${activeTab === 'things' ? 'admin-tab-active' : ''}`}
          onClick={() => setSearchParams({ tab: 'things' })}
        >
          Things
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'requests'}
          className={`admin-tab ${activeTab === 'requests' ? 'admin-tab-active' : ''}`}
          onClick={() => setSearchParams({ tab: 'requests' })}
        >
          Requests
        </button>
      </div>

      {activeTab === 'groups' && (
        <section className="admin-section" aria-label="All groups">
          {groupsLoading && <p className="status">Loading groups…</p>}
          {groupsError && (
            <p className="status error" role="alert">
              {groupsError}
            </p>
          )}
          {!groupsLoading && !groupsError && groups.length === 0 && (
            <p className="status">No groups yet.</p>
          )}
          {!groupsLoading && !groupsError && groups.length > 0 && (
            <ul className="admin-list" aria-label="Groups">
              {groups.map((g) => (
                <li key={g.id}>
                  <div
                    className="admin-card admin-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/groups/${g.id}`, { state: { fromAdmin: true } })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/groups/${g.id}`, { state: { fromAdmin: true } });
                      }
                    }}
                  >
                    <div className="admin-card-main">
                      <div className="admin-card-title-row">
                        <div className="admin-card-title">{g.name}</div>
                        <span
                          className={`admin-badge ${
                            g.is_public ? 'admin-badge-public' : 'admin-badge-private'
                          }`}
                        >
                          {g.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                      {g.description && <div className="admin-card-subtitle">{g.description}</div>}
                    </div>
                    <div className="admin-card-meta">
                      <span>
                        {memberCountByGroupId[g.id] ?? 0} member
                        {(memberCountByGroupId[g.id] ?? 0) === 1 ? '' : 's'}
                      </span>
                      <span>
                        {thingCountByGroupId[g.id] ?? 0} thing
                        {(thingCountByGroupId[g.id] ?? 0) === 1 ? '' : 's'} shared
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'users' && (
        <section className="admin-section" aria-label="All users">
          {usersLoading && <p className="status">Loading users…</p>}
          {usersError && (
            <p className="status error" role="alert">
              {usersError}
            </p>
          )}
          {!usersLoading && !usersError && users.length === 0 && (
            <p className="status">No users yet.</p>
          )}
          {!usersLoading && !usersError && users.length > 0 && (
            <ul className="admin-list" aria-label="Users">
              {users.map((u) => {
                const stats = statsByUserId[u.id] ?? { groups: 0, adminGroups: 0, items: 0 };
                return (
                  <li key={u.id}>
                    <div
                      className="admin-card admin-card-clickable"
                      role="button"
                      tabIndex={0}
                    onClick={() => navigate(`/user/${u.id}`, { state: { fromAdmin: true } })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/user/${u.id}`, { state: { fromAdmin: true } });
                        }
                      }}
                    >
                      <div className="admin-card-main">
                        <div className="admin-card-title">{u.full_name || '(no name)'}</div>
                        <div className="admin-card-subtitle">Role: {u.role || 'user'}</div>
                      </div>
                      <div className="admin-card-meta">
                        <span>
                          {stats.groups} group{stats.groups === 1 ? '' : 's'}
                        </span>
                        <span>
                          {stats.adminGroups} admin group{stats.adminGroups === 1 ? '' : 's'}
                        </span>
                        <span>
                          {stats.items} item{stats.items === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'things' && (
        <section className="admin-section" aria-label="All things">
          {itemsLoading && <p className="status">Loading things…</p>}
          {itemsError && (
            <p className="status error" role="alert">
              {itemsError}
            </p>
          )}
          {!itemsLoading && !itemsError && items.length === 0 && (
            <p className="status">No things yet.</p>
          )}
          {!itemsLoading && !itemsError && items.length > 0 && (
            <ul className="admin-list" aria-label="Things">
              {items.map((item) => (
                <li key={item.id}>
                  <div
                    className="admin-card admin-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/thing/${item.id}`, { state: { fromAdmin: true } })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/thing/${item.id}`, { state: { fromAdmin: true } });
                      }
                    }}
                  >
                    <div className="admin-card-main">
                      <div className="admin-card-title">{item.name}</div>
                      {item.description && <div className="admin-card-subtitle">{item.description}</div>}
                    </div>
                    <div className="admin-card-meta">
                      <span>
                        Shared with {groupCountByItemId[item.id] ?? 0} group
                        {(groupCountByItemId[item.id] ?? 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'requests' && (
        <section className="admin-section" aria-label="All requests">
          {requestsLoading && <p className="status">Loading requests…</p>}
          {requestsError && (
            <p className="status error" role="alert">
              {requestsError}
            </p>
          )}
          {!requestsLoading && !requestsError && requests.length === 0 && (
            <p className="status">No requests yet.</p>
          )}
          {!requestsLoading && !requestsError && requests.length > 0 && (
            <ul className="admin-list" aria-label="Requests">
              {requests.map((request) => (
                <li key={request.id}>
                  <div
                    className="admin-card admin-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/thing/${request.id}`, { state: { fromAdmin: true } })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/thing/${request.id}`, { state: { fromAdmin: true } });
                      }
                    }}
                  >
                    <div className="admin-card-main">
                      <div className="admin-card-title">{request.name}</div>
                      {request.description && <div className="admin-card-subtitle">{request.description}</div>}
                    </div>
                    <div className="admin-card-meta">
                      <span>
                        Shared with {groupCountByRequestId[request.id] ?? 0} group
                        {(groupCountByRequestId[request.id] ?? 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default AdminPage;

