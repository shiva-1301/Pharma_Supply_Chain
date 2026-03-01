import { useState } from 'react';
import { ethers } from 'ethers';

const VerifyBatch = ({ tracker }) => {
  const [lotNumber, setLotNumber] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setStatus('');
    setResult(null);
    setHistory([]);
    setLoading(true);

    try {
      const batchID = ethers.utils.id(lotNumber);
      const [manufacturer, currentOwner, metadataHash, recalled] = await tracker.verifyBatch(batchID);
      const custodyHistory = await tracker.getCustodyHistory(batchID);

      setResult({
        batchID,
        manufacturer,
        currentOwner,
        metadataHash,
        recalled
      });
      setHistory(custodyHistory);
    } catch (err) {
      console.error(err);
      if (err.message.includes('batch does not exist')) {
        setStatus('No batch found with this lot number. It may be unregistered or counterfeit.');
      } else {
        setStatus('Error: ' + (err.reason || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = (addr, mfr) => {
    if (addr.toLowerCase() === mfr.toLowerCase()) return 'Manufacturer';
    return '';
  };

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__header-icon" aria-hidden="true">⊘</span>
        <h2>Verify Batch Authenticity</h2>
        <span className="badge badge--verified" style={{marginLeft: 'auto'}}>Public Read-Only</span>
      </div>
      <div className="panel__body">
        <p className="panel__description">
          Enter a lot number to verify its on-chain registration, recall status, and full custody chain.
          No wallet connection required.
        </p>
        <form onSubmit={handleVerify} className="form">
          <div className="form__row">
            <div className="form__group">
              <label>Lot Number <span className="required">*</span></label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. BATCH-AMX-2026-001"
                required
              />
            </div>
            <div className="form__group" style={{justifyContent: 'flex-end'}}>
              <button type="submit" className="btn btn--secondary" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Batch'}
              </button>
            </div>
          </div>
        </form>

        {status && <p className="status status--error">{status}</p>}

        {result && (
          <div className="verify-result">
            <hr className="section-rule" />

            <div className="verify-result__status-row">
              <span className={`recall-badge ${result.recalled ? 'recall-badge--recalled' : 'recall-badge--safe'}`}>
                {result.recalled ? '⚠ RECALLED' : '✓ ACTIVE'}
              </span>
              {!result.recalled && (
                <span className="badge badge--verified">Verified On-Chain</span>
              )}
            </div>

            <div className="detail-grid">
              <div className="detail-grid__item">
                <span className="detail-grid__label">Batch ID</span>
                <span className="detail-grid__value">{result.batchID.slice(0, 18)}...{result.batchID.slice(58)}</span>
              </div>
              <div className="detail-grid__item">
                <span className="detail-grid__label">Recall Status</span>
                <span className="detail-grid__value detail-grid__value--text">
                  {result.recalled ? (
                    <span className="badge badge--recalled">Recalled</span>
                  ) : (
                    <span className="badge badge--active">Active</span>
                  )}
                </span>
              </div>
              <div className="detail-grid__item">
                <span className="detail-grid__label">Manufacturer</span>
                <span className="detail-grid__value">{result.manufacturer}</span>
              </div>
              <div className="detail-grid__item">
                <span className="detail-grid__label">Current Owner</span>
                <span className="detail-grid__value">{result.currentOwner}</span>
              </div>
              <div className="detail-grid__item detail-grid__item--full">
                <span className="detail-grid__label">Metadata Hash (keccak-256)</span>
                <span className="detail-grid__value">{result.metadataHash}</span>
              </div>
            </div>

            <h3 className="custody-section__heading">
              Custody Chain &middot; {history.length} {history.length === 1 ? 'entry' : 'entries'}
            </h3>
            <ol className="custody-timeline">
              {history.map((addr, i) => (
                <li key={i} className="custody-timeline__entry">
                  <span className={`custody-timeline__marker${i === 0 ? ' custody-timeline__marker--first' : ''}`}>
                    {i + 1}
                  </span>
                  <div className="custody-timeline__content">
                    <span className="custody-timeline__label">
                      {i === 0 ? 'Registered' : `Transfer #${i}`}
                    </span>
                    <span className="custody-timeline__addr">{addr}</span>
                    {roleLabel(addr, result.manufacturer) && (
                      <span className="custody-timeline__role">{roleLabel(addr, result.manufacturer)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyBatch;
