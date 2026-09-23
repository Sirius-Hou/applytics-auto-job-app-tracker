export const label = (s: string) =>
  s === 'OA'
    ? 'OA'
    : s === 'GENERAL_SWE'
      ? 'General Software Engineering'
      : s === 'COOP'
        ? 'Co-op'
        : s
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/^./, (c) => c.toUpperCase());
export const localDate = (s = new Date().toISOString()) => {
  const d = new Date(s);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const localDay = (s = new Date().toISOString()) => localDate(s).slice(0, 10);
export const dayToIso = (day: string) => new Date(`${day}T12:00:00`).toISOString();
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || 'Request failed');
  return data;
}
export function Field({
  name,
  value,
  onChange,
  type = 'text',
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label>
      {name}
      <input
        type={type}
        lang={type === 'date' ? 'en-US' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Select({
  name,
  value,
  options,
  onChange,
  all = false,
  labels = {},
}: {
  name: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  all?: boolean;
  labels?: Record<string, string>;
}) {
  return (
    <label>
      {name}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {all && <option value="">All</option>}
        {options.map((v) => (
          <option key={v} value={v}>
            {labels[v] ?? label(v)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MultiSelect({
  name,
  value,
  options,
  labels = {},
  onChange,
}: {
  name: string;
  value: string;
  options: readonly string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  const selected = value ? value.split(',').filter(Boolean) : [];
  const toggle = (option: string) =>
    onChange(
      (selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option]
      ).join(','),
    );
  return (
    <details className="multi-select">
      <summary>
        <span>{name}</span>
        <strong>
          {selected.length ? `${selected.length} selected` : 'All'}{' '}
          <span aria-hidden="true">⌄</span>
        </strong>
      </summary>
      <div className="multi-select-menu">
        {options.map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
            />
            {labels[option] ?? label(option)}
          </label>
        ))}
      </div>
    </details>
  );
}

export type Runner = (fn: () => Promise<void>) => Promise<void>;
