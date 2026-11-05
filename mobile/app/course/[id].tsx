import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/common/Badge';
import { BrandColors } from '@/constants/Colors';
import { fetchClassDetail, fetchCourseDescription } from '@/services/catalog';
import type { CourseItem } from '@/types';

/** Địa chỉ website (đăng ký và thanh toán làm trên web; app chỉ để xem) */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

/** "2026-11-02" → "02/11/2026" */
const formatDate = (iso?: string | null) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * Chi tiết một lớp đang mở: lấy từ GET /catalog/classes/{id} (lịch từng buổi, sĩ số, học phí thật)
 * và mô tả khóa từ GET /catalog/courses. Đăng ký và thanh toán làm trên website.
 */
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<CourseItem | null>(null);
  const [description, setDescription] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCourse(null);
    setError(null);
    fetchClassDetail(id)
      .then((detail) => {
        if (!active) return;
        setCourse(detail);
        if (detail.courseId) {
          fetchCourseDescription(detail.courseId)
            .then((text) => active && setDescription(text))
            .catch(() => undefined);
        }
      })
      .catch(() => active && setError('Lớp này không còn mở hoặc không tải được. Hãy quay lại danh sách lớp.'));
    return () => {
      active = false;
    };
  }, [id]);

  const openOnWeb = () => {
    if (course) void Linking.openURL(`${WEB_URL}/student/checkout?lop=${course.id}`);
  };

  if (!course) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        {error ? (
          <>
            <Ionicons name="alert-circle-outline" size={44} color={BrandColors.muted} />
            <Text style={[styles.descriptionText, { textAlign: 'center', marginTop: 12 }]}>{error}</Text>
            <TouchableOpacity style={[styles.enrollButton, { marginTop: 16 }]} onPress={() => router.back()}>
              <Text style={styles.enrollButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color={BrandColors.navy} />
        )}
      </SafeAreaView>
    );
  }

  const full = (course.spotsLeft ?? 0) <= 0;
  const upcoming = (course.sessions ?? []).filter((session) => session.status !== 'CANCELLED').slice(0, 6);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BrandColors.navy} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Course Banner */}
        <View style={styles.banner}>
          <View style={styles.badgeRow}>
            <Badge label={course.gradeLabel} variant="orange" size="sm" />
            <Badge
              label={course.classType === 'GROUP' ? `Lớp nhóm (tối đa ${course.maxStudents} bạn)` : '1-kèm-1'}
              variant="neutral"
              size="sm"
            />
            <Badge label={course.deliveryMode === 'ONLINE' ? 'Trực tuyến' : 'Tại trung tâm'} variant="neutral" size="sm" />
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
            <Text style={styles.paramLabel}>{full ? 'Đã đủ chỗ' : `Còn ${course.spotsLeft} chỗ`}</Text>
          </View>
          <View style={styles.paramItem}>
            <Ionicons name="layers-outline" size={20} color={BrandColors.navy} />
            <Text style={styles.paramValue}>{course.totalSessions} buổi</Text>
            <Text style={styles.paramLabel}>Thời lượng</Text>
          </View>
        </View>

        {/* Course Description */}
        {description ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Giới thiệu khóa học</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        ) : null}

        {/* Schedule */}
        {upcoming.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Lịch các buổi đầu</Text>
            {upcoming.map((session) => (
              <View key={session.id} style={styles.highlightRow}>
                <Ionicons name="calendar-number-outline" size={18} color={BrandColors.navy} />
                <Text style={styles.highlightText}>
                  Buổi {session.sessionNumber}: {formatDate(session.date)}, {session.startTime.substring(0, 5)} -{' '}
                  {session.endTime.substring(0, 5)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Venue & Dates */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Địa điểm & Khai giảng</Text>
          <View style={styles.venueRow}>
            <Ionicons name={course.deliveryMode === 'ONLINE' ? 'videocam' : 'location'} size={18} color={BrandColors.navy} />
            <Text style={styles.venueText}>{course.location}</Text>
          </View>
          <View style={styles.venueRow}>
            <Ionicons name="flag" size={18} color={BrandColors.orange} />
            <Text style={styles.venueText}>Khai giảng: {formatDate(course.startDate)}</Text>
          </View>
          {course.enrollmentDeadline ? (
            <View style={styles.venueRow}>
              <Ionicons name="hourglass-outline" size={18} color={BrandColors.orange} />
              <Text style={styles.venueText}>Hạn đăng ký: {formatDate(course.enrollmentDeadline)}</Text>
            </View>
          ) : null}
          <View style={styles.venueRow}>
            <Ionicons name="person-outline" size={18} color={BrandColors.navy} />
            <Text style={styles.venueText}>Gia sư được trung tâm phân công sau khi lớp chốt sĩ số.</Text>
          </View>
        </View>

        {/* Group Pricing Rules (BR-02) */}
        {course.classType === 'GROUP' && (
          <View style={[styles.sectionCard, styles.pricingCard]}>
            <View style={styles.pricingHeader}>
              <Ionicons name="shield-checkmark" size={20} color={BrandColors.navy} />
              <Text style={styles.pricingTitle}>Học phí theo sĩ số</Text>
            </View>
            <Text style={styles.pricingDesc}>
              Lớp nhóm 2 - 3 bạn giảm 20%, 4 - 5 bạn giảm 35%, 6 - 8 bạn giảm 40% so với học phí 1 kèm 1. Giá được chốt lúc bạn đăng ký.
              Đến hạn đăng ký mà lớp chưa đủ 2 bạn, trung tâm dời ngày khai giảng hoặc hoàn tiền 100%.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.feeLabel}>
            {course.discountRate ? `Học phí (giảm ${Math.round(course.discountRate * 100)}%):` : 'Học phí trọn khóa:'}
          </Text>
          <Text style={styles.feeAmount}>{formatCurrency(course.tuitionFee)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.enrollButton, full && styles.enrolledButton]}
          onPress={openOnWeb}
          disabled={full}
          activeOpacity={0.85}>
          <Ionicons name={full ? 'close-circle-outline' : 'open-outline'} size={18} color="#FFFFFF" />
          <Text style={styles.enrollButtonText}>{full ? 'Lớp đã đủ chỗ' : 'Đăng ký trên web'}</Text>
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
