import { useState } from 'react';
import { ethers } from 'ethers';

const RegisterBatch = ({ tracker, account, provider, onSuccess }) => {
  const [lotNumber, setLotNumber] = useState('');
  const [drugName, setDrugName] = useState('');
  const [ndc, setNdc] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [site, setSite] = useState('');
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
      const metadataHash = ethers.utils.id(JSON.stringify({
        drugName,
        ndc,
        lotNumber,
        expiryDate,
        site
      }));

      const tx = await tracker.connect(signer).registerBatch(batchID, metadataHash);
      await tx.wait();

      setStatus(`Batch registered successfully. Batch ID: ${batchID.slice(0, 18)}...`);
      setLotNumber('');
      setDrugName('');
      setNdc('');
      setExpiryDate('');
      setSite('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      if (err.message.includes('batch already registered')) {
        setStatus('Error: This batch is already registered on-chain.');
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
        <span className="panel__header-icon" aria-hidden="true">＋</span>
        <h2>Register New Batch</h2>
      </div>
      <div className="panel__body">
        <p className="panel__description">
          Register a new pharmaceutical batch on-chain. The caller address becomes the immutable manufacturer.
          Metadata is hashed client-side; only the hash is stored on-chain.
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
              <label>Drug Name & Dosage <span className="required">*</span></label>
              <input
                type="text"
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                placeholder="e.g. Amoxicillin 500mg"
                required
              />
            </div>
          </div>
          <div className="form__divider"></div>
          <div className="form__row">
            <div className="form__group">
              <label>NDC (National Drug Code)</label>
              <input
                type="text"
                value={ndc}
                onChange={(e) => setNdc(e.target.value)}
                placeholder="e.g. 0781-2613-01"
              />
            </div>
            <div className="form__group">
              <label>Expiry Date <span className="required">*</span></label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form__group">
            <label>Manufacturing Site</label>
            <input
              type="text"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. PharmaCo Plant A, Mumbai"
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register Batch'}
          </button>
        </form>
        {status && <p className={`status ${status.startsWith('Error') ? 'status--error' : 'status--success'}`}>{status}</p>}
      </div>
    </div>
  );
};

export default RegisterBatch;
