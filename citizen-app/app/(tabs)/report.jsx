/**
 * app/(tabs)/report.jsx
 *
 * Stage 3 — Report an Issue screen
 *
 * Collects: category, title, description, photo (optional), GPS (optional).
 * Validates required fields before showing a review summary.
 * Submission is a clearly-labelled LOCAL DEMO only — no data is sent to
 * any server. The submit handler is isolated so it can be replaced with
 * the real POST /complaints call in Stage 4 when Dev1's API is ready.
 */

import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

import Colors from '../../constants/colors';
import FormInput from '../../components/FormInput';
import CategoryPicker, { CATEGORIES } from '../../components/CategoryPicker';
import PhotoPicker from '../../components/PhotoPicker';
import LocationPicker from '../../components/LocationPicker';
import { useComplaints } from '../../context/complaints';

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────
function validate(category, title, description) {
  const errors = {};
  if (!category)             errors.category    = 'Please select a category.';
  if (!title.trim())         errors.title       = 'Title is required.';
  else if (title.trim().length < 5)
                             errors.title       = 'Title must be at least 5 characters.';
  if (!description.trim())   errors.description = 'Description is required.';
  else if (description.trim().length < 10)
                             errors.description = 'Please describe the issue in at least 10 characters.';
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Review summary card
// ─────────────────────────────────────────────────────────────────────────────
function ReviewCard({ category, title, description, photo, location }) {
  const cat = CATEGORIES.find((c) => c.id === category);
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewHeading}>📋 Review Your Report</Text>

      <Row label="Category"    value={cat ? `${cat.icon} ${cat.label}` : '—'} />
      <Row label="Title"       value={title} />
      <Row label="Description" value={description} multiline />
      <Row
        label="Photo"
        value={photo ? '✅ Photo attached (local only)' : '⬜ No photo'}
        valueColor={photo ? Colors.success : Colors.textMuted}
      />
      <Row
        label="Location"
        value={
          location
            ? `${location.latitude}, ${location.longitude}`
            : '⬜ Not provided'
        }
        valueColor={location ? Colors.success : Colors.textMuted}
      />

      <View style={styles.mockWarning}>
        <Text style={styles.mockWarningText}>
          ⚠️  DEMO MODE — This report will NOT be sent to any server.{'\n'}
          Real submission will be enabled in Stage 4 when the backend API is ready.
        </Text>
      </View>
    </View>
  );
}

function Row({ label, value, multiline = false, valueColor }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text
        style={[styles.reviewValue, multiline && styles.reviewValueMulti, valueColor && { color: valueColor }]}
        numberOfLines={multiline ? 0 : 2}
      >
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success card shown after mock submit
// ─────────────────────────────────────────────────────────────────────────────
function SuccessCard({ newId, onReset, onViewComplaints, onViewDetail }) {
  return (
    <View style={styles.successCard}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.successTitle}>Report Submitted (Demo)</Text>
      {newId && (
        <View style={styles.successIdBadge}>
          <Text style={styles.successIdText}>Reference ID: {newId}</Text>
        </View>
      )}
      <Text style={styles.successBody}>
        Your complaint has been saved locally this session.{'\n\n'}
        It will appear in My Complaints and can be viewed in detail.{'\n'}
        Real server submission will be enabled in Stage 5.
      </Text>
      {/* View detail */}
      {newId && (
        <TouchableOpacity
          style={styles.successPrimaryBtn}
          onPress={onViewDetail}
          accessibilityRole="button"
          accessibilityLabel={`View complaint ${newId}`}
        >
          <Text style={styles.successPrimaryBtnText}>View My Complaint →</Text>
        </TouchableOpacity>
      )}
      {/* View all */}
      <TouchableOpacity
        style={styles.successSecondaryBtn}
        onPress={onViewComplaints}
        accessibilityRole="button"
        accessibilityLabel="Go to My Complaints"
      >
        <Text style={styles.successSecondaryBtnText}>My Complaints</Text>
      </TouchableOpacity>
      {/* Report another */}
      <TouchableOpacity
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Report another issue"
      >
        <Text style={styles.successResetText}>Report Another Issue</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const router = useRouter();
  const { addComplaint } = useComplaints();

  // Form fields
  const [category,    setCategory]    = useState('');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [photo,       setPhoto]       = useState(null);
  const [location,    setLocation]    = useState(null);

  // UI state
  const [errors,      setErrors]      = useState({});
  const [step,        setStep]        = useState('form');   // 'form' | 'review' | 'success'
  const [submitting,  setSubmitting]  = useState(false);
  const [newId,       setNewId]       = useState(null);     // ID assigned after submit

  const descRef = useRef(null);
  const scrollRef = useRef(null);

  // ── Field change handlers (clear error on edit) ───────────────────────────
  const handleCategorySelect = (id) => {
    setCategory(id);
    if (errors.category) setErrors((e) => ({ ...e, category: '' }));
  };
  const handleTitleChange = (v) => {
    setTitle(v);
    if (errors.title) setErrors((e) => ({ ...e, title: '' }));
  };
  const handleDescChange = (v) => {
    setDescription(v);
    if (errors.description) setErrors((e) => ({ ...e, description: '' }));
  };

  // ── Proceed to review ─────────────────────────────────────────────────────
  const handleReview = () => {
    const fieldErrors = validate(category, title, description);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Scroll to top so the user sees the first error
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setErrors({});
    setStep('review');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Submit — adds to local ComplaintsContext, navigable from My Complaints ──
  // TODO Stage 5: replace addComplaint() with → POST /complaints, use returned ID
  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1400)); // simulate network latency

    // Resolve category metadata for the store
    const cat = CATEGORIES.find((c) => c.id === category);
    const id = addComplaint({
      category,
      categoryLabel: cat?.label ?? category,
      categoryIcon:  cat?.icon  ?? '📌',
      title:         title.trim(),
      description:   description.trim(),
      photoUri:      photo?.uri  ?? null,
      location:      location    ?? null,
    });

    setNewId(id);
    setSubmitting(false);
    setStep('success');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Reset entire form ─────────────────────────────────────────────────────
  const handleReset = () => {
    setCategory('');
    setTitle('');
    setDescription('');
    setPhoto(null);
    setLocation(null);
    setErrors({});
    setNewId(null);
    setStep('form');
  };

  // ── Back from review ──────────────────────────────────────────────────────
  const handleBack = () => {
    setStep('form');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isDisabled = submitting;

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <SuccessCard
            newId={newId}
            onReset={handleReset}
            onViewComplaints={() => router.push('/(tabs)/complaints')}
            onViewDetail={() => newId && router.push(`/complaint/${newId}`)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Step indicator ── */}
          <View style={styles.stepRow}>
            <StepDot n={1} label="Details"  active={step === 'form'}   done={step === 'review'} />
            <View style={styles.stepLine} />
            <StepDot n={2} label="Review"   active={step === 'review'} done={false} />
          </View>

          {/* ══ FORM STEP ══════════════════════════════════════════════════ */}
          {step === 'form' && (
            <>
              {/* Category */}
              <CategoryPicker
                selected={category}
                onSelect={handleCategorySelect}
                error={errors.category}
                disabled={isDisabled}
              />

              {/* Title */}
              <FormInput
                label="Title *"
                value={title}
                onChangeText={handleTitleChange}
                placeholder="Short description, e.g. 'Pothole on MG Road'"
                autoCapitalize="sentences"
                error={errors.title}
                editable={!isDisabled}
                onSubmitEditing={() => descRef.current?.focus()}
              />

              {/* Description */}
              <View style={styles.descWrapper}>
                <Text style={styles.fieldLabel}>
                  Description <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.descInputRow,
                  !!errors.description && styles.descInputRowError,
                ]}>
                  <MultilineInput
                    value={description}
                    onChange={handleDescChange}
                    editable={!isDisabled}
                    inputRef={descRef}
                  />
                </View>
                {!!errors.description && (
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {errors.description}
                  </Text>
                )}
              </View>

              {/* Photo */}
              <PhotoPicker
                photo={photo}
                onPhoto={setPhoto}
                disabled={isDisabled}
              />

              {/* Location */}
              <LocationPicker
                location={location}
                onLocation={setLocation}
                disabled={isDisabled}
              />

              {/* Next → Review */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleReview}
                accessibilityRole="button"
                accessibilityLabel="Review your report before submitting"
              >
                <Text style={styles.primaryBtnText}>Review Report →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══ REVIEW STEP ════════════════════════════════════════════════ */}
          {step === 'review' && (
            <>
              <ReviewCard
                category={category}
                title={title}
                description={description}
                photo={photo}
                location={location}
              />

              {/* Submit (mock) */}
              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Submit report"
                accessibilityState={{ busy: submitting }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Submit Report (Demo)</Text>
                )}
              </TouchableOpacity>

              {/* Back to edit */}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleBack}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Go back and edit report"
              >
                <Text style={styles.secondaryBtnText}>← Edit Details</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiline description input (kept separate to avoid ref confusion)
// ─────────────────────────────────────────────────────────────────────────────
import { TextInput } from 'react-native';

function MultilineInput({ value, onChange, editable, inputRef }) {
  return (
    <TextInput
      ref={inputRef}
      style={styles.descInput}
      value={value}
      onChangeText={onChange}
      placeholder="Describe the issue clearly — location details, severity, how long it has existed…"
      placeholderTextColor={Colors.textMuted}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      autoCapitalize="sentences"
      autoCorrect
      editable={editable}
      accessibilityLabel="Issue description"
      maxLength={500}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator dot
// ─────────────────────────────────────────────────────────────────────────────
function StepDot({ n, label, active, done }) {
  return (
    <View style={styles.stepDotWrapper}>
      <View style={[
        styles.stepDot,
        active && styles.stepDotActive,
        done   && styles.stepDotDone,
      ]}>
        <Text style={[styles.stepDotText, (active || done) && styles.stepDotTextLight]}>
          {done ? '✓' : n}
        </Text>
      </View>
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex:      { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { padding: 16, paddingBottom: 48 },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDotWrapper: { alignItems: 'center', gap: 4 },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 8, marginBottom: 18 },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone:   { backgroundColor: Colors.success },
  stepDotText:      { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  stepDotTextLight: { color: '#fff' },
  stepLabel:       { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  stepLabelActive: { color: Colors.primary, fontWeight: '700' },

  // Description field
  fieldLabel: {
    fontSize: 13, fontWeight: '600',
    color: Colors.textSecondary, marginBottom: 6, letterSpacing: 0.3,
  },
  required: { color: '#C62828' },
  descWrapper:       { marginBottom: 18 },
  descInputRow: {
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 10, backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  descInputRowError: { borderColor: '#C62828', backgroundColor: '#FFF5F5' },
  descInput: {
    minHeight: 100, maxHeight: 160,
    padding: 12, fontSize: 15,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  errorText: { marginTop: 5, fontSize: 12, color: '#C62828' },

  // Review card
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14, padding: 20,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  reviewHeading: {
    fontSize: 16, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: 16,
  },
  reviewRow: {
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  reviewLabel: {
    fontSize: 11, fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3,
  },
  reviewValue:       { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  reviewValueMulti:  { lineHeight: 22 },
  mockWarning: {
    marginTop: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 8, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.warning,
  },
  mockWarningText: { fontSize: 12, color: '#795548', lineHeight: 18 },

  // Success card
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14, padding: 28,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  successIcon:  { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: Colors.success, marginBottom: 12 },
  successIdBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 7, marginBottom: 14,
  },
  successIdText: { fontSize: 14, fontWeight: '700', color: Colors.primary, fontFamily: 'monospace' },
  successBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  successPrimaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 28,
    width: '100%', alignItems: 'center', marginBottom: 12,
  },
  successPrimaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successSecondaryBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 28,
    width: '100%', alignItems: 'center', marginBottom: 20,
  },
  successSecondaryBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  successResetText: { fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' },
  // keep old names for backward compat (no longer rendered but avoids undefined errors)
  resetBtn:     { display: 'none' },
  resetBtnText: { display: 'none' },

  // Buttons
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 10,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 12,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.65, elevation: 0 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },

  secondaryBtn: {
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 10, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
