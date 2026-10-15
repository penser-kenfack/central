import { Routes, Route } from 'react-router-dom';
import { SessionProvider } from './session.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Jobs from './pages/Jobs.jsx';
import JobEditor from './pages/JobEditor.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Candidates from './pages/Candidates.jsx';
import Application from './pages/Application.jsx';
import Capture from './pages/Capture.jsx';
import Messages from './pages/Messages.jsx';
import AuditLog from './pages/AuditLog.jsx';

export default function BackOffice() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/connexion" element={<Login />} />
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="offres" element={<Jobs />} />
          <Route path="offres/nouvelle" element={<JobEditor />} />
          <Route path="offres/:id/modifier" element={<JobEditor />} />
          <Route path="offres/:id" element={<Pipeline />} />
          <Route path="candidats" element={<Candidates />} />
          <Route path="candidatures/nouvelle" element={<Capture />} />
          <Route path="candidatures/:id" element={<Application />} />
          <Route path="messages" element={<Messages />} />
          <Route path="journal" element={<AuditLog />} />
        </Route>
      </Routes>
    </SessionProvider>
  );
}
