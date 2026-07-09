import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useApiResource } from './useApiResource';

describe('useApiResource', () => {
  it('loads data on mount', async () => {
    const loader = jest.fn().mockResolvedValue('value');
    const { result } = renderHook(() => useApiResource(loader));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('value');
    expect(result.current.error).toBeNull();
  });

  it('captures loader errors', async () => {
    const loader = jest.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApiResource(loader));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
  });

  it('reloads on demand', async () => {
    const loader = jest.fn().mockResolvedValue('v1');
    const { result } = renderHook(() => useApiResource(loader));
    await waitFor(() => expect(result.current.loading).toBe(false));

    loader.mockResolvedValue('v2');
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.data).toBe('v2'));
  });
});
