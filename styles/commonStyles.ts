import { StyleSheet } from 'react-native';

// MoMo Analytics Color Scheme - Ghana-inspired with fraud detection theme
export const colors = {
  // Primary colors - Ghana flag inspired with security theme
  background: '#FFFFFF',
  backgroundDark: '#0A0E1A',
  card: '#F8F9FA',
  cardDark: '#1A1F2E',
  
  // Text colors
  text: '#1A1F2E',
  textDark: '#FFFFFF',
  textSecondary: '#6B7280',
  textSecondaryDark: '#9CA3AF',
  
  // Brand colors - Ghana gold and green with security blue
  primary: '#FFD700', // Ghana gold
  primaryDark: '#FFC700',
  secondary: '#006B3F', // Ghana green
  secondaryDark: '#008751',
  accent: '#2563EB', // Security blue
  accentDark: '#3B82F6',
  
  // Risk level colors
  riskLow: '#10B981', // Green
  riskMedium: '#F59E0B', // Amber
  riskHigh: '#EF4444', // Red
  riskCritical: '#DC2626', // Dark red
  
  // UI colors
  border: '#E5E7EB',
  borderDark: '#374151',
  highlight: '#FEF3C7', // Light gold highlight
  highlightDark: '#78350F',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Legacy colors for compatibility
  backgroundAlt: '#162133',
  grey: '#90CAF9',
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "white",
  },
});
