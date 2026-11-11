/**
 * Thematic taxonomy (spec §3). In Phase 2 these rows live in the
 * `categories` table; this file is the seed and the type-safe lookup.
 */
import type { Locale } from "./content/types";

export interface Category {
  slug: string;
  name: string;
  namePt: string;
  /** Hue used for the small category dot. */
  hue: number;
  topics: string[];
}

export const CATEGORIES: Category[] = [
  { slug: "gender", name: "Gender Equality & Feminism", namePt: "Igualdade de Gênero e Feminismo", hue: 330, topics: ["Women's suffrage", "Women in STEM", "Political representation"] },
  { slug: "lgbtq", name: "LGBTQ+ Rights & Diversity", namePt: "Direitos LGBTQ+ e Diversidade", hue: 285, topics: ["Marriage equality", "Anti-discrimination law", "History"] },
  { slug: "race", name: "Racial Equality & Racism", namePt: "Igualdade Racial e Racismo", hue: 20, topics: ["Civil rights", "Apartheid", "Abolition"] },
  { slug: "environment", name: "Environment & Climate", namePt: "Meio Ambiente e Clima", hue: 150, topics: ["Climate agreements", "Renewable energy", "Conservation"] },
  { slug: "human-rights", name: "Human Rights & Social Justice", namePt: "Direitos Humanos e Justiça Social", hue: 255, topics: ["UDHR", "Refugees", "Humanitarian organisations"] },
  { slug: "disability", name: "Accessibility & Disability Rights", namePt: "Acessibilidade e Direitos das Pessoas com Deficiência", hue: 200, topics: ["Inclusion", "Assistive technology", "Legislation"] },
  { slug: "indigenous", name: "Indigenous Peoples & Cultural Preservation", namePt: "Povos Indígenas e Preservação Cultural", hue: 45, topics: ["Land rights", "Languages", "Heritage"] },
  { slug: "tech", name: "Technology, AI & Society", namePt: "Tecnologia, IA e Sociedade", hue: 225, topics: ["Algorithmic bias", "Privacy", "AI ethics"] },
  { slug: "education", name: "Education & Equal Opportunities", namePt: "Educação e Igualdade de Oportunidades", hue: 175, topics: ["Access", "Literacy", "Digital divide"] },
  { slug: "politics", name: "Politics, Democracy & Representation", namePt: "Política, Democracia e Representação", hue: 0, topics: ["Voting rights", "Civil liberties", "Representation"] },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): Category {
  return BY_SLUG.get(slug) ?? { slug, name: slug, namePt: slug, hue: 260, topics: [] };
}

export function categoryName(slug: string, locale: Locale): string {
  const c = getCategory(slug);
  return locale === "pt-BR" ? c.namePt : c.name;
}
