const Footer = () => (
  <footer className="app-footer">
    <div className="container footer-grid">
      <div>
        <p className="brand">TreePro Anywhere</p>
        <p className="muted">Portable, stateless, and ready for any runtime.</p>
      </div>
      <div>
        <p className="footer-title">Resources</p>
        <ul>
          <li><a href="https://nodejs.org" target="_blank" rel="noreferrer">Node.js</a></li>
          <li><a href="https://vitejs.dev" target="_blank" rel="noreferrer">Vite</a></li>
          <li><a href="https://react.dev" target="_blank" rel="noreferrer">React</a></li>
        </ul>
      </div>
      <div>
        <p className="footer-title">Deployment</p>
        <ul>
          <li><a href="#deploy">Docker</a></li>
          <li><a href="#deploy">Static hosting</a></li>
          <li><a href="#deploy">Bare metal</a></li>
        </ul>
      </div>
    </div>
    <p className="muted center">Made to run anywhere. Ship confidently.</p>
  </footer>
);

export default Footer;
