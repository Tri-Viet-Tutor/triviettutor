import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { CourseCard } from '@/components/common/CourseCard';
import { SessionCard } from '@/components/common/SessionCard';
import { BrandColors } from '@/constants/Colors';
import { CENTER_INFO, MOCK_COURSES, MOCK_SESSIONS, MOCK_TUTORS } from '@/constants/data';
import { useAuth } from '@/services/authContext';
import { GradeLevel } from '@/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'ALL'>('ALL');

  // Next upcoming session
  const nextSession = MOCK_SESSIONS.find((s) => s.status === 'UPCOMING');

  const filteredCourses =
    selectedGrade === 'ALL'
      ? MOCK_COURSES
      : MOCK_COURSES.filter((c) => c.gradeLevel === selectedGrade);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Hero Brand Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={BrandColors.orange} />
            <Text style={styles.heroBadgeText}>Trung tâm Gia sư THPT Hàng đầu</Text>
          </View>
          <Text style={styles.heroTitle}>Bồi dưỡng & Luyện thi Lớp 10 - 11 - 12</Text>
          <Text style={styles.heroDesc}>
            Mô hình lớp nhóm tinh gọn 2 - 8 bạn hoặc 1 kèm 1 với gia sư giỏi, phương pháp cá nhân hóa bứt phá điểm số thi THPT.
          </Text>

          <View style={styles.heroCtaRow}>
            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={() => router.push('/(tabs)/courses')}
              activeOpacity={0.85}>
              <Text style={styles.heroPrimaryBtnText}>Khám phá lớp học</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroSecondaryBtn}
              onPress={() => router.push('/modal')}
              activeOpacity={0.8}>
              <Text style={styles.heroSecondaryBtnText}>Tư vấn miễn phí</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Action Grid */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(tabs)/courses')}
            activeOpacity={0.75}>
            <View style={[styles.quickIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="search" size={20} color={BrandColors.navy} />
            </View>
            <Text style={styles.quickLabel}>Tìm lớp học</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(tabs)/schedule')}
            activeOpacity={0.75}>
            <View style={[styles.quickIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="calendar" size={20} color={BrandColors.orange} />
            </View>
            <Text style={styles.quickLabel}>Lịch học tuần</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(tabs)/courses')}
            activeOpacity={0.75}>
            <View style={[styles.quickIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="people" size={20} color="#16A34A" />
            </View>
            <Text style={styles.quickLabel}>Lớp nhóm 2-8</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/modal')}
            activeOpacity={0.75}>
            <View style={[styles.quickIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="headset" size={20} color="#9333EA" />
            </View>
            <Text style={styles.quickLabel}>Hotline 1900</Text>
          </TouchableOpacity>
        </View>

        {/* Next Session Widget */}
        {nextSession && user && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time" size={18} color={BrandColors.navy} />
                <Text style={styles.sectionTitle}>Buổi học kế tiếp của bạn</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')}>
                <Text style={styles.seeAllText}>Xem lịch</Text>
              </TouchableOpacity>
            </View>
            <SessionCard session={nextSession} />
          </View>
        )}

        {/* Grade Filter Chips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="school" size={18} color={BrandColors.navy} />
              <Text style={styles.sectionTitle}>Khóa học đang mở đăng ký</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/courses')}>
              <Text style={styles.seeAllText}>Tất cả ({MOCK_COURSES.length})</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterChipRow}>
            {(['ALL', 'GRADE_10', 'GRADE_11', 'GRADE_12'] as const).map((grade) => {
              const isSelected = selectedGrade === grade;
              const label =
                grade === 'ALL'
                  ? 'Tất cả khối'
                  : grade === 'GRADE_10'
                  ? 'Lớp 10'
                  : grade === 'GRADE_11'
                  ? 'Lớp 11'
                  : 'Lớp 12';
              return (
                <TouchableOpacity
                  key={grade}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedGrade(grade)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Course List */}
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </View>

        {/* Featured Tutors */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="ribbon" size={18} color={BrandColors.navy} />
              <Text style={styles.sectionTitle}>Gia sư tiêu biểu Trung tâm</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tutorScroll}>
            {Object.values(MOCK_TUTORS).map((tutor) => (
              <View key={tutor.id} style={styles.tutorCard}>
                <View style={styles.tutorAvatarBox}>
                  <Ionicons name="person" size={28} color={BrandColors.navy} />
                </View>
                <Text style={styles.tutorCardName}>{tutor.fullName}</Text>
                <View style={styles.tutorRatingRow}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.tutorRatingText}>{tutor.rating} ({tutor.reviewCount} đánh giá)</Text>
                </View>
                <Text style={styles.tutorBio} numberOfLines={2}>
                  {tutor.bio}
                </Text>
                <View style={styles.tutorTags}>
                  {tutor.specialties.slice(0, 2).map((s, idx) => (
                    <Text key={idx} style={styles.tutorTag}>
                      {s}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Commitment Banner */}
        <View style={styles.commitCard}>
          <Ionicons name="shield-checkmark" size={28} color={BrandColors.navy} />
          <Text style={styles.commitTitle}>Cam kết chất lượng VietTriTutor</Text>
          <Text style={styles.commitText}>
            • Lớp học quy mô nhỏ (2 - 8 bạn) để thầy cô theo sát từng học sinh.{'\n'}
            • Báo cáo điểm danh và kết quả học tập minh bạch cho phụ huynh.{'\n'}
            • Đổi gia sư hoặc chuyển lớp linh hoạt nếu không phù hợp.
          </Text>
        </View>
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
    paddingBottom: 30,
  },
  heroBanner: {
    backgroundColor: BrandColors.navy,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: BrandColors.navyDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroCtaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPrimaryBtn: {
    backgroundColor: BrandColors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  heroPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  heroSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroSecondaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickItem: {
    alignItems: 'center',
    width: '23%',
  },
  quickIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.ink,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.ink,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.navy,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.muted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  tutorScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  tutorCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tutorAvatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BrandColors.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tutorCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 2,
  },
  tutorRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  tutorRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  tutorBio: {
    fontSize: 12,
    color: BrandColors.muted,
    lineHeight: 16,
    marginBottom: 8,
  },
  tutorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tutorTag: {
    fontSize: 10,
    color: BrandColors.navy,
    backgroundColor: BrandColors.navyLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  commitCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: BrandColors.cream,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.marker,
  },
  commitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.ink,
    marginTop: 6,
    marginBottom: 6,
  },
  commitText: {
    fontSize: 12,
    color: BrandColors.ink,
    lineHeight: 20,
  },
});
