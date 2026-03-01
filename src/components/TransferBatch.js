import { useState } from 'react';
import { ethers } from 'ethers';

const TransferBatch = ({ tracker, account, provider, onSuccess }) => {
  const [lotNumber, setLotNumber] = useState('');
  const [newOwner, setNewOwner] = useState('');
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

      const tx = await tracker.connect(signer).transferBatch(batchID, newOwner);
      await tx.wait();

      setStatus(`Batch custody transferred to ${newOwner.slice(0, 6)}...${newOwner.slice(38, 42)}`);
      setLotNumber('');
      setNewOwner('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      if (err.message.includes('caller is not the current owner')) {
        setStatus('Error: You are not the current custodian of this batch.');
      } else if (err.message.includes('batch does not exist')) {
        setStatus('Error: No batch found with this lot number.');
      } else if (err.message.includes('cannot transfer to zero')) {
        setStatus('Error: Cannot transfer to zero address.');
      } else if (err.message.includes('cannot transfer to self')) {
        setStatus('Error: Cannot transfer to yourself.');
      } else {
        setStatus('Error: ' + (err.reason || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__header-icon" aria-hidden="true">⇄</span>
        <h2>Transfer Batch Custody</h2>
      </div>
      <div className="panel__body">
        <p className="panel__description">
          Only the current owner of a batch can transfer custody.
          This records an immutable ownership change on-chain.
        </p>
        <form onSubmit={handleSubmit} className="form">
          <div className="form__row">
            <div className="form__group">
              <label>Lot Number <span className="required">*</span></label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. BATCH-AMX-2026-004"
                required
              />
            </div>
            <div className="form__group">
              <label>New Owner Address <span className="required">*</span></label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Transferring...' : 'Transfer Custody'}
          </button>
        </form>
        {status && <p className={`status ${status.startsWith('Error') ? 'status--error' : 'status--success'}`}>{status}</p>}
      </div>
    </div>
  );
};

export default TransferBatch;
