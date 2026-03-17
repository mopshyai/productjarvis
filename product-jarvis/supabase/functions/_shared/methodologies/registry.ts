import type { MethodCategory, MethodologyDefinition, MethodologyId } from './types.ts';
import catalogData from './catalog.v1.json' with { type: 'json' };

const catalog = catalogData as MethodologyDefinition[];

export async function getMethodologyCatalog() {
  return catalog;
}

export async function getMethodologyById(id: MethodologyId) {
  return catalog.find((item) => item.id === id) || null;
}

export async function getMethodologiesByCategory(category: MethodCategory) {
  return catalog.filter((item) => item.category === category && !item.deprecated);
}

export async function getActiveMethodologyIds(): Promise<MethodologyId[]> {
  return catalog.filter((item) => !item.deprecated).map((item) => item.id);
}
