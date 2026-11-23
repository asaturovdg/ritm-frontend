import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useMemberReturn } from '../useMemberReturn.js';
afterEach(() => { cleanup(); sessionStorage.clear(); });
function Harness({ ready }) {
  const preserve = useMemberReturn({ isAuthReady: ready, token: ready ? 't' : null, showInputCode: !ready });
  const location = useLocation();
  return <p>{location.pathname}{location.search}, {preserve ? 'Сохранённый переход' : 'Обычный запуск'}</p>;
}
describe('возврат после входа', () => {
  it('восстанавливает профиль и companions из разрешённого внутреннего адреса', async () => {
    sessionStorage.setItem('community_return_path', '/members/99?source=companions');
    render(<MemoryRouter initialEntries={['/']}><Harness ready /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('/members/99?source=companions, Сохранённый переход')).toBeInTheDocument());
    expect(sessionStorage.getItem('community_return_path')).toBe(null);
  });
  it('отбрасывает внешний адрес', () => {
    sessionStorage.setItem('community_return_path', '//evil.test');
    render(<MemoryRouter initialEntries={['/']}><Harness ready /></MemoryRouter>);
    expect(screen.getByText('/, Обычный запуск')).toBeInTheDocument();
  });
  it('сохраняет целевой профиль до существующего входа', () => {
    render(<MemoryRouter initialEntries={['/members/99?source=companions']}><Harness ready={false} /></MemoryRouter>);
    expect(sessionStorage.getItem('community_return_path')).toBe('/members/99?source=companions');
  });
});
