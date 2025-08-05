import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { X, Share, Plus, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/Button';
import { useAndroidBackButton } from '@/utils/BackHandler';

interface InstallPromptProps {
  visible: boolean;
  onClose: () => void;
}

export function InstallPrompt({ visible, onClose }: InstallPromptProps) {
  const { theme } = useTheme();

  // Configure Android back button pour fermer le popup
  useAndroidBackButton(() => {
    if (visible) {
      onClose();
      return true; // Empêcher le comportement par défaut
    }
    return false; // Laisser le comportement par défaut si le popup n'est pas visible
  });

  if (!visible || Platform.OS !== 'web') {
    return null;
  }

  // Détecter le navigateur pour afficher les bonnes instructions
  const getBrowserInstructions = () => {
    if (typeof window === 'undefined') return 'safari';
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return 'chrome';
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return 'safari';
    } else if (userAgent.includes('firefox')) {
      return 'firefox';
    } else if (userAgent.includes('edg')) {
      return 'edge';
    }
    
    return 'chrome'; // Défaut
  };

  const browserType = getBrowserInstructions();

  const getInstructions = () => {
    switch (browserType) {
      case 'safari':
        return {
          title: 'Ajouter à l\'écran d\'accueil',
          steps: [
            { icon: <Share size={16} color="#FFFFFF" />, text: 'Allez sur le menu de votre navigateur (⋮, ..., partager sur iOS)' },
            { icon: <Plus size={16} color="#FFFFFF" />, text: 'Cliquez sur "Ajouter à l\'écran d\'accueil"' },
            { icon: <Smartphone size={16} color="#FFFFFF" />, text: 'Ajoutez-le à votre écran d\'accueil' }
          ]
        };
      case 'chrome':
        return {
          title: 'Installer l\'application',
          steps: [
            { icon: <Share size={16} color="#FFFFFF" />, text: 'Allez sur le menu de votre navigateur (⋮, ..., partager sur iOS)' },
            { icon: <Plus size={16} color="#FFFFFF" />, text: 'Cliquez sur "Ajouter à l\'écran d\'accueil"' },
            { icon: <Smartphone size={16} color="#FFFFFF" />, text: 'Ajoutez-le à votre écran d\'accueil' }
          ]
        };
      case 'firefox':
        return {
          title: 'Ajouter à l\'écran d\'accueil',
          steps: [
            { icon: <Share size={16} color="#FFFFFF" />, text: 'Allez sur le menu de votre navigateur (⋮, ..., partager sur iOS)' },
            { icon: <Plus size={16} color="#FFFFFF" />, text: 'Cliquez sur "Ajouter à l\'écran d\'accueil"' },
            { icon: <Smartphone size={16} color="#FFFFFF" />, text: 'Ajoutez-le à votre écran d\'accueil' }
          ]
        };
      default:
        return {
          title: 'Installer l\'application',
          steps: [
            { icon: <Share size={16} color="#FFFFFF" />, text: 'Allez sur le menu de votre navigateur (⋮, ..., partager sur iOS)' },
            { icon: <Plus size={16} color="#FFFFFF" />, text: 'Cliquez sur "Ajouter à l\'écran d\'accueil"' },
            { icon: <Smartphone size={16} color="#FFFFFF" />, text: 'Ajoutez-le à votre écran d\'accueil' }
          ]
        };
    }
  };

  const instructions = getInstructions();
  const styles = createStyles(theme);

  return (
    <View style={styles.overlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{instructions.title}</Text>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeButton}
          >
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          <Text style={styles.introText}>
            Installez Siemens CalcConform sur votre appareil pour un accès rapide et une expérience optimale.
          </Text>
          
          <View style={styles.instructionsList}>
            {instructions.steps.map((step, index) => (
              <View key={index} style={styles.instructionStep}>
                <View style={styles.stepIconContainer}>
                  {React.cloneElement(step.icon as React.ReactElement, { size: 16, color: "#FFFFFF" })}
                </View>
                <Text style={styles.stepText}>
                  {index + 1}. {step.text}
                </Text>
              </View>
            ))}
          </View>
          
          <View style={styles.genericTutorialNote}>
            <Text style={styles.genericTutorialIcon}>💡</Text>
            <Text style={styles.genericTutorialText}>
              Tutoriel générique - Les étapes peuvent varier selon votre téléphone et navigateur
            </Text>
          </View>
          
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>✨ Avantages :</Text>
            <Text style={styles.benefitsText}>
              • Accès rapide depuis l'écran d'accueil{'\n'}
              • Fonctionne hors ligne{'\n'}
              • Interface plein écran{'\n'}
              • Notifications push (futures mises à jour)
            </Text>
          </View>
        </View>

        <View style={styles.modalFooter}>
          <Button
            title="Compris"
            onPress={onClose}
            style={styles.understandButton}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2147483647,
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    flex: 1,
    marginRight: 6,
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
  },
  modalBody: {
    flex: 1,
    marginBottom: 12,
  },
  introText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  instructionsList: {
    marginBottom: 6,
    gap: 4,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    gap: 8,
  },
  stepIconContainer: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 14,
  },
  genericTutorialNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warning + '20',
    borderRadius: 8,
    padding: 6,
    marginTop: 4,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  genericTutorialIcon: {
    fontSize: 12,
    marginRight: 6,
    marginTop: 1,
  },
  genericTutorialText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: theme.colors.warning,
    lineHeight: 12,
    flex: 1,
  },
  benefitsSection: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  benefitsTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 3,
  },
  benefitsText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 14,
  },
  modalFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  understandButton: {
    width: '100%',
    paddingVertical: 10,
  },
});