import type { MethodCategory, MethodologyDefinition, MethodologyId } from './types.ts';

const CATALOG_URL = new URL('./catalog.v1.json', import.meta.url);
let cache: MethodologyDefinition[] | null = null;

async function loadCatalog(): Promise<MethodologyDefinition[]> {
  if (cache) return cache;
  const raw = await Deno.readTextFile(CATALOG_URL);
  cache = JSON.parse(raw) as MethodologyDefinition[];
  return cache;
}

export async function getMethodologyCatalog() {
  return await loadCatalog();
}

export async function getMethodologyById(id: MethodologyId) {
  const catalog = await loadCatalog();
  return catalog.find((item) => item.id === id) || null;
}

export async function getMethodologiesByCategory(category: MethodCategory) {
  const catalog = await loadCatalog();
  return catalog.filter((item) => item.category === category && !item.deprecated);
}

export async function getActiveMethodologyIds(): Promise<MethodologyId[]> {
  const catalog = await loadCatalog();
  return catalog.filter((item) => !item.deprecated).map((item) => item.id);
}
