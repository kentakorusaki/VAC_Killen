import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from './img/title.png';
import './Navbar.css';
import { useAuth } from '../context/AuthContext';
import useToast from '../hooks/useToast';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const [navBackground, setNavBackground] = useState('transparentNav');
  const { isShowing, message, showToast } = useToast();
  const navigate = useNavigate();

  const handleScroll = () => {
    const show = window.scrollY > 50;
    setNavBackground(show ? 'darkNav' : 'transparentNav');
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('You have been logged out successfully');
    } catch (error) {
      console.error("Logout failed", error);
      showToast('Logout failed. Please try again.');
    }
  };

  return (
    <>
      <nav className={`navbar ${navBackground}`}>
        <Link to="/">
          <img src={logo} alt="Logo" className="title" width={225}/>
        </Link>
        <div className="nav-links">
          <span className='directory'>
            <Link to="/about">About</Link>
          </span>
          <span className='directory'>
            <Link to="/sermons">Sermons</Link>
          </span>
          <span className='directory'>
            <Link to="/events">Events</Link>
          </span>
          <span className='directory'>
            <Link to="/contact">Contact</Link>
          </span>
          <span className='directory'>
            {currentUser ? (
              <button onClick={handleLogout}>Logout</button>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </span>
        </div>
      </nav>
      {isShowing && <div className="toast">{message}</div>}
    </>
  );
}

export default Navbar;
