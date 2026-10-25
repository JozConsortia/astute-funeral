import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { Apply } from './pages/Apply';
import { Contact } from './pages/Contact';
import { GetCovered } from './pages/GetCovered';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

// Admin code is split into its own bundle so public visitors never download it.
const AdminLayout = lazy(() => import('./admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const Login = lazy(() => import('./admin/Login').then((m) => ({ default: m.Login })));
const Overview = lazy(() => import('./admin/Overview').then((m) => ({ default: m.Overview })));
const Applications = lazy(() => import('./admin/Applications').then((m) => ({ default: m.Applications })));
const Capture = lazy(() => import('./admin/Capture').then((m) => ({ default: m.Capture })));
const Messages = lazy(() => import('./admin/Messages').then((m) => ({ default: m.Messages })));
const Settings = lazy(() => import('./admin/Settings').then((m) => ({ default: m.Settings })));
const Users = lazy(() => import('./admin/Users').then((m) => ({ default: m.Users })));

export function App() {
  return (
    <Suspense fallback={<div className="admin-loading">Loading…</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="get-covered" element={<GetCovered />} />
          <Route path="apply" element={<Apply />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="admin/login" element={<Login />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="applications" element={<Applications />} />
          <Route path="capture" element={<Capture />} />
          <Route path="messages" element={<Messages />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
