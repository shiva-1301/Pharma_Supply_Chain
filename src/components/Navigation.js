import { ethers } from 'ethers';

const Navigation = ({ account, setAccount, activeTab, setActiveTab }) => {
    const connectHandler = async () => {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = ethers.utils.getAddress(accounts[0]);
        setAccount(account);
    };

    const tabs = [
        { id: 'verify', label: 'Verify', icon: '⊘' },
        { id: 'register', label: 'Register', icon: '＋' },
        { id: 'transfer', label: 'Transfer', icon: '⇄' },
        { id: 'recall', label: 'Recall', icon: '⚑' },
        { id: 'events', label: 'Event Log', icon: '☰' }
    ];

    return (
        <nav>
            <div className='nav__brand'>
                <h1>PharmaBatchTracker</h1>
                <span className="nav__divider" aria-hidden="true"></span>
                <span className="nav__subtitle">Batch Traceability System</span>
            </div>

            <ul className='nav__links'>
                {tabs.map(tab => (
                    <li key={tab.id}>
                        <a
                            href="#!"
                            className={activeTab === tab.id ? 'nav__link--active' : ''}
                            onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
                        >
                            <span className="nav__icon" aria-hidden="true">{tab.icon}</span>
                            {tab.label}
                        </a>
                    </li>
                ))}
            </ul>

            {account ? (
                <button type="button" className='nav__connect nav__connect--connected'>
                    {account.slice(0, 6) + '...' + account.slice(38, 42)}
                </button>
            ) : (
                <button type="button" className='nav__connect' onClick={connectHandler}>
                    Connect Wallet
                </button>
            )}
        </nav>
    );
};

export default Navigation;