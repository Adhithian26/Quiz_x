import { Quiz } from '@quizx/shared';

const RAW_API_BASE = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

export async function fetchQuizzes(): Promise<Quiz[]> {
  const res = await fetch(`${API_BASE}/api/quizzes`);
  if (!res.ok) throw new Error('Failed to fetch quizzes');
  const data = await res.json();
  return data.quizzes || [];
}

export async function fetchQuiz(id: string): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/api/quizzes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch quiz');
  const data = await res.json();
  return data.quiz;
}

export async function saveQuiz(quiz: Quiz, hostSecret: string): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/api/quizzes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hostSecret}`
    },
    body: JSON.stringify(quiz)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save quiz');
  }
  const data = await res.json();
  return data.quiz;
}

export async function deleteQuiz(id: string, hostSecret: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/quizzes/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${hostSecret}`
    }
  });
  if (!res.ok) throw new Error('Failed to delete quiz');
  const data = await res.json();
  return data.success;
}

export async function verifyHostSecret(hostSecret: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostSecret })
    });
    const data = await res.json();
    return Boolean(data.valid);
  } catch {
    return false;
  }
}

export function getExportCsvUrl(sessionId: string): string {
  return `${API_BASE}/api/sessions/${sessionId}/export/csv`;
}
