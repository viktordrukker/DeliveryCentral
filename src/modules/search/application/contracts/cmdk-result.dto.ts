/**
 * FE-#270 — Global ⌘K search result.
 *
 * One row per matched entity. Caller renders by `kind`; `rank` is used
 * to order results across mixed entity types.
 */

export type CmdkResultKind = 'person' | 'project' | 'position' | 'case' | 'assignment';

export interface CmdkResultDto {
  kind: CmdkResultKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  /** 0..1 relevance — prefix-match scores highest, substring lower, archived de-ranked. */
  rank: number;
}
