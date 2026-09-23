export function normalizeCompany(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function normalizeSkill(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}
