import { ScrollView, Text, View } from 'react-native';
import { StreetDetail } from '../../services/api/types';

export type StreetDetailDrawerProps = {
  detail: StreetDetail;
};

export const StreetDetailDrawer = ({ detail }: StreetDetailDrawerProps) => (
  <ScrollView testID="street-detail-drawer" accessibilityLabel={`Detalhes da rua ${detail.name}`}>
    <Text testID="drawer-name">{detail.name}</Text>
    <Text testID="drawer-owner" accessibilityLabel="Proprietário atual">
      {detail.owner ? `Dono: ${detail.owner.name ?? detail.owner.userId}` : 'Sem dono'}
    </Text>
    <Text testID="drawer-tenure">
      {detail.tenureDays !== null ? `Tempo de posse: ${detail.tenureDays} dias` : 'Sem posse'}
    </Text>
    <Text testID="drawer-disputes">{`Disputas: ${detail.disputesCount}`}</Text>
    <View accessibilityLabel="Ranking da rua">
      {detail.ranking.map((entry) => (
        <Text key={entry.userId} testID={`rank-${entry.rank}`}>
          {`${entry.rank}. ${entry.name ?? entry.userId} — ${entry.points} pts`}
        </Text>
      ))}
    </View>
    <View accessibilityLabel="Histórico de domínio">
      {detail.ownershipHistory.map((entry, index) => (
        <Text key={`${entry.userId}-${entry.acquiredAt}`} testID={`history-${index}`}>
          {`${entry.name ?? entry.userId}: ${entry.acquiredAt}${entry.lostAt ? ` → ${entry.lostAt}` : ' (atual)'}`}
        </Text>
      ))}
    </View>
  </ScrollView>
);
