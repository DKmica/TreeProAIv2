import { useEffect, useState } from 'react';

const Status = () => {
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status || 'ok'))
      .catch(() => setStatus('unreachable'));
  }, []);

  return (
    <section className="container">
      <p className="eyebrow">Runtime checks</p>
      <h2>Deployment status</h2>
      <p className="lead">The Express API replies with a simple health document.</p>
      <div className={`status-card ${status === 'ok' ? 'success' : 'warn'}`}>
        <p className="muted">/api/health</p>
        <p className="status-value">{status}</p>
      </div>
      <div id="deploy" className="deploy">
        <h3>Deploy anywhere</h3>
        <ol>
          <li>Install dependencies: <code>npm install</code></li>
          <li>Build the UI: <code>npm run build</code></li>
          <li>Start the server: <code>node server/index.js</code></li>
        </ol>
        <p className="muted">The server serves static assets from <code>dist/</code> and exposes <code>/api/health</code>.</p>
      </div>
    </section>
  );
};

export default Status;
