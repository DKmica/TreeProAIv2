import { Link, NavLink } from 'react-router-dom';

const Header = () => {
  return (
    <header className="app-header">
      <div className="container header-content">
        <Link to="/" className="brand">TreePro Anywhere</Link>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/platform">Platform</NavLink>
          <NavLink to="/status">Status</NavLink>
        </nav>
        <a className="cta" href="#deploy">Deploy now</a>
      </div>
    </header>
  );
};

export default Header;
