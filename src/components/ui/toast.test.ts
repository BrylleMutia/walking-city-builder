import { dismissToast, removeToast, toast, useToastStore } from './toast';

const toasts = () => useToastStore.getState().toasts;

beforeEach(() => useToastStore.setState({ toasts: [] }));

describe('toast', () => {
  it('adds newest first with a type and default duration', () => {
    toast('One');
    toast.success('Two', { description: 'more' });
    expect(toasts().map((t) => [t.title, t.type])).toEqual([
      ['Two', 'success'],
      ['One', 'default'],
    ]);
    expect(toasts()[0].duration).toBe(4000);
    expect(toast.loading('Wait') && toasts()[0].duration).toBe(Infinity);
  });

  it('updates in place when an id is reused', () => {
    const id = toast.loading('Saving…');
    toast.success('Saved', { id });
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toMatchObject({ id, type: 'success', title: 'Saved', version: 2 });
  });

  it('morphs a promise toast into success or error', async () => {
    await toast.promise(Promise.resolve(5), { loading: 'Buying', success: (n) => `Got ${n}`, error: 'Nope' });
    expect(toasts()[0]).toMatchObject({ type: 'success', title: 'Got 5' });

    await expect(
      toast.promise(Promise.reject(new Error('x')), { loading: 'Buying', success: 'Yes', error: 'Nope' }),
    ).rejects.toThrow('x');
    expect(toasts()[0]).toMatchObject({ type: 'error', title: 'Nope' });
  });

  it('dismiss marks closing; remove ignores a stale version', () => {
    const id = toast('Hi');
    dismissToast(id);
    expect(toasts()[0].closing).toBe(true);

    toast('Hi again', { id }); // re-shown while exiting
    removeToast(id, 1); // late callback from the first exit
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0].closing).toBe(false);

    removeToast(id, 2);
    expect(toasts()).toHaveLength(0);
  });
});
