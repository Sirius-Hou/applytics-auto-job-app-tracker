import {
  categories,
  terms,
  arrangements,
  statuses,
  sectionTypes,
  skillTypes,
  roleSummaryTags,
  type Application,
} from '../../shared/contracts';
import { label, Field, Select, type Runner } from './common';
import { useAddApplication } from '../controllers/useAddApplication';
export function Add({
  busy,
  run,
  saved,
}: {
  busy: boolean;
  run: Runner;
  saved: (a: Application) => void;
}) {
  const {
    raw,
    setRaw,
    url,
    setUrl,
    job,
    editJob: edit,
    status,
    setStatus,
    applied,
    setApplied,
    notes,
    setNotes,
    parse,
    save,
  } = useAddApplication({ run, saved });
  return (
    <>
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
      <section className="panel form">
        <h2>Original posting</h2>
        <Field name="Job URL" value={url} type="url" onChange={setUrl} />
        <label>
          Full job description
          <textarea
            className="jd-input"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste the complete job description here…"
          />
        </label>
        <div className="actions">
          <p>AI extraction with strict validation. Missing details stay unknown.</p>
          <button className="primary" disabled={busy || !raw.trim() || !url} onClick={parse}>
            {busy ? 'Parsing with AI…' : 'Parse with AI →'}
          </button>
        </div>
      </section>
      {job && (
        <section className="panel form">
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
            <Select name="Initial status" value={status} options={statuses} onChange={setStatus} />
            <Field name="Application Date" type="date" value={applied} onChange={setApplied} />
          </div>
          <label>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="actions">
            <span>Original JD is preserved exactly as pasted.</span>
            <button className="primary" disabled={busy || !applied} onClick={save}>
              {busy ? 'Saving…' : 'Save application'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
