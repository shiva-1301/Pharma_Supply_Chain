import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

// Components
import Navigation from './components/Navigation';
import RegisterBatch from './components/RegisterBatch';
import TransferBatch from './components/TransferBatch';
import VerifyBatch from './components/VerifyBatch';
import RecallBatch from './components/RecallBatch';
import EventLog from './components/EventLog';

// ABI
import PharmaBatchTrackerABI from './abis/PharmaBatchTracker.json';

// Config
import config from './config.json';

function App() {
  const [provider, setProvider] = useState(null);
  const [tracker, setTracker] = useState(null);
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('verify');

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    setProvider(provider);

    const network = await provider.getNetwork();
    const chainId = network.chainId;
    const networkConfig = config[chainId] || config[String(chainId)] || config['31337'];

    if (!networkConfig) {
      console.error('Network not supported. Chain ID:', chainId);
      return;
    }

    const trackerContract = new ethers.Contract(
      networkConfig.PharmaBatchTracker.address,
      PharmaBatchTrackerABI.abi,
      provider
    );
    setTracker(trackerContract);

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async () => {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = ethers.utils.getAddress(accounts[0]);
        setAccount(account);
      });
    }
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  const renderTab = () => {
    if (!tracker) {
      return <p className="loading">Connecting to blockchain...</p>;
    }

    switch (activeTab) {
      case 'register':
        return <RegisterBatch tracker={tracker} account={account} provider={provider} />;
      case 'transfer':
        return <TransferBatch tracker={tracker} account={account} provider={provider} />;
      case 'verify':
        return <VerifyBatch tracker={tracker} />;
      case 'recall':
        return <RecallBatch tracker={tracker} account={account} provider={provider} />;
      case 'events':
        return <EventLog tracker={tracker} />;
      default:
        return <VerifyBatch tracker={tracker} />;
    }
  };

  return (
    <div className="app">
      <Navigation
        account={account}
        setAccount={setAccount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="system-header">
        <div className="system-header__left">
          <div>
            <div className="system-header__title">Pharmaceutical Batch Traceability & Recall System</div>
            <div className="system-header__sub">Blockchain-verified supply chain custody tracking</div>
          </div>
        </div>
        <div className="system-header__right">
          <div className="system-header__indicator">
            <span className="system-header__dot"></span>
            Localhost : 8545
          </div>
          {account && (
            <span className="system-header__wallet">{account}</span>
          )}
        </div>
      </div>

      <main className="main-content">
        {renderTab()}
      </main>

      <footer className="app-footer">
        PharmaBatchTracker v1.0 &nbsp;|&nbsp; Research Prototype &nbsp;|&nbsp; Hardhat Local Network &nbsp;|&nbsp; Not for production use
      </footer>
    </div>
  );
}

export default App;
