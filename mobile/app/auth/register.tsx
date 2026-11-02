import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { registerWithApi } from '@/services/api';
import { BrandColors } from '@/constants/Colors';
import { GradeLevel } from '@/types';

/** Địa chỉ website để kích hoạt tài khoản bằng mã gửi qua email */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState<GradeLevel>('GRADE_12');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ tên, email và mật khẩu.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Tạo tài khoản thật; máy chủ gửi mã kích hoạt tới email
      await registerWithApi(fullName, email, password);
      Alert.alert(
        'Đã tạo tài khoản',
        `Mã kích hoạt đã được gửi tới ${email.trim()}. Mở trang kích hoạt trên website để nhập mã, sau đó đăng nhập trên app.`,
        [
          { text: 'Để sau', style: 'cancel', onPress: () => router.replace('/auth/login') },
          {
            text: 'Mở trang kích hoạt',
            onPress: () => {
              void Linking.openURL(`${WEB_URL}/verify-email`);
              router.replace('/auth/login');
            },
          },
        ]
      );
    } catch (error: any) {
      const message = String(error?.message ?? '');
      Alert.alert(
        'Chưa tạo được tài khoản',
        message.includes('Network request failed') ? 'Không kết nối được máy chủ.' : message || 'Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>Tạo tài khoản Học viên</Text>
            <Text style={styles.headerSubtitle}>
              Tham gia học tập cùng gia sư chất lượng cao tại VietTriTutor
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên học sinh / phụ huynh</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={BrandColors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Nguyễn Minh Quân"
                  placeholderTextColor={BrandColors.muted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Địa chỉ Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={BrandColors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="minhquan@gmail.com"
                  placeholderTextColor={BrandColors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại liên hệ</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color={BrandColors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="0912 345 678"
                  placeholderTextColor={BrandColors.muted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Grade Level Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Khối lớp THPT</Text>
              <View style={styles.gradeRow}>
                {(['GRADE_10', 'GRADE_11', 'GRADE_12'] as const).map((g) => {
                  const isSelected = grade === g;
                  const label =
                    g === 'GRADE_10'
                      ? 'Lớp 10'
                      : g === 'GRADE_11'
                      ? 'Lớp 11'
                      : 'Lớp 12';
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.gradeBtn, isSelected && styles.gradeBtnActive]}
                      onPress={() => setGrade(g)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.gradeBtnText,
                          isSelected && styles.gradeBtnTextActive,
                        ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={BrandColors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor={BrandColors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={BrandColors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={18} color={BrandColors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={BrandColors.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Business Rule Notice */}
            <View style={styles.ruleNotice}>
              <Ionicons name="information-circle-outline" size={16} color={BrandColors.navy} />
              <Text style={styles.ruleNoticeText}>
                *Lưu ý: Tài khoản Gia sư do Trung tâm trực tiếp xét duyệt và cấp quyền (BR-01.01).
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Đang khởi tạo tài khoản...' : 'Đăng ký tài khoản'}
              </Text>
            </TouchableOpacity>

            {/* Login Prompt */}
            <View style={styles.loginPrompt}>
              <Text style={styles.promptText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={styles.loginLinkText}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.navy,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BrandColors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.ink,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.ink,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gradeBtnActive: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  gradeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.muted,
  },
  gradeBtnTextActive: {
    color: '#FFFFFF',
  },
  ruleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.navyLight,
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginBottom: 16,
  },
  ruleNoticeText: {
    fontSize: 11,
    color: BrandColors.navy,
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: BrandColors.navy,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 13,
    color: BrandColors.muted,
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.navy,
  },
});
