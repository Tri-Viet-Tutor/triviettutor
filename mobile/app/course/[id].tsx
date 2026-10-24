import React, { useState } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/common/Badge';
import { BrandColors } from '@/constants/Colors';
import { MOCK_COURSES } from '@/constants/data';
import { useAuth } from '@/services/authContext';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);

  const course = MOCK_COURSES.find((c) => c.id === id) || MOCK_COURSES[0];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleEnroll = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập để tiến hành đăng ký lớp học.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đăng nhập',
            onPress: () => router.push('/auth/login'),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Xác nhận đăng ký lớp học',
      `Bạn đang đăng ký lớp:\n${course.title}\n\n• Học phí: ${formatCurrency(course.tuitionFee)}\n• Khai giảng dự kiến: ${course.startDate}\n• Lịch học: ${course.scheduleLabel} (${course.timeSlotHours})\n\nHọc sinh sẽ được kiểm tra chặn trùng lịch trước khi thanh toán.`,
      [
        { text: 'Suy nghĩ thêm', style: 'cancel' },
        {
          text: 'Đăng ký ngay',
          onPress: () => {
            setIsEnrolled(true);
            Alert.alert(
              'Đăng ký thành công!',
              'Giáo vụ Trung tâm VietTriTutor sẽ liên hệ với bạn qua SĐT/Email để xác nhận lịch học và kích hoạt phòng học.',
              [{ text: 'Về trang chủ', onPress: () => router.push('/(tabs)') }]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BrandColors.navy} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Course Banner */}
        <View style={styles.banner}>
          <View style={styles.badgeRow}>
            <Badge label={course.gradeLabel} variant="orange" size="sm" />
            <Badge
              label={course.classType === 'GROUP' ? `Lớp nhóm (${course.maxStudents} bạn)` : '1-kèm-1'}
              variant="neutral"
              size="sm"
            />
            <Badge
              label={course.deliveryMode === 'ONLINE' ? 'Trực tuyến' : 'Tại trung tâm'}
              variant="neutral"
              size="sm"
            />
          </View>
          <Text style={styles.bannerTitle}>{course.title}</Text>
          <Text style={styles.courseCode}>Mã lớp: {course.code}</Text>
        </View>

        {/* Quick Parameters */}
        <View style={styles.paramGrid}>
          <View style={styles.paramItem}>
            <Ionicons name="calendar-outline" size={20} color={BrandColors.navy} />
            <Text style={styles.paramValue}>{course.scheduleLabel}</Text>
            <Text style={styles.paramLabel}>Lịch tuần</Text>
          </View>
          <View style={styles.paramItem}>
            <Ionicons name="time-outline" size={20} color={BrandColors.navy} />
            <Text style={styles.paramValue}>{course.timeSlotHours}</Text>
            <Text style={styles.paramLabel}>Khung giờ</Text>
          </View>
          <View style={styles.paramItem}>
            <Ionicons name="people-outline" size={20} color={BrandColors.navy} />
            <Text style={styles.paramValue}>
              {course.enrolledStudents}/{course.maxStudents}
            </Text>
            <Text style={styles.paramLabel}>Sĩ số hiện tại</Text>
          </View>
          <View style={styles.paramItem}>
            <Ionicons name="layers-outline" size={20} color={BrandColors.navy} />
            <Text style={styles.paramValue}>{course.totalSessions} buổi</Text>
            <Text style={styles.paramLabel}>Thời lượng</Text>
          </View>
        </View>

        {/* Course Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Giới thiệu & Mục tiêu khóa học</Text>
          <Text style={styles.descriptionText}>{course.description}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Điểm nổi bật của khóa:</Text>
          {course.highlights.map((item, idx) => (
            <View key={idx} style={styles.highlightRow}>
              <Ionicons name="checkmark-circle" size={18} color={BrandColors.success} />
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Tutor Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Gia sư đảm nhiệm</Text>
          <View style={styles.tutorBox}>
            <View style={styles.tutorAvatar}>
              <Ionicons name="person" size={32} color={BrandColors.navy} />
            </View>
            <View style={styles.tutorDetails}>
              <Text style={styles.tutorName}>{course.tutor.fullName}</Text>
              <Text style={styles.tutorBio}>{course.tutor.bio}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {course.tutor.rating} ({course.tutor.reviewCount} đánh giá từ học sinh)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Venue & Location */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Địa điểm & Khai giảng</Text>
          <View style={styles.venueRow}>
            <Ionicons
              name={course.deliveryMode === 'ONLINE' ? 'videocam' : 'location'}
              size={18}
              color={BrandColors.navy}
            />
            <Text style={styles.venueText}>{course.location}</Text>
          </View>
          <View style={styles.venueRow}>
            <Ionicons name="flag" size={18} color={BrandColors.orange} />
            <Text style={styles.venueText}>Dự kiến khai giảng: {course.startDate}</Text>
          </View>
        </View>

        {/* Group Pricing Rules (BR-02) */}
        <View style={[styles.sectionCard, styles.pricingCard]}>
          <View style={styles.pricingHeader}>
            <Ionicons name="shield-checkmark" size={20} color={BrandColors.navy} />
            <Text style={styles.pricingTitle}>Chính sách Sĩ số & Học phí (BR-02)</Text>
          </View>
          <Text style={styles.pricingDesc}>
            Lớp nhóm được thiết kế quy mô vàng từ 2 đến 8 học sinh THPT để đảm bảo chất lượng cao nhất.
            Nếu đến hạn chốt đăng ký mà lớp chưa đủ 2 bạn, trung tâm cam kết dời ngày hoặc hoàn tiền 100%.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.feeLabel}>Học phí trọn gói:</Text>
          <Text style={styles.feeAmount}>{formatCurrency(course.tuitionFee)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.enrollButton, isEnrolled && styles.enrolledButton]}
          onPress={handleEnroll}
          disabled={isEnrolled}
          activeOpacity={0.85}>
          <Ionicons
            name={isEnrolled ? 'checkmark-circle' : 'bag-check-outline'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.enrollButtonText}>
            {isEnrolled ? 'Đã đăng ký' : 'Đăng ký ngay'}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  banner: {
    backgroundColor: BrandColors.navy,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 6,
  },
  courseCode: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  paramGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  paramItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  paramValue: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.ink,
    marginTop: 4,
    textAlign: 'center',
  },
  paramLabel: {
    fontSize: 10,
    color: BrandColors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: BrandColors.muted,
    lineHeight: 20,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 4,
  },
  highlightText: {
    fontSize: 13,
    color: BrandColors.ink,
    flex: 1,
    lineHeight: 18,
  },
  tutorBox: {
    flexDirection: 'row',
    gap: 12,
  },
  tutorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorDetails: {
    flex: 1,
  },
  tutorName: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 2,
  },
  tutorBio: {
    fontSize: 12,
    color: BrandColors.muted,
    lineHeight: 16,
    marginBottom: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  venueText: {
    fontSize: 13,
    color: BrandColors.ink,
    flex: 1,
  },
  pricingCard: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.marker,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pricingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.ink,
  },
  pricingDesc: {
    fontSize: 12,
    color: BrandColors.ink,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 11,
    color: BrandColors.muted,
    marginBottom: 2,
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navy,
  },
  enrollButton: {
    backgroundColor: BrandColors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  enrolledButton: {
    backgroundColor: BrandColors.success,
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
