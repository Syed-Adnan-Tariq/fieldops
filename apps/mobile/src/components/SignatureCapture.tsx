import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';

interface SignatureCaptureProps {
  onSave: (signerName: string, signatureDataUrl: string) => void;
  onCancel: () => void;
}

export function SignatureCapture({ onSave, onCancel }: SignatureCaptureProps) {
  const [signerName, setSignerName] = useState('');
  const [signed, setSigned] = useState(false);

  const handleSave = () => {
    if (!signerName.trim()) {
      Alert.alert('Name Required', "Please enter the signer's name");
      return;
    }
    if (!signed) {
      Alert.alert('Signature Required', 'Please confirm signature');
      return;
    }
    const dataUrl = `data:text/plain;base64,${btoa('signed:' + signerName.trim())}`;
    onSave(signerName.trim(), dataUrl);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Capture Signature</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Signer's Name</Text>
        <TextInput
          value={signerName}
          onChangeText={setSignerName}
          placeholder="Full name of signer"
          style={styles.nameInput}
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Signature Confirmation</Text>
        <TouchableOpacity
          style={[styles.signBox, signed && styles.signBoxSigned]}
          onPress={() => setSigned(!signed)}
          activeOpacity={0.7}
        >
          {signed ? (
            <Text style={styles.signedText}>✓ Signed</Text>
          ) : (
            <Text style={styles.signHint}>Tap to confirm signature</Text>
          )}
        </TouchableOpacity>

        {signed && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSigned(false)}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  saveBtn: { padding: 4 },
  saveText: { fontSize: 15, color: '#1D4ED8', fontWeight: '700' },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  nameInput: {
    height: 48, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, fontSize: 15,
    color: '#111827', backgroundColor: '#fff',
  },
  signBox: {
    height: 120, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff',
  },
  signBoxSigned: { borderColor: '#10B981', borderStyle: 'solid', backgroundColor: '#F0FDF4' },
  signHint: { color: '#9CA3AF', fontSize: 14 },
  signedText: { color: '#10B981', fontSize: 20, fontWeight: '700' },
  clearBtn: {
    marginTop: 12, alignSelf: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#FEE2E2',
  },
  clearText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
});
