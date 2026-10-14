import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SessionItem } from '@/types';
import { BrandColors } from '@/constants/Colors';
import { Badge } from './Badge';

interface SessionCardProps {
  session: SessionItem;
  onLeaveRequest?: (session: SessionItem) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onLeaveRequest }) => {
  const [hasRequestedLeave, setHasRequestedLeave] = useState(false);

  const getStatusBadge = () => {
    if (session.status === 'COMPLETED') {
      if (session.attendance === 'PRESENT') {
        return <Badge label="Đã có mặt" variant="success" size="sm" />;
      }
      if (session.attendance === 'LATE') {
        return <Badge label="Vào muộn" variant="warning" size="sm" />;
      }
      if (session.attendance === 'EXCUSED') {
        return <Badge label="Nghỉ có phép" variant="info" size="sm" />;
      }
      return <Badge label="Đã hoàn thành" variant="neutral" size="sm" />;
    }

    if (session.status === 'IN_PROGRESS') {
      return <Badge label="Đang diễn ra" variant="orange" size="sm" />;
    }

    if (hasRequestedLeave) {
      return <Badge label="Chờ duyệt nghỉ" variant="warning" size="sm" />;
    }

    return <Badge label="Sắp diễn ra" variant="primary" size="sm" />;
  };

  const handleLeavePress = () => {
    Alert.alert(
      'Xin nghỉ buổi học',
      `Bạn có chắc chắn muốn gửi đơn xin nghỉ buổi học ${session.className} ngày ${session.date} (${session.timeSlotHours})?\n\n*Lưu ý: Xin nghỉ trước 24 giờ sẽ được xếp lịch học bù theo quy chế trung tâm.*`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi đơn',
          style: 'destructive',
          onPress: () => {
            setHasRequestedLeave(true);
            Alert.alert('Thành công', 'Đơn xin nghỉ của bạn đã được gửi tới giáo vụ trung tâm!');
            if (onLeaveRequest) onLeaveRequest(session);
          },
        },
      ]
    );
  };

  const handleJoinClass = () => {
    Alert.alert(
      'Vào lớp học',
      `Địa điểm / Phòng học:\n${session.roomOrLink}\n\nChúc bạn có một buổi học bổ ích và tập trung cao độ!`
    );
  };

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.sessionCounter}>
          <Text style={styles.counterText}>
            Buổi {session.sessionNumber}/{session.totalSessions}
          </Text>
        </View>
        <Text style={styles.dateText}>{session.dayOfWeek}, {session.date}</Text>
        {getStatusBadge()}
      </View>

      {/* Class Name & Topic */}
      <Text style={styles.className}>{session.className}</Text>
      <Text style={styles.topicText}>Chủ đề: {session.topic}</Text>

      {/* Meta details */}
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <Ionicons name="time" size={16} color={BrandColors.navy} />
          <Text style={styles.metaText}>{session.timeSlotHours}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name={session.deliveryMode === 'ONLINE' ? 'videocam' : 'location'}
            size={16}
            color={BrandColors.navy}
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {session.roomOrLink}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="person" size={16} color={BrandColors.muted} />
          <Text style={styles.metaText}>{session.tutorName}</Text>
        </View>
      </View>

      {/* Actions */}
      {session.status !== 'COMPLETED' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={handleJoinClass}
            activeOpacity={0.8}>
            <Ionicons
              name={session.deliveryMode === 'ONLINE' ? 'videocam-outline' : 'navigate-outline'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.joinBtnText}>
              {session.deliveryMode === 'ONLINE' ? 'Vào phòng học' : 'Chỉ đường tới lớp'}
            </Text>
          </TouchableOpacity>

          {!hasRequestedLeave && (
            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={handleLeavePress}
              activeOpacity={0.7}>
              <Ionicons name="document-text-outline" size={15} color={BrandColors.muted} />
              <Text style={styles.leaveBtnText}>Xin nghỉ</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionCounter: {
    backgroundColor: BrandColors.navyLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.navy,
  },
  dateText: {
    fontSize: 12,
    color: BrandColors.muted,
    fontWeight: '500',
  },
  className: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 4,
  },
  topicText: {
    fontSize: 13,
    color: BrandColors.muted,
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 18,
  },
  metaContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: BrandColors.ink,
    fontWeight: '500',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  joinBtn: {
    backgroundColor: BrandColors.navy,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  leaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaveBtnText: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
