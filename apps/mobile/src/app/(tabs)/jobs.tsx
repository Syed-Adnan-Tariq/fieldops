import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJobsStore } from '../../store/jobs.store';
import { ApiService } from '../../services/api.service';
import { Job, JobStatus } from '@fieldops/shared';

const STATUS_FILTERS: Array<{ label: string; value: JobStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Assigned', value: JobStatus.ASSIGNED },
  { label: 'Dispatched', value: JobStatus.DISPATCHED },
  { label: 'In Progress', value: JobStatus.IN_PROGRESS },
  { label: 'Completed', value: JobStatus.COMPLETED },
];

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

export default function JobsScreen() {
  const router = useRouter();
  const { jobs, setJobs, loading, setLoading } = useJobsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<JobStatus | 'all'>('all');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ApiService.getMyJobs();
      setJobs(response.data as Job[]);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [setJobs, setLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  }, [loadJobs]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = activeFilter === 'all'
    ? jobs
    : jobs.filter((j) => j.status === activeFilter);

  const renderJob = ({ item: job }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push(`/job/${job.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.jobCardLeft}>
        <View
          style={[styles.priorityBar, { backgroundColor: PRIORITY_COLORS[job.priority] ?? '#6B7280' }]}
        />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
          <Text style={styles.jobAddress} numberOfLines={1}>
            {job.address.street}, {job.address.city}
          </Text>
          {job.scheduledStartAt && (
            <Text style={styles.jobSchedule}>
              {new Date(job.scheduledStartAt).toLocaleDateString()} at{' '}
              {new Date(job.scheduledStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.jobCardRight}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: (STATUS_COLORS[job.status] ?? '#6B7280') + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: STATUS_COLORS[job.status] ?? '#6B7280' },
            ]}
          >
            {job.status.replace('_', ' ')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, activeFilter === f.value && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f.value && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJob}
          keyExtractor={(j) => j.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1D4ED8"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No jobs found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1D4ED8',
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterChipTextActive: { color: '#1D4ED8' },
  listContent: { padding: 12, gap: 8 },
  jobCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  priorityBar: { width: 4 },
  jobInfo: { flex: 1, padding: 14 },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  jobAddress: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  jobSchedule: { fontSize: 11, color: '#9CA3AF' },
  jobCardRight: { padding: 14, alignItems: 'flex-end' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
