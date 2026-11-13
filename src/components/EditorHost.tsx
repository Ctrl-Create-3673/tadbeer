import { EventForm } from '../features/events/EventForm';
import { NoteForm } from '../features/notes/NoteForm';
import { ReminderForm } from '../features/reminders/ReminderForm';
import { TaskForm } from '../features/tasks/TaskForm';
import { useApp } from './AppContext';

export function EditorHost() {
  const { editor } = useApp();
  if (!editor) return null;
  const k = `${editor.kind}-${editor.id ?? 'new'}-${editor.date ?? ''}`;
  if (editor.kind === 'task') return <TaskForm key={k} id={editor.id} date={editor.date} />;
  if (editor.kind === 'event') return <EventForm key={k} id={editor.id} date={editor.date} />;
  if (editor.kind === 'note') return <NoteForm key={k} id={editor.id} date={editor.date} />;
  return <ReminderForm key={k} id={editor.id} date={editor.date} />;
}
