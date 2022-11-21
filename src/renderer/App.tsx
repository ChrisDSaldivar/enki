import { useState, createContext } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';
import './App.css';
import 'tailwindcss/tailwind.css';
import { Octokit } from '@octokit/rest';

import LoginPage from '../components/LoginPage';
import EnkiMain from '../components/EnkiMain';

const OctokitContext = createContext<{
  octokit: Octokit | undefined;
  setOctokit: any;
}>({ octokit: undefined, setOctokit: undefined });


export default function App() {
  const [octokit, setOctokit] = useState<Octokit | undefined>();

  return (
    <OctokitContext.Provider value={{ octokit, setOctokit }}>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage OctokitContext={OctokitContext} />} />
          <Route path="/app" element={<EnkiMain OctokitContext={OctokitContext} />} />
        </Routes>
      </Router>
    </OctokitContext.Provider>
  );
}
