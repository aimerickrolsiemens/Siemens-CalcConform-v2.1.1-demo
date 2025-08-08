import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Download, FileText, Building, Wind, CheckCircle, AlertCircle, Share } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Project } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { calculateCompliance, formatDeviation } from '@/utils/compliance';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ExportScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { projects } = useStorage();
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sélectionner tous les projets par défaut
    if (projects.length > 0) {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  }, [projects]);

  const handleProjectToggle = (projectId: string) => {
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const generateCSVData = () => {
    const selectedProjectsList = projects.filter(p => selectedProjects.has(p.id));
    
    const headers = [
      'Projet',
      'Ville',
      'Bâtiment',
      'Zone',
      'Volet',
      'Type',
      'Débit référence (m³/h)',
      'Débit mesuré (m³/h)',
      'Écart (%)',
      'Statut',
      'Remarques',
      'Date création',
      'Date modification'
    ];

    const rows = [headers];

    selectedProjectsList.forEach(project => {
      project.buildings.forEach(building => {
        building.functionalZones.forEach(zone => {
          zone.shutters.forEach(shutter => {
            const compliance = calculateCompliance(shutter.referenceFlow, shutter.measuredFlow);
            
            rows.push([
              project.name,
              project.city || '',
              building.name,
              zone.name,
              shutter.name,
              shutter.type === 'high' ? 'Volet Haut' : 'Volet Bas',
              shutter.referenceFlow.toString(),
              shutter.measuredFlow.toString(),
              formatDeviation(compliance.deviation),
              compliance.label,
              shutter.remarks || '',
              new Date(shutter.createdAt).toLocaleDateString('fr-FR'),
              new Date(shutter.updatedAt).toLocaleDateString('fr-FR')
            ]);
          });
        });
      });
    });

    return rows.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const handleExport = async () => {
    if (selectedProjects.size === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un projet à exporter');
      return;
    }

    setLoading(true);
    try {
      const csvData = generateCSVData();
      const fileName = `siemens_calcconform_export_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        // Export pour web
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert('Succès', 'Fichier CSV téléchargé avec succès');
      } else {
        // Export pour mobile
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csvData, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Exporter les données CalcConform',
          });
        } else {
          Alert.alert('Succès', `Fichier sauvegardé : ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les données');
    } finally {
      setLoading(false);
    }
  };

  const getProjectStats = (project: Project) => {
    const buildingCount = project.buildings.length;
    const zoneCount = project.buildings.reduce((total, building) => 
      total + building.functionalZones.length, 0);
    const shutterCount = project.buildings.reduce((total, building) => 
      total + building.functionalZones.reduce((zoneTotal, zone) => 
        zoneTotal + zone.shutters.length, 0), 0);

    return { buildingCount, zoneCount, shutterCount };
  };

  const styles = createStyles(theme);

  if (projects.length === 0) {
    return (
      <View style={styles.container}>
        <Header title={strings.exportTitle} subtitle={strings.exportSubtitle} />
        <View style={styles.emptyContainer}>
          <FileText size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>{strings.noProjectsToExport}</Text>
          <Text style={styles.emptySubtitle}>
            {strings.noProjectsToExportDesc}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={strings.exportTitle} subtitle={strings.exportSubtitle} />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>{strings.availableProjects}</Text>
          <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
            <Text style={styles.selectAllText}>
              {selectedProjects.size === projects.length ? <Text>Tout désélectionner</Text> : <Text>Tout sélectionner</Text>}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.projectsList}>
          {projects.map((project) => {
            const isSelected = selectedProjects.has(project.id);
            const stats = getProjectStats(project);
            
            return (
              <TouchableOpacity
                key={project.id}
                style={[styles.projectCard, isSelected && styles.projectCardSelected]}
                onPress={() => handleProjectToggle(project.id)}
              >
                <View style={styles.projectHeader}>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    {project.city && (
                      <Text style={styles.projectCity}>{project.city}</Text>
                    )}
                  </View>
                  <View style={styles.checkboxContainer}>
                    {isSelected ? (
                      <CheckCircle size={24} color={theme.colors.primary} />
                    ) : (
                      <View style={styles.uncheckedBox} />
                    )}
                  </View>
                </View>

                <View style={styles.projectStats}>
                  <View style={styles.statItem}>
                    <Building size={16} color={theme.colors.primary} />
                    <Text style={styles.statText}>{stats.buildingCount} bâtiments</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Wind size={16} color={theme.colors.primary} />
                    <Text style={styles.statText}>{stats.zoneCount} zones</Text>
                  </View>
                  <View style={styles.statItem}>
                    <FileText size={16} color={theme.colors.primary} />
                    <Text style={styles.statText}>{stats.shutterCount} volets</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.exportInfo}>
          <Text style={styles.exportInfoTitle}>
            <Text>📊 Format d'export</Text>
          </Text>
          <Text style={styles.exportInfoText}>
            <Text>Les données seront exportées au format CSV avec toutes les informations de conformité, mesures et métadonnées.</Text>
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={loading ? <Text>Export en cours...</Text> : `${strings.exportMyData} (${selectedProjects.size})`}
          onPress={handleExport}
          disabled={loading || selectedProjects.size === 0}
          style={styles.exportButton}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  selectAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  projectsList: {
    marginBottom: 24,
  },
  projectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  projectCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  projectCity: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  checkboxContainer: {
    marginLeft: 12,
  },
  uncheckedBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  projectStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  exportInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  exportInfoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  exportInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
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
  },
  exportButton: {
    width: '100%',
  },
});