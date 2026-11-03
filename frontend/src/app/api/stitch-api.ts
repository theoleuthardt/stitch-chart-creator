import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StitchDrawing } from '../domain/symbols';

/** A custom stitch stored in the account. */
export interface AccountStitch extends StitchDrawing {
  id: string;
}

/** The custom stitch routes of the backend. */
@Injectable({ providedIn: 'root' })
export class StitchApi {
  private readonly http = inject(HttpClient);

  list(): Promise<AccountStitch[]> {
    return firstValueFrom(this.http.get<AccountStitch[]>('/api/stitches'));
  }

  create(stitch: StitchDrawing): Promise<AccountStitch> {
    return firstValueFrom(this.http.post<AccountStitch>('/api/stitches', stitch));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/stitches/${encodeURIComponent(id)}`));
  }
}
