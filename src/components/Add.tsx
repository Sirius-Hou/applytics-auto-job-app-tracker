import { useEffect, useState } from 'react';
import {
  categories,
  terms,
  arrangements,
  statuses,
  sectionTypes,
  skillTypes,
  roleSummaryTags,
  type Job,
  type Application,
} from '../../shared/contracts';
import { dayToIso, label, localDay, request, Field, Select, type Runner } from './common';
import LatticeLoader from './LatticeLoader';
import samplePosting from '../demo/sample-jd.txt?raw';

const sampleUrl = samplePosting.match(/^Job URL:\s*(.+)$/m)?.[1].trim() ?? '';
const sampleDescription = samplePosting.split(/^JD:\s*$/m)[1]?.trim() ?? '';
if (!sampleUrl || !sampleDescription) throw new Error('The demo job sample is incomplete.');

export function Add({
  busy,
  run,
  saved,
  demoTourStep = 0,
  advanceDemoTour,
}: {
  busy: boolean;
  run: Runner;
  saved: (a: Application) => void;
  demoTourStep?: number;
  advanceDemoTour?: () => void;
}) {
  const [raw, setRaw] = useState(demoTourStep >= 7 ? sampleDescription : '');
  const [url, setUrl] = useState(demoTourStep >= 7 ? sampleUrl : '');
  const [job, setJob] = useState<Job | null>(null);
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState('APPLIED');
  const [applied, setApplied] = useState(localDay());
  const [notes, setNotes] = useState('');
  const [parseTargetRect, setParseTargetRect] = useState<DOMRect | null>(null);
  const [saveTargetRect, setSaveTargetRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (demoTourStep === 8) {
      window.setTimeout(() => {
        const target = document.querySelector('.demo-review-target');
        if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY });
      }, 150);
      return;
    }
    if (demoTourStep === 9) {
      window.setTimeout(() => {
        const target = document.querySelector('.demo-save-target');
        target?.scrollIntoView({ block: 'center' });
        if (target) setSaveTargetRect(target.getBoundingClientRect());
      });
      return;
    }
    if (demoTourStep !== 7) return;
    window.setTimeout(() => {
      const target = document.querySelector('.demo-parse-target');
      target?.scrollIntoView({ block: 'center' });
      if (target) setParseTargetRect(target.getBoundingClientRect());
    });
  }, [demoTourStep]);
  const edit = (key: keyof Job, value: unknown) => setJob((j) => (j ? { ...j, [key]: value } : j));
  return (
    <>
      {(demoTourStep === 7 || demoTourStep === 8 || demoTourStep === 9) && (
        <div className={`demo-tour demo-tour-step-${demoTourStep}`} role="dialog" aria-modal="true">
          <div className="demo-tour-backdrop" />
          {(demoTourStep === 7 ? parseTargetRect : demoTourStep === 9 ? saveTargetRect : null) && (
            <div
              className="demo-tour-arrow"
              aria-hidden="true"
              style={{
                top:
                  demoTourStep === 7
                    ? parseTargetRect!.top + parseTargetRect!.height + 10
                    : saveTargetRect!.top - 44,
                left:
                  demoTourStep === 7
                    ? parseTargetRect!.left + parseTargetRect!.width / 2
                    : saveTargetRect!.left + saveTargetRect!.width / 2,
              }}
            >
              {demoTourStep === 7 ? '↑' : '↓'}
            </div>
          )}
          <section
            className="demo-tour-card"
            style={
              demoTourStep === 7 && parseTargetRect
                ? {
                    top: parseTargetRect.top + parseTargetRect.height + 55,
                    left: Math.min(
                      window.innerWidth - 460,
                      Math.max(20, parseTargetRect.left + parseTargetRect.width - 440),
                    ),
                    width: 440,
                    transform: 'none',
                  }
                : demoTourStep === 9 && saveTargetRect
                  ? {
                      top: Math.max(20, saveTargetRect.top - 250),
                      left: Math.max(20, saveTargetRect.left + saveTargetRect.width - 440),
                      width: 440,
                      transform: 'none',
                    }
                  : undefined
            }
          >
            <small>DEMO TOUR · {demoTourStep} OF 9</small>
            <h2>
              {demoTourStep === 7
                ? 'Parse this sample with AI'
                : demoTourStep === 8
                  ? 'Review extracted details'
                  : 'Save this application'}
            </h2>
            <p>
              {demoTourStep === 7
                ? 'The sample URL and job description are ready. Click Parse with AI and allow about 15–20 seconds. AI output must pass strict validation, so an occasional system glitch may cause an error—click Parse with AI again to retry.'
                : demoTourStep === 8
                  ? 'Review every extracted field below and correct anything you want before saving the application.'
                  : 'Click Add to Applications to save this parsed job to your application history.'}
            </p>
            {demoTourStep === 8 && (
              <button className="primary" onClick={advanceDemoTour}>
                Next
              </button>
            )}
          </section>
        </div>
      )}
      <div className="title-row">
        <div>
          <h1>Add Application</h1>
          <p>Paste a posting, review the extracted fields, and save it.</p>
        </div>
      </div>
      <div className="steps">
        <span className="selected">01 / Paste posting</span>
        <span className={job ? 'selected' : ''}>02 / Review & correct</span>
        <span>03 / Save to ledger</span>
      </div>
      <section className={`panel form${demoTourStep === 7 ? ' demo-editable-posting' : ''}`}>
        <h2>Original posting</h2>
        <Field
          name="Job URL"
          value={url}
          type="url"
          onChange={(v) => {
            setUrl(v);
            setJob(null);
          }}
        />
        <label>
          Full job description
          <textarea
            className="jd-input"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setJob(null);
            }}
            placeholder="Paste the complete job description here…"
          />
        </label>
        <div className="actions">
          <p>AI extraction with strict validation. Missing details stay unknown.</p>
          <button
            className={`primary parse-button${parsing ? ' parse-button-loading' : ''}${demoTourStep === 7 ? ' demo-tour-target demo-parse-target' : ''}`}
            disabled={busy || !raw.trim() || !url}
            onClick={async () => {
              setParsing(true);
              await run(async () => {
                setJob(await request<Job>('/parse', 'POST', { rawJd: raw, originalUrl: url }));
                if (demoTourStep === 7) advanceDemoTour?.();
              });
              setParsing(false);
            }}
          >
            {parsing ? <LatticeLoader /> : 'Parse with AI →'}
          </button>
        </div>
      </section>
      {demoTourStep === 7 && <div className="demo-tour-spacer" aria-hidden="true" />}
      {job && (
        <section
          className={`panel form${demoTourStep === 8 ? ' demo-tour-target demo-review-target' : ''}`}
        >
          <h2>Review extracted details</h2>
          <p className="muted">
            Check every field before saving. You can add any missing information.
          </p>
          <div className="grid">
            <Field
              name="Company"
              value={job.company || ''}
              onChange={(v) => edit('company', v || null)}
            />
            <Field
              name="Job title"
              value={job.title || ''}
              onChange={(v) => edit('title', v || null)}
            />
            <Select
              name="Employment Type"
              value={job.category}
              options={categories}
              onChange={(v) => edit('category', v)}
            />
            <Select
              name="Recruiting term"
              value={job.term}
              options={terms}
              onChange={(v) => edit('term', v)}
            />
            <Field
              name="Recruiting Year"
              type="number"
              value={String(job.recruitingYear ?? '')}
              onChange={(v) => edit('recruitingYear', v ? Number(v) : null)}
            />
            <Select
              name="Work Setting"
              value={job.workArrangement}
              options={arrangements}
              onChange={(v) => edit('workArrangement', v)}
            />
            <Field
              name="Canonical URL (optional)"
              value={job.canonicalUrl || ''}
              onChange={(v) => edit('canonicalUrl', v || null)}
            />
          </div>
          <h3>Smart role summary</h3>
          <div className="grid">
            {[0, 1].map((index) => (
              <Select
                key={index}
                name={index === 0 ? 'Primary direction' : 'Secondary direction'}
                value={job.roleSummary[index] ?? ''}
                options={index === 0 ? roleSummaryTags : ['', ...roleSummaryTags]}
                onChange={(value) =>
                  edit(
                    'roleSummary',
                    value
                      ? [
                          ...job.roleSummary.slice(0, index),
                          value,
                          ...job.roleSummary.slice(index + 1),
                        ]
                      : job.roleSummary.slice(0, 1),
                  )
                }
              />
            ))}
          </div>
          <h3>Locations</h3>
          {job.locations.map((l, i) => (
            <div className="subform" key={i}>
              <div className="grid">
                {(['city', 'region', 'countryCode'] as const).map((k) => (
                  <Field
                    key={k}
                    name={
                      k === 'countryCode'
                        ? 'Country Code'
                        : k === 'region'
                          ? 'State / Province'
                          : 'City'
                    }
                    value={l[k] || ''}
                    onChange={(v) =>
                      edit(
                        'locations',
                        job.locations.map((x, n) => {
                          if (n !== i) return x;
                          const updated = { ...x, [k]: v || null };
                          return {
                            ...updated,
                            rawText:
                              x.rawText ||
                              [updated.city, updated.region, updated.countryCode]
                                .filter(Boolean)
                                .join(', '),
                          };
                        }),
                      )
                    }
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  edit(
                    'locations',
                    job.locations.filter((_, n) => n !== i),
                  )
                }
              >
                Remove location
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              edit('locations', [
                ...job.locations,
                { rawText: '', city: null, region: null, countryCode: null },
              ])
            }
          >
            ＋ Add location
          </button>
          <h3>Compensation</h3>
          {job.compensation ? (
            <>
              <div className="grid">
                <Select
                  name="Currency"
                  value={job.compensation.currency ?? ''}
                  options={['', 'USD', 'CAD', 'CNY', 'EUR']}
                  labels={{
                    '': 'Unknown',
                    USD: 'US Dollar (USD)',
                    CAD: 'Canadian Dollar (CAD)',
                    CNY: 'Chinese Yuan (CNY)',
                    EUR: 'Euro (EUR)',
                  }}
                  onChange={(v) =>
                    edit('compensation', { ...job.compensation, currency: v || null })
                  }
                />
                {(['minimum', 'maximum'] as const).map((k) => (
                  <Field
                    key={k}
                    name={label(k)}
                    type="number"
                    value={String(job.compensation![k] ?? '')}
                    onChange={(v) =>
                      edit('compensation', {
                        ...job.compensation,
                        [k]: v === '' ? null : Number(v),
                      })
                    }
                  />
                ))}
                <Select
                  name="Salary Type"
                  value={job.compensation.payPeriod}
                  options={['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'UNKNOWN']}
                  labels={{
                    HOUR: 'Hourly',
                    DAY: 'Daily',
                    WEEK: 'Weekly',
                    MONTH: 'Monthly',
                    YEAR: 'Annually',
                    UNKNOWN: 'Unknown',
                  }}
                  onChange={(v) => edit('compensation', { ...job.compensation, payPeriod: v })}
                />
              </div>
              <button onClick={() => edit('compensation', null)}>Remove compensation</button>
            </>
          ) : (
            <button
              onClick={() =>
                edit('compensation', {
                  currency: null,
                  minimum: null,
                  maximum: null,
                  payPeriod: 'UNKNOWN',
                  rawText: '',
                })
              }
            >
              ＋ Add explicit compensation
            </button>
          )}
          <h3>Job Requirements</h3>
          {job.requirementSections.map((s, i) => (
            <div className="subform" key={i}>
              <div className="grid">
                <Field
                  name="Section Title"
                  value={s.rawHeading}
                  onChange={(v) =>
                    edit(
                      'requirementSections',
                      job.requirementSections.map((x, n) =>
                        n === i ? { ...x, rawHeading: v } : x,
                      ),
                    )
                  }
                />
                <Select
                  name="Requirement Type"
                  value={s.type}
                  options={sectionTypes}
                  onChange={(v) =>
                    edit(
                      'requirementSections',
                      job.requirementSections.map((x, n) => (n === i ? { ...x, type: v } : x)),
                    )
                  }
                />
              </div>
              <label>
                Requirements
                <textarea
                  value={s.content}
                  onChange={(e) =>
                    edit(
                      'requirementSections',
                      job.requirementSections.map((x, n) =>
                        n === i ? { ...x, content: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <button
                onClick={() =>
                  edit(
                    'requirementSections',
                    job.requirementSections
                      .filter((_, n) => n !== i)
                      .map((item, index) => ({ ...item, displayOrder: index })),
                  )
                }
              >
                Remove section
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              edit('requirementSections', [
                ...job.requirementSections,
                {
                  rawHeading: '',
                  type: 'UNKNOWN',
                  content: '',
                  displayOrder: job.requirementSections.length,
                },
              ])
            }
          >
            ＋ Add section
          </button>
          <h3>Skills & ATS Keywords</h3>
          {job.skills.map((skill, i) => (
            <div className="subform" key={`${skill.name}-${i}`}>
              <div className="grid">
                <Field
                  name="Skill Name"
                  value={skill.name}
                  onChange={(v) =>
                    edit(
                      'skills',
                      job.skills.map((item, index) => (index === i ? { ...item, name: v } : item)),
                    )
                  }
                />
                <Select
                  name="Skill type"
                  value={skill.type}
                  options={skillTypes}
                  onChange={(v) =>
                    edit(
                      'skills',
                      job.skills.map((item, index) => (index === i ? { ...item, type: v } : item)),
                    )
                  }
                />
                <Select
                  name="Requirement level"
                  value={skill.requirementType}
                  options={['MINIMUM', 'PREFERRED']}
                  onChange={(v) =>
                    edit(
                      'skills',
                      job.skills.map((item, index) =>
                        index === i ? { ...item, requirementType: v } : item,
                      ),
                    )
                  }
                />
              </div>
              <button
                onClick={() =>
                  edit(
                    'skills',
                    job.skills.filter((_, index) => index !== i),
                  )
                }
              >
                Remove skill
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              edit('skills', [
                ...job.skills,
                { name: '', type: 'ENGINEERING_PRACTICE', requirementType: 'PREFERRED' },
              ])
            }
          >
            ＋ Add skill
          </button>
          <h3>Years of Experience Requirement</h3>
          {job.experience ? (
            <div className="subform">
              <div className="grid">
                <Field
                  name="Minimum years"
                  type="number"
                  value={String(job.experience.minimumYears ?? '')}
                  onChange={(v) =>
                    edit('experience', {
                      ...job.experience,
                      minimumYears: v === '' ? null : Number(v),
                    })
                  }
                />
                <Field
                  name="Maximum years"
                  type="number"
                  value={String(job.experience.maximumYears ?? '')}
                  onChange={(v) =>
                    edit('experience', {
                      ...job.experience,
                      maximumYears: v === '' ? null : Number(v),
                    })
                  }
                />
                <Field
                  name="Original experience text"
                  value={job.experience.rawText}
                  onChange={(v) => edit('experience', { ...job.experience, rawText: v })}
                />
              </div>
              <button onClick={() => edit('experience', null)}>Remove experience rule</button>
            </div>
          ) : (
            <button
              onClick={() =>
                edit('experience', { minimumYears: null, maximumYears: null, rawText: '' })
              }
            >
              ＋ Add explicit experience rule
            </button>
          )}
          <h3>Application record</h3>
          <div className="grid">
            <Select
              name="Initial status"
              value={status}
              options={statuses.filter((value) => value !== 'OTHER')}
              onChange={setStatus}
            />
            <Field name="Application Date" type="date" value={applied} onChange={setApplied} />
          </div>
          <label>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="actions">
            <span>Original JD is preserved exactly as pasted.</span>
            <button
              className={`primary${demoTourStep === 9 ? ' demo-tour-target demo-save-target' : ''}`}
              disabled={busy || !applied}
              onClick={() =>
                run(async () =>
                  saved(
                    await request<Application>('/applications', 'POST', {
                      job,
                      status,
                      appliedAt: dayToIso(applied),
                      notes,
                    }),
                  ),
                )
              }
            >
              {busy ? 'Saving…' : demoTourStep === 9 ? 'Add to Applications' : 'Save application'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
