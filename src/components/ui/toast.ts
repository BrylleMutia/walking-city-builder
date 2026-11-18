import { create } from 'zustand';

// Behaviour translated from Rare UI's "Toast" (rareui.com), whose API follows
// Sonner: toast(), toast.success(), toast.promise(), update by id.

export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  /** Muted second line under the title. */
  description?: string;
  /** A pill button on the right. Pressing it runs onPress and closes the toast. */
  action?: { label: string; onPress: () => void };
  /** Ms before it closes. Loading toasts stay until updated or dismissed. */
  duration?: number;
  /** Reuse an id to update a toast that is already showing. */
  id?: string;
  /** Close button + swipe away. Default true. */
  dismissible?: boolean;
}

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: ToastOptions['action'];
  duration: number;
  dismissible: boolean;
  /** Bumped on every update so the toast restarts its timer and re-pops its icon. */
  version: number;
  /** Set by dismiss; the toast plays its exit animation, then calls removeToast. */
  closing: boolean;
}

const DEFAULT_DURATION = 4000;
/** Older toasts beyond this are dropped (only 3 are visible anyway). */
const MAX_TOASTS = 6;

interface ToastState {
  /** Newest first. */
  toasts: ToastData[];
}

export const useToastStore = create<ToastState>(() => ({ toasts: [] }));

let counter = 0;

function show(type: ToastType, title: string, options: ToastOptions = {}): string {
  const id = options.id ?? `t${++counter}`;
  const duration = options.duration ?? (type === 'loading' ? Infinity : DEFAULT_DURATION);
  useToastStore.setState(({ toasts }) => {
    // A closing toast with this id is revived in place (its exit animation reverses).
    const existing = toasts.find((t) => t.id === id);
    const next: ToastData = {
      id,
      type,
      title,
      description: options.description,
      action: options.action,
      duration,
      dismissible: options.dismissible ?? true,
      version: (existing?.version ?? 0) + 1,
      closing: false,
    };
    if (existing) return { toasts: toasts.map((t) => (t.id === id ? next : t)) };
    return { toasts: [next, ...toasts.filter((t) => t.id !== id)].slice(0, MAX_TOASTS) };
  });
  return id;
}

/** Starts the exit animation (the Toaster removes it when the animation ends). */
export function dismissToast(id?: string) {
  useToastStore.setState(({ toasts }) => ({
    toasts: toasts.map((t) => (id === undefined || t.id === id ? { ...t, closing: true } : t)),
  }));
}

/**
 * Removes a toast once its exit (or swipe) animation is done. The version
 * guard keeps a late callback from removing a toast that was re-shown under
 * the same id meanwhile.
 */
export function removeToast(id: string, version: number) {
  useToastStore.setState(({ toasts }) => ({
    toasts: toasts.filter((t) => t.id !== id || t.version !== version),
  }));
}

type Message<T> = string | ((value: T) => string);

/**
 * Shows a toast from anywhere (no hook needed):
 *   toast('Saved') · toast.success('Pack bought', { description: '5 cards' })
 *   toast.promise(buyPack(), { loading: 'Buying…', success: 'Done!', error: 'Failed' })
 */
export const toast = Object.assign((title: string, options?: ToastOptions) => show('default', title, options), {
  success: (title: string, options?: ToastOptions) => show('success', title, options),
  error: (title: string, options?: ToastOptions) => show('error', title, options),
  warning: (title: string, options?: ToastOptions) => show('warning', title, options),
  info: (title: string, options?: ToastOptions) => show('info', title, options),
  loading: (title: string, options?: ToastOptions) => show('loading', title, options),
  dismiss: dismissToast,
  /** Shows `loading` until the task settles, then morphs the same toast into success or error. */
  promise<T>(
    task: Promise<T> | (() => Promise<T>),
    messages: { loading: string; success: Message<T>; error: Message<unknown> },
    options?: Omit<ToastOptions, 'id'>,
  ): Promise<T> {
    const id = show('loading', messages.loading, options);
    const run = typeof task === 'function' ? task() : task;
    run.then(
      (value) => {
        const m = messages.success;
        show('success', typeof m === 'function' ? m(value) : m, { ...options, id });
      },
      (err: unknown) => {
        const m = messages.error;
        show('error', typeof m === 'function' ? m(err) : m, { ...options, id });
      },
    );
    return run;
  },
});
