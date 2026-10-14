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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/services/authContext';
import { DEMO_USERS } from '@/constants/data';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    await login(email, 'ROLE_STUDENT');
    setIsSubmitting(false);

    Alert.alert('Thành công', 'Đăng nhập thành công!', [
      {
        text: 'Tiếp tục',
        onPress: () => router.replace('/(tabs)'),
      },
    ]);
  };

  const handleQuickLogin = async (roleKey: 'student' | 'tutor' | 'admin') => {
    const demo = DEMO_USERS[roleKey];
    if (demo) {
      setEmail(demo.email);
      setPassword('password123');
      setIsSubmitting(true);
      await login(demo.email, demo.role);
      setIsSubmitting(false);
      router.replace('/(tabs)');
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
          
          {/* Header & Logo */}
          <View style={styles.headerBox}>
            <View style={styles.logoBadge}>
              <Ionicons name="school" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.logoTitle}>
              VietTri<Text style={styles.logoHighlight}>Tutor</Text>
            </Text>
            <Text style={styles.headerSubtitle}>
              Hệ thống Bồi dưỡng & Luyện thi THPT Lớp 10 - 11 - 12
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Đăng nhập tài khoản</Text>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email hoặc Số điện thoại</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={BrandColors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="hocvien@gmail.com"
                  placeholderTextColor={BrandColors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={BrandColors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
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

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() =>
                Alert.alert(
                  'Quên mật khẩu',
                  'Vui lòng liên hệ giáo vụ trung tâm qua hotline 1900 8899 để được cấp lại mật khẩu mới.'
                )
              }>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
              </Text>
            </TouchableOpacity>

            {/* Register link */}
            <View style={styles.registerPrompt}>
              <Text style={styles.promptText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={styles.registerLinkText}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Demo Section */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Đăng nhập nhanh mẫu (Demo Mode):</Text>
            <View style={styles.demoList}>
              <TouchableOpacity
                style={styles.demoCard}
                onPress={() => handleQuickLogin('student')}>
                <Ionicons name="school" size={18} color={BrandColors.navy} />
                <View>
                  <Text style={styles.demoCardName}>Học viên THPT</Text>
                  <Text style={styles.demoCardSub}>Nguyễn Minh Quân (Lớp 12)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoCard}
                onPress={() => handleQuickLogin('tutor')}>
                <Ionicons name="book" size={18} color={BrandColors.orange} />
                <View>
                  <Text style={styles.demoCardName}>Gia sư Trung tâm</Text>
                  <Text style={styles.demoCardSub}>Thầy Hồ Đức Thuận (Môn Toán)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoCard}
                onPress={() => handleQuickLogin('admin')}>
                <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
                <View>
                  <Text style={styles.demoCardName}>Quản trị viên (Admin)</Text>
                  <Text style={styles.demoCardSub}>admin@viettritutor.edu.vn</Text>
                </View>
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: BrandColors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: BrandColors.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: BrandColors.navy,
  },
  logoHighlight: {
    color: BrandColors.orange,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BrandColors.muted,
    marginTop: 4,
    textAlign: 'center',
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
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 16,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 12,
    color: BrandColors.navy,
    fontWeight: '600',
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
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 13,
    color: BrandColors.muted,
  },
  registerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.navy,
  },
  demoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 10,
  },
  demoList: {
    gap: 8,
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  demoCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.ink,
  },
  demoCardSub: {
    fontSize: 11,
    color: BrandColors.muted,
  },
});
