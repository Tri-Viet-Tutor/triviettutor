import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { CourseCard } from '@/components/common/CourseCard';
import { BrandColors } from '@/constants/Colors';
import { fetchOpenClasses } from '@/services/catalog';
import { CourseItem, DeliveryMode, GradeLevel } from '@/types';

export default function CoursesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'ALL'>('ALL');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryMode | 'ALL'>('ALL');

  // Lớp đang mở đăng ký lấy từ máy chủ (GET /catalog/classes, xem được khi chưa đăng nhập)
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCourses(await fetchOpenClasses());
      setLoadError(null);
    } catch {
      setLoadError('Không tải được danh sách lớp. Kéo xuống để thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCourses = useMemo(() => {
    const keyword = searchQuery.toLowerCase();
    return courses.filter((course) => {
      const matchSearch =
        course.title.toLowerCase().includes(keyword) ||
        course.subjectLabel.toLowerCase().includes(keyword) ||
        course.code.toLowerCase().includes(keyword);

      const matchGrade =
        selectedGrade === 'ALL' || course.gradeLevel === selectedGrade;

      const matchDelivery =
        selectedDelivery === 'ALL' || course.deliveryMode === selectedDelivery;

      return matchSearch && matchGrade && matchDelivery;
    });
  }, [courses, searchQuery, selectedGrade, selectedDelivery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedGrade('ALL');
    setSelectedDelivery('ALL');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title="Danh mục Khóa học" subtitle="Các lớp học THPT đang mở tuyển sinh" />

      <View style={styles.container}>
        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={BrandColors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên khóa, môn hoặc mã lớp..."
              placeholderTextColor={BrandColors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={BrandColors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips Bar */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {/* Grades */}
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
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setSelectedGrade(grade)}
                  activeOpacity={0.7}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.chipDivider} />

            {/* Delivery Mode */}
            {(['ALL', 'ONLINE', 'OFFLINE'] as const).map((mode) => {
              const isSelected = selectedDelivery === mode;
              const label =
                mode === 'ALL'
                  ? 'Mọi hình thức'
                  : mode === 'ONLINE'
                  ? 'Trực tuyến'
                  : 'Tại trung tâm';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setSelectedDelivery(mode)}
                  activeOpacity={0.7}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Result Header */}
        <View style={styles.resultHeader}>
          <Text style={styles.resultCount}>
            Tìm thấy <Text style={styles.countNumber}>{filteredCourses.length}</Text> lớp học phù hợp
          </Text>
          {(selectedGrade !== 'ALL' || selectedDelivery !== 'ALL' || searchQuery !== '') && (
            <TouchableOpacity onPress={handleResetFilters} activeOpacity={0.7}>
              <Text style={styles.resetText}>Đặt lại bộ lọc</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Course List */}
        <ScrollView
          style={styles.courseList}
          contentContainerStyle={styles.courseListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              colors={[BrandColors.navy]}
              tintColor={BrandColors.navy}
            />
          }>
          {loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={BrandColors.navy} />
              <Text style={styles.emptyDesc}>Đang tải các lớp đang mở…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="cloud-offline-outline" size={40} color={BrandColors.muted} />
              </View>
              <Text style={styles.emptyTitle}>{loadError}</Text>
              <TouchableOpacity style={styles.resetBtn} onPress={load} activeOpacity={0.8}>
                <Text style={styles.resetBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : courses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="school-outline" size={40} color={BrandColors.muted} />
              </View>
              <Text style={styles.emptyTitle}>Hiện chưa có lớp nào mở đăng ký</Text>
              <Text style={styles.emptyDesc}>Trung tâm sẽ mở lớp mới sớm, bạn quay lại sau nhé.</Text>
            </View>
          ) : filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="search-outline" size={40} color={BrandColors.muted} />
              </View>
              <Text style={styles.emptyTitle}>Không tìm thấy lớp học phù hợp</Text>
              <Text style={styles.emptyDesc}>
                Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetFilters}
                activeOpacity={0.8}>
                <Text style={styles.resetBtnText}>Xem tất cả khóa học</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.ink,
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.muted,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  resultCount: {
    fontSize: 13,
    color: BrandColors.muted,
  },
  countNumber: {
    fontWeight: '700',
    color: BrandColors.navy,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.orange,
  },
  courseList: {
    flex: 1,
  },
  courseListContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: BrandColors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  resetBtn: {
    backgroundColor: BrandColors.navy,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
