import { useState } from 'react';
import { statuses, type Application, type ApplicationEvent } from '../../shared/contracts';
import { dayToIso, label, localDay, request, Field, Select, type Runner } from './common';

const skillOrder = [
  'PROGRAMMING_LANGUAGE',
  'TECHNICAL_DOMAIN',
  'ENGINEERING_PRACTICE',
  'FRAMEWORK',
  'PLATFORM',
  'TOOL',
  'CLOUD',
  'DATABASE',
  'LIBRARY',
  'OPERATING_SYSTEM',
  'HARDWARE',
  'PROTOCOL_API',
] as const;

function SkillGroup({
  title,
  skills,
  empty,
}: {
  title: string;
  skills: Application['job']['skills'];
  empty: string;
}) {
  return (
    <div className="skill-group">
      <h3>{title}</h3>
      {skills.length ? (
        <div className="skill-list">
          {[...skills]
            .sort(
              (left, right) =>
                skillOrder.indexOf(left.type) - skillOrder.indexOf(right.type) ||
                left.name.localeCompare(right.name),
            )
            .map((skill) => (
              <span className="skill-chip" key={`${skill.name}-${skill.type}`}>
                {skill.name}
              </span>
            ))}
        </div>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </div>
  );
}

function requirementItems(content: string) {
  const items = content
    .split(/\r?\n/)
    .map((item) => item.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, ''))
    .filter(Boolean);
  return items.length ? items : [content.trim()];
}

function ActionIcon({ kind }: { kind: 'edit' | 'delete' }) {
  return kind === 'edit' ? (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 20h4l11-11-4-4L4 16v4Zm10-14 4 4" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" />
    </svg>
  );
}
export function Detail({
  data: a,
  busy,
  run,
  changed,
  back,
  deleted,
}: {
  data: Application;
  busy: boolean;
  run: Runner;
  changed: (a: Application) => void;
  back: () => void;
  deleted: () => void;
}) {
  const [notes, setNotes] = useState(a.notes);
  const [applied, setApplied] = useState(localDay(a.appliedAt));
  const [type, setType] = useState('OA');
  const [when, setWhen] = useState(localDay());
  const [eventNotes, setEventNotes] = useState('');
  const [editingEvent, setEditingEvent] = useState<ApplicationEvent | null>(null);
  return (
    <>
      <button onClick={back}>← All applications</button>
      <div className="title-row">
        <div>
          <div className="company-name">{a.job.company || 'Company not provided'}</div>
          <h1>{a.job.title || 'Untitled position'}</h1>
          <p>
            {[
              a.job.category,
              a.job.term,
              a.job.recruitingYear === null ? 'UNKNOWN' : String(a.job.recruitingYear),
              a.job.workArrangement,
            ]
              .filter((value) => value !== 'UNKNOWN')
              .map(label)
              .join(' · ')}
          </p>
        </div>
        <span className={'badge ' + a.status.toLowerCase()}>{label(a.status)}</span>
      </div>
      <div className="detail-grid">
        <div>
          <section className="panel form">
            <h2>Posting details</h2>
            <a href={a.job.originalUrl} target="_blank" rel="noreferrer">
              Open original job posting ↗
            </a>
            {a.job.canonicalUrl && (
              <p>
                <a href={a.job.canonicalUrl} target="_blank" rel="noreferrer">
                  Canonical posting ↗
                </a>
              </p>
            )}
            <h3>Role Focus</h3>
            <div className="skill-list">
              {a.job.roleSummary.map((role) => (
                <span className="badge" key={role}>
                  {label(role)}
                </span>
              ))}
            </div>
            <h3>Locations</h3>
            {a.job.locations.length ? (
              a.job.locations.map((l, i) => <p key={i}>{l.rawText}</p>)
            ) : (
              <p className="muted">No location provided</p>
            )}
            <h3>Compensation</h3>
            {a.job.compensation ? (
              <>
                <p>{a.job.compensation.rawText}</p>
                {(a.job.compensation.minimum !== null || a.job.compensation.maximum !== null) && (
                  <p className="muted">
                    {a.job.compensation.currency || 'Currency unknown'} ·{' '}
                    {a.job.compensation.minimum ?? '—'} – {a.job.compensation.maximum ?? '—'} ·{' '}
                    {label(a.job.compensation.payPeriod)}
                  </p>
                )}
              </>
            ) : (
              <p className="muted">Not provided</p>
            )}
            <h3>Years of Experience Required</h3>
            {a.job.experience ? (
              <p>
                YOE:{' '}
                {a.job.experience.minimumYears !== null && a.job.experience.maximumYears !== null
                  ? `${a.job.experience.minimumYears}–${a.job.experience.maximumYears} years`
                  : a.job.experience.minimumYears !== null
                    ? `${a.job.experience.minimumYears}+ years`
                    : a.job.experience.maximumYears !== null
                      ? `Up to ${a.job.experience.maximumYears} years`
                      : 'N/A'}
              </p>
            ) : (
              <p className="muted">YOE: N/A</p>
            )}
            <div className="skills-section">
              <SkillGroup
                title="Core Skills"
                skills={a.job.skills.filter((skill) => skill.requirementType === 'MINIMUM')}
                empty="No required skills identified"
              />
              <SkillGroup
                title="Preferred / Good to Have"
                skills={a.job.skills.filter((skill) => skill.requirementType !== 'MINIMUM')}
                empty="No preferred skills identified"
              />
            </div>
          </section>
          <section className="panel form">
            <h2>Job Requirements</h2>
            {a.job.requirementSections.length ? (
              a.job.requirementSections.map((s, i) => (
                <div className="requirement-section" key={i}>
                  <h3>{s.rawHeading || 'Requirements'}</h3>
                  <ul>
                    {requirementItems(s.content).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="muted">
                No requirement sections identified. The full posting is below.
              </p>
            )}
          </section>
          <section className="panel form">
            <details>
              <summary>Full original job description</summary>
              <pre>{a.job.rawJd}</pre>
            </details>
          </section>
          <section className="panel form">
            <h2>Additional Application Notes</h2>
            <Field name="Application Date" type="date" value={applied} onChange={setApplied} />
            <label>
              Notes
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <button
              disabled={busy || !applied}
              onClick={() =>
                run(async () =>
                  changed(
                    await request<Application>('/applications/' + a.id, 'PATCH', {
                      notes,
                      appliedAt: dayToIso(applied),
                    }),
                  ),
                )
              }
            >
              Save changes
            </button>
            <p className="muted">
              Correcting the application date leaves historical event timestamps intact.
            </p>
          </section>
          <section className="danger-zone">
            <div>
              <strong>Delete Application</strong>
              <p>Remove this application and its complete timeline permanently.</p>
            </div>
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Delete this application and its complete history?')) return;
                run(async () => {
                  await request(`/applications/${a.id}`, 'DELETE');
                  deleted();
                });
              }}
            >
              Delete Application
            </button>
          </section>
        </div>
        <div className="timeline-column">
          <section className="panel form timeline-panel">
            <h2>Application timeline</h2>
            <div className="timeline">
              {a.events.map((e) =>
                editingEvent?.id === e.id ? (
                  <article className="timeline-editor" key={e.id}>
                    <span className="timeline-dot" />
                    <Select
                      name="Event / status"
                      value={editingEvent.type}
                      options={statuses}
                      onChange={(value) =>
                        setEditingEvent({
                          ...editingEvent,
                          type: value as ApplicationEvent['type'],
                        })
                      }
                    />
                    <Field
                      name="Event Date"
                      type="date"
                      value={localDay(editingEvent.occurredAt)}
                      onChange={(value) =>
                        setEditingEvent({ ...editingEvent, occurredAt: dayToIso(value) })
                      }
                    />
                    <label>
                      Event notes
                      <textarea
                        value={editingEvent.notes}
                        onChange={(event) =>
                          setEditingEvent({ ...editingEvent, notes: event.target.value })
                        }
                      />
                    </label>
                    <div className="event-actions">
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            changed(
                              await request<Application>(
                                `/applications/${a.id}/events/${e.id}`,
                                'PATCH',
                                {
                                  type: editingEvent.type,
                                  occurredAt: editingEvent.occurredAt,
                                  notes: editingEvent.notes,
                                },
                              ),
                            );
                            setEditingEvent(null);
                          })
                        }
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingEvent(null)}>Cancel</button>
                    </div>
                  </article>
                ) : (
                  <article key={e.id}>
                    <span className="timeline-dot" />
                    <strong>{label(e.type)}</strong>
                    <time>{new Date(e.occurredAt).toLocaleDateString()}</time>
                    {e.notes && e.notes !== 'Initial application record' && <p>{e.notes}</p>}
                    <div className="event-actions">
                      <button
                        className="icon-button"
                        aria-label="Edit event"
                        title="Edit event"
                        onClick={() => setEditingEvent(e)}
                      >
                        <ActionIcon kind="edit" />
                      </button>
                      <button
                        className="icon-button danger-text"
                        aria-label="Delete event"
                        title="Delete event"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm('Delete this timeline event?')) return;
                          run(async () =>
                            changed(
                              await request<Application>(
                                `/applications/${a.id}/events/${e.id}`,
                                'DELETE',
                              ),
                            ),
                          );
                        }}
                      >
                        <ActionIcon kind="delete" />
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
          <section className="panel form record-next-step">
            <details className="status-update-details">
              <summary>Update Application Status</summary>
              <div className="status-update-form">
                <Select name="New Status" value={type} options={statuses} onChange={setType} />
                <Field name="Status Date" type="date" value={when} onChange={setWhen} />
                <label>
                  Notes
                  <textarea value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} />
                </label>
                <button
                  className="primary"
                  disabled={busy || !when}
                  onClick={() =>
                    run(async () => {
                      changed(
                        await request<Application>('/applications/' + a.id + '/events', 'POST', {
                          type,
                          occurredAt: dayToIso(when),
                          notes: eventNotes,
                        }),
                      );
                      setEventNotes('');
                    })
                  }
                >
                  Save Status Update
                </button>
                <p className="muted">The latest update by date sets the current status.</p>
              </div>
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
