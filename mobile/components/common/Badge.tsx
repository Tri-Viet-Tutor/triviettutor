import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { BrandColors } from '@/constants/Colors';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'orange' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  style,
}) => {
  const getBadgeStyle = (): { bg: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'orange':
        return {
          bg: { backgroundColor: BrandColors.orangeLight, borderColor: '#FED7AA' },
          text: { color: BrandColors.orangeHover },
        };
      case 'success':
        return {
          bg: { backgroundColor: BrandColors.successLight, borderColor: '#BBF7D0' },
          text: { color: BrandColors.success },
        };
      case 'warning':
        return {
          bg: { backgroundColor: BrandColors.warningLight, borderColor: '#FDE68A' },
          text: { color: BrandColors.warning },
        };
      case 'danger':
        return {
          bg: { backgroundColor: BrandColors.dangerLight, borderColor: '#FECACA' },
          text: { color: BrandColors.danger },
        };
      case 'info':
        return {
          bg: { backgroundColor: BrandColors.infoLight, borderColor: '#BAE6FD' },
          text: { color: BrandColors.info },
        };
      case 'neutral':
        return {
          bg: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
          text: { color: BrandColors.muted },
        };
      case 'primary':
      default:
        return {
          bg: { backgroundColor: BrandColors.navyLight, borderColor: '#BFDBFE' },
          text: { color: BrandColors.navy },
        };
    }
  };

  const current = getBadgeStyle();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSm ? styles.badgeSm : styles.badgeMd,
        current.bg,
        style,
      ]}>
      <Text style={[styles.text, isSm ? styles.textSm : styles.textMd, current.text]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 12,
  },
});
