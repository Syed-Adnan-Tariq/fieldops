import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJobsStore } from '../../store/jobs.store';
import { ApiService } from '../../services/api.service';
import { SignatureCapture } from '../../components/SignatureCapture';
import { PhotoCapture } from '../../components/PhotoCapture';
import { Job, JobStatus, JOB_STATUS_TRANSITIONS } from '@fieldops/shared';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { jobs, updateJob } = useJobsStore();
  const [job, setJob] = useState<Job | null>(jobs.find((j) => j.id === id) ?? null);
  const [loading, setLoading] = useState(!job);
  const [noteText, setNoteText] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadJob = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await ApiService.getJobById(id);
      const loaded = res.data as Job;
      setJob(loaded);
      updateJob(id, loaded);
    } catch (err) {
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [id, updateJob]);

  useEffect(() => {
    if (!job) loadJob();
  }, [job, loadJob]);

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job) return;
    setSubmitting(true);
    try {
      const res = await ApiService.updateJobStatus(job.id, newStatus);
      const updated = res.data as Job;
      setJob(updated);
      updateJob(job.id, updated);
      Alert.alert('Updated', `Job status changed to ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to update job status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!job || !noteText.trim()) return;
    setSubmitting(true);
    try {
      await ApiService.addJobNote(job.id, noteText.trim());
      setNoteText('');
      await loadJob();
      Alert.alert('Note Added', 'Your note has been saved');
    } catch {
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignature = async (signerName: string, signatureDataUrl: string) => {
    if (!job) return;
    setSubmitting(true);
    try {
      await ApiService.addJobSignature(job.id, signerName, signatureDataUrl);
      setShowSignature(false);
      await loadJob();
      Alert.alert('Signature Captured', 'Client signature has been saved');
    } catch {
      Alert.alert('Error', 'Failed to save signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D4ED8" />
        <Text style={styles.loadingText}>Loading job...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Job not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allowedNextStatuses = (JOB_STATUS_TRANSITIONS[job.status] ?? []) as JobStatus[];
  const priorityColors: Record<string, string> = {
    low: '#6B7280', medium: '#3B82F6', high: '#F59E0B', urgent: '#EF4444',
  };
  const statusColors: Record<string, string> = {
    pending: '#6B7280', assigned: '#3B82F6', dispatched: '#8B5CF6',
    in_progress: '#F59E0B', on_site: '#F97316', completed: '#10B981',
    cancelled: '#EF4444', failed: '#EF4444',
  };

  if (showSignature) {
    return (
      <SignatureCapture
        onSave={handleSignature}
        onCancel={() => setShowSignature(false)}
      />
    );
  }

  if (showPhoto) {
    return (
      <PhotoCapture
        jobId={job.id}
        onDone={() => setShowPhoto(false)}
        onCancel={() => setShowPhoto(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Status & Priority */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: (statusColors[job.status] ?? '#6B7280') + '20' },
          ]}
        >
          <Text style={[styles.statusPillText, { color: statusColors[job.status] ?? '#6B7280' }]}>
            {job.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <View
          style={[
            styles.priorityPill,
            { backgroundColor: (priorityColors[job.priority] ?? '#6B7280') + '20' },
          ]}
        >
          <Text style={[styles.priorityPillText, { color: priorityColors[job.priority] ?? '#6B7280' }]}>
            {job.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Details card */}
      <View style={styles.card}>
        <DetailRow icon="location-outline" label="Address">
          {job.address.street}, {job.address.city}, {job.address.state} {job.address.postalCode}
        </DetailRow>
        {job.description && (
          <DetailRow icon="document-text-outline" label="Description">
            {job.description}
          </DetailRow>
        )}
        {job.scheduledStartAt && (
          <DetailRow icon="calendar-outline" label="Scheduled">
            {new Date(job.scheduledStartAt).toLocaleString()}
          </DetailRow>
        )}
        {job.estimatedDurationMinutes && (
          <DetailRow icon="time-outline" label="Est. Duration">
            {job.estimatedDurationMinutes} minutes
          </DetailRow>
        )}
      </View>

      {/* Status Action Buttons */}
      {allowedNextStatuses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionGrid}>
            {allowedNextStatuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.actionButton,
                  status === JobStatus.COMPLETED && styles.actionButtonSuccess,
                  status === JobStatus.CANCELLED && styles.actionButtonDanger,
                  status === JobStatus.IN_PROGRESS && styles.actionButtonPrimary,
                ]}
                onPress={() => handleStatusChange(status)}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    (status === JobStatus.COMPLETED ||
                      status === JobStatus.CANCELLED ||
                      status === JobStatus.IN_PROGRESS) &&
                      styles.actionButtonTextLight,
                  ]}
                >
                  {getStatusActionLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Capture</Text>
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => setShowSignature(true)}
            disabled={!!job.signature}
          >
            <Ionicons
              name="pencil-outline"
              size={22}
              color={job.signature ? '#10B981' : '#1D4ED8'}
            />
            <Text style={styles.captureButtonText}>
              {job.signature ? 'Signed' : 'Signature'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => setShowPhoto(true)}
          >
            <Ionicons name="camera-outline" size={22} color="#1D4ED8" />
            <Text style={styles.captureButtonText}>Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes ({job.notes.length})</Text>
        {job.notes.map((note) => (
          <View key={note.id} style={styles.noteItem}>
            <Text style={styles.noteAuthor}>{note.authorName}</Text>
            <Text style={styles.noteContent}>{note.content}</Text>
            <Text style={styles.noteTime}>
              {new Date(note.createdAt).toLocaleString()}
            </Text>
          </View>
        ))}
        <View style={styles.noteInput}>
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Add a note..."
            multiline
            numberOfLines={3}
            style={styles.noteTextInput}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={[styles.noteSubmitBtn, (!noteText.trim() || submitting) && styles.noteSubmitBtnDisabled]}
            onPress={handleAddNote}
            disabled={!noteText.trim() || submitting}
          >
            <Text style={styles.noteSubmitText}>Add Note</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color="#6B7280" style={styles.detailIcon} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{children}</Text>
      </View>
    </View>
  );
}

function getStatusActionLabel(status: JobStatus): string {
  const labels: Partial<Record<JobStatus, string>> = {
    [JobStatus.IN_PROGRESS]: 'Start Work',
    [JobStatus.ON_SITE]: 'Mark On Site',
    [JobStatus.COMPLETED]: 'Complete Job',
    [JobStatus.CANCELLED]: 'Cancel',
    [JobStatus.FAILED]: 'Mark Failed',
    [JobStatus.DISPATCHED]: 'Acknowledge',
    [JobStatus.ASSIGNED]: 'Accept',
  };
  return labels[status] ?? status.replace('_', ' ');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  backBtn: { padding: 12, backgroundColor: '#1D4ED8', borderRadius: 8, marginTop: 16 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  headerRight: { width: 30 },
  statusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  priorityPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  priorityPillText: { fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  detailIcon: { marginTop: 2 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#374151', lineHeight: 20 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonPrimary: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  actionButtonSuccess: { backgroundColor: '#059669', borderColor: '#059669' },
  actionButtonDanger: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  actionButtonText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  actionButtonTextLight: { color: '#fff' },
  captureRow: { flexDirection: 'row', gap: 10 },
  captureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  captureButtonText: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  noteItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  noteAuthor: { fontSize: 12, fontWeight: '700', color: '#374151' },
  noteContent: { fontSize: 13, color: '#4B5563', marginTop: 4, lineHeight: 18 },
  noteTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  noteInput: { gap: 8 },
  noteTextInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteSubmitBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  noteSubmitBtnDisabled: { opacity: 0.5 },
  noteSubmitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
