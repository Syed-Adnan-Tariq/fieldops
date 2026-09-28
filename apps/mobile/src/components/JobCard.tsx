import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '@fieldops/shared';

interface JobCardProps {
  job: Job;
  onPress?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#6B7280',
  assigned: '#3B82F6',
  dispatched: '#8B5CF6',
  in_progress: '#F59E0B',
  on_site: '#F97316',
  completed: '#10B981',
  cancelled: '#EF4444',
  failed: '#EF4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export function JobCard({ job, onPress }: JobCardProps) {
  const statusColor = STATUS_COLORS[job.status] ?? '#6B7280';
  const priorityColor = PRIORITY_COLORS[job.priority] ?? '#6B7280';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.priorityStripe, { backgroundColor: priorityColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {job.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={12} color="#9CA3AF" />
          <Text style={styles.address} numberOfLines={1}>
            {job.address.street}, {job.address.city}
          </Text>
        </View>
        {job.scheduledStartAt && (
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={12} color="#9CA3AF" />
            <Text style={styles.time}>
              {new Date(job.scheduledStartAt).toLocaleDateString()} at{' '}
              {new Date(job.scheduledStartAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  priorityStripe: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827', marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  address: { flex: 1, fontSize: 12, color: '#6B7280' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontSize: 11, color: '#9CA3AF' },
});
