/**
 * Bảng màu nhận diện thương hiệu VietTriTutor (Brand Palette)
 * Đồng bộ màu sắc với frontend (React + Tailwind CSS)
 */

export const BrandColors = {
  navy: '#0B3A8C',
  navyDark: '#0A2B6B',
  navyDeep: '#082A66',
  navyLight: '#E8F0FE',
  orange: '#F5A00F',
  orangeHover: '#DE8B00',
  orangeLight: '#FFF7ED',
  marker: '#FFD98A',
  cream: '#FFF8E8',
  paper: '#F5F1E9',
  paperDeep: '#E8E2D5',
  ink: '#14213D',
  muted: '#52607A',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',
};

const tintColorLight = BrandColors.navy;
const tintColorDark = '#60A5FA';

export default {
  light: {
    text: BrandColors.ink,
    textSecondary: BrandColors.muted,
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: BrandColors.border,
    tint: tintColorLight,
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    accent: BrandColors.orange,
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    tint: tintColorDark,
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorDark,
    accent: BrandColors.orange,
  },
};
