import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { NoteImageGallery } from '@/components/NoteImageGallery';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCallback } from 'react';

export default function CreateNoteScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { createNote, notes } = useStorage();
  const { preserveData } = useLocalSearchParams<{ preserveData?: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ content?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldReset, setShouldReset] = useState(true);

  // Réinitialiser le formulaire au focus de la page
  useFocusEffect(
    useCallback(() => {
      console.log('📝 Page de création de note focalisée - shouldReset:', shouldReset);
      
      // Réinitialiser le formulaire si nécessaire
      if (shouldReset) {
        console.log('🔄 Réinitialisation du formulaire');
        setTitle('');
        setDescription('');
        setLocation('');
        setTags('');
        setContent('');
        setImages([]);
        setErrors({});
        setLoading(false);
        setShouldReset(false);
      }
    }, [shouldReset])
  );

  const handleBack = () => {
    safeNavigate('/(tabs)/notes');
  };

  const safeNavigate = (path: string) => {
    try {
      if (router.canGoBack !== undefined) {
        router.push(path);
      } else {
        setTimeout(() => {
          router.push(path);
        }, 100);
      }
    } catch (error) {
      console.error('Erreur de navigation:', error);
      setTimeout(() => {
        try {
          router.push(path);
        } catch (retryError) {
          console.error('Erreur de navigation retry:', retryError);
        }
      }, 200);
    }
  };

  const validateForm = () => {
    // SUPPRIMÉ : Plus aucune validation pour éviter tout blocage
    return true;
  };

  const handleCreate = async () => {
    console.log('🚀 Début création note avec:', {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      tags: tags.trim(),
      content: content.trim(),
      imagesCount: images.length
    });

    setLoading(true);
    try {
      // Générer un titre automatique si aucun titre n'est fourni
      let finalTitle = title.trim();
      if (!finalTitle) {
        const existingTitles = notes.map(n => n.title).filter(t => t.startsWith('Note sans titre'));
        const nextNumber = existingTitles.length + 1;
        finalTitle = `Note sans titre ${nextNumber}`;
      }

      console.log('📝 Création de la note:', finalTitle, 'avec', images.length, 'images');
      
      // Validation et nettoyage des images AVANT la création
      const validImages: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img && img.trim() !== '' && img.startsWith('data:image/')) {
          console.log(`✅ Image ${i} valide: ${img.substring(0, 50)}...`);
          validImages.push(img);
        } else {
          console.warn(`⚠️ Image ${i} invalide ou vide, ignorée`);
        }
      }
      
      console.log(`📸 Images validées: ${validImages.length}/${images.length}`);
      
      const noteData = {
        title: finalTitle,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        tags: tags.trim() || undefined,
        content: content.trim(),
        images: validImages.length > 0 ? validImages : undefined,
      };
      
      console.log('📋 Données de la note à créer:', {
        ...noteData,
        images: noteData.images ? `${noteData.images.length} images` : 'aucune image'
      });
      
      const note = await createNote(noteData);

      if (note) {
        console.log('✅ Note créée avec succès:', note.id);
        console.log('✅ Images dans la note créée:', note.images?.length || 0);
        // Marquer qu'il faut réinitialiser le formulaire au prochain focus
        setShouldReset(true);
        safeNavigate(`/(tabs)/note/${note.id}`);
      } else {
        console.error('❌ createNote a retourné null - problème dans StorageContext');
        setShouldReset(true);
        safeNavigate('/(tabs)/notes');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de la note:', error);
      console.error('❌ Type d\'erreur:', error.name);
      console.error('❌ Message d\'erreur:', error.message);
      
      // En cas d'erreur, essayer de créer sans les images
      try {
        console.log('🔄 Tentative de création sans images après erreur...');
        const noteWithoutImages = await createNote({
          title: finalTitle,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          tags: tags.trim() || undefined,
          content: content.trim(),
          images: undefined,
        });
        
        if (noteWithoutImages) {
          console.log('✅ Note créée sans images après erreur:', noteWithoutImages.id);
          setShouldReset(true);
          safeNavigate(`/(tabs)/note/${noteWithoutImages.id}`);
        } else {
          console.error('❌ Échec total - même sans images');
          setShouldReset(true);
          safeNavigate('/(tabs)/notes');
        }
      } catch (recoveryError) {
        console.error('❌ Erreur de récupération:', recoveryError);
        setShouldReset(true);
        safeNavigate('/(tabs)/notes');
          } finally {
      setLoading(false);
    }
      };
  }

  const handleAddImage = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxDimension = Math.max(img.width, img.height);
        const targetMaxDimension = Math.min(maxDimension, 400); // Encore plus réduit pour éviter le quota
        
        const ratio = targetMaxDimension / maxDimension;
        const newWidth = Math.round(img.width * ratio);
        const newHeight = Math.round(img.height * ratio);

        canvas.width = newWidth;
        canvas.height = newHeight;

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }

        ctx?.drawImage(img, 0, 0, newWidth, newHeight);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); // Qualité encore plus réduite
        console.log('✅ Image compressée avec succès');
        resolve(compressedBase64);
      };

      img.onerror = () => {
        console.error('❌ Erreur lors du chargement de l\'image pour compression');
        resolve(''); // Résoudre avec une chaîne vide en cas d'erreur
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (files && files.length > 0) {
      try {
        console.log('📸 Images sélectionnées:', files.length);
        
        const compressedImages: string[] = [];
        
        // Traiter chaque fichier sélectionné
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file && file.type.startsWith('image/')) {
            console.log(`📸 Traitement image ${i + 1}/${files.length}:`, file.name);
            
            try {
              const compressedImage = await compressImage(file);
              
              if (compressedImage && compressedImage.length > 0) {
                compressedImages.push(compressedImage);
                console.log(`✅ Image ${i + 1} compressée avec succès`);
              } else {
                console.warn(`⚠️ Image ${i + 1} compressée vide, ignorée`);
              }
            } catch (compressionError) {
              console.error(`❌ Erreur compression image ${i + 1}:`, compressionError);
              
              // Fallback sans compression pour cette image
              try {
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve, reject) => {
                  reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    if (base64) {
                      resolve(base64);
                    } else {
                      reject(new Error('Base64 vide'));
                    }
                  };
                  reader.onerror = () => reject(new Error('Erreur FileReader'));
                });
                
                reader.readAsDataURL(file);
                const base64 = await base64Promise;
                
                compressedImages.push(base64);
                console.log(`✅ Image ${i + 1} ajoutée sans compression (fallback)`);
              } catch (fallbackError) {
                console.error(`❌ Erreur fallback image ${i + 1}:`, fallbackError);
              }
            }
          } else {
            console.warn(`⚠️ Fichier ${i + 1} ignoré (pas une image):`, file.type);
          }
        }
        
        // Ajouter toutes les images compressées avec succès
        if (compressedImages.length > 0) {
          setImages(prev => [...prev, ...compressedImages]);
          console.log(`✅ ${compressedImages.length}/${files.length} images ajoutées avec succès`);
        } else {
          console.warn('⚠️ Aucune image n\'a pu être traitée');
        }
        
      } catch (error) {
        console.error('❌ Erreur générale lors du traitement des images:', error);
      }
    }
    
    // Réinitialiser l'input
    target.value = '';
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Header
        title={strings.newNote}
        onBack={handleBack}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label={strings.noteTitle}
            value={title}
            onChangeText={setTitle}
          />

          <Input
            label={strings.description}
            value={description}
            onChangeText={setDescription}
          />

          <Input
            label="Lieu"
            value={location}
            onChangeText={setLocation}
          />

          <Input
            label="Mots-clés"
            value={tags}
            onChangeText={setTags}
          />

          <NoteImageGallery 
            images={images}
            onRemoveImage={handleRemoveImage}
            editable={true}
            disableViewer={true}
          />

          <View style={styles.imageButtonContainer}>
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddImage}
            >
              <Camera size={16} color={theme.colors.primary} />
              <Text style={styles.addPhotoText}>Ajouter une photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.contentLabel}>{strings.noteContent}</Text>
          <TextInput
            style={styles.contentTextInput}
            value={content}
            onChangeText={setContent}
            placeholder={strings.writeYourNote}
            placeholderTextColor={theme.colors.textTertiary}
            multiline={true}
            textAlignVertical="top"
            scrollEnabled={true}
            autoCorrect={true}
            spellCheck={true}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          {errors.content && (
            <Text style={styles.errorText}>{errors.content}</Text>
          )}

          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e as any)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.fixedFooter}>
        <Button
          title={loading ? "Création..." : strings.createNote}
          onPress={handleCreate}
          disabled={false}
          style={styles.footerButton}
        />
      </View>

    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 140, // Espace augmenté pour le bouton fixe
  },
  imageButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 36,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addPhotoText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  contentLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    marginTop: 16,
  },
  contentTextInput: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text,
    lineHeight: 24,
    minHeight: 200,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' && {
      outlineWidth: 0,
      resize: 'none',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  fixedFooter: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  footerButton: {
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.error,
    marginTop: 8,
  },
});