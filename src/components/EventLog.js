import { useState, useEffect } from 'react';

const EventLog = ({ tracker }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tracker) return;
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Query all BatchRegistered events
      const regFilter = tracker.filters.BatchRegistered();
      const regEvents = await tracker.queryFilter(regFilter, 0, 'latest');

      // Query all BatchTransferred events
      const txFilter = tracker.filters.BatchTransferred();
      const txEvents = await tracker.queryFilter(txFilter, 0, 'latest');

      // Query all BatchRecalled events
      const recallFilter = tracker.filters.BatchRecalled();
      const recallEvents = await tracker.queryFilter(recallFilter, 0, 'latest');

      const allEvents = [
        ...regEvents.map(e => ({
          type: 'Registered',
          batchID: e.args.batchID,
          from: e.args.manufacturer,
          to: null,
          blockNumber: e.blockNumber,
          txHash: e.transactionHash
        })),
        ...txEvents.map(e => ({
          type: 'Transferred',
          batchID: e.args.batchID,
          from: e.args.from,
          to: e.args.to,
          blockNumber: e.blockNumber,
          txHash: e.transactionHash
        })),
        ...recallEvents.map(e => ({
          type: 'Recalled',
          batchID: e.args.batchID,
          from: e.args.manufacturer,
          to: null,
          blockNumber: e.blockNumber,
          txHash: e.transactionHash
        }))
      ];

      // Sort by block number descending (most recent first)
      allEvents.sort((a, b) => b.blockNumber - a.blockNumber);
      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const truncate = (hash) => hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : '';
  const truncateAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(38)}` : '—';

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__header-icon" aria-hidden="true">☰</span>
        <h2>On-Chain Event Log</h2>
        <span className="badge badge--pending" style={{marginLeft: 'auto'}}>{events.length} Events</span>
      </div>
      <div className="panel__body">
        <p className="panel__description">
          Immutable audit trail derived from contract events. All entries are verifiable on-chain.
        </p>

        {loading ? (
          <p className="loading">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="loading">No events recorded yet.</p>
        ) : (
          <div className="events-table-wrapper">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Type</th>
                  <th>Batch ID</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={i} className={ev.type === 'Recalled' ? 'events-table__row--recalled' : ''}>
                    <td>{ev.blockNumber}</td>
                    <td>
                      <span className={`event-badge event-badge--${ev.type.toLowerCase()}`}>
                        {ev.type}
                      </span>
                    </td>
                    <td className="mono">{truncate(ev.batchID)}</td>
                    <td className="mono">{truncateAddr(ev.from)}</td>
                    <td className="mono">{ev.to ? truncateAddr(ev.to) : '—'}</td>
                    <td className="mono">{truncate(ev.txHash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button className="btn btn--ghost btn--small" onClick={loadEvents} style={{ marginTop: '10px' }}>
          Refresh Events
        </button>
      </div>
    </div>
  );
};

export default EventLog;
