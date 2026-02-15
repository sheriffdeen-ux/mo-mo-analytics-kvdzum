
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedPost } from '@/utils/api';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  riskLevel?: string;
  analysis?: any;
}

export default function ChatbotScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    console.log('[Chatbot] Screen mounted');
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'bot',
      content: '👋 Welcome to MoMo Analytics AI Fraud Analyzer!\n\n📱 Paste your MoMo SMS message below and I\'ll analyze it through our advanced 7-layer security framework with ML-inspired fraud detection.\n\n✅ Supported Providers:\n• MTN MoMo (447, 4255, MTNMoMo)\n• Vodafone Cash (557, VCash)\n• AirtelTigo Money (505, TMoney)\n• Telecel Cash\n\n🔒 Privacy Guaranteed:\nWe only extract transaction data (amount, recipient, time, reference). Raw SMS messages are never stored.\n\n💡 Commands:\nType any of these commands:\n• HELP - Show all commands\n• TODAY - Today\'s transactions\n• WEEK - This week\'s summary\n• STATS - Transaction statistics\n• HISTORY - Recent transactions\n\n📝 Example SMS:\n"0000012062913379 Confirmed. You have received GHS10.00 from MTN MOBILE MONEY with transaction reference: Transfer From: 233593122760-AJARATU SEIDU on 2026-02-13 at 16:51:59. Your Telecel Cash balance is GHS14.23."',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setLoading(true);

    console.log('[Chatbot] Processing message:', messageText);

    // Check if it's a command
    const commandUpper = messageText.toUpperCase();
    const isCommand = ['HELP', 'TODAY', 'WEEK', 'STATS', 'HISTORY'].includes(commandUpper) ||
                      commandUpper.startsWith('BUDGET ') ||
                      commandUpper.startsWith('ALERTS ');

    try {
      if (isCommand) {
        // Handle command
        console.log('[Chatbot] Processing command:', commandUpper);
        
        const response = await authenticatedPost<{
          success: boolean;
          reply: string;
          data?: any;
          error?: string;
        }>('/api/chatbot/command', {
          command: messageText,
        });

        console.log('[Chatbot] Command response:', response);

        if (!response.success && response.error) {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: `❌ ${response.error}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }

        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response.reply,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        // Analyze SMS
        console.log('[Chatbot] Analyzing SMS:', messageText);

        const response = await authenticatedPost<{
          success: boolean;
          chatbotReply: string;
          transaction: any;
          analysis: any;
          error?: string;
        }>('/api/chatbot/sms/analyze', {
          smsMessage: messageText,
        });

        console.log('[Chatbot] Analysis complete:', response);

        if (!response.success && response.error) {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: `❌ ${response.error}\n\nPlease paste a valid MoMo transaction SMS (MTN, Vodafone, AirtelTigo, or Telecel Cash).\n\nOr type HELP to see available commands.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }

        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response.chatbotReply,
          timestamp: new Date(),
          riskLevel: response.analysis?.riskLevel,
          analysis: response.analysis,
        };

        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error: any) {
      console.error('[Chatbot] Request failed:', error);
      
      let errorText = 'Unknown error';
      
      if (error?.message) {
        errorText = error.message;
      } else if (typeof error === 'string') {
        errorText = error;
      }
      
      // Check for specific error types
      if (errorText.includes('401') || errorText.includes('Unauthorized')) {
        errorText = 'Authentication error. Please try logging in again.';
      } else if (errorText.includes('Network')) {
        errorText = 'Network error. Please check your internet connection and try again.';
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `❌ Request Failed\n\n${errorText}\n\nPlease try again or type HELP for available commands.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel?: string) => {
    if (!riskLevel) return textSecondaryColor;
    
    switch (riskLevel) {
      case 'LOW':
        return colors.riskLow;
      case 'MEDIUM':
        return colors.riskMedium;
      case 'HIGH':
        return colors.riskHigh;
      case 'CRITICAL':
        return colors.riskCritical;
      default:
        return textSecondaryColor;
    }
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const timeText = `${formattedHours}:${formattedMinutes} ${ampm}`;
    return timeText;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'AI Fraud Analyzer',
          headerShown: true,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowInfo(true)}
              style={{ marginRight: 16 }}
            >
              <IconSymbol
                ios_icon_name="info.circle"
                android_material_icon_name="info"
                size={24}
                color={textColor}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => {
            const isUser = message.type === 'user';
            const messageTime = formatTime(message.timestamp);
            const riskColor = getRiskColor(message.riskLevel);

            return (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
                ]}
              >
                {!isUser && (
                  <View style={[styles.botAvatar, { backgroundColor: colors.primary }]}>
                    <IconSymbol
                      ios_icon_name="shield.fill"
                      android_material_icon_name="security"
                      size={20}
                      color={colors.text}
                    />
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isUser
                      ? [styles.userMessage, { backgroundColor: colors.primary }]
                      : [styles.botMessage, { backgroundColor: cardColor }],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isUser ? colors.text : textColor },
                    ]}
                  >
                    {message.content}
                  </Text>

                  {message.riskLevel && (
                    <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                      <Text style={styles.riskBadgeText}>
                        {message.riskLevel}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[
                      styles.messageTime,
                      { color: isUser ? colors.textSecondary : textSecondaryColor },
                    ]}
                  >
                    {messageTime}
                  </Text>
                </View>

                {isUser && (
                  <View style={[styles.userAvatar, { backgroundColor: colors.accent }]}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={20}
                      color="#fff"
                    />
                  </View>
                )}
              </View>
            );
          })}

          {loading && (
            <View style={styles.loadingWrapper}>
              <View style={[styles.botAvatar, { backgroundColor: colors.primary }]}>
                <IconSymbol
                  ios_icon_name="shield.fill"
                  android_material_icon_name="security"
                  size={20}
                  color={colors.text}
                />
              </View>
              <View style={[styles.loadingBubble, { backgroundColor: cardColor }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
                  Analyzing with ML-inspired fraud detection...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: cardColor, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? colors.backgroundDark : '#f5f5f5',
                color: textColor,
                borderColor: colors.border,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Paste MoMo SMS or type a command (HELP, TODAY, STATS)..."
            placeholderTextColor={textSecondaryColor}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() && !loading ? colors.primary : colors.border,
              },
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || loading}
          >
            <IconSymbol
              ios_icon_name="paperplane.fill"
              android_material_icon_name="send"
              size={24}
              color={inputText.trim() && !loading ? colors.text : textSecondaryColor}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Info Modal */}
      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowInfo(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: cardColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                🛡️ Advanced Fraud Detection
              </Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="close"
                  size={28}
                  color={textSecondaryColor}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.infoSection, { color: textColor }]}>
                <Text style={styles.infoTitle}>🔍 7-Layer Security Framework</Text>
                {'\n\n'}
                <Text style={{ color: textSecondaryColor }}>
                  1. SMS Parsing & Sender Verification{'\n'}
                  2. Input Validation{'\n'}
                  3. Scam Pattern Recognition (Ghana-specific){'\n'}
                  4. Historical Behavior Analysis{'\n'}
                  5. Transaction Velocity Checks{'\n'}
                  6. Amount-based Risk Scoring{'\n'}
                  7. Temporal Analysis
                </Text>
              </Text>

              <Text style={[styles.infoSection, { color: textColor }]}>
                <Text style={styles.infoTitle}>🚨 Sender Verification</Text>
                {'\n\n'}
                <Text style={{ color: textSecondaryColor }}>
                  We verify SMS sender IDs against official MoMo shortcodes:{'\n\n'}
                  • MTN: 447, 4255, MTNMoMo{'\n'}
                  • Vodafone: 557, VCash{'\n'}
                  • AirtelTigo: 505, TMoney{'\n\n'}
                  SMS from unknown senders are flagged as HIGH RISK.
                </Text>
              </Text>

              <Text style={[styles.infoSection, { color: textColor }]}>
                <Text style={styles.infoTitle}>📊 Risk Levels</Text>
                {'\n\n'}
                <Text style={{ color: colors.riskLow }}>• LOW (&lt;35): Normal transaction</Text>
                {'\n'}
                <Text style={{ color: colors.riskMedium }}>• MEDIUM (35-59): Monitor closely</Text>
                {'\n'}
                <Text style={{ color: colors.riskHigh }}>• HIGH (60-79): Review immediately</Text>
                {'\n'}
                <Text style={{ color: colors.riskCritical }}>• CRITICAL (80+): URGENT ACTION NEEDED</Text>
              </Text>

              <Text style={[styles.infoSection, { color: textColor }]}>
                <Text style={styles.infoTitle}>💡 Available Commands</Text>
                {'\n\n'}
                <Text style={{ color: textSecondaryColor }}>
                  • HELP - Show all commands{'\n'}
                  • TODAY - Today's transactions{'\n'}
                  • WEEK - This week's summary{'\n'}
                  • STATS - Transaction statistics{'\n'}
                  • HISTORY - Recent transactions
                </Text>
              </Text>

              <Text style={[styles.infoSection, { color: textColor }]}>
                <Text style={styles.infoTitle}>🔒 Privacy Guarantee</Text>
                {'\n\n'}
                <Text style={{ color: textSecondaryColor }}>
                  We only extract transaction data (amount, recipient, time, reference). Raw SMS messages are never stored on our servers.
                </Text>
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowInfo(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>
                Got it
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  userMessage: {
    borderBottomRightRadius: 4,
  },
  botMessage: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    maxHeight: 400,
  },
  infoSection: {
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
  },
  infoTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  modalButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
