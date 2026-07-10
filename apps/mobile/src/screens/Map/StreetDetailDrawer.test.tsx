import { fireEvent, render, screen } from '@testing-library/react-native';
import { StreetDetail } from '../../services/api/types';
import { StreetDetailDrawer } from './StreetDetailDrawer';

const detail: StreetDetail = {
  id: 's1',
  name: 'Rua Maranhão',
  cityId: 'city-a',
  owner: { userId: 'u1', name: 'Ana' },
  disputesCount: 3,
  tenureDays: 12,
  ranking: [
    { userId: 'u1', name: 'Ana', points: 200, rank: 1 },
    { userId: 'u2', name: 'Bruno', points: 100, rank: 2 },
  ],
  ownershipHistory: [{ userId: 'u1', name: 'Ana', acquiredAt: '2026-07-01T00:00:00Z', lostAt: null }],
};

describe('StreetDetailDrawer', () => {
  it('shows owner, tenure, disputes and ranking', () => {
    render(<StreetDetailDrawer detail={detail} currentUserId="u1" />);

    expect(screen.getByTestId('drawer-name')).toHaveTextContent('Rua Maranhão');
    expect(screen.getByTestId('drawer-owner')).toHaveTextContent('Você é o proprietário');
    expect(screen.getByTestId('drawer-tenure')).toHaveTextContent(/12 dias/);
    expect(screen.getByTestId('drawer-disputes')).toHaveTextContent('3');
    expect(screen.getByTestId('rank-1')).toHaveTextContent(/Ana/);
    expect(screen.getByTestId('rank-2')).toHaveTextContent(/Bruno/);
    expect(screen.getByTestId('history-0')).toHaveTextContent(/atual/);
  });

  it('labels the owner when the street belongs to someone else', () => {
    render(<StreetDetailDrawer detail={detail} currentUserId="u2" />);

    expect(screen.getByTestId('drawer-owner')).toHaveTextContent(/Ana/);
  });

  it('shows the ownerless state', () => {
    render(<StreetDetailDrawer detail={{ ...detail, owner: null, tenureDays: null }} />);

    expect(screen.getByTestId('drawer-owner')).toHaveTextContent(/Sem dono/);
    expect(screen.getByTestId('drawer-tenure')).toHaveTextContent('Sem posse');
  });

  it('closes when the close control is pressed', () => {
    const onClose = jest.fn();
    render(<StreetDetailDrawer detail={detail} onClose={onClose} />);

    fireEvent.press(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
