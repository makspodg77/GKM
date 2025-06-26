import './Header.css';
import Herb from '../../assets/Herb-Goleniowa-powiat.png';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" aria-label="Strona główna">
          <img src={Herb} alt="Herb Gminy Goleniów" width="50" height="50" />
        </Link>
        <div className="site-title">
          <h1>Goleniowska Komunikacja Miejska</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
