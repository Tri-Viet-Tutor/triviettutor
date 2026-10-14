import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { Badge } from '@/components/common/Badge';
import { BrandColors } from '@/constants/Colors';
import { CENTER_INFO } from '@/constants/data';
import { useAuth } from '@/services/authContext';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout, switchRole } = useAuth();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleSupportCall = () => {
    Alert.alert(
      'Hotline Trung tâm',
      `Gọi hỗ trợ VietTriTutor qua số:\n${CENTER_INFO.hotline}\n\nThời gian làm việc: 08:00 - 21:30 hàng ngày.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title="Hồ sơ Cá nhân" subtitle="Quản lý tài khoản & cài đặt" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* User Card */}
        {isAuthenticated && user ? (
          <View style={styles.userCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={36} color={BrandColors.navy} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.fullName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.userTagRow}>
                  <Badge
                    label={
                      user.role === 'ROLE_ADMIN'
                        ? 'Quản trị viên'
                        : user.role === 'ROLE_TUTOR'
                        ? 'Gia sư Trung tâm'
                        : 'Học viên THPT'
                    }
                    variant={user.role === 'ROLE_STUDENT' ? 'primary' : 'orange'}
                    size="sm"
                  />
                  {user.gradeLevel && (
                    <Badge label="Lớp 12" variant="neutral" size="sm" />
                  )}
                </View>
              </View>
            </View>

            {user.school && (
              <View style={styles.schoolRow}>
                <Ionicons name="business-outline" size={15} color={BrandColors.muted} />
                <Text style={styles.schoolText}>{user.school}</Text>
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>2</Text>
                <Text style={styles.statLbl}>Lớp đang học</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: BrandColors.success }]}>98%</Text>
                <Text style={styles.statLbl}>Chuyên cần</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: BrandColors.orange }]}>0</Text>
                <Text style={styles.statLbl}>Đơn xin nghỉ</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <Ionicons name="person-circle-outline" size={56} color={BrandColors.navy} />
            <Text style={styles.guestTitle}>Chào mừng bạn đến với VietTriTutor</Text>
            <Text style={styles.guestDesc}>
              Đăng nhập để theo dõi lịch học, kết quả điểm danh và đăng ký khóa học THPT.
            </Text>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.85}>
              <Text style={styles.loginBtnText}>Đăng nhập ngay</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Demo Role Switcher */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeaderTitle}>Trải nghiệm nhanh theo vai trò (Demo Switcher)</Text>
          <Text style={styles.sectionSubDesc}>
            Chuyển nhanh góc nhìn người dùng để trải nghiệm giao diện các nhóm actor:
          </Text>
          <View style={styles.demoButtons}>
            <TouchableOpacity
              style={[
                styles.demoBtn,
                user?.role === 'ROLE_STUDENT' && styles.demoBtnActive,
              ]}
              onPress={() => switchRole('student')}>
              <Ionicons
                name="school-outline"
                size={16}
                color={user?.role === 'ROLE_STUDENT' ? '#FFFFFF' : BrandColors.navy}
              />
              <Text
                style={[
                  styles.demoBtnText,
                  user?.role === 'ROLE_STUDENT' && styles.demoBtnTextActive,
                ]}>
                Học viên (Student)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoBtn,
                user?.role === 'ROLE_TUTOR' && styles.demoBtnActive,
              ]}
              onPress={() => switchRole('tutor')}>
              <Ionicons
                name="person-outline"
                size={16}
                color={user?.role === 'ROLE_TUTOR' ? '#FFFFFF' : BrandColors.navy}
              />
              <Text
                style={[
                  styles.demoBtnText,
                  user?.role === 'ROLE_TUTOR' && styles.demoBtnTextActive,
                ]}>
                Gia sư (Tutor)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoBtn,
                user?.role === 'ROLE_ADMIN' && styles.demoBtnActive,
              ]}
              onPress={() => switchRole('admin')}>
              <Ionicons
                name="shield-outline"
                size={16}
                color={user?.role === 'ROLE_ADMIN' ? '#FFFFFF' : BrandColors.navy}
              />
              <Text
                style={[
                  styles.demoBtnText,
                  user?.role === 'ROLE_ADMIN' && styles.demoBtnTextActive,
                ]}>
                Quản trị viên (Admin)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/modal')}
            activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="information-circle-outline" size={20} color={BrandColors.navy} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Về Trung tâm VietTriTutor</Text>
              <Text style={styles.menuSubLabel}>Mô hình trung tâm, cam kết chất lượng giáo dục</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSupportCall}
            activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="call-outline" size={20} color={BrandColors.orange} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Hotline Hỗ trợ Phụ huynh & Học sinh</Text>
              <Text style={styles.menuSubLabel}>{CENTER_INFO.hotline}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Thông báo', 'Tính năng thông báo tự động trước giờ học 30 phút đã được kích hoạt.')}
            activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="notifications-outline" size={20} color="#16A34A" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Cài đặt Thông báo & Nhắc lịch</Text>
              <Text style={styles.menuSubLabel}>Nhắc trước buổi học 30 phút qua push notification</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Quy chế học phí', 'Học phí được thanh toán theo kỳ hoặc khóa học. Lớp nhóm từ 2 đến 8 học viên áp dụng bảng chiết khấu cố định theo quy tắc BR-02.')}
            activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="receipt-outline" size={20} color="#9333EA" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Quy chế Lớp học & Chính sách Học phí</Text>
              <Text style={styles.menuSubLabel}>Chính sách sĩ số nhóm 2 - 8 bạn và hoàn tiền</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Auth / Logout Button */}
        {isAuthenticated ? (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={BrandColors.danger} />
            <Text style={styles.logoutBtnText}>Đăng xuất khỏi thiết bị</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.authBtn}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}>
            <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
            <Text style={styles.authBtnText}>Đăng nhập vào hệ thống</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.versionText}>VietTriTutor Mobile • Phiên bản 1.0.0 (Expo SDK 57)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BrandColors.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.ink,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: BrandColors.muted,
    marginBottom: 6,
  },
  userTagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  schoolText: {
    fontSize: 12,
    color: BrandColors.muted,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navy,
  },
  statLbl: {
    fontSize: 11,
    color: BrandColors.muted,
    marginTop: 2,
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.ink,
    marginTop: 10,
    marginBottom: 6,
  },
  guestDesc: {
    fontSize: 13,
    color: BrandColors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  loginBtn: {
    backgroundColor: BrandColors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionBox: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 4,
  },
  sectionSubDesc: {
    fontSize: 11,
    color: BrandColors.muted,
    marginBottom: 10,
  },
  demoButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  demoBtnActive: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.ink,
  },
  demoBtnTextActive: {
    color: '#FFFFFF',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 2,
  },
  menuSubLabel: {
    fontSize: 11,
    color: BrandColors.muted,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: BrandColors.dangerLight,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: BrandColors.navy,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  authBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: BrandColors.muted,
    marginTop: 20,
  },
});
