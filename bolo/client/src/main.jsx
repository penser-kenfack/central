import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';

// The public career pages are loaded separately from the HR back-office,
// so that a candidate on a 3G connection downloads only what they need.
const Careers = lazy(() => import('./pages/public/Careers.jsx'));
const JobPublic = lazy(() => import('./pages/public/JobPublic.jsx'));
const Track = lazy(() => import('./pages/public/Track.jsx'));
const BackOffice = lazy(() => import('./BackOffice.jsx'));

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/carrieres/:company" element={<Careers />} />
        <Route path="/carrieres/:company/:job" element={<JobPublic />} />
        <Route path="/suivi/:token" element={<Track />} />
        <Route path="/*" element={<BackOffice />} />
      </Routes>
    </Suspense>
  </BrowserRouter>,
);
