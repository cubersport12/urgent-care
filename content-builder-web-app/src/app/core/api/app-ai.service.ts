import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, retry, throwError } from 'rxjs';
import {
  aiGeneratedQuestionsSchema,
  rescueItemDataSchema
} from '@/core/utils';
import { API_BASE, getSessionId } from './api-client';
import { z } from 'zod';

export type GeneratedTestResponse = z.infer<typeof aiGeneratedQuestionsSchema>;
export type GeneratedRescueResponse = z.infer<typeof rescueItemDataSchema>;

@Injectable({
  providedIn: 'root'
})
export class AppAIService {
  private readonly _http = inject(HttpClient);

  private _getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const sessionId = getSessionId();
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    return headers;
  }

  public generateTestQuestions(prompt: string): Observable<GeneratedTestResponse> {
    const url = `${API_BASE}/api/v1/ai/generate-test`;
    return this._http.post<{ questions: unknown[] }>(url, { prompt }, { headers: this._getHeaders() }).pipe(
      map((response) => {
        const parsed = aiGeneratedQuestionsSchema.safeParse(response);
        if (!parsed.success) {
          const details = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'корень'}: ${issue.message}`)
            .join('; ');
          throw new Error(`Ответ ИИ не соответствует схеме вопросов: ${details}`);
        }
        return parsed.data;
      }),
      // Одна автоматическая попытка, если модель вернула ответ вне схемы или сеть моргнула
      retry(1),
      catchError((error: unknown) => this._handleError(error, 'Не удалось сгенерировать вопросы к тесту'))
    );
  }

  public generateRescue(
    prompt: string,
    sceneCount?: number | null,
    difficulty?: string | null
  ): Observable<GeneratedRescueResponse> {
    const url = `${API_BASE}/api/v1/ai/generate-rescue`;
    const body: Record<string, unknown> = { prompt };
    if (sceneCount != null) {
      body['sceneCount'] = sceneCount;
    }
    if (difficulty) {
      body['difficulty'] = difficulty;
    }
    return this._http.post<unknown>(url, body, { headers: this._getHeaders() }).pipe(
      map((response) => {
        const parsed = rescueItemDataSchema.safeParse(response);
        if (!parsed.success) {
          const details = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'корень'}: ${issue.message}`)
            .join('; ');
          throw new Error(`Ответ ИИ не соответствует схеме сценария: ${details}`);
        }
        return parsed.data;
      }),
      retry(1),
      catchError((error: unknown) => this._handleError(error, 'Не удалось сгенерировать сценарий спасения'))
    );
  }

  private _handleError(error: unknown, fallbackMessage: string): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.detail || error.error?.message;
      return throwError(() => new Error(typeof apiMessage === 'string' ? apiMessage : fallbackMessage));
    }
    if (error instanceof Error) {
      return throwError(() => error);
    }
    return throwError(() => new Error(fallbackMessage));
  }
}
