// Created by weixi on 2026/10/26.
export interface TocHeading { depth: number; slug: string; text: string }
export interface TocChapter { heading: TocHeading; children: TocHeading[] }
export function groupTocHeadings(headings: TocHeading[]): TocChapter[] {
  const supported = headings.filter(({ depth, slug }) => depth >= 1 && depth <= 6 && slug !== 'footnote-label');
  const baseDepth = supported.reduce((depth, heading) => Math.min(depth, heading.depth), 6);
  const chapters: TocChapter[] = [];
  for (const heading of supported) {
    if (heading.depth > baseDepth + 3) continue;
    if (heading.depth === baseDepth || chapters.length === 0) {
      chapters.push({ heading, children: [] });
    } else {
      chapters[chapters.length - 1].children.push(heading);
    }
  }
  return chapters;
}
