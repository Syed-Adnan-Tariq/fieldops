import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../services/api.service';

interface PhotoCaptureProps {
  jobId: string;
  onDone: () => void;
  onCancel: () => void;
}

interface CapturedPhoto {
  uri: string;
  fileName?: string;
}

export function PhotoCapture({ jobId, onDone, onCancel }: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotos((prev) => [
        ...prev,
        { uri: asset.uri, fileName: asset.fileName ?? `photo_${Date.now()}.jpg` },
      ]);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map((a) => ({
        uri: a.uri,
        fileName: a.fileName ?? `photo_${Date.now()}.jpg`,
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      onDone();
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (const photo of photos) {
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: photo.uri,
          name: photo.fileName ?? 'photo.jpg',
          type: 'image/jpeg',
        } as any);

        await apiClient.post(`/jobs/${jobId}/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        successCount += 1;
      } catch {
        // count as failure, continue uploading others
      }
    }

    setUploading(false);

    if (successCount === 0) {
      Alert.alert('Upload Failed', 'Failed to upload photos. Please try again.');
    } else {
      Alert.alert('Photos Uploaded', `${successCount} photo(s) uploaded successfully`);
    }

    onDone();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Job Photos</Text>
        <TouchableOpacity
          onPress={handleUpload}
          style={styles.doneBtn}
          disabled={uploading}
        >
          <Text style={styles.doneText}>{uploading ? 'Saving...' : 'Done'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Photo grid */}
        {photos.length > 0 && (
          <View style={styles.grid}>
            {photos.map((photo, i) => (
              <View key={i} style={styles.photoWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removePhoto(i)}
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <View style={styles.actionIcon}>
              <Ionicons name="camera" size={28} color="#1D4ED8" />
            </View>
            <Text style={styles.actionLabel}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickFromLibrary}>
            <View style={styles.actionIcon}>
              <Ionicons name="images" size={28} color="#1D4ED8" />
            </View>
            <Text style={styles.actionLabel}>From Library</Text>
          </TouchableOpacity>
        </View>

        {photos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubtext}>Take photos of the job site or work completed</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  doneBtn: { padding: 4 },
  doneText: { fontSize: 15, color: '#1D4ED8', fontWeight: '700' },
  content: { padding: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  photoWrapper: { position: 'relative' },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    gap: 8,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
  emptySubtext: {
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'center',
    maxWidth: 240,
  },
});
