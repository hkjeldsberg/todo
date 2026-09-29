import type { Category, Content, Expression, Gender, GNumber, NounName, Scene, SceneObject } from "./types";

/** Typed, indexed view of the expression inventory and a scene's nouns. */
export class Inventory {
  readonly list: Expression[];
  private readonly byId: Map<string, Expression>;

  constructor(expressions: Expression[]) {
    this.list = expressions.slice().sort((a, b) => a.sort - b.sort);
    this.byId = new Map(this.list.map((e) => [e.id, e]));
  }

  get(id: string): Expression {
    const e = this.byId.get(id);
    if (!e) throw new Error(`unknown expression ${id}`);
    return e;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  /** Regional forms mean the same as their standard: arriba_de → encima_de. */
  meaning(id: string): string {
    return this.byId.get(id)?.standard ?? id;
  }

  byCategory(category: Category): Expression[] {
    return this.list.filter((e) => e.category === category);
  }
}

export function inventoryOf(content: Content): Inventory {
  return new Inventory(content.expressions);
}

// ─────────────────────────────────────────────────────────────── nouns

const ARTICLES: Record<string, { gender: Gender; number: GNumber; definite: boolean }> = {
  el: { gender: "m", number: "sg", definite: true },
  la: { gender: "f", number: "sg", definite: true },
  los: { gender: "m", number: "pl", definite: true },
  las: { gender: "f", number: "pl", definite: true },
  un: { gender: "m", number: "sg", definite: false },
  una: { gender: "f", number: "sg", definite: false },
  unos: { gender: "m", number: "pl", definite: false },
  unas: { gender: "f", number: "pl", definite: false },
  este: { gender: "m", number: "sg", definite: true },
  esta: { gender: "f", number: "sg", definite: true },
  estos: { gender: "m", number: "pl", definite: true },
  estas: { gender: "f", number: "pl", definite: true },
  ese: { gender: "m", number: "sg", definite: true },
  esa: { gender: "f", number: "sg", definite: true },
  esos: { gender: "m", number: "pl", definite: true },
  esas: { gender: "f", number: "pl", definite: true },
  aquel: { gender: "m", number: "sg", definite: true },
  aquella: { gender: "f", number: "sg", definite: true },
};

export function articleInfo(word: string) {
  return ARTICLES[word] ?? null;
}

/** The definite article for a gender/number. */
export function definiteArticle(gender: Gender, number: GNumber): string {
  if (number === "pl") return gender === "m" ? "los" : "las";
  return gender === "m" ? "el" : "la";
}

/** "la maceta" → { es: "la maceta", gender: "f", number: "sg" }. */
export function nounName(phrase: string): NounName {
  const [article] = phrase.split(" ");
  const info = ARTICLES[article];
  if (!info) throw new Error(`"${phrase}" has no article`);
  return { es: phrase, gender: info.gender, number: info.number };
}

/** Every name an object answers to, canonical first. */
export function namesOf(obj: SceneObject): NounName[] {
  return [{ es: obj.es, gender: obj.gender, number: obj.number }, ...obj.aliases.map(nounName)];
}

/** The noun without its article: "el puesto de fruta" → "puesto de fruta". */
export function bareNoun(phrase: string): string {
  return phrase.split(" ").slice(1).join(" ");
}

export function objectById(scene: Scene, id: string): SceneObject {
  const o = scene.objects.find((x) => x.id === id);
  if (!o) throw new Error(`${scene.id}: unknown object ${id}`);
  return o;
}
