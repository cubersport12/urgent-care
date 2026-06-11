import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { formatRescueItemDataSchemaForPrompt, NullableValue, rescueItemDataSchema } from '@/core/utils';
import { environment } from '../../../environments/environment';
import { z } from 'zod';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';

type DeepSeekMessageRole = 'system' | 'user' | 'assistant';

type DeepSeekMessage = {
  role: DeepSeekMessageRole;
  content: string;
};

type DeepSeekChatCompletionRequest = {
  model: string;
  messages: DeepSeekMessage[];
  stream: false;
};

type DeepSeekChatCompletionResponse = {
  choices?: {
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }[];
  error?: {
    message: string;
    type?: string;
  };
};

export type AppAIAskOptions = {
  model?: string;
  systemPrompt?: NullableValue<string>;
  messages?: DeepSeekMessage[];
};

@Injectable({
  providedIn: 'root'
})
export class AppAIService {
  private readonly _http = inject(HttpClient);

  public ask(prompt: string, options?: AppAIAskOptions): Observable<string> {
    if (!environment.deepseekToken) {
      return throwError(() => new Error('DEEPSEEK_TOKEN не задан. Укажите переменную окружения перед сборкой или запуском.'));
    }
    const messages: DeepSeekMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    if (options?.messages?.length) {
      messages.push(...options.messages);
    }
    messages.push({ role: 'user', content: prompt });

    const body: DeepSeekChatCompletionRequest = {
      model: options?.model ?? DEFAULT_MODEL,
      messages,
      stream: false
    };

    return this._http.post<DeepSeekChatCompletionResponse>(DEEPSEEK_API_URL, body, {
      headers: {
        'Authorization': `Bearer ${environment.deepseekToken}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      switchMap((response) => {
        const content = response.choices?.[0]?.message?.content?.trim();
        if (content) {
          return of(content);
        }
        return throwError(() => new Error(response.error?.message ?? 'Пустой ответ от DeepSeek'));
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          const apiMessage = error.error?.error?.message ?? error.error?.message;
          return throwError(() => new Error(apiMessage ?? error.message));
        }
        if (error instanceof Error) {
          return throwError(() => error);
        }
        return throwError(() => new Error('Ошибка запроса к DeepSeek'));
      })
    );
  }

  public generateRescue(prompt: string): Observable<z.infer<typeof rescueItemDataSchema>> {
    const schemaJson = formatRescueItemDataSchemaForPrompt();
    const userPrompt = `JSON Schema целевого ответа (объект AppRescueItemDataVm):

${schemaJson}

Задание: ${prompt}

Требования:
- Режим спасения — визуальная новелла: parameters, scenes, опционально completion.
- Допустимы вводные слайды без choices перед первым выбором.
- Сценарий должен быть интересным и живым, не «душным».
- id параметров, сцен и choices — уникальные UUID-строки.
- parameterChanges[].parameterId ссылается на parameters[].id.
- nextSceneId ссылается на scenes[].id или null.
- completion.success / failure — деревья compare и group по parameterId.
- background и defaultBackground — строки-идентификаторы фона (например bg-hospital).
- Верни ТОЛЬКО валидный JSON-объект без markdown-обёртки и комментариев.`;

    return this.ask(userPrompt, {
      systemPrompt: 'Ты топовый сценарист визуальных новелл. Ты генерируешь сцены для визуальной новеллы на основе описания в медицинском направлении.'
    }).pipe(
      map(response => this._parseRescueItemDataResponse(response))
    );
  }

  private _parseRescueItemDataResponse(response: string): z.infer<typeof rescueItemDataSchema> {
    let json: unknown;
    try {
      json = JSON.parse(this._extractJsonObject(response));
    }
    catch {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Error('ИИ вернул невалидный JSON. Попробуйте уточнить промпт и повторить.');
    }
    const parsed = rescueItemDataSchema.safeParse(json);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map(issue => `${issue.path.join('.') || 'корень'}: ${issue.message}`)
        .join('; ');
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Error(`JSON не соответствует схеме: ${details}`);
    }
    return parsed.data;
  }

  private _extractJsonObject(text: string): string {
    const trimmed = text.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
    return fenced ? fenced[1].trim() : trimmed;
  }
}
