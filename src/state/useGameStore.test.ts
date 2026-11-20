// Offline city changes: they must survive until the server has them.
// (jest.mock calls are hoisted above these imports.)

import * as api from './backend';
import { initialData } from './gameLogic';
import type { ServerState } from './serverState';
import { useToastStore } from '../components/ui/toast';
import { useGameStore } from './useGameStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// A tiny fake game server: just enough of the backend module for the city queue.
jest.mock('./backend', () => {
  class BackendError extends Error {
    reason: string;
    constructor(reason: string) {
      super(reason);
      this.reason = reason;
    }
  }
  return {
    BackendError,
    ensureSession: jest.fn(),
    getAccountEmail: jest.fn(async () => null),
    verifySignInCode: jest.fn(),
    syncSteps: jest.fn(),
    fetchState: jest.fn(),
    placeItem: jest.fn(),
    removeItem: jest.fn(),
    moveItem: jest.fn(),
    buyPack: jest.fn(),
    updateProfile: jest.fn(),
    resetProgress: jest.fn(),
    subscribePlayer: jest.fn(async () => () => {}),
  };
});


const mocked = api as jest.Mocked<typeof api>;
const offline = () => new (api.BackendError as unknown as new (r: string) => Error)('offline');
const flush = () => new Promise((r) => setTimeout(r, 0));

let serverCity: ServerState['city'];

beforeEach(() => {
  // The live channel lives in module state: close one left open by a previous test.
  useGameStore.getState().pauseLive();
  jest.clearAllMocks();
  serverCity = [];
  mocked.ensureSession.mockResolvedValue('user-1');
  mocked.syncSteps.mockResolvedValue({ day: '', steps: 0, credited: 0, wood: 0, balance: 3000 });
  mocked.placeItem.mockImplementation(async (item_id, x, y) => {
    if (serverCity.some((t) => t.x === x && t.y === y)) {
      throw new (api.BackendError as unknown as new (r: string) => Error)('tile_occupied');
    }
    serverCity.push({ x, y, item_id });
    return { x, y, item_id };
  });
  mocked.fetchState.mockImplementation(async () => ({
    profile: null,
    steps: {},
    inventory: { bakery: { count: 1, foil: 0 }, 'lamp-post': { count: 1, foil: 0 } },
    city: [...serverCity],
  }));
  useGameStore.setState({
    ...initialData(),
    collection: { bakery: { count: 1, foil: 0 }, 'lamp-post': { count: 1, foil: 0 } },
    city: [],
    pendingCity: [],
    cloud: 'offline',
    onboarded: true,
    haul: { steps: 0, wood: 0 },
    showHaul: false,
  });
});

it('queues a placement made offline and uploads it on reconnect', async () => {
  expect(useGameStore.getState().placeItem('bakery', 2, 3)).toBe(true);
  expect(mocked.placeItem).not.toHaveBeenCalled();
  expect(useGameStore.getState().pendingCity).toEqual([{ op: 'place', itemId: 'bakery', x: 2, y: 3 }]);

  await useGameStore.getState().connect();

  expect(mocked.placeItem).toHaveBeenCalledWith('bakery', 2, 3);
  const s = useGameStore.getState();
  expect(s.cloud).toBe('online');
  expect(s.pendingCity).toEqual([]);
  expect(s.city).toEqual([{ itemId: 'bakery', x: 2, y: 3 }]);
});

it('queues a placement whose request is cut off by a lost connection', async () => {
  useGameStore.setState({ cloud: 'online' });
  mocked.placeItem.mockRejectedValueOnce(offline());

  useGameStore.getState().placeItem('lamp-post', 0, 0);
  await flush();

  const s = useGameStore.getState();
  expect(s.cloud).toBe('offline');
  expect(s.city).toEqual([{ itemId: 'lamp-post', x: 0, y: 0 }]);
  expect(s.pendingCity).toEqual([{ op: 'place', itemId: 'lamp-post', x: 0, y: 0 }]);
});

it('keeps queued changes when the reconnect attempt is still offline', async () => {
  useGameStore.getState().placeItem('bakery', 1, 1);
  mocked.ensureSession.mockRejectedValueOnce(offline());

  await useGameStore.getState().connect();

  const s = useGameStore.getState();
  expect(s.cloud).toBe('offline');
  expect(s.pendingCity).toHaveLength(1);
  expect(s.city).toEqual([{ itemId: 'bakery', x: 1, y: 1 }]);
});

it('drops a queued change the server rejects and adopts the server city', async () => {
  // Another device already built on 4,4 while this phone was offline.
  serverCity = [{ x: 4, y: 4, item_id: 'lamp-post' }];
  useGameStore.getState().placeItem('bakery', 4, 4);

  await useGameStore.getState().connect();

  const s = useGameStore.getState();
  expect(s.pendingCity).toEqual([]);
  expect(s.city).toEqual([{ itemId: 'lamp-post', x: 4, y: 4 }]);
});

it('replays placements and removals in order', async () => {
  const store = useGameStore.getState();
  store.placeItem('bakery', 1, 1);
  store.removeAt(1, 1);
  store.placeItem('bakery', 2, 2);
  mocked.removeItem.mockImplementation(async (x, y) => {
    serverCity = serverCity.filter((t) => !(t.x === x && t.y === y));
    return { x, y, item_id: 'bakery' };
  });

  await useGameStore.getState().connect();

  expect(mocked.placeItem.mock.calls).toEqual([
    ['bakery', 1, 1],
    ['bakery', 2, 2],
  ]);
  expect(mocked.removeItem).toHaveBeenCalledWith(1, 1);
  expect(useGameStore.getState().city).toEqual([{ itemId: 'bakery', x: 2, y: 2 }]);
});

describe('moving objects', () => {
  const moveOnServer = async (fx: number, fy: number, tx: number, ty: number) => {
    const from = serverCity.find((t) => t.x === fx && t.y === fy);
    if (!from) throw new (api.BackendError as unknown as new (r: string) => Error)('tile_empty');
    const to = serverCity.find((t) => t.x === tx && t.y === ty);
    serverCity = serverCity.map((t) =>
      t === from ? { ...t, x: tx, y: ty } : t === to ? { ...t, x: fx, y: fy } : t,
    );
    return { swapped: !!to };
  };

  beforeEach(() => {
    serverCity = [
      { x: 1, y: 1, item_id: 'bakery' },
      { x: 2, y: 2, item_id: 'lamp-post' },
    ];
    useGameStore.setState({
      city: [
        { itemId: 'bakery', x: 1, y: 1 },
        { itemId: 'lamp-post', x: 2, y: 2 },
      ],
    });
    mocked.moveItem.mockImplementation(moveOnServer);
  });

  it('moves at once and sends the move to the server', async () => {
    useGameStore.setState({ cloud: 'online' });
    expect(useGameStore.getState().moveItem(1, 1, 2, 2)).toBe(true);
    expect(useGameStore.getState().city).toEqual([
      { itemId: 'bakery', x: 2, y: 2 },
      { itemId: 'lamp-post', x: 1, y: 1 },
    ]);
    await flush();
    expect(mocked.moveItem).toHaveBeenCalledWith(1, 1, 2, 2);
    expect(useGameStore.getState().pendingCity).toEqual([]);
  });

  it('queues a move made offline and replays it on reconnect', async () => {
    useGameStore.getState().moveItem(1, 1, 5, 5);
    expect(mocked.moveItem).not.toHaveBeenCalled();
    expect(useGameStore.getState().pendingCity).toEqual([{ op: 'move', fx: 1, fy: 1, tx: 5, ty: 5 }]);

    await useGameStore.getState().connect();

    expect(mocked.moveItem).toHaveBeenCalledWith(1, 1, 5, 5);
    expect(useGameStore.getState().pendingCity).toEqual([]);
    expect(useGameStore.getState().city).toEqual(
      expect.arrayContaining([{ itemId: 'bakery', x: 5, y: 5 }]),
    );
    useGameStore.getState().pauseLive();
  });

  it('refuses a move to the same lot without calling the server', () => {
    useGameStore.setState({ cloud: 'online' });
    expect(useGameStore.getState().moveItem(1, 1, 1, 1)).toBe(false);
    expect(mocked.moveItem).not.toHaveBeenCalled();
  });
});

describe('live sync', () => {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let nudge: () => void;
  const stop = jest.fn();

  beforeEach(() => {
    mocked.subscribePlayer.mockImplementation(async (_user, onChange) => {
      nudge = onChange;
      return stop;
    });
  });
  afterEach(() => useGameStore.getState().pauseLive());

  it('subscribes on connect and picks up a change from another device', async () => {
    await useGameStore.getState().connect();
    await flush();
    expect(mocked.subscribePlayer).toHaveBeenCalledWith('user-1', expect.any(Function));

    serverCity = [{ x: 6, y: 6, item_id: 'lamp-post' }];
    nudge();
    nudge(); // several nudges per action collapse into one fetch
    await wait(500);

    expect(mocked.fetchState).toHaveBeenCalledTimes(2); // connect + one live refresh
    expect(useGameStore.getState().city).toEqual([{ itemId: 'lamp-post', x: 6, y: 6 }]);
  });

  it('keeps an own placement that the server has not answered yet', async () => {
    await useGameStore.getState().connect();
    await flush();
    let answer!: () => void;
    mocked.placeItem.mockImplementationOnce(
      (item_id, x, y) => new Promise((r) => (answer = () => r({ x, y, item_id }))),
    );

    useGameStore.getState().placeItem('bakery', 3, 3);
    nudge();
    await wait(500);
    expect(useGameStore.getState().city).toEqual([{ itemId: 'bakery', x: 3, y: 3 }]);
    answer();
  });

  it('closes the channel when paused', async () => {
    await useGameStore.getState().connect();
    await flush();
    useGameStore.getState().pauseLive();
    expect(stop).toHaveBeenCalled();
  });
});

describe('sync notices (toasts)', () => {
  const toasts = () => useToastStore.getState().toasts;

  // A successful connect resets the once-per-offline-stretch flag.
  beforeEach(async () => {
    useGameStore.setState({ cloud: 'offline' });
    await useGameStore.getState().connect();
    useGameStore.getState().pauseLive();
    useToastStore.setState({ toasts: [] });
  });

  it('says once that offline changes are saved, then that they synced', async () => {
    useGameStore.setState({ cloud: 'offline' });
    useGameStore.getState().placeItem('bakery', 1, 1);
    useGameStore.getState().placeItem('lamp-post', 2, 2);
    expect(toasts().map((t) => [t.id, t.type])).toEqual([['city-offline', 'info']]);

    await useGameStore.getState().connect();

    expect(toasts()[0]).toMatchObject({ type: 'success', title: 'Back online', description: '2 city changes synced.' });
    expect(toasts().find((t) => t.id === 'city-offline')?.closing).toBe(true);
  });

  it('stays quiet about changes made while still connecting', async () => {
    useGameStore.setState({ cloud: 'connecting' });
    useGameStore.getState().placeItem('bakery', 1, 1);
    await useGameStore.getState().connect();
    expect(toasts()).toEqual([]);
  });

  it('warns when the server rejects a change', async () => {
    serverCity = [{ x: 4, y: 4, item_id: 'lamp-post' }];
    useGameStore.getState().placeItem('bakery', 4, 4);
    await flush();
    expect(toasts()[0]).toMatchObject({ id: 'city-rejected', type: 'warning' });
  });
});

describe('step goal', () => {
  const serverGoal = (step_goal: number) =>
    mocked.fetchState.mockImplementation(async () => ({
      profile: { display_name: null, step_goal, balance: 3000, lifetime_steps: 0, packs_opened: 0 },
      steps: {},
      inventory: {},
      city: [],
    }) as unknown as ServerState);

  beforeEach(() => useGameStore.setState({ profilePending: false }));

  it('keeps a goal set offline through the next connect and sends it', async () => {
    serverGoal(8000);
    useGameStore.getState().setGoal(10000);
    expect(mocked.updateProfile).not.toHaveBeenCalled();
    expect(useGameStore.getState().profilePending).toBe(true);

    await useGameStore.getState().connect();
    await flush();

    expect(useGameStore.getState().goal).toBe(10000);
    expect(mocked.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ goal: 10000 }));
    expect(useGameStore.getState().profilePending).toBe(false);
  });

  it('takes the server goal when nothing is pending', async () => {
    serverGoal(12000);
    await useGameStore.getState().connect();
    expect(useGameStore.getState().goal).toBe(12000);
  });

  it('stays pending when the request is cut off', async () => {
    serverGoal(8000);
    await useGameStore.getState().connect();
    mocked.updateProfile.mockRejectedValueOnce(offline());
    useGameStore.getState().setGoal(9000);
    await flush();
    expect(useGameStore.getState()).toMatchObject({ goal: 9000, profilePending: true, cloud: 'offline' });
  });
});

describe('sign in to an existing account', () => {
  const accountState = () =>
    mocked.fetchState.mockImplementation(async () => ({
      profile: { display_name: 'Bry', step_goal: 12000, balance: 4200, lifetime_steps: 9000, packs_opened: 3 },
      steps: {},
      inventory: { 'lamp-post': { count: 1, foil: 0 } },
      city: [{ x: 5, y: 5, item_id: 'lamp-post' }],
    }) as unknown as ServerState);

  beforeEach(() => {
    // A guest with progress and unsent local changes on this phone.
    useGameStore.setState({
      cloud: 'online',
      onboarded: false,
      hapticsOn: false,
      stepsToday: 700,
      displayName: 'Guest',
      profilePending: true,
      pendingCity: [{ op: 'place', itemId: 'bakery', x: 1, y: 1 }],
    });
  });

  it("replaces the guest's local data with the account's and sends nothing from the guest", async () => {
    mocked.verifySignInCode.mockResolvedValue('bry@example.com');
    mocked.getAccountEmail.mockResolvedValueOnce('bry@example.com'); // the new session's email
    accountState();
    useGameStore.getState().addSteps(5); // debounced step sync, cancelled by the switch

    await useGameStore.getState().signIn('bry@example.com', '123456');
    await new Promise((r) => setTimeout(r, 1500)); // past the step-sync debounce

    expect(mocked.verifySignInCode).toHaveBeenCalledWith('bry@example.com', '123456');
    expect(mocked.syncSteps).not.toHaveBeenCalled();
    expect(mocked.placeItem).not.toHaveBeenCalled();
    expect(mocked.updateProfile).not.toHaveBeenCalled();
    expect(useGameStore.getState()).toMatchObject({
      cloud: 'online',
      accountEmail: 'bry@example.com',
      displayName: 'Bry',
      goal: 12000,
      packsOpened: 3,
      stepsToday: 0,
      pendingCity: [],
      profilePending: false,
      city: [{ itemId: 'lamp-post', x: 5, y: 5 }],
      // Device settings and the onboarding flag aren't account data.
      hapticsOn: false,
      onboarded: false,
    });
    useGameStore.getState().pauseLive();
  });

  it('keeps the guest untouched when the code is refused', async () => {
    mocked.verifySignInCode.mockRejectedValue(
      new (api.BackendError as unknown as new (r: string) => Error)('code_invalid'),
    );
    // The guest reconnects afterwards; keep it offline so the guest's data stays as set.
    mocked.ensureSession.mockRejectedValueOnce(offline());

    await expect(useGameStore.getState().signIn('bry@example.com', '000000')).rejects.toMatchObject({
      reason: 'code_invalid',
    });

    expect(useGameStore.getState()).toMatchObject({ displayName: 'Guest', stepsToday: 700 });
    expect(useGameStore.getState().pendingCity).toHaveLength(1);
    useGameStore.getState().pauseLive();
  });
});

describe('onboarding', () => {
  it('finishes, and can be replayed for testing', () => {
    useGameStore.setState({ onboarded: false });
    useGameStore.getState().requestStepTracking();
    useGameStore.getState().completeOnboarding();
    expect(useGameStore.getState()).toMatchObject({ onboarded: true, stepTrackingRequested: true });
    useGameStore.getState().replayOnboarding();
    expect(useGameStore.getState()).toMatchObject({ onboarded: false, stepTrackingRequested: false });
  });
});

describe('display name', () => {
  const serverProfile = (display_name: string) =>
    mocked.fetchState.mockImplementation(async () => ({
      profile: { display_name, step_goal: 8000, balance: 3000, lifetime_steps: 0, packs_opened: 0 },
      steps: {},
      inventory: {},
      city: [],
    }) as unknown as ServerState);

  beforeEach(() => useGameStore.setState({ profilePending: false, displayName: 'Walker' }));

  it('rejects unusable names without changing anything', () => {
    expect(useGameStore.getState().setDisplayName('   ')).toBe(false);
    expect(useGameStore.getState()).toMatchObject({ displayName: 'Walker', profilePending: false });
  });

  it('keeps a name set before the first connect and sends it with the goal', async () => {
    serverProfile('Walker');
    expect(useGameStore.getState().setDisplayName('  Bry ')).toBe(true);
    await useGameStore.getState().connect();
    await flush();
    expect(useGameStore.getState().displayName).toBe('Bry');
    expect(mocked.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Bry' }));
    expect(useGameStore.getState().profilePending).toBe(false);
  });

  it('takes the name from the server when nothing is pending', async () => {
    serverProfile('From Other Phone');
    await useGameStore.getState().connect();
    expect(useGameStore.getState().displayName).toBe('From Other Phone');
  });
});

describe('avatar', () => {
  const serverAvatar = (avatar_id: string | undefined) =>
    mocked.fetchState.mockImplementation(async () => ({
      profile: { display_name: 'Walker', step_goal: 8000, avatar_id, balance: 3000, lifetime_steps: 0, packs_opened: 0 },
      steps: {},
      inventory: {},
      city: [],
    }) as unknown as ServerState);

  beforeEach(() => useGameStore.setState({ profilePending: false, avatarId: 'sprout' }));

  it('ignores an unknown portrait', () => {
    useGameStore.getState().setAvatar('dragon' as never);
    expect(useGameStore.getState()).toMatchObject({ avatarId: 'sprout', profilePending: false });
  });

  it('keeps a portrait picked offline through connect and sends it', async () => {
    serverAvatar('sprout');
    useGameStore.getState().setAvatar('curly');
    await useGameStore.getState().connect();
    await flush();
    expect(useGameStore.getState().avatarId).toBe('curly');
    expect(mocked.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarId: 'curly' }));
    expect(useGameStore.getState().profilePending).toBe(false);
  });

  it('takes the server portrait, falling back to the default for unknown or missing ids', async () => {
    serverAvatar('bun');
    await useGameStore.getState().connect();
    expect(useGameStore.getState().avatarId).toBe('bun');
    serverAvatar('from-a-newer-app');
    await useGameStore.getState().connect();
    expect(useGameStore.getState().avatarId).toBe('sprout');
    serverAvatar(undefined);
    await useGameStore.getState().connect();
    expect(useGameStore.getState().avatarId).toBe('sprout');
  });
});

describe('wood haul popup', () => {
  const walked = (steps: number, wood: number, balance: number) => {
    useGameStore.setState({ stepsToday: steps });
    mocked.syncSteps.mockResolvedValue({ day: '', steps, credited: steps, wood, balance });
  };

  it('opens on connect once 500+ steps were credited, with what the server rolled', async () => {
    walked(620, 58, 458);
    await useGameStore.getState().connect();
    expect(useGameStore.getState()).toMatchObject({ showHaul: true, haul: { steps: 620, wood: 58 }, balance: 458 });
  });

  it('keeps adding up below 500 and stays closed', async () => {
    walked(300, 31, 431);
    await useGameStore.getState().connect();
    expect(useGameStore.getState()).toMatchObject({ showHaul: false, haul: { steps: 300, wood: 31 } });
    walked(560, 25, 456);
    mocked.syncSteps.mockResolvedValue({ day: '', steps: 560, credited: 260, wood: 25, balance: 456 });
    await useGameStore.getState().connect();
    expect(useGameStore.getState()).toMatchObject({ showHaul: true, haul: { steps: 560, wood: 56 } });
  });

  it('starts a new haul when dismissed', async () => {
    walked(900, 90, 490);
    await useGameStore.getState().connect();
    useGameStore.getState().dismissHaul();
    expect(useGameStore.getState()).toMatchObject({ showHaul: false, haul: { steps: 0, wood: 0 } });
  });

  it('waits for the first open after onboarding', async () => {
    useGameStore.setState({ onboarded: false });
    walked(900, 90, 490);
    await useGameStore.getState().connect();
    expect(useGameStore.getState()).toMatchObject({ showHaul: false, haul: { steps: 900, wood: 90 } });
  });
});
