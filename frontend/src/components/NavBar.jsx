import { Link, NavLink } from 'react-router-dom';

function NavBar() {
  return (
    <nav className="main-nav">
      <div className="main-nav-inner">
        <Link to="/" className="brand">
          FOOD<span>BRIDGE</span>
        </Link>
        <div className="main-nav-links">
          <NavLink to="/">Home</NavLink>
          <a href="/#contact">Contact</a>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
