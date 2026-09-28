import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobsStore } from '../../store/jobs.store';
import { JobStatus } from '@fieldops/shared';

// Lazy-loaded to prevent TaskManager from crashing at startup
const getLocation = () => import('../../services/location.service').then((m) => m.default);

export default function MapScreen() {
  const { jobs } = useJobsStore();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const pendingJobs = jobs.filter(
    (j) =>
      j.status === JobStatus.ASSIGNED ||
      j.status === JobStatus.DISPATCHED ||
      j.status === JobStatus.IN_PROGRESS ||
      j.status === JobStatus.ON_SITE,
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const locationSvc = await getLocation();
      const loc = await locationSvc.getCurrentLocation();
      if (loc) {
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch (err) {
      console.error('Failed to load location:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D4ED8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Locations</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#1D4ED8" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Current Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          {currentLocation ? (
            <View style={styles.locationCard}>
              <Ionicons name="location" size={20} color="#1D4ED8" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>GPS Active</Text>
                <Text style={styles.locationCoords}>
                  {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Live</Text>
              </View>
            </View>
          ) : (
            <View style={styles.locationCard}>
              <Ionicons name="location-outline" size={20} color="#9CA3AF" />
              <Text style={styles.noLocationText}>Location unavailable</Text>
            </View>
          )}
        </View>

        {/* Job Stops */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Jobs ({pendingJobs.length})</Text>
          {pendingJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="map-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>No active jobs</Text>
            </View>
          ) : (
            pendingJobs.map((job, i) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{i + 1}</Text>
                </View>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobAddress}>
                    {job.address.street}, {job.address.city}
                  </Text>
                  <View style={[styles.statusBadge,
                    job.status === JobStatus.IN_PROGRESS || job.status === JobStatus.ON_SITE
                      ? styles.statusActive : styles.statusPending
                  ]}>
                    <Text style={styles.statusText}>{job.status.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Ionicons name="navigate-outline" size={20} color="#1D4ED8" />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  refreshBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentContainer: { padding: 16, gap: 16 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  locationInfo: { flex: 1 },
  locationTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  locationCoords: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  activeBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  noLocationText: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 32,
    alignItems: 'center', gap: 8,
  },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  jobCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stopNumber: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#1D4ED8', justifyContent: 'center', alignItems: 'center',
  },
  stopNumberText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  jobInfo: { flex: 1, gap: 3 },
  jobTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  jobAddress: { fontSize: 12, color: '#6B7280' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  statusActive: { backgroundColor: '#FEF3C7' },
  statusPending: { backgroundColor: '#EFF6FF' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
});
