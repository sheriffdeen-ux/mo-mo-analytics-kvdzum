
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
      content: '👋 Welcome to MoMo Analytics AI Fraud Analyzer!\n\n📱 Paste your MoMo SMS message below and I\'ll analyze it through our 7-layer security framework.\n\n✅ Supported Providers:\n• MTN MoMo\n• Vodafone Cash\n• AirtelTigo Money\n\n🔒 Privacy Guaranteed:\nWe only extract transaction data (amount, recipient, time, reference). Raw SMS messages are never stored.\n\n💡 Example SMS:\n"MTN MoMo: You sent GHS 100.00 to 0241234567 on 14/Feb/2024 at 2:45pm. Ref: MTN123456. New Balance: GHS 1,450.50"',
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
    const smsText = inputText;
    setInputText('');
    setLoading(true);

    console.log('[Chatbot] Analyzing SMS:', smsText);

    try {
      const response = await authenticatedPost<{
        success: boolean;
        reply: string;
        transactionAnalysis: any;
        riskLevel: string;
        shouldAlert: boolean;
        error?: string;
      }>('/api/chatbot/analyze-sms', {
        smsMessage: smsText,
      });

      console.log('[Chatbot] Analysis complete:', response);

      if (!response.success && response.error) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `❌ ${response.error}\n\nPlease paste a valid MoMo transaction SMS (MTN, Vodafone, or AirtelTigo).`,
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
        riskLevel: response.riskLevel,
        analysis: response.transactionAnalysis,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('[Chatbot] Analysis failed:', error);
      
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
        content: `❌ Analysis Failed\n\n${errorText}\n\nPlease make sure you're pasting a valid MoMo transaction SMS from MTN, Vodafone, or AirtelTigo.`,
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
                  Analyzing through 7 security layers...
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
            placeholder="Paste MoMo SMS here..."
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
});
