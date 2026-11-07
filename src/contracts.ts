export interface Settings {
  autoDismissAppliedModal: boolean;
  hideAppliedJobs: boolean;
}
export type ButtonAction = 'ljtc-copy-about' | 'ljtc-send-chatgpt' | 'ljtc-send-sheets'
  | 'ljtc-copy-top' | 'ljtc-dismiss-job' | 'ljtc-open-settings' | 'ljtc-apply-job'
  | 'ljtc-previous-job' | 'ljtc-next-job';
export interface JobCard { id: string; node: HTMLElement }
export interface NavigationCard { id: string; element: HTMLElement }
export interface RemovedJobAnchor { id: string; previous: string[]; next: string[] }

type Failure<C extends string> = { ok: false; code: C };
export type ChatGptPartial = Failure<'SEND_BUTTON_NOT_READY'>;
export type ChatGptUncertain = Failure<'SUBMIT_FAILED' | 'CHATGPT_CONNECTION_FAILED'>;
export type ChatGptResult = ({ ok: true } | ChatGptPartial | ChatGptUncertain
  | Failure<'NO_TEXT' | 'INVALID_SENDER' | 'CHATGPT_NOT_OPEN' | 'CHATGPT_NOT_READY'
    | 'CHATGPT_SCRIPT_UNAVAILABLE' | 'COMPOSER_NOT_FOUND' | 'DRAFT_EXISTS'>) & { tabUrl?: string };
type SheetsDiagnostics = { cell?: string; nextCell?: string; selectedCell?: string; stage?: string };
export type SheetsPartial = Failure<'SHEETS_NEXT_CELL_FAILED'> & SheetsDiagnostics;
export type SheetsUncertain = Failure<'SHEETS_VERIFY_FAILED' | 'SHEETS_CONNECTION_FAILED'> & SheetsDiagnostics;
export type SheetsResult = { ok: true; cell: string; nextCell: string } | SheetsPartial | SheetsUncertain
  | Failure<'NO_TEXT' | 'INVALID_SENDER' | 'SHEETS_BUSY' | 'SHEETS_NOT_OPEN' | 'SHEETS_NOT_READY'
    | 'SHEETS_SELECTION_REQUIRED' | 'SHEETS_EDITING' | 'SHEETS_PASTE_FAILED' | 'SHEETS_SCRIPT_UNAVAILABLE'>;
export type PopupResult = { ok: true } | Failure<'INVALID_SENDER' | 'POPUP_OPEN_FAILED'>;
export type RefreshResult = { isJobsPage: boolean; buttonCount: number };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isSettings(value: unknown): value is Partial<Settings> {
  return isRecord(value) && Object.entries(value).every(([key, setting]) =>
    (key === 'autoDismissAppliedModal' || key === 'hideAppliedJobs') && typeof setting === 'boolean');
}
export function readSettings(value: unknown): Settings {
  const settings = isRecord(value) ? value : {};
  return {
    autoDismissAppliedModal: typeof settings.autoDismissAppliedModal === 'boolean' ? settings.autoDismissAppliedModal : false,
    hideAppliedJobs: typeof settings.hideAppliedJobs === 'boolean' ? settings.hideAppliedJobs : true
  };
}
export function errorMessage(error: unknown): string {
  return isRecord(error) && typeof error.message === 'string' ? error.message : String(error);
}

// One endpoint binds request validation, reply validation and a conservative
// fallback. An invalid/lost reply never initiates recovery or a second write.
interface Endpoint<Q extends { type: string }, R> {
  type: Q['type'];
  request: (value: unknown) => value is Q;
  response: (value: unknown) => value is R;
  invalid: R;
}
function textRequest<T extends string>(type: T) {
  return (value: unknown): value is { type: T; text: string } =>
    isRecord(value) && value.type === type && typeof value.text === 'string';
}
function signalRequest<T extends string>(type: T) {
  return (value: unknown): value is { type: T } => isRecord(value) && value.type === type;
}
const chatCodes = ['NO_TEXT', 'INVALID_SENDER', 'CHATGPT_NOT_OPEN', 'CHATGPT_NOT_READY',
  'CHATGPT_SCRIPT_UNAVAILABLE', 'COMPOSER_NOT_FOUND', 'DRAFT_EXISTS', 'SEND_BUTTON_NOT_READY',
  'SUBMIT_FAILED', 'CHATGPT_CONNECTION_FAILED'];
function isChatGptResult(value: unknown): value is ChatGptResult {
  return isRecord(value) && (value.tabUrl === undefined || typeof value.tabUrl === 'string')
    && (value.ok === true || (value.ok === false && typeof value.code === 'string' && chatCodes.includes(value.code)));
}
const sheetsCodes = ['NO_TEXT', 'INVALID_SENDER', 'SHEETS_BUSY', 'SHEETS_NOT_OPEN', 'SHEETS_NOT_READY',
  'SHEETS_SELECTION_REQUIRED', 'SHEETS_EDITING', 'SHEETS_PASTE_FAILED', 'SHEETS_SCRIPT_UNAVAILABLE',
  'SHEETS_NEXT_CELL_FAILED', 'SHEETS_VERIFY_FAILED', 'SHEETS_CONNECTION_FAILED'];
function isSheetsResult(value: unknown): value is SheetsResult {
  if (!isRecord(value)) return false;
  if (value.ok === true) return typeof value.cell === 'string' && typeof value.nextCell === 'string';
  return value.ok === false && typeof value.code === 'string' && sheetsCodes.includes(value.code)
    && ['cell', 'nextCell', 'selectedCell', 'stage'].every(key => value[key] === undefined || typeof value[key] === 'string');
}
const chatInvalid: ChatGptResult = { ok: false, code: 'CHATGPT_CONNECTION_FAILED' };
const sheetsInvalid: SheetsResult = { ok: false, code: 'SHEETS_CONNECTION_FAILED' };
export const sendChatGpt: Endpoint<{ type: 'LJTC_SEND_TO_CHATGPT'; text: string }, ChatGptResult> = {
  type: 'LJTC_SEND_TO_CHATGPT', request: textRequest('LJTC_SEND_TO_CHATGPT'), response: isChatGptResult, invalid: chatInvalid
};
export const fillChatGpt: Endpoint<{ type: 'LJTC_FILL_CHATGPT'; text: string }, ChatGptResult> = {
  type: 'LJTC_FILL_CHATGPT', request: textRequest('LJTC_FILL_CHATGPT'), response: isChatGptResult, invalid: chatInvalid
};
export const sendSheets: Endpoint<{ type: 'LJTC_SEND_TO_SHEETS'; text: string }, SheetsResult> = {
  type: 'LJTC_SEND_TO_SHEETS', request: textRequest('LJTC_SEND_TO_SHEETS'), response: isSheetsResult, invalid: sheetsInvalid
};
export const fillSheets: Endpoint<{ type: 'LJTC_FILL_SHEETS'; text: string }, SheetsResult> = {
  type: 'LJTC_FILL_SHEETS', request: textRequest('LJTC_FILL_SHEETS'), response: isSheetsResult, invalid: sheetsInvalid
};
export const openPopup: Endpoint<{ type: 'LJTC_OPEN_POPUP' }, PopupResult> = {
  type: 'LJTC_OPEN_POPUP', request: signalRequest('LJTC_OPEN_POPUP'),
  response: (value): value is PopupResult => isRecord(value) && (value.ok === true
    || (value.ok === false && (value.code === 'INVALID_SENDER' || value.code === 'POPUP_OPEN_FAILED'))),
  invalid: { ok: false, code: 'POPUP_OPEN_FAILED' }
};
export const refreshButtonsMessage: Endpoint<{ type: 'LJTC_REFRESH_BUTTONS' }, RefreshResult> = {
  type: 'LJTC_REFRESH_BUTTONS', request: signalRequest('LJTC_REFRESH_BUTTONS'),
  response: (value): value is RefreshResult => isRecord(value) && typeof value.isJobsPage === 'boolean'
    && typeof value.buttonCount === 'number' && Number.isInteger(value.buttonCount) && value.buttonCount >= 0,
  invalid: { isJobsPage: false, buttonCount: 0 }
};
export const settingsUpdated: Endpoint<{ type: 'LJTC_SETTINGS_UPDATED'; settings: Partial<Settings> }, { ok: true } | Failure<'INVALID_MESSAGE'>> = {
  type: 'LJTC_SETTINGS_UPDATED', request: (value): value is { type: 'LJTC_SETTINGS_UPDATED'; settings: Partial<Settings> } =>
    isRecord(value) && value.type === 'LJTC_SETTINGS_UPDATED' && isSettings(value.settings),
  response: (value): value is { ok: true } | Failure<'INVALID_MESSAGE'> => isRecord(value)
    && (value.ok === true || (value.ok === false && value.code === 'INVALID_MESSAGE')),
  invalid: { ok: false, code: 'INVALID_MESSAGE' }
};
export async function sendRuntime<Q extends { type: string }, R>(endpoint: Endpoint<Q, R>, message: NoInfer<Q>): Promise<R> {
  const value: unknown = await chrome.runtime.sendMessage(message);
  return endpoint.response(value) ? value : endpoint.invalid;
}
export async function sendTab<Q extends { type: string }, R>(endpoint: Endpoint<Q, R>, tabId: number, message: NoInfer<Q>): Promise<R> {
  const value: unknown = await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
  return endpoint.response(value) ? value : endpoint.invalid;
}
export function listen<Q extends { type: string }, R>(endpoint: Endpoint<Q, R>,
  handler: (message: NoInfer<Q>, sender: chrome.runtime.MessageSender, reply: (response: NoInfer<R>) => void) => boolean): void {
  chrome.runtime.onMessage.addListener((value: unknown, sender, reply: (response: R) => void) => {
    if (!isRecord(value) || value.type !== endpoint.type) return false;
    if (!endpoint.request(value)) { reply(endpoint.invalid); return false; }
    return handler(value, sender, reply);
  });
}
