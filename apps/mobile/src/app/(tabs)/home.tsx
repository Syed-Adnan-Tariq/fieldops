import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';
import { useJobsStore } from '../../store/jobs.store';
import { ApiService } from '../../services/api.service';
import apiClient from '../../services/api.service';
import { Job, JobStatus, SOCKET_EVENTS } from '@fieldops/shared';

// Lazy-loaded to prevent socket.io + TaskManager from crashing at startup
const getSocket = () => import('../../services/socket.service').then((m) => m.default);
const getLocation = () => import('../../services/location.service').then((m) => m.default);

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, accessToken } = useAuthStore();
  const { jobs, setJobs, updateJob } = useJobsStore();
  const [isTracking, setIsTracking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Clock in/out state
  const [clockStatus, setClockStatus] = useState<{ isClockedIn: boolean; currentShift: any | null }>({
    isClockedIn: false,
    currentShift: null,
  });
  const [clockLoading, setClockLoading] = useState(false);
  const [elapsed, setElapsed] = useState('');
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeJob = jobs.find(
    (j) =>
      j.status === JobStatus.IN_PROGRESS || j.status === JobStatus.ON_SITE,
  );

  const pendingJobs = jobs.filter(
    (j) => j.status === JobStatus.ASSIGNED || j.status === JobStatus.DISPATCHED,
  );

  const loadJobs = useCallback(async () => {
    try {
      const response = await ApiService.getMyJobs();
      setJobs(response.data as Job[]);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  }, [setJobs]);

  const fetchClockStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/timeclock/status');
      setClockStatus(res.data);
    } catch {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadJobs(), fetchClockStatus()]);
    setRefreshing(false);
  }, [loadJobs, fetchClockStatus]);

  // Initialize socket and location on mount (lazy-loaded)
  useEffect(() => {
    if (!accessToken) return;

    let cleanups: Array<() => void> = [];

    getSocket().then((socketService) => {
      const socket = socketService.connect(accessToken);
      socket.on(SOCKET_EVENTS.CONNECT, () => setIsConnected(true));
      socket.on(SOCKET_EVENTS.DISCONNECT, () => setIsConnected(false));
      if (socket.connected) setIsConnected(true);

      cleanups.push(socketService.onJobAssigned((data) => {
        const jobData = data as { job: Job };
        if (jobData.job) {
          useJobsStore.getState().addJob(jobData.job);
          Alert.alert('New Job Assigned!', `You have been assigned: ${jobData.job.title}`, [
            { text: 'View', onPress: () => router.push('/jobs') },
          ]);
        }
      }));
      cleanups.push(socketService.onJobUpdated((data) => {
        const job = data as Job;
        updateJob(job.id, job);
      }));
      cleanups.push(socketService.onGeofenceEnter((data) => {
        const ev = data as { geofenceName: string };
        Alert.alert('Checked In', `You've entered: ${ev.geofenceName}`);
      }));
      cleanups.push(socketService.onGeofenceExit((data) => {
        const ev = data as { geofenceName: string };
        Alert.alert('Checked Out', `You've left: ${ev.geofenceName}`);
      }));
    }).catch(() => {});

    loadJobs();
    fetchClockStatus();

    return () => { cleanups.forEach((fn) => fn()); };
  }, [accessToken, loadJobs, fetchClockStatus, router, updateJob]);

  // Update elapsed timer when clocked in
  useEffect(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }

    if (clockStatus.isClockedIn && clockStatus.currentShift?.clockInAt) {
      const update = () => {
        const diff = Date.now() - new Date(clockStatus.currentShift.clockInAt).getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setElapsed(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
        );
      };
      update();
      elapsedTimerRef.current = setInterval(update, 1000);
    } else {
      setElapsed('');
    }

    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [clockStatus.isClockedIn, clockStatus.currentShift?.clockInAt]);

  // Check background tracking status
  useEffect(() => {
    getLocation().then((l) => l.isBackgroundTrackingActive().then(setIsTracking)).catch(() => {});
  }, []);

  const toggleClock = async () => {
    setClockLoading(true);
    try {
      if (clockStatus.isClockedIn) {
        await apiClient.post('/timeclock/clock-out', {});
      } else {
        await apiClient.post('/timeclock/clock-in', {});
      }
      await fetchClockStatus();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to update clock status');
    } finally {
      setClockLoading(false);
    }
  };

  const toggleTracking = async () => {
    if (isTracking) {
      await locationService.stopBackgroundTracking();
      setIsTracking(false);
    } else {
      await locationService.startBackgroundTracking();
      setIsTracking(true);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await locationService.stopBackgroundTracking();
          socketService.disconnect();
          try { await ApiService.logout(); } catch {}
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
            <Text style={styles.workerName}>
              {user?.firstName} {user?.lastName}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Status indicators */}
        <View style={styles.statusRow}>
          <StatusBadge
            icon="radio-outline"
            label={isConnected ? 'Connected' : 'Disconnected'}
            active={isConnected}
          />
          <StatusBadge
            icon="location-outline"
            label={isTracking ? 'Tracking' : 'Not Tracking'}
            active={isTracking}
          />
        </View>
      </View>

      {/* Clock In / Clock Out card */}
      <View style={styles.section}>
        <View style={[styles.clockCard, clockStatus.isClockedIn && styles.clockCardActive]}>
          <View style={styles.clockCardHeader}>
            <View style={styles.clockCardTitleRow}>
              <Ionicons
                name={clockStatus.isClockedIn ? 'time' : 'time-outline'}
                size={20}
                color={clockStatus.isClockedIn ? '#fff' : '#374151'}
              />
              <Text style={[styles.clockCardTitle, clockStatus.isClockedIn && styles.clockCardTitleActive]}>
                {clockStatus.isClockedIn ? 'Clocked In' : 'Not Clocked In'}
              </Text>
            </View>
            {clockStatus.isClockedIn && elapsed ? (
              <Text style={styles.clockElapsed}>{elapsed}</Text>
            ) : null}
          </View>

          {clockStatus.isClockedIn && clockStatus.currentShift?.clockInAt ? (
            <Text style={styles.clockSubtext}>
              Since {formatTime(new Date(clockStatus.currentShift.clockInAt))}
            </Text>
          ) : (
            <Text style={styles.clockSubtext}>Tap below to start your shift</Text>
          )}

          <TouchableOpacity
            style={[
              styles.clockButton,
              clockStatus.isClockedIn ? styles.clockButtonOut : styles.clockButtonIn,
              clockLoading && styles.clockButtonDisabled,
            ]}
            onPress={toggleClock}
            disabled={clockLoading}
            activeOpacity={0.85}
          >
            <Ionicons
              name={clockStatus.isClockedIn ? 'stop-circle' : 'play-circle'}
              size={22}
              color="#fff"
            />
            <Text style={styles.clockButtonText}>
              {clockLoading
                ? clockStatus.isClockedIn ? 'Clocking Out...' : 'Clocking In...'
                : clockStatus.isClockedIn ? 'Clock Out' : 'Clock In'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tracking toggle */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.trackingButton, isTracking && styles.trackingButtonActive]}
          onPress={toggleTracking}
        >
          <Ionicons
            name={isTracking ? 'stop-circle' : 'play-circle'}
            size={24}
            color="#fff"
          />
          <Text style={styles.trackingButtonText}>
            {isTracking ? 'Stop GPS Tracking' : 'Start GPS Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Job */}
      {activeJob && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Job</Text>
          <TouchableOpacity
            style={styles.activeJobCard}
            onPress={() => router.push(`/job/${activeJob.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.activeJobHeader}>
              <View style={styles.activeJobStatus}>
                <View style={styles.activeDot} />
                <Text style={styles.activeJobStatusText}>
                  {activeJob.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </View>
            <Text style={styles.activeJobTitle}>{activeJob.title}</Text>
            <Text style={styles.activeJobAddress}>
              {activeJob.address.street}, {activeJob.address.city}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pending jobs summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
          <TouchableOpacity onPress={() => router.push('/jobs')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {pendingJobs.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming jobs</Text>
        ) : (
          pendingJobs.slice(0, 3).map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.pendingJobItem}
              onPress={() => router.push(`/job/${job.id}`)}
            >
              <View style={styles.pendingJobInfo}>
                <Text style={styles.pendingJobTitle} numberOfLines={1}>
                  {job.title}
                </Text>
                <Text style={styles.pendingJobAddr} numberOfLines={1}>
                  {job.address.city}, {job.address.state}
                </Text>
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(job.priority) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: getPriorityColor(job.priority) },
                  ]}
                >
                  {job.priority}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

function StatusBadge({
  icon,
  label,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
}) {
  return (
    <View style={[styles.statusBadge, active ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
      <Ionicons name={icon} size={13} color={active ? '#D1FAE5' : '#FEE2E2'} />
      <Text style={[styles.statusBadgeText, { color: active ? '#D1FAE5' : '#FEE2E2' }]}>
        {label}
      </Text>
    </View>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: '#6B7280',
    medium: '#3B82F6',
    high: '#F59E0B',
    urgent: '#EF4444',
  };
  return colors[priority] ?? '#6B7280';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerCard: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  workerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  logoutBtn: { padding: 4 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeActive: { borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)' },
  statusBadgeInactive: { borderColor: 'rgba(255,100,100,0.3)', backgroundColor: 'rgba(255,100,100,0.1)' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },

  // Clock card
  clockCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  clockCardActive: {
    backgroundColor: '#065F46',
    borderColor: '#065F46',
  },
  clockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clockCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  clockCardTitleActive: {
    color: '#fff',
  },
  clockElapsed: {
    fontSize: 20,
    fontWeight: '800',
    color: '#A7F3D0',
    fontVariant: ['tabular-nums'],
  },
  clockSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 15,
  },
  clockButtonIn: {
    backgroundColor: '#059669',
  },
  clockButtonOut: {
    backgroundColor: '#DC2626',
  },
  clockButtonDisabled: {
    opacity: 0.6,
  },
  clockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
  },
  trackingButtonActive: { backgroundColor: '#DC2626' },
  trackingButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activeJobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeJobStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeJobStatusText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  activeJobTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  activeJobAddress: { fontSize: 13, color: '#6B7280' },
  pendingJobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  pendingJobInfo: { flex: 1, marginRight: 10 },
  pendingJobTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  pendingJobAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priorityText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  bottomPad: { height: 40 },
});
