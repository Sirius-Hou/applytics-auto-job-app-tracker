import { useState } from 'react';
import type { Application, ApplicationEvent } from '../../shared/contracts';
import { dayToIso, localDay, request, type Runner } from '../components/common';

type Options = {
  application: Application;
  run: Runner;
  changed: (application: Application) => void;
  deleted: () => void;
};

export function useApplicationDetail({ application, run, changed, deleted }: Options) {
  const [notes, setNotes] = useState(application.notes);
  const [applied, setApplied] = useState(localDay(application.appliedAt));
  const [eventType, setEventType] = useState('OA');
  const [eventDay, setEventDay] = useState(localDay());
  const [eventNotes, setEventNotes] = useState('');
  const [editingEvent, setEditingEvent] = useState<ApplicationEvent | null>(null);

  const saveApplication = () =>
    run(async () => {
      changed(
        await request<Application>('/applications/' + application.id, 'PATCH', {
          notes,
          appliedAt: dayToIso(applied),
        }),
      );
    });

  const removeApplication = () =>
    run(async () => {
      await request(`/applications/${application.id}`, 'DELETE');
      deleted();
    });

  const saveEvent = (eventId: string) =>
    run(async () => {
      if (!editingEvent) return;
      changed(
        await request<Application>(`/applications/${application.id}/events/${eventId}`, 'PATCH', {
          type: editingEvent.type,
          occurredAt: editingEvent.occurredAt,
          notes: editingEvent.notes,
        }),
      );
      setEditingEvent(null);
    });

  const removeEvent = (eventId: string) =>
    run(async () => {
      changed(
        await request<Application>(`/applications/${application.id}/events/${eventId}`, 'DELETE'),
      );
    });

  const addEvent = () =>
    run(async () => {
      changed(
        await request<Application>('/applications/' + application.id + '/events', 'POST', {
          type: eventType,
          occurredAt: dayToIso(eventDay),
          notes: eventNotes,
        }),
      );
      setEventNotes('');
    });

  return {
    notes,
    setNotes,
    applied,
    setApplied,
    eventType,
    setEventType,
    eventDay,
    setEventDay,
    eventNotes,
    setEventNotes,
    editingEvent,
    setEditingEvent,
    saveApplication,
    removeApplication,
    saveEvent,
    removeEvent,
    addEvent,
  };
}
