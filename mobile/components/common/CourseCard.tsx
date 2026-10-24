import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CourseItem } from '@/types';
import { BrandColors } from '@/constants/Colors';
import { Badge } from './Badge';

interface CourseCardProps {
  course: CourseItem;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getSubjectIcon = (subject: string): keyof typeof Ionicons.glyphMap => {
    switch (subject) {
      case 'MATH':
        return 'calculator-outline';
      case 'PHYSICS':
        return 'flash-outline';
      case 'CHEMISTRY':
        return 'flask-outline';
      case 'ENGLISH':
        return 'language-outline';
      case 'LITERATURE':
        return 'book-outline';
      default:
        return 'school-outline';
    }
  };

  const fillRatio = Math.min(course.enrolledStudents / course.maxStudents, 1);
  const isAlmostFull = course.enrolledStudents >= course.maxStudents - 1;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}>
      
      {/* Top row: Badges */}
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <Badge label={course.gradeLabel} variant="primary" size="sm" />
          <Badge
            label={course.classType === 'GROUP' ? `Nhóm (${course.maxStudents} bạn)` : '1 Kèm 1'}
            variant="orange"
            size="sm"
          />
          <Badge
            label={course.deliveryMode === 'ONLINE' ? 'Trực tuyến' : 'Tại trung tâm'}
            variant="neutral"
            size="sm"
          />
        </View>

        <View style={styles.subjectIconBox}>
          <Ionicons name={getSubjectIcon(course.subject)} size={18} color={BrandColors.navy} />
        </View>
      </View>

      {/* Course Title */}
      <Text style={styles.title} numberOfLines={2}>
        {course.title}
      </Text>

      {/* Tutor info */}
      <View style={styles.tutorRow}>
        <Ionicons name="person-circle-outline" size={18} color={BrandColors.muted} />
        <Text style={styles.tutorName}>{course.tutor.fullName}</Text>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.ratingText}>{course.tutor.rating}</Text>
        </View>
      </View>

      {/* Schedule Info */}
      <View style={styles.metaBox}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={BrandColors.navy} />
          <Text style={styles.metaText}>{course.scheduleLabel}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={BrandColors.navy} />
          <Text style={styles.metaText}>{course.timeSlotHours}</Text>
        </View>
      </View>

      {/* Capacity & Progress */}
      <View style={styles.capacitySection}>
        <View style={styles.capacityHeader}>
          <Text style={styles.capacityLabel}>
            Đã đăng ký: <Text style={styles.capacityCount}>{course.enrolledStudents}/{course.maxStudents} học viên</Text>
          </Text>
          {isAlmostFull && (
            <Text style={styles.urgentText}>Sắp đủ lớp!</Text>
          )}
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${fillRatio * 100}%` },
              isAlmostFull ? styles.progressWarning : styles.progressNormal,
            ]}
          />
        </View>
      </View>

      {/* Bottom Row: Tuition fee & CTA */}
      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.feeLabel}>Học phí khóa ({course.totalSessions} buổi):</Text>
          <Text style={styles.feeValue}>{formatCurrency(course.tuitionFee)}</Text>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
          activeOpacity={0.8}>
          <Text style={styles.ctaButtonText}>Xem lớp</Text>
          <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  subjectIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BrandColors.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.ink,
    lineHeight: 22,
    marginBottom: 6,
  },
  tutorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tutorName: {
    fontSize: 13,
    color: BrandColors.muted,
    marginLeft: 5,
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 8,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  metaText: {
    fontSize: 12,
    color: BrandColors.ink,
    fontWeight: '500',
  },
  capacitySection: {
    marginBottom: 12,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  capacityLabel: {
    fontSize: 11,
    color: BrandColors.muted,
  },
  capacityCount: {
    fontWeight: '700',
    color: BrandColors.ink,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.orange,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressNormal: {
    backgroundColor: BrandColors.navy,
  },
  progressWarning: {
    backgroundColor: BrandColors.orange,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  feeLabel: {
    fontSize: 11,
    color: BrandColors.muted,
    marginBottom: 2,
  },
  feeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navy,
  },
  ctaButton: {
    backgroundColor: BrandColors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
