import type { Task } from '../../types';
export type TaskState = 'pending' | 'in_progress' | 'completed' | 'overdue';
export const taskState = (t: Task, today: string): TaskState =>
  t.status === 'completed' ? 'completed' : t.dueDate && t.dueDate < today ? 'overdue' : t.status;
export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;
export const STATE_LABEL: Record<TaskState, string> = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed', overdue: 'Overdue' };
