import React from "react";
import ReactDOM from "react-dom";
import VoiceOverApp from "./VoiceOverApp";
import "./styles.css";

ReactDOM.render(
  <React.StrictMode>
    <header>
      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <a className="navbar-brand" href="#">
            <img
              src="https://www.rajasthanroyals.com/static-assets/images/rr-logo.svg"
              alt="Rajasthan Royals Logo"
              height="60"
            />
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link active" href="#">
                  HOME
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  TEAM
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  MATCHES
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  ROYALS TV
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  FANS
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>

    <VoiceOverApp />

    <footer className="footer-section">
      <div className="container">
        <div className="row">
          <div className="col-lg-4">
            <div className="footer-logo mb-4">
              <img
                src="https://www.rajasthanroyals.com/static-assets/images/rr-logo.svg"
                alt="Rajasthan Royals"
                height="80"
              />
            </div>
            <p>Adding your voice to legendary Rajasthan Royals moments.</p>
          </div>
          <div className="col-lg-4">
            <h5>CONNECT WITH US</h5>
            <div className="social-icons">
              <a href="#">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>
          <div className="col-lg-4">
            <h5>DOWNLOAD THE APP</h5>
            <div className="app-links">
              <a href="#" className="d-inline-block mb-2">
                <img
                  src="https://www.rajasthanroyals.com/static-assets/images/google-play.png"
                  alt="Google Play"
                  height="40"
                />
              </a>
              <a href="#" className="d-inline-block">
                <img
                  src="https://www.rajasthanroyals.com/static-assets/images/app-store.png"
                  alt="App Store"
                  height="40"
                />
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom mt-4 pt-3">
          <div className="row">
            <div className="col-md-6">
              <p>&copy; 2025 Rajasthan Royals. All rights reserved.</p>
            </div>
            <div className="col-md-6 text-md-end">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Use</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </React.StrictMode>,
  document.getElementById("root")
);
