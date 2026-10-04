import { useState } from 'react';
import type { Application, Job } from '../../shared/contracts';
import { dayToIso, localDay, request, type Runner } from '../components/common';

type Options = {
  run: Runner;
  saved: (application: Application) => void;
};

export function useAddApplication({ run, saved }: Options) {
  const [raw, setRawValue] = useState('');
  const [url, setUrlValue] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState('APPLIED');
  const [applied, setApplied] = useState(localDay());
  const [notes, setNotes] = useState('');

  const setRaw = (value: string) => {
    setRawValue(value);
    setJob(null);
  };

  const setUrl = (value: string) => {
    setUrlValue(value);
    setJob(null);
  };

  const editJob = (key: keyof Job, value: unknown) =>
    setJob((current) => (current ? { ...current, [key]: value } : current));

  const parse = () =>
    run(async () => {
      setJob(await request<Job>('/parse', 'POST', { rawJd: raw, originalUrl: url }));
    });

  const save = () =>
    run(async () => {
      if (!job) return;
      saved(
        await request<Application>('/applications', 'POST', {
          job,
          status,
          appliedAt: dayToIso(applied),
          notes,
        }),
      );
    });

  return {
    raw,
    setRaw,
    url,
    setUrl,
    job,
    editJob,
    status,
    setStatus,
    applied,
    setApplied,
    notes,
    setNotes,
    parse,
    save,
  };
}
