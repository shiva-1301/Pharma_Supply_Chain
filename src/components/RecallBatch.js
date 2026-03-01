import { useState } from 'react';
import { ethers } from 'ethers';

const RecallBatch = ({ tracker, account, provider, onSuccess }) => {
  const [lotNumber, setLotNumber] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setLoading(true);

    if (!account) {
      setStatus('Please connect your wallet first.');
      setLoading(false);
      return;
    }

    try {
      const signer = provider.getSigner(account);
      const batchID = ethers.utils.id(lotNumber);

      const tx = await tracker.connect(signer).recallBatch(batchID);
      await tx.wait();

      setStatus(`Batch "${lotNumber}" has been recalled permanently.`);
      setLotNumber('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      if (err.message.includes('caller is not the manufacturer')) {
        setStatus('Error: Only the original manufacturer can recall this batch.');
      } else if (err.message.includes('batch does not exist')) {
        setStatus('Error: No batch found with this lot number.');
      } else if (err.message.includes('batch already recalled')) {
        setStatus('Error: This batch has already been recalled.');
      } else {
        setStatus('Error: ' + (err.reason || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel panel--danger">
      <div className="panel__header">
        <span className="panel__header-icon" aria-hidden="true">⚑</span>
        <h2>Recall Batch</h2>
        <span className="badge badge--recalled" style={{marginLeft: 'auto'}}>Irreversible Action</span>
      </div>
      <div className="panel__body">
        <p className="panel__description">
          Only the original manufacturer can initiate a recall.
          This action is permanent — once recalled, the flag cannot be removed.
        </p>
        <form onSubmit={handleSubmit} className="form">
          <div className="form__group">
            <label>Lot Number <span className="required">*</span></label>
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="e.g. BATCH-PCM-2026-003"
              required
            />
          </div>
          <button type="submit" className="btn btn--danger" disabled={loading}>
            {loading ? 'Processing Recall...' : 'Initiate Recall'}
          </button>
        </form>
        {status && <p className={`status ${status.startsWith('Error') ? 'status--error' : 'status--success'}`}>{status}</p>}
      </div>
    </div>
  );
};

export default RecallBatch;
