import { useState } from 'react';
import MyThingsPanel from './MyThingsPanel';
import MyRequestsPanel from './MyRequestsPanel';
import './MyItemsPanel.css';

function MyItemsPanel({
  user,
  myThings,
  setMyThings,
  myThingsLoading,
  myThingsError,
  myRequests,
  setMyRequests,
  myRequestsLoading,
  myRequestsError,
  showAddForm,
  onShowAddForm,
  addForm,
  onAddSubmit,
  showAddRequestForm,
  onShowAddRequestForm,
  addRequestForm,
  onAddRequestSubmit,
  onSelectThing,
  onSelectRequest,
  canAddItems = true,
  activeTab: controlledTab,
  onTabChange,
}) {
  const [internalTab, setInternalTab] = useState('things');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  return (
    <div className="my-items-panel" aria-label="My things and requests">
      <div className="my-items-panel-tabs" role="tablist" aria-label="Things or requests">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'things'}
          aria-controls="my-items-panel-things"
          id="my-items-tab-things"
          className={`my-items-panel-tab ${activeTab === 'things' ? 'my-items-panel-tab-active' : ''}`}
          onClick={() => setActiveTab('things')}
        >
          Things
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'requests'}
          aria-controls="my-items-panel-requests"
          id="my-items-tab-requests"
          className={`my-items-panel-tab ${activeTab === 'requests' ? 'my-items-panel-tab-active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests
        </button>
      </div>
      <div
        id="my-items-panel-things"
        role="tabpanel"
        aria-labelledby="my-items-tab-things"
        hidden={activeTab !== 'things'}
        className="my-items-panel-content"
      >
        {activeTab === 'things' && (
          <MyThingsPanel
            user={user}
            myThings={myThings}
            setMyThings={setMyThings}
            myThingsLoading={myThingsLoading}
            myThingsError={myThingsError}
            showAddForm={showAddForm}
            onShowAddForm={onShowAddForm}
            addForm={addForm}
            onAddSubmit={onAddSubmit}
            onSelectThing={onSelectThing}
            canAddThings={canAddItems}
            showTitle={false}
          />
        )}
      </div>
      <div
        id="my-items-panel-requests"
        role="tabpanel"
        aria-labelledby="my-items-tab-requests"
        hidden={activeTab !== 'requests'}
        className="my-items-panel-content"
      >
        {activeTab === 'requests' && (
          <MyRequestsPanel
            user={user}
            myRequests={myRequests}
            setMyRequests={setMyRequests}
            myRequestsLoading={myRequestsLoading}
            myRequestsError={myRequestsError}
            showAddForm={showAddRequestForm}
            onShowAddForm={onShowAddRequestForm}
            addForm={addRequestForm}
            onAddSubmit={onAddRequestSubmit}
            onSelectRequest={onSelectRequest}
            canAddRequests={canAddItems}
            showTitle={false}
          />
        )}
      </div>
    </div>
  );
}

export default MyItemsPanel;
