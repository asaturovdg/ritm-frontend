import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import TelegramLoginWidget from '../TelegramLoginWidget.jsx';

describe('TelegramLoginWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete window.onTelegramAuth;
  });

  it('sets window.onTelegramAuth on mount', () => {
    render(
      <TelegramLoginWidget onSuccess={vi.fn()} onError={vi.fn()} onStatusChange={vi.fn()} />
    );
    expect(typeof window.onTelegramAuth).toBe('function');
  });

  it('cleans up window.onTelegramAuth on unmount', () => {
    const { unmount } = render(
      <TelegramLoginWidget onSuccess={vi.fn()} onError={vi.fn()} onStatusChange={vi.fn()} />
    );
    unmount();
    expect(window.onTelegramAuth).toBeUndefined();
  });

  it('calls onStatusChange("failed") after 5s timeout', () => {
    const onStatusChange = vi.fn();
    render(
      <TelegramLoginWidget onSuccess={vi.fn()} onError={vi.fn()} onStatusChange={onStatusChange} />
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(onStatusChange).toHaveBeenCalledWith('failed');
  });

  it('calls onStatusChange("failed") when script loads but container has error text (Bot domain invalid)', async () => {
    let capturedScript;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === 'script') capturedScript = el;
      return el;
    });

    const onStatusChange = vi.fn();
    render(
      <TelegramLoginWidget onSuccess={vi.fn()} onError={vi.fn()} onStatusChange={onStatusChange} />
    );

    // Telegram renders error text directly in container instead of a button iframe
    const container = document.querySelector('div[style]');
    if (container) container.textContent = 'Bot domain invalid';

    await act(async () => {
      capturedScript.onload();
      vi.advanceTimersByTime(300);
    });

    expect(onStatusChange).toHaveBeenCalledWith('failed');
    vi.restoreAllMocks();
  });

  it('calls onStatusChange("failed") when script.onerror fires', () => {
    let capturedScript;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === 'script') capturedScript = el;
      return el;
    });

    const onStatusChange = vi.fn();
    render(
      <TelegramLoginWidget onSuccess={vi.fn()} onError={vi.fn()} onStatusChange={onStatusChange} />
    );

    act(() => capturedScript.onerror(new Error('network')));
    expect(onStatusChange).toHaveBeenCalledWith('failed');
  });

  it('calls onSuccess with token data when auth resolves ok', async () => {
    const onSuccess = vi.fn();
    const tokenData = { access_token: 'acc123', refresh_token: 'ref456' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => tokenData,
    });

    render(
      <TelegramLoginWidget onSuccess={onSuccess} onError={vi.fn()} onStatusChange={vi.fn()} />
    );

    await act(async () => {
      await window.onTelegramAuth({ id: 1, first_name: 'Ivan', auth_date: 1234567890, hash: 'abc' });
    });

    expect(onSuccess).toHaveBeenCalledWith(tokenData);
  });

  it('calls onError when backend returns non-ok response', async () => {
    const onError = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    render(
      <TelegramLoginWidget onSuccess={vi.fn()} onError={onError} onStatusChange={vi.fn()} />
    );

    await act(async () => {
      await window.onTelegramAuth({ id: 1, first_name: 'Ivan', auth_date: 1234567890, hash: 'abc' });
    });

    expect(onError).toHaveBeenCalledWith('HTTP 401');
  });

  it('calls onError on network failure', async () => {
    const onError = vi.fn();
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    render(
      <TelegramLoginWidget onSuccess={vi.fn()} onError={onError} onStatusChange={vi.fn()} />
    );

    await act(async () => {
      await window.onTelegramAuth({ id: 1, first_name: 'Ivan', auth_date: 1234567890, hash: 'abc' });
    });

    expect(onError).toHaveBeenCalledWith('Ошибка соединения');
  });
});
