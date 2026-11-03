import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { renderThumbnail } from '../chart/thumbnail';
import { CraftType, Pattern } from '../domain/pattern';

/** A chart as the backend stores it. */
export interface StoredPattern extends Pattern {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** An entry of the chart list: everything except the chart itself. */
export interface PatternSummary {
  id: string;
  title: string;
  craftType: CraftType;
  width: number;
  height: number;
  thumbnail: string | null;
  updatedAt: string;
}

export interface PatternPage {
  items: PatternSummary[];
  total: number;
  page: number;
  size: number;
}

/** Charts fetched per page of the library. */
const PAGE_SIZE = 50;

/** The fields of a pattern the backend accepts, nothing that only exists in the editor. */
function body(pattern: Pattern, version?: number) {
  const { title, craftType, width, height, palette, cells, symbols } = pattern;
  return {
    title,
    craftType,
    width,
    height,
    palette,
    cells,
    symbols,
    thumbnail: renderThumbnail(pattern),
    version,
  };
}

/** The route of a chart. An id from the address stays inside its path segment. */
function path(id: string): string {
  return `/api/patterns/${encodeURIComponent(id)}`;
}

/** The pattern routes of the backend. */
@Injectable({ providedIn: 'root' })
export class PatternApi {
  private readonly http = inject(HttpClient);

  list(page: number): Promise<PatternPage> {
    return firstValueFrom(
      this.http.get<PatternPage>(`/api/patterns?page=${page}&size=${PAGE_SIZE}`),
    );
  }

  get(id: string): Promise<StoredPattern> {
    return firstValueFrom(this.http.get<StoredPattern>(path(id)));
  }

  create(pattern: Pattern): Promise<StoredPattern> {
    return firstValueFrom(this.http.post<StoredPattern>('/api/patterns', body(pattern)));
  }

  save(id: string, pattern: Pattern, version: number): Promise<StoredPattern> {
    return firstValueFrom(this.http.put<StoredPattern>(path(id), body(pattern, version)));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(path(id)));
  }
}
