import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0xd9145CCE52D386f254917e481eB44e9943F39138';
const ABI = [
  {"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"}],"name":"createStartup","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"startupId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"buyTokens","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"startupId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"sellTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"milestoneId","type":"uint256"},{"internalType":"bool","name":"support","type":"bool"}],"name":"vote","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"startupId","type":"uint256"},{"internalType":"string","name":"description","type":"string"}],"name":"createMilestone","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"milestoneId","type":"uint256"}],"name":"resolveMilestone","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"getLeaderboard","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"address","name":"founder","type":"address"},{"internalType":"uint256","name":"tokenSupply","type":"uint256"},{"internalType":"uint256","name":"ethBalance","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct StartupMarket.Startup[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"startupId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getBuyPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"startupId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getSellReturn","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"startupId","type":"uint256"}],"name":"getMyTokens","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getStartup","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"address","name":"founder","type":"address"},{"internalType":"uint256","name":"tokenSupply","type":"uint256"},{"internalType":"uint256","name":"ethBalance","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct StartupMarket.Startup","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getMilestone","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"startupId","type":"uint256"},{"internalType":"string","name":"description","type":"string"},{"internalType":"uint256","name":"votesFor","type":"uint256"},{"internalType":"uint256","name":"votesAgainst","type":"uint256"},{"internalType":"bool","name":"resolved","type":"bool"},{"internalType":"bool","name":"passed","type":"bool"}],"internalType":"struct StartupMarket.Milestone","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"startupCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"milestoneCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

let toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = 'info', duration = 4500) => {
    const id = ++toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);
  return { toasts, addToast };
}

export default function App() {
  const [tab, setTab] = useState('create');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [readContract, setReadContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const { toasts, addToast } = useToast();

  // Create Startup
  const [csName, setCsName] = useState('');
  const [csDesc, setCsDesc] = useState('');
  const [csLoading, setCsLoading] = useState(false);

  // Buy
  const [buyId, setBuyId] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState(null);
  const [buyPriceLoading, setBuyPriceLoading] = useState(false);
  const [buyMyTokens, setBuyMyTokens] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);

  // Sell
  const [sellId, setSellId] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [sellReturn, setSellReturn] = useState(null);
  const [sellReturnLoading, setSellReturnLoading] = useState(false);
  const [sellMyTokens, setSellMyTokens] = useState(null);
  const [sellLoading, setSellLoading] = useState(false);

  // Leaderboard
  const [lbData, setLbData] = useState(null);
  const [lbLoading, setLbLoading] = useState(false);

  // Milestones
  const [msSid, setMsSid] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msLoading, setMsLoading] = useState(false);
  const [msFilterId, setMsFilterId] = useState('');
  const [msList, setMsList] = useState(null);
  const [msListLoading, setMsListLoading] = useState(false);

  async function connectWallet() {
    if (!window.ethereum) { addToast('No wallet detected. Install MetaMask!', 'error'); return; }
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send('eth_requestAccounts', []);
      const s = await p.getSigner();
      const addr = await s.getAddress();
      const c = new ethers.Contract(CONTRACT_ADDRESS, ABI, s);
      const rc = new ethers.Contract(CONTRACT_ADDRESS, ABI, p);
      setProvider(p); setSigner(s); setContract(c); setReadContract(rc); setUserAddress(addr);
      addToast('Wallet connected: ' + addr.slice(0,6) + '…' + addr.slice(-4), 'success');
      window.ethereum.on('accountsChanged', () => window.location.reload());
      window.ethereum.on('chainChanged', () => window.location.reload());
    } catch(e) {
      addToast('Connection failed: ' + (e.message || e), 'error');
    }
  }

  function ensureConnected() {
    if (!contract) { addToast('Please connect your wallet first', 'warn'); return false; }
    return true;
  }

  // Create Startup
  async function handleCreateStartup() {
    if (!ensureConnected()) return;
    if (!csName.trim()) { addToast('Startup name is required', 'warn'); return; }
    if (!csDesc.trim()) { addToast('Description is required', 'warn'); return; }
    setCsLoading(true);
    try {
      const tx = await contract.createStartup(csName.trim(), csDesc.trim());
      addToast('Transaction sent! Waiting for confirmation…', 'info');
      await tx.wait();
      addToast(`🚀 Startup "${csName}" launched successfully!`, 'success');
      setCsName(''); setCsDesc('');
    } catch(e) { addToast('Error: ' + (e.reason || e.message || 'Transaction failed'), 'error'); }
    finally { setCsLoading(false); }
  }

  // Buy
  const fetchBuyPrice = useCallback(async (id, amount) => {
    if (!id || !amount || Number(amount) <= 0) { setBuyPrice(null); setBuyMyTokens(null); return; }
    setBuyPriceLoading(true);
    try {
      const price = await readContract.getBuyPrice(BigInt(id), BigInt(amount));
      setBuyPrice(ethers.formatEther(price));
      try { const t = await readContract.getMyTokens(BigInt(id)); setBuyMyTokens(t.toString()); } catch(_) {}
    } catch(_) { setBuyPrice(null); }
    finally { setBuyPriceLoading(false); }
  }, [readContract, userAddress]);

  const debouncedBuyPrice = useDebounce(fetchBuyPrice, 600);
  useEffect(() => { debouncedBuyPrice(buyId, buyAmount); }, [buyId, buyAmount]);

  async function handleBuyTokens() {
    if (!ensureConnected()) return;
    if (!buyId || !buyAmount || Number(buyAmount) <= 0) { addToast('Enter valid startup ID and amount', 'warn'); return; }
    setBuyLoading(true);
    try {
      const price = await readContract.getBuyPrice(BigInt(buyId), BigInt(buyAmount));
      const tx = await contract.buyTokens(BigInt(buyId), BigInt(buyAmount), { value: price });
      addToast('Transaction sent! Waiting…', 'info');
      await tx.wait();
      addToast(`💰 Bought ${buyAmount} tokens for startup #${buyId}!`, 'success');
      fetchBuyPrice(buyId, buyAmount);
    } catch(e) { addToast('Error: ' + (e.reason || e.message || 'Transaction failed'), 'error'); }
    finally { setBuyLoading(false); }
  }

  // Sell
  const fetchSellReturn = useCallback(async (id, amount) => {
    if (!id || !amount || Number(amount) <= 0) { setSellReturn(null); setSellMyTokens(null); return; }
    setSellReturnLoading(true);
    try {
      const ret = await readContract.getSellReturn(BigInt(id), BigInt(amount));
      setSellReturn(ethers.formatEther(ret));
      try { const t = await readContract.getMyTokens(BigInt(id)); setSellMyTokens(t.toString()); } catch(_) {}
    } catch(_) { setSellReturn(null); }
    finally { setSellReturnLoading(false); }
  }, [readContract, userAddress]);

  const debouncedSellReturn = useDebounce(fetchSellReturn, 600);
  useEffect(() => { debouncedSellReturn(sellId, sellAmount); }, [sellId, sellAmount]);

  async function handleSellTokens() {
    if (!ensureConnected()) return;
    if (!sellId || !sellAmount || Number(sellAmount) <= 0) { addToast('Enter valid startup ID and amount', 'warn'); return; }
    setSellLoading(true);
    try {
      const tx = await contract.sellTokens(BigInt(sellId), BigInt(sellAmount));
      addToast('Transaction sent! Waiting…', 'info');
      await tx.wait();
      addToast(`📤 Sold ${sellAmount} tokens from startup #${sellId}!`, 'success');
      fetchSellReturn(sellId, sellAmount);
    } catch(e) { addToast('Error: ' + (e.reason || e.message || 'Transaction failed'), 'error'); }
    finally { setSellLoading(false); }
  }

  // Leaderboard
  async function loadLeaderboard() {
    setLbLoading(true); setLbData(null);
    try {
      const startups = await readContract.getLeaderboard();
      setLbData(startups);
    } catch(e) { addToast('Failed to load leaderboard', 'error'); }
    finally { setLbLoading(false); }
  }
  useEffect(() => { if (tab === 'leaderboard' && readContract) loadLeaderboard(); }, [tab, readContract]);

  // Milestones
  async function handleCreateMilestone() {
    if (!ensureConnected()) return;
    if (!msSid) { addToast('Enter a startup ID', 'warn'); return; }
    if (!msDesc.trim()) { addToast('Milestone description is required', 'warn'); return; }
    setMsLoading(true);
    try {
      const tx = await contract.createMilestone(BigInt(msSid), msDesc.trim());
      addToast('Transaction sent! Waiting…', 'info');
      await tx.wait();
      addToast('✅ Milestone created!', 'success');
      setMsDesc('');
    } catch(e) { addToast('Error: ' + (e.reason || e.message || 'Transaction failed'), 'error'); }
    finally { setMsLoading(false); }
  }

  async function loadMilestones(id) {
    setMsListLoading(true);
    try {
      if (id !== undefined && id !== '') {
        const ms = await readContract.getMilestone(BigInt(id));
        setMsList([ms]);
      } else {
        const count = await readContract.milestoneCount();
        const all = [];
        for (let i = 0; i < Number(count); i++) {
          try { all.push(await readContract.getMilestone(BigInt(i))); } catch(_) {}
        }
        setMsList(all);
      }
    } catch(e) { addToast('Failed to load milestones', 'error'); }
    finally { setMsListLoading(false); }
  }

  async function handleVote(msId, support) {
    if (!ensureConnected()) return;
    try {
      const tx = await contract.vote(BigInt(msId), support);
      addToast('Vote sent! Waiting…', 'info');
      await tx.wait();
      addToast(support ? '👍 Voted For!' : '👎 Voted Against!', 'success');
      loadMilestones(msFilterId !== '' ? msFilterId : undefined);
    } catch(e) { addToast('Error: ' + (e.reason || e.message || 'Transaction failed'), 'error'); }
  }

  async function handleResolve(msId) {
    if (!ensureConnected()) return;
    try {
      const tx = await contract.resolveMilestone(BigInt(msId));
      addToast('Resolving… Waiting…', 'info');
      await tx.wait();
      addToast('⚖️ Milestone resolved!', 'success');
      loadMilestones(msFilterId !== '' ? msFilterId : undefined);
    } catch(e) { addToast('Error: ' + (e.reason || e.message || 'Transaction failed'), 'error'); }
  }

  const rankEmojis = ['🥇','🥈','🥉'];
  const rankClasses = ['gold','silver','bronze'];

  return (
    <>
      <header>
        <div className="logo">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">StartupMarket</span>
        </div>
        <div className="header-right">
          {userAddress && (
            <div className="wallet-info" style={{display:'flex'}}>
              <div className="wallet-dot"></div>
              <span className="wallet-addr">{userAddress.slice(0,6)}…{userAddress.slice(-4)}</span>
            </div>
          )}
          <button className="btn-connect" onClick={connectWallet}
            style={userAddress ? {borderColor:'var(--neon-green)',color:'var(--neon-green)'} : {}}>
            {userAddress ? 'Connected' : 'Connect Wallet'}
          </button>
        </div>
      </header>

      <main>
        <div className="tab-bar">
          {[['create','🚀 Create Startup'],['buy','💰 Buy Tokens'],['sell','📤 Sell Tokens'],['leaderboard','🏆 Leaderboard'],['milestones','🗳️ Milestones']].map(([key,label]) => (
            <button key={key} className={`tab-btn${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {/* CREATE */}
        {tab === 'create' && (
          <div className="card">
            <div className="card-title">🚀 Launch Your Startup</div>
            <div className="form-group">
              <label>Startup Name</label>
              <input type="text" value={csName} onChange={e=>setCsName(e.target.value)} placeholder="e.g. DecentraAI" maxLength={64} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={csDesc} onChange={e=>setCsDesc(e.target.value)} placeholder="What problem does your startup solve?" rows={3} />
            </div>
            <button className="btn btn-primary" onClick={handleCreateStartup} disabled={csLoading}>
              {csLoading ? <><span className="spinner"></span> Processing…</> : '🚀 Launch Startup'}
            </button>
          </div>
        )}

        {/* BUY */}
        {tab === 'buy' && (
          <div className="card">
            <div className="card-title">💰 Buy Startup Tokens</div>
            <div className="grid-2">
              <div className="form-group">
                <label>Startup ID</label>
                <input type="number" value={buyId} onChange={e=>setBuyId(e.target.value)} placeholder="0" min="0" />
              </div>
              <div className="form-group">
                <label>Token Amount</label>
                <input type="number" value={buyAmount} onChange={e=>setBuyAmount(e.target.value)} placeholder="100" min="1" />
              </div>
            </div>
            {buyMyTokens !== null && <div className="my-tokens-badge">🪙 My tokens: <strong>{buyMyTokens}</strong></div>}
            <div className="price-preview">
              <span className="price-label">💡 Estimated Cost</span>
              {buyPriceLoading ? <span className="price-loading">⏳ Fetching price…</span>
                : buyPrice !== null ? <span className="price-value">{buyPrice} ETH</span>
                : <span className="price-loading">Enter startup ID &amp; amount to preview</span>}
            </div>
            <button className="btn btn-buy" onClick={handleBuyTokens} disabled={buyLoading}>
              {buyLoading ? <><span className="spinner"></span> Processing…</> : '💰 Buy Tokens'}
            </button>
          </div>
        )}

        {/* SELL */}
        {tab === 'sell' && (
          <div className="card">
            <div className="card-title">📤 Sell Startup Tokens</div>
            <div className="grid-2">
              <div className="form-group">
                <label>Startup ID</label>
                <input type="number" value={sellId} onChange={e=>setSellId(e.target.value)} placeholder="0" min="0" />
              </div>
              <div className="form-group">
                <label>Token Amount</label>
                <input type="number" value={sellAmount} onChange={e=>setSellAmount(e.target.value)} placeholder="50" min="1" />
              </div>
            </div>
            {sellMyTokens !== null && <div className="my-tokens-badge">🪙 My tokens: <strong>{sellMyTokens}</strong></div>}
            <div className="price-preview sell-preview">
              <span className="price-label">💡 Estimated Return</span>
              {sellReturnLoading ? <span className="price-loading">⏳ Fetching return…</span>
                : sellReturn !== null ? <span className="price-value">{sellReturn} ETH</span>
                : <span className="price-loading">Enter startup ID &amp; amount to preview</span>}
            </div>
            <button className="btn btn-sell" onClick={handleSellTokens} disabled={sellLoading}>
              {sellLoading ? <><span className="spinner"></span> Processing…</> : '📤 Sell Tokens'}
            </button>
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <>
            <div className="card" style={{marginBottom:0,borderBottomLeftRadius:0,borderBottomRightRadius:0,borderBottom:'none',paddingBottom:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <div className="card-title" style={{marginBottom:0}}>🏆 Startup Leaderboard</div>
                <button className="btn-load" onClick={loadLeaderboard}>↻ Refresh</button>
              </div>
            </div>
            <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderTop:'none',borderBottomLeftRadius:'var(--radius)',borderBottomRightRadius:'var(--radius)',padding:20}}>
              {lbLoading ? (
                <div className="lb-empty"><div className="spinner" style={{width:28,height:28,borderWidth:3,margin:'0 auto 10px'}}></div><div>Loading…</div></div>
              ) : !lbData ? (
                <div className="lb-empty"><div style={{fontSize:'2rem',marginBottom:8}}>🏆</div><div>Connect wallet &amp; click Refresh</div></div>
              ) : lbData.length === 0 ? (
                <div className="lb-empty"><div style={{fontSize:'2rem',marginBottom:8}}>🏜️</div><div>No startups yet!</div></div>
              ) : (
                <div className="lb-grid">
                  {lbData.map((s,i) => (
                    <div className="lb-card" key={s.id.toString()}>
                      <div className={`lb-rank${i<3?' '+rankClasses[i]:''}`}>{i<3?rankEmojis[i]:`#${i+1}`}</div>
                      <div className="lb-name">{s.name}</div>
                      <div className="lb-desc">{s.description}</div>
                      <div className="lb-stats">
                        <div className="lb-stat"><div className="lb-stat-label">Token Supply</div><div className="lb-stat-value">{s.tokenSupply.toString()}</div></div>
                        <div className="lb-stat"><div className="lb-stat-label">ETH Balance</div><div className="lb-stat-value cyan">{parseFloat(ethers.formatEther(s.ethBalance)).toFixed(4)} ETH</div></div>
                      </div>
                      <div className="lb-founder">👤 {s.founder.slice(0,6)}…{s.founder.slice(-4)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* MILESTONES */}
        {tab === 'milestones' && (
          <>
            <div className="card">
              <div className="card-title">🗳️ Create Milestone</div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Startup ID</label>
                  <input type="number" value={msSid} onChange={e=>setMsSid(e.target.value)} placeholder="0" min="0" />
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Milestone Description</label>
                  <textarea value={msDesc} onChange={e=>setMsDesc(e.target.value)} placeholder="Describe the milestone goal…" rows={2} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" style={{width:'auto'}} onClick={handleCreateMilestone} disabled={msLoading}>
                {msLoading ? <><span className="spinner"></span> Processing…</> : '✚ Create Milestone'}
              </button>
            </div>
            <div className="card">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:18}}>
                <div className="card-title" style={{marginBottom:0}}>📋 Browse Milestones</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input type="number" value={msFilterId} onChange={e=>setMsFilterId(e.target.value)} placeholder="Milestone ID" min="0" style={{width:130,padding:'8px 12px',fontSize:'0.82rem'}} />
                  <button className="btn-load" onClick={() => loadMilestones(msFilterId)}>↻ Load</button>
                  <button className="btn-load" onClick={() => loadMilestones()}>All</button>
                </div>
              </div>
              {msListLoading ? (
                <div className="lb-empty"><div className="spinner" style={{width:24,height:24,borderWidth:3,margin:'0 auto 8px'}}></div>Loading…</div>
              ) : !msList ? (
                <div className="lb-empty"><div style={{fontSize:'2rem',marginBottom:8}}>🗳️</div><div>Load a milestone ID or click "All"</div></div>
              ) : msList.length === 0 ? (
                <div className="lb-empty">No milestones found.</div>
              ) : msList.map(ms => {
                const total = Number(ms.votesFor) + Number(ms.votesAgainst);
                const forPct = total > 0 ? (Number(ms.votesFor) / total * 100) : 50;
                return (
                  <div className="ms-card" key={ms.id.toString()}>
                    <div className="ms-header">
                      <div><div className="ms-id">Milestone #{ms.id.toString()}</div><div className="ms-startup">Startup #{ms.startupId.toString()}</div></div>
                      <div>{ms.resolved ? (ms.passed ? <span className="ms-badge badge-passed">✅ Passed</span> : <span className="ms-badge badge-failed">❌ Failed</span>) : <span className="ms-badge badge-pending">⏳ Pending</span>}</div>
                    </div>
                    <div className="ms-desc">{ms.description}</div>
                    <div className="ms-votes">
                      <span className="vote-for-count">👍 {ms.votesFor.toString()}</span>
                      <div className="vote-bar"><div className="vote-fill" style={{width:`${forPct}%`}}></div></div>
                      <span className="vote-against-count">👎 {ms.votesAgainst.toString()}</span>
                    </div>
                    {!ms.resolved && (
                      <div className="ms-actions">
                        <button className="btn btn-vote-for" onClick={() => handleVote(ms.id, true)}>👍 Vote For</button>
                        <button className="btn btn-vote-against" onClick={() => handleVote(ms.id, false)}>👎 Vote Against</button>
                        <button className="btn btn-resolve" onClick={() => handleResolve(ms.id)}>⚖️ Resolve</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <div id="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </>
  );
}

