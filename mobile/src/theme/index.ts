import { StyleSheet } from 'react-native';

export const theme = {
    colors: {
        primary: '#14B8A6', // Lighter Ocean Teal / Turquoise
        primaryLight: '#5EEAD4',
        primaryDark: '#0D9488',
        secondary: '#A78BFA', // Lighter Soft Violet
        secondaryLight: '#C4B5FD',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceLight: '#F1F5F9', // Slate 100 for inputs
        textPrimary: '#0F172A', // Slate 900
        textSecondary: '#475569', // Slate 600
        textMuted: '#94A3B8', // Slate 400
        border: '#CBD5E1', // Slate 300
        danger: '#E11D48',
        dangerLight: '#FFE4E6',
        success: '#059669',
        successLight: '#D1FAE5',
        warning: '#D97706',
        warningLight: '#FEF3C7',
    },
    gradients: {
        primary: ['#14B8A6', '#14B8A6'] as const, // Replaced high gradient with solid lighter primary color
        success: ['#10B981', '#10B981'] as const,
        danger: ['#F43F5E', '#F43F5E'] as const,
        surface: ['#FFFFFF', '#FFFFFF'] as const,
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        xxl: 40,
    },
    borderRadius: {
        s: 8,
        m: 16,
        l: 20,
        xl: 24,
        round: 9999,
    },
    shadows: {
        sm: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
        },
        md: {
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
        },
        lg: {
            shadowColor: '#0284C7',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 5,
        }
    }
};

export const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerMode: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.xxl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    fab: {
        position: 'absolute',
        bottom: theme.spacing.xl,
        right: theme.spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.l,
        borderTopRightRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        paddingBottom: theme.spacing.xl,
        maxHeight: '85%',
        ...theme.shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    closeButton: {
        padding: theme.spacing.xs,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.round,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.s,
        padding: 14,
        fontSize: 16,
        marginBottom: theme.spacing.m,
        backgroundColor: theme.colors.surfaceLight,
        color: theme.colors.textPrimary,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        padding: 14,
        borderRadius: theme.borderRadius.s,
        alignItems: 'center',
        marginTop: theme.spacing.s,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    disabledButton: {
        backgroundColor: theme.colors.primaryLight,
        opacity: 0.7,
    },
    submitButtonText: {
        color: theme.colors.surface,
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textMuted,
        marginTop: theme.spacing.l,
        fontSize: 14,
        fontWeight: '500',
    }
});
