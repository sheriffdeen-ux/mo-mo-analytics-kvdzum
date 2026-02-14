
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Switch,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

interface AutoReplySettings {
  autoReplyEnabled: boolean;
  replyOnlyNoFraud: boolean;
  includeDailySummary: boolean;
  includeWeeklySummary: boolean;
  includeMonthlySummary: boolean;
  customReplyTemplate: string | null;
}

export default function SMSSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutoReplySettings>({
    autoReplyEnabled: true,
    replyOnlyNoFraud: true,
    includeDailySummary: true,
    includeWeeklySummary: false,
    includeMonthlySummary: false,
    customReplyTemplate: null,
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateText, setTemplateText] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { authenticatedGet } = await import("@/utils/api");
      const data = await authenticatedGet("/api/sms/auto-reply-settings");
      if (data) {
        setSettings(data);
        setTemplateText(data.customReplyTemplate || "");
      }
      console.log("[SMS Settings] Settings loaded successfully");
    } catch (error) {
      console.error("[SMS Settings] Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const { authenticatedPut } = await import("@/utils/api");
      await authenticatedPut("/api/sms/auto-reply-settings", settings);
      setSaveMessage("Settings saved successfully!");
      console.log("[SMS Settings] Settings saved successfully");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("[SMS Settings] Failed to save settings:", error);
      setSaveMessage("Failed to save settings. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSetting = (key: keyof AutoReplySettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveTemplate = () => {
    setSettings((prev) => ({
      ...prev,
      customReplyTemplate: templateText.trim() || null,
    }));
    setShowTemplateModal(false);
  };

  const backgroundColor = isDark ? colors.background : "#f5f5f5";
  const cardBg = isDark ? colors.cardBackground : "#fff";
  const textColor = isDark ? colors.text : "#000";
  const textSecondary = isDark ? colors.textSecondary : "#666";

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
        <Stack.Screen
          options={{
            title: "SMS Auto-Reply Settings",
            headerShown: true,
            headerBackTitle: "Back",
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>
            Loading settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <Stack.Screen
        options={{
          title: "SMS Auto-Reply Settings",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: cardBg }]}>
          <IconSymbol
            ios_icon_name="message.badge.fill"
            android_material_icon_name="message"
            size={64}
            color={colors.success}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            AI Chatbot Configuration
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Automatically reply to SMS after fraud analysis
          </Text>
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: isDark ? "#1a3a52" : "#e3f2fd" },
          ]}
        >
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.infoText, { color: textColor }]}>
            The AI chatbot analyzes transactions and sends automated SMS replies with transaction details and fraud status.
          </Text>
        </View>

        {/* Auto-Reply Settings */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Auto-Reply Settings
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor }]}>
                Enable Auto-Reply
              </Text>
              <Text style={[styles.settingText, { color: textSecondary }]}>
                Automatically send SMS replies after analysis
              </Text>
            </View>
            <Switch
              value={settings.autoReplyEnabled}
              onValueChange={() => handleToggleSetting("autoReplyEnabled")}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={settings.autoReplyEnabled ? "#fff" : "#f4f3f4"}
            />
          </View>

          <View
            style={[
              styles.settingRow,
              { opacity: settings.autoReplyEnabled ? 1 : 0.5 },
            ]}
          >
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor }]}>
                Reply Only If No Fraud
              </Text>
              <Text style={[styles.settingText, { color: textSecondary }]}>
                Only send replies when no fraud is detected
              </Text>
            </View>
            <Switch
              value={settings.replyOnlyNoFraud}
              onValueChange={() => handleToggleSetting("replyOnlyNoFraud")}
              disabled={!settings.autoReplyEnabled}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={settings.replyOnlyNoFraud ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Summary Inclusions */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Include Financial Summaries
          </Text>
          <Text style={[styles.cardSubtitle, { color: textSecondary }]}>
            Add financial reports to auto-replies
          </Text>

          <View
            style={[
              styles.settingRow,
              { opacity: settings.autoReplyEnabled ? 1 : 0.5 },
            ]}
          >
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor }]}>
                Daily Summary
              </Text>
              <Text style={[styles.settingText, { color: textSecondary }]}>
                Include today's total sent and received
              </Text>
            </View>
            <Switch
              value={settings.includeDailySummary}
              onValueChange={() => handleToggleSetting("includeDailySummary")}
              disabled={!settings.autoReplyEnabled}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={settings.includeDailySummary ? "#fff" : "#f4f3f4"}
            />
          </View>

          <View
            style={[
              styles.settingRow,
              { opacity: settings.autoReplyEnabled ? 1 : 0.5 },
            ]}
          >
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor }]}>
                Weekly Summary
              </Text>
              <Text style={[styles.settingText, { color: textSecondary }]}>
                Include this week's totals
              </Text>
            </View>
            <Switch
              value={settings.includeWeeklySummary}
              onValueChange={() => handleToggleSetting("includeWeeklySummary")}
              disabled={!settings.autoReplyEnabled}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={settings.includeWeeklySummary ? "#fff" : "#f4f3f4"}
            />
          </View>

          <View
            style={[
              styles.settingRow,
              { borderBottomWidth: 0, opacity: settings.autoReplyEnabled ? 1 : 0.5 },
            ]}
          >
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor }]}>
                Monthly Summary
              </Text>
              <Text style={[styles.settingText, { color: textSecondary }]}>
                Include this month's totals
              </Text>
            </View>
            <Switch
              value={settings.includeMonthlySummary}
              onValueChange={() => handleToggleSetting("includeMonthlySummary")}
              disabled={!settings.autoReplyEnabled}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={settings.includeMonthlySummary ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Custom Template */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Custom Reply Template
          </Text>
          <Text style={[styles.cardSubtitle, { color: textSecondary }]}>
            Customize the AI-generated reply format (optional)
          </Text>

          <TouchableOpacity
            style={[
              styles.templateButton,
              {
                backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0",
                opacity: settings.autoReplyEnabled ? 1 : 0.5,
              },
            ]}
            onPress={() => setShowTemplateModal(true)}
            disabled={!settings.autoReplyEnabled}
          >
            <IconSymbol
              ios_icon_name="doc.text.fill"
              android_material_icon_name="description"
              size={24}
              color={colors.primary}
            />
            <View style={styles.templateTextContainer}>
              <Text style={[styles.templateTitle, { color: textColor }]}>
                {settings.customReplyTemplate ? "Edit Template" : "Add Custom Template"}
              </Text>
              {settings.customReplyTemplate && (
                <Text
                  style={[styles.templatePreview, { color: textSecondary }]}
                  numberOfLines={2}
                >
                  {settings.customReplyTemplate}
                </Text>
              )}
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Example Reply */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.success, borderWidth: 2 }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Example Auto-Reply
          </Text>
          <View style={[styles.exampleBox, { backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9" }]}>
            <Text style={[styles.exampleText, { color: textColor }]}>
              Transaction confirmed: Sent GHS 50.00 to John Doe. Ref: MTN123456. Time: 2:30 PM. Balance: GHS 450.00.
              {settings.includeDailySummary && " Today's total: Sent GHS 150, Received GHS 200."}
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <React.Fragment>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color="#fff"
              />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </React.Fragment>
          )}
        </TouchableOpacity>

        {saveMessage ? (
          <Text
            style={[
              styles.saveMessage,
              {
                color: saveMessage.includes("success") ? colors.success : colors.error,
              },
            ]}
          >
            {saveMessage}
          </Text>
        ) : null}
      </ScrollView>

      {/* Custom Template Modal */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTemplateModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: cardBg }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Custom Reply Template
            </Text>
            <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
              Use placeholders: [amount], [recipient], [reference], [time], [balance]
            </Text>

            <TextInput
              style={[
                styles.templateInput,
                {
                  backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
                  color: textColor,
                  borderColor: colors.border,
                },
              ]}
              value={templateText}
              onChangeText={setTemplateText}
              placeholder="Enter custom template..."
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveTemplate}
              >
                <Text style={styles.modalButtonText}>Save Template</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: isDark ? colors.cardBackground : "#f0f0f0" },
                ]}
                onPress={() => setShowTemplateModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: textColor }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingText: {
    fontSize: 14,
  },
  templateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  templateTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  templatePreview: {
    fontSize: 14,
  },
  exampleBox: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  saveMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  templateInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
