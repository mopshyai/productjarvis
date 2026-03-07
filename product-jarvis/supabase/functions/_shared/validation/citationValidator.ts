export type Citation = {
  type?: string;
  id?: string;
  label?: string;
  link?: string;
};

export function normalizeCitations(value: unknown): Citation[] {
  const list = Array.isArray(value) ? value : [];
  if (!list.length) {
    return [{ type: 'system', id: 'no-source', label: 'No source found', link: '' }];
  }

  return list.map((citation) => {
    const item = (citation || {}) as Citation;
    return {
      type: item.type || 'system',
      id: item.id || 'no-source',
      label: item.label || 'No source found',
      link: item.link || '',
    };
  });
}
