import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

const INSTALL_PROMPT_STORAGE_KEY = 'siemens_install_prompt_shown';

export function useInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      // Vérifier seulement sur web
      if (Platform.OS !== 'web') {
        setIsLoading(false);
        return;
      }

      // Utiliser localStorage sur web
      const hasShown = localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY);
      
      if (!hasShown) {
        console.log('🚀 Première ouverture détectée, affichage du popup PWA');
        // Délai pour laisser l'app se charger complètement
        setTimeout(() => {
          setShowPrompt(true);
          setIsLoading(false);
        }, 2000);
      } else {
        console.log('✅ Popup PWA déjà affiché précédemment');
        setIsLoading(false);
      }
    } catch (error) {
      console.warn('Erreur lors de la vérification du premier lancement:', error);
      setIsLoading(false);
    }
  };

  const hidePrompt = () => {
    try {
      // Sauvegarder dans localStorage
      localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, 'true');
      console.log('✅ Statut PWA sauvegardé dans localStorage');
      setShowPrompt(false);
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du statut PWA:', error);
      setShowPrompt(false);
    }
  };

  return {
    showPrompt,
    hidePrompt,
    isLoading
  };
}