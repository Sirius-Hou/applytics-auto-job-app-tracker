export type SessionUser = { id: string; email: string; displayName: string | null };

export type ApplicationListRow = {
  id: string;
  company: string | null;
  title: string | null;
  status: string;
  appliedAt: string;
  category: string;
  term: string;
  workArrangement: string;
  countryCode: string | null;
  updatedAt: string;
};

export type AppView = 'list' | 'add' | 'detail' | 'settings';
