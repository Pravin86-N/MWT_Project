import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppProviders from './providers/AppProviders';
import Routes from './routes';
import Header from '../components/common/Header';
import './styles/globals.css';

const App = () => {
  return (
    <AppProviders>
      <Router>
        <Header />
        <Routes />
      </Router>
    </AppProviders>
  );
};

export default App;