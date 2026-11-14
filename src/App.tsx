import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './components/AppContext';
import { EditorHost } from './components/EditorHost';
import { Layout } from './components/Layout';
import { applyFonts } from './styles/fonts.config';
import { loadAll } from './services/storage/db';
import { useSettings } from './services/storage/settings';
import { seedNoteCategories } from './services/storage/seed';
import { CalendarPage } from './pages/CalendarPage';
import { Dashboard } from './pages/Dashboard';
import { EventsPage } from './pages/EventsPage';
import { NotesPage } from './pages/NotesPage';
import { PlannerPage } from './pages/PlannerPage';
import { PrintPage } from './pages/PrintPage';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';
import { DownloadPage } from './pages/DownloadPage';
import { InvitesPage } from './pages/InvitesPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { TasksPage } from './pages/TasksPage';
import { Splash } from './components/Splash';
import { Tour } from './components/Tour';
import { WidgetPage } from './pages/WidgetPage';

function Shell() {
  const [s] = useSettings();
  useEffect(() => { applyFonts(s.fonts); }, [s.fonts]);
  useEffect(() => { document.documentElement.dataset.theme = s.theme; document.documentElement.lang = s.language; document.documentElement.dir = s.language === 'ar' ? 'rtl' : 'ltr'; }, [s.theme, s.language]);
  return <HashRouter><Routes><Route element={<Layout />}>
    <Route index element={<Dashboard />} /><Route path="calendar" element={<CalendarPage />} /><Route path="tasks" element={<TasksPage />} />
    <Route path="events" element={<EventsPage />} /><Route path="notes" element={<NotesPage />} /><Route path="reminders" element={<RemindersPage />} />
    <Route path="planner" element={<PlannerPage />} /><Route path="print" element={<PrintPage />} /><Route path="download" element={<DownloadPage />} /><Route path="invites" element={<InvitesPage />} /><Route path="feedback" element={<FeedbackPage />} /><Route path="settings" element={<SettingsPage />} />
  </Route></Routes><EditorHost /><Tour /></HashRouter>;
}

export default function App() {
  const [state, setState] = useState<'loading' | 'ready' | { error: string }>('loading');
  useEffect(() => { loadAll().then(seedNoteCategories).then(() => setState('ready')).catch((e) => setState({ error: String(e?.message ?? e) })); }, []);
  if (state === 'loading') return <div role="status" className="grid h-full place-items-center text-muted">Loading your planner…</div>;
  if (typeof state === 'object') return <div role="alert" className="mx-auto mt-20 max-w-md rounded-2xl border border-burgundy p-6"><b>Storage is unavailable.</b><p className="mt-2 text-sm">This browser blocked IndexedDB (private mode or disabled site data), so nothing could be saved. Open the app in a normal window. Details: {state.error}</p></div>;
  if (location.hash.startsWith('#/widget')) return <WidgetPage />;
  return <><AppProvider><Shell /></AppProvider><Splash /></>;
}
