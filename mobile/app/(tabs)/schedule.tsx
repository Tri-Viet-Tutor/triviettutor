import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { SessionCard } from '@/components/common/SessionCard';
import { BrandColors } from '@/constants/Colors';
import { SessionItem } from '@/types';
import { useAuth } from '@/services/authContext';
import { fetchMySessions } from '@/services/sessions';

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** "2026-10-28" theo giờ máy (không dùng toISOString vì sẽ lệch ngày theo múi giờ UTC) */
function isoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Bảy ngày Thứ 2 → Chủ nhật của tuần chứa `anchor` */
function weekOf(anchor: Date): Date[] {
  const monday = new Date(anchor);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

interface DayItem {
  day: string;
  date: string;
  fullDate: string;
  hasSession: boolean;
  isToday?: boolean;
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const today = new Date();
  const todayStr = isoDate(today);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterMode, setFilterMode] = useState<'SELECTED_DAY' | 'ALL_WEEK'>('ALL_WEEK');

  const loadSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const week = weekOf(new Date());
      setSessions(await fetchMySessions({ from: isoDate(week[0]), to: isoDate(week[6]) }));
      setLoadError(null);
    } catch (error: any) {
      // Không hiện lịch giả: báo lỗi để học viên biết và kéo xuống tải lại
      setSessions([]);
      setLoadError(error?.message === 'SESSION_EXPIRED' ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' : 'Không tải được lịch học. Kéo xuống để thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions();
  }, [loadSessions]);

  // Tuần hiện tại (Thứ 2 → Chủ nhật)
  const weekDays = weekOf(today);
  const currentWeekDays: DayItem[] = weekDays.map((day) => {
    const fullDate = isoDate(day);
    return {
      day: WEEKDAY_SHORT[day.getDay()],
      date: `${day.getDate()}/${day.getMonth() + 1}`,
      fullDate,
      hasSession: sessions.some((s) => s.date === fullDate),
      isToday: fullDate === todayStr,
    };
  });

  const filteredSessions =
    filterMode === 'SELECTED_DAY'
      ? sessions.filter((s) => s.date === selectedDate)
      : sessions;

  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;
  const upcomingCount = sessions.filter((s) => s.status === 'UPCOMING' || s.status === 'IN_PROGRESS').length;
  const onlineCount = sessions.filter((s) => s.deliveryMode === 'ONLINE').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader
        title="Thời khóa biểu"
        subtitle="Lịch học tuần này"
      />

      <View style={styles.container}>
        {/* Weekly Stats Header */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Tổng ca học</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: BrandColors.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Đã học</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: BrandColors.orange }]}>{upcomingCount}</Text>
            <Text style={styles.statLabel}>Sắp tới</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: BrandColors.navy }]}>{onlineCount}</Text>
            <Text style={styles.statLabel}>Lớp Online</Text>
          </View>
        </View>

        {/* Week Day Strip */}
        <View style={styles.weekStripWrapper}>
          <View style={styles.weekStripHeader}>
            <View style={styles.monthHeaderRow}>
              <Text style={styles.weekTitle}>
                Tháng {today.getMonth() + 1} / {today.getFullYear()}
              </Text>
            </View>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, filterMode === 'ALL_WEEK' && styles.toggleBtnActive]}
                onPress={() => setFilterMode('ALL_WEEK')}>
                <Text
                  style={[
                    styles.toggleBtnText,
                    filterMode === 'ALL_WEEK' && styles.toggleBtnTextActive,
                  ]}>
                  Cả tuần
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, filterMode === 'SELECTED_DAY' && styles.toggleBtnActive]}
                onPress={() => setFilterMode('SELECTED_DAY')}>
                <Text
                  style={[
                    styles.toggleBtnText,
                    filterMode === 'SELECTED_DAY' && styles.toggleBtnTextActive,
                  ]}>
                  Theo ngày
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.daysRow}>
            {currentWeekDays.map((item) => {
              const isSelected = selectedDate === item.fullDate;
              return (
                <TouchableOpacity
                  key={item.fullDate}
                  style={[
                    styles.dayItem,
                    isSelected && styles.dayItemActive,
                    item.isToday && styles.dayItemToday,
                  ]}
                  onPress={() => {
                    setSelectedDate(item.fullDate);
                    setFilterMode('SELECTED_DAY');
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextActive,
                      item.isToday && !isSelected && styles.dayTextToday,
                    ]}>
                    {item.day}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      isSelected && styles.dateTextActive,
                      item.isToday && !isSelected && styles.dateTextToday,
                    ]}>
                    {item.date.split('/')[0]}
                  </Text>
                  {item.hasSession && (
                    <View
                      style={[
                        styles.sessionDot,
                        isSelected ? styles.sessionDotActive : styles.sessionDotNormal,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Rule notice bar */}
        <View style={styles.noticeBar}>
          <Ionicons name="information-circle" size={16} color={BrandColors.navy} />
          <Text style={styles.noticeText}>
            Xin nghỉ trước ít nhất 24 giờ để trung tâm sắp xếp. Với lớp trực tuyến, bấm "Vào phòng học Online" để mở phòng học.
          </Text>
        </View>

        {/* Sessions list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.navy} />
            <Text style={styles.loadingText}>Đang tải lịch học từ máy chủ...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.sessionList}
            contentContainerStyle={styles.sessionListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[BrandColors.navy]}
                tintColor={BrandColors.navy}
              />
            }>
            {!user ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="log-in-outline" size={48} color={BrandColors.muted} />
                <Text style={styles.emptyTitle}>Đăng nhập để xem lịch học</Text>
                <Text style={styles.emptyDesc}>Lịch học hiện theo các lớp bạn đã đăng ký.</Text>
              </View>
            ) : loadError ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cloud-offline-outline" size={48} color={BrandColors.muted} />
                <Text style={styles.emptyTitle}>{loadError}</Text>
                <TouchableOpacity style={styles.showAllBtn} onPress={onRefresh}>
                  <Text style={styles.showAllBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : sessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={BrandColors.muted} />
                <Text style={styles.emptyTitle}>Tuần này bạn chưa có buổi học nào</Text>
                <Text style={styles.emptyDesc}>Đăng ký lớp ở tab Khóa học để lịch học hiện ở đây.</Text>
              </View>
            ) : filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <SessionCard key={session.sessionId} session={session} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="cafe-outline" size={48} color={BrandColors.muted} />
                <Text style={styles.emptyTitle}>Không có ca học nào trong ngày</Text>
                <Text style={styles.emptyDesc}>
                  Bạn có thể nghỉ ngơi, ôn lại bài giảng cũ hoặc xem lịch toàn bộ tuần.
                </Text>
                <TouchableOpacity
                  style={styles.showAllBtn}
                  onPress={() => setFilterMode('ALL_WEEK')}>
                  <Text style={styles.showAllBtnText}>Xem lịch toàn bộ tuần</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
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
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navy,
  },
  statLabel: {
    fontSize: 11,
    color: BrandColors.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  weekStripWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  weekStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.ink,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 11,
    color: BrandColors.muted,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: BrandColors.navy,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    width: 44,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayItemToday: {
    borderColor: BrandColors.navy,
  },
  dayItemActive: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  dayText: {
    fontSize: 11,
    color: BrandColors.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  dayTextToday: {
    color: BrandColors.navy,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.ink,
  },
  dateTextActive: {
    color: '#FFFFFF',
  },
  dateTextToday: {
    color: BrandColors.navy,
  },
  sessionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  sessionDotNormal: {
    backgroundColor: BrandColors.orange,
  },
  sessionDotActive: {
    backgroundColor: '#FFFFFF',
  },
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.navyLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  noticeText: {
    fontSize: 11,
    color: BrandColors.navy,
    lineHeight: 16,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: BrandColors.muted,
  },
  sessionList: {
    flex: 1,
  },
  sessionListContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: BrandColors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  showAllBtn: {
    backgroundColor: BrandColors.navy,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  showAllBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
