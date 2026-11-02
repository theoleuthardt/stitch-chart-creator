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

/** The backend sends `null` for a chart without symbols; the model has no such field then. */
function fromServer(stored: StoredPattern): StoredPattern {
  const { symbols, ...pattern } = stored;
  return symbols ? stored : pattern;
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

  async get(id: string): Promise<StoredPattern> {
    return fromServer(await firstValueFrom(this.http.get<StoredPattern>(`/api/patterns/${id}`)));
  }

  create(pattern: Pattern): Promise<StoredPattern> {
    return firstValueFrom(this.http.post<StoredPattern>('/api/patterns', body(pattern)));
  }

  save(id: string, pattern: Pattern, version: number): Promise<StoredPattern> {
    return firstValueFrom(
      this.http.put<StoredPattern>(`/api/patterns/${id}`, body(pattern, version)),
    );
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/patterns/${id}`));
  }
}
