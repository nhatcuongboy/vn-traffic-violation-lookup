import TelegramBot, { CallbackQuery, Message, ParseMode } from 'node-telegram-bot-api';
import config from '../config';
import { LookupResult, UserState } from '../types';
import { ViolationService } from './violationService';

export class TelegramService {
  private bot: TelegramBot;
  private violationService: ViolationService;
  private userStates: Record<number, UserState>;

  constructor() {
    if (!config.telegram.token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
    }

    this.bot = new TelegramBot(config.telegram.token, { polling: config.telegram.polling });
    this.violationService = new ViolationService();
    this.userStates = {};

    this.setupBotCommands();
    this.setupHandlers();
    this.setupErrorHandlers();
  }

  /**
   * Setup bot commands menu
   */
  private async setupBotCommands(): Promise<void> {
    try {
      await this.bot.setMyCommands([
        { command: 'start', description: '🚀 Bắt đầu sử dụng bot' },
        { command: 'lookup', description: '🔍 Tra cứu vi phạm giao thông' },
        { command: 'menu', description: '📋 Hiển thị menu chính' },
        { command: 'help', description: '❓ Hướng dẫn sử dụng' },
      ]);
      console.log('📋 Bot commands menu: ✅ Configured');
    } catch (error) {
      console.error('[ERROR] Failed to setup bot commands:', error);
    }
  }

  /**
   * Setup event handlers for the bot
   */
  private setupHandlers(): void {
    // Start command
    this.bot.onText(/\/start/, (msg: Message) => {
      const chatId = msg.chat.id;
      this.showMainMenu(chatId);
    });

    // Help command
    this.bot.onText(/\/help/, (msg: Message) => {
      const chatId = msg.chat.id;
      this.showHelp(chatId);
    });

    // Menu command
    this.bot.onText(/\/menu/, (msg: Message) => {
      const chatId = msg.chat.id;
      this.showMainMenu(chatId);
    });

    // Lookup command
    this.bot.onText(/\/lookup/, (msg: Message) => {
      const chatId = msg.chat.id;
      this.startSearch(chatId);
    });

    // Handle all messages
    this.bot.on('message', async (msg: Message) => {
      const chatId = msg.chat.id;
      const text = msg.text?.trim();

      // Skip if it's a command
      if (text?.startsWith('/')) return;

      const userState = this.userStates[chatId];

      // If no state, ask user to start
      if (!userState) {
        await this.bot.sendMessage(chatId, 'Vui lòng gõ /start để bắt đầu tra cứu 🚦');
        return;
      }

      await this.handleUserMessage(chatId, text, userState);
    });

    // Handle callback queries from inline keyboard
    this.bot.on('callback_query', async (callbackQuery: CallbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });
  }

  /**
   * Setup error handlers for the bot
   */
  private setupErrorHandlers(): void {
    this.bot.on('polling_error', (error: Error) => {
      if (error.message.includes('409 Conflict')) {
        console.warn('[WARN] Telegram Bot conflict detected. Another instance might be running.');
        console.warn('[WARN] Please ensure only one bot instance is running.');
      } else {
        console.error('[ERROR] Telegram Bot polling error:', error.message);
      }
    });

    this.bot.on('error', (error: Error) => {
      console.error('[ERROR] Telegram Bot error:', error.message);
    });
  }

  /**
   * Show main menu with custom keyboard
   */
  private showMainMenu(chatId: number): void {
    const welcomeMessage = `🚗 *Chào mừng bạn đến với Bot Tra Cứu Phạt Nguội!*

Tôi có thể giúp bạn:
• 🔍 Tra cứu vi phạm giao thông theo biển số xe
• 📋 Xem hướng dẫn sử dụng
• 🆘 Liên hệ hỗ trợ

Chọn một tùy chọn bên dưới:`;

    const options = {
      reply_markup: {
        keyboard: [
          [{ text: '🔍 Tra cứu vi phạm' }, { text: '❓ Hướng dẫn' }],
          [{ text: '📋 Menu chính' }, { text: '🆘 Hỗ trợ' }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
      parse_mode: 'Markdown' as ParseMode,
    };

    this.bot.sendMessage(chatId, welcomeMessage, options);
  }

  /**
   * Show help information
   */
  private showHelp(chatId: number): void {
    const helpMessage = `❓ *Hướng dẫn sử dụng Bot Tra Cứu Phạt Nguội!*

*Các lệnh có sẵn:*
/start - 🚀 Bắt đầu sử dụng bot
/help - ❓ Hiển thị hướng dẫn này
/menu - 📋 Hiển thị menu chính
/lookup - 🔍 Bắt đầu tra cứu vi phạm

*Cách sử dụng:*
1️⃣ Nhấn "🔍 Tra cứu vi phạm" hoặc gõ /lookup
2️⃣ Chọn loại xe (ô tô, xe máy, xe đạp điện)
3️⃣ Nhập biển số xe (ví dụ: 51K01234)
4️⃣ Chờ kết quả tra cứu

*Lưu ý:*
• Biển số phải đúng định dạng
• Kết quả có thể mất vài giây để tải
• Bạn có thể cập nhật kết quả bất kỳ lúc nào

*Hỗ trợ:*
Nếu gặp vấn đề, vui lòng liên hệ qua /menu`;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔍 Bắt đầu tra cứu', callback_data: 'start_search' },
            { text: '📋 Menu chính', callback_data: 'show_menu' },
          ],
        ],
      },
      parse_mode: 'Markdown' as ParseMode,
    };

    this.bot.sendMessage(chatId, helpMessage, options);
  }

  /**
   * Start lookup process
   */
  private startSearch(chatId: number): void {
    this.userStates[chatId] = { step: 'ASK_VEHICLE_TYPE' };

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚗 Xe ô tô',
              callback_data: 'vehicle_type_1',
            },
          ],
          [
            {
              text: '🏍️ Xe máy',
              callback_data: 'vehicle_type_2',
            },
          ],
          [
            {
              text: '🚴‍♀️ Xe đạp điện',
              callback_data: 'vehicle_type_3',
            },
          ],
        ],
      },
    };

    this.bot.sendMessage(chatId, '🔻 Chọn loại xe của bạn:', options);
  }

  /**
   * Handle messages from users
   */
  private async handleUserMessage(
    chatId: number,
    text: string | undefined,
    userState: UserState,
  ): Promise<void> {
    try {
      // Handle custom keyboard button presses
      if (text === '🔍 Tra cứu vi phạm') {
        this.startSearch(chatId);
        return;
      } else if (text === '❓ Hướng dẫn') {
        this.showHelp(chatId);
        return;
      } else if (text === '📋 Menu chính') {
        this.showMainMenu(chatId);
        return;
      } else if (text === '🆘 Hỗ trợ') {
        await this.bot.sendMessage(
          chatId,
          '🆘 *Hỗ trợ kỹ thuật*\n\n' +
            'Nếu bạn gặp vấn đề khi sử dụng bot, vui lòng:\n' +
            '• Kiểm tra lại biển số xe\n' +
            '• Thử lại sau vài phút\n' +
            '• Sử dụng lệnh /menu để quay lại menu chính\n\n' +
            'Bot được phát triển để hỗ trợ tra cứu vi phạm giao thông một cách nhanh chóng và chính xác.',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Only handle plate number input (vehicle type is selected via buttons)
      if (userState.step === 'ASK_PLATE') {
        userState.plate = text;
        userState.step = 'FETCHING';

        this.bot.sendMessage(chatId, '⏳ Đang tra cứu vi phạm, vui lòng chờ...');

        // Lookup violations
        const result = await this.violationService.lookupByPlate(
          userState.plate!,
          userState.vehicleType!,
        );

        await this.sendViolationResults(chatId, result, userState);
      }
    } catch (error) {
      console.error('[ERROR] Telegram Service:', error);

      // Handle unexpected errors (not from service result)
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.handleLookupError(chatId, errorMessage, userState);
    }
  }

  /**
   * Handle callback queries from inline keyboard
   */
  private async handleCallbackQuery(callbackQuery: CallbackQuery): Promise<void> {
    const chatId = callbackQuery.message?.chat.id;
    if (!chatId || !callbackQuery.data) return;

    // Remove the inline keyboard
    const messageId = callbackQuery.message?.message_id;
    if (messageId) {
      await this.bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        {
          chat_id: chatId,
          message_id: messageId,
        },
      );
    }

    if (callbackQuery.data === 'new_search' || callbackQuery.data === 'start_search') {
      // Start new lookup
      this.userStates[chatId] = { step: 'ASK_VEHICLE_TYPE' };

      // Answer the callback query
      await this.bot.answerCallbackQuery(callbackQuery.id);

      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚗 Xe ô tô',
                callback_data: 'vehicle_type_1',
              },
            ],
            [
              {
                text: '🏍️ Xe máy',
                callback_data: 'vehicle_type_2',
              },
            ],
            [
              {
                text: '🚴‍♀️ Xe đạp điện',
                callback_data: 'vehicle_type_3',
              },
            ],
          ],
        },
      };

      await this.bot.sendMessage(chatId, '🔻 Chọn loại xe của bạn:', options);
    } else if (callbackQuery.data === 'show_menu') {
      // Show main menu
      await this.bot.answerCallbackQuery(callbackQuery.id);
      this.showMainMenu(chatId);
    } else if (callbackQuery.data === 'change_vehicle_type') {
      // Handle change vehicle type
      await this.bot.answerCallbackQuery(callbackQuery.id);

      // Reset to vehicle type selection step but keep any existing plate number
      const userState = this.userStates[chatId];
      if (userState) {
        userState.step = 'ASK_VEHICLE_TYPE';
        // Keep the plate number if user has already entered it
        const existingPlate = userState.plate;

        const options = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🚗 Xe ô tô',
                  callback_data: 'vehicle_type_1',
                },
              ],
              [
                {
                  text: '🏍️ Xe máy',
                  callback_data: 'vehicle_type_2',
                },
              ],
              [
                {
                  text: '🚴‍♀️ Xe đạp điện',
                  callback_data: 'vehicle_type_3',
                },
              ],
            ],
          },
        };

        let message = '🔻 Chọn loại xe của bạn:';
        if (existingPlate) {
          message += `\n\n📝 Biển số đã nhập: ${existingPlate}`;
        }

        await this.bot.sendMessage(chatId, message, options);
      }
    } else if (callbackQuery.data.startsWith('vehicle_type_')) {
      // Handle vehicle type selection
      const vehicleType = callbackQuery.data.split('_')[2];
      const userState = this.userStates[chatId];

      if (userState) {
        userState.vehicleType = vehicleType;
        userState.step = 'ASK_PLATE';

        // Answer the callback query
        await this.bot.answerCallbackQuery(callbackQuery.id);

        // Get vehicle type display name
        const vehicleTypeNames = {
          '1': '🚗 Xe ô tô',
          '2': '🏍️ Xe máy',
          '3': '🚴‍♀️ Xe đạp điện',
        };
        const selectedVehicleType =
          vehicleTypeNames[vehicleType as keyof typeof vehicleTypeNames] || 'Phương tiện';

        const options = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `🔄 Thay đổi loại xe`,
                  callback_data: 'change_vehicle_type',
                },
              ],
            ],
          },
        };

        let message = `📋 Loại xe đã chọn: ${selectedVehicleType}\n\n🔢 Nhập số biển số xe của bạn (ví dụ: 51K01234):`;

        // If user already has a plate number, show it and ask if they want to keep it
        if (userState.plate) {
          message += `\n\n📝 Biển số hiện tại: ${userState.plate}`;
          message += `\n\nBạn có thể giữ nguyên biển số này hoặc nhập biển số mới.`;
        }

        await this.bot.sendMessage(chatId, message, options);
      }
    } else if (callbackQuery.data.startsWith('refresh_')) {
      // Format: refresh_vehicleType_plate
      const [, vehicleType, plate] = callbackQuery.data.split('_');

      await this.bot.sendMessage(chatId, '⏳ Đang cập nhật thông tin mới nhất, vui lòng chờ...');

      try {
        const result = await this.violationService.lookupByPlate(plate, vehicleType);
        await this.sendViolationResults(chatId, result, { step: 'FETCHING', vehicleType, plate });
      } catch (error) {
        console.error('[ERROR] Telegram Service:', error);

        // Handle unexpected errors (not from service result)
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.handleLookupError(chatId, errorMessage, {
          step: 'FETCHING',
          vehicleType,
          plate,
        });
      }
    } else if (callbackQuery.data === 'retry_search') {
      // Handle retry lookup - restart the lookup process
      await this.bot.answerCallbackQuery(callbackQuery.id);

      // Get the current user state to retry with same parameters
      const userState = this.userStates[chatId];
      if (userState && userState.plate && userState.vehicleType) {
        // Retry with same parameters
        userState.step = 'FETCHING';

        await this.bot.sendMessage(chatId, '⏳ Đang thử lại tra cứu, vui lòng chờ...');

        try {
          const result = await this.violationService.lookupByPlate(
            userState.plate,
            userState.vehicleType,
          );
          await this.sendViolationResults(chatId, result, userState);
        } catch (error) {
          console.error('[ERROR] Telegram Service:', error);

          // Handle unexpected errors (not from service result)
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.handleLookupError(chatId, errorMessage, userState);
        }
      } else {
        // No previous state, start new lookup
        this.startSearch(chatId);
      }
    }
  }

  /**
   * Send violation results to user
   */
  private async sendViolationResults(
    chatId: number,
    result: LookupResult,
    userState: UserState,
  ): Promise<void> {
    // Lookup if there's an error in the result
    if (result.status === 'error') {
      await this.handleLookupError(chatId, result.message || 'Unknown error occurred', userState);
      return;
    }

    const violations = result.data?.violations || [];

    if (!violations || violations.length === 0) {
      // No violations found
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🔄 Cập nhật kết quả mới',
                callback_data: `refresh_${userState.vehicleType}_${userState.plate}`,
              },
              { text: '🔎 Tra cứu biển số khác', callback_data: 'new_search' },
            ],
            [{ text: '📋 Menu chính', callback_data: 'show_menu' }],
          ],
        },
      };
      await this.bot.sendMessage(
        chatId,
        '✅ Không tìm thấy vi phạm nào cho phương tiện này.',
        options,
      );
      return;
    }

    // Send each violation
    for (const violation of violations) {
      let message = `🚨 Vi phạm giao thông lúc ${violation.violationTime}\n\n`;
      message += `📍 Địa điểm vi phạm: ${violation.location}\n\n`;
      message += `❌ Loại vi phạm: ${violation.violation}\n\n`;
      message += `💰 Số tiền phạt: ${violation.fine || 'Chưa có thông tin'}\n\n`;
      message += `📌 Trạng thái: ${violation.status || 'Chưa xử lý'}\n\n`;
      message += `🏢 Đơn vị xử lý: ${violation.resolutionDepartment || 'Chưa có thông tin'}\n\n`;

      if (violation.resolutionAddress) {
        message += `📮 Địa chỉ nộp phạt: ${violation.resolutionAddress}\n\n`;
      }

      if (violation.resolutionPhone) {
        message += `📞 Số điện thoại liên hệ: ${violation.resolutionPhone}`;
      }

      await this.bot.sendMessage(chatId, message);
    }

    // Add options after showing all violations
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔄 Cập nhật kết quả mới',
              callback_data: `refresh_${userState.vehicleType}_${userState.plate}`,
            },
            { text: '🔎 Tra cứu biển số khác', callback_data: 'new_search' },
          ],
          [{ text: '📋 Menu chính', callback_data: 'show_menu' }],
        ],
      },
    };
    await this.bot.sendMessage(chatId, 'Các tùy chọn khác:', options);

    // Reset state
    delete this.userStates[chatId];
  }

  /**
   * Handle lookup errors with specific error messages
   * @param chatId - Chat ID to send message to
   * @param errorMessage - Error message from lookup
   * @param userState - Current user state
   */
  private async handleLookupError(
    chatId: number,
    errorMessage: string,
    userState: UserState,
  ): Promise<void> {
    // Lookup if this is a captcha-related error first
    if (this.isCaptchaError(errorMessage)) {
      await this.handleCaptchaError(chatId, errorMessage, userState);
      // Reset state after showing captcha error
      delete this.userStates[chatId];
      return;
    }

    let friendlyMessage = '';

    if (errorMessage.includes('404')) {
      friendlyMessage =
        `🔒 *Lỗi kết nối*\n\n` +
        `Không thể kết nối đến hệ thống tra cứu. Điều này có thể do:\n` +
        `• Hệ thống đang bảo trì\n` +
        `• Phiên làm việc đã hết hạn\n` +
        `• Website có thể đã thay đổi\n\n` +
        `💡 *Gợi ý:* Thử lại sau vài phút`;
    } else if (errorMessage.includes('403')) {
      friendlyMessage =
        `🚫 *Truy cập bị từ chối*\n\n` +
        `Hệ thống đã từ chối yêu cầu tra cứu. Điều này có thể do:\n` +
        `• Quá nhiều yêu cầu trong thời gian ngắn\n` +
        `• Hệ thống đang bảo vệ chống spam\n\n` +
        `💡 *Gợi ý:* Chờ vài phút rồi thử lại`;
    } else if (errorMessage.includes('Timeout')) {
      friendlyMessage =
        `⏰ *Hết thời gian chờ*\n\n` +
        `Hệ thống phản hồi quá chậm. Điều này có thể do:\n` +
        `• Kết nối mạng không ổn định\n` +
        `• Hệ thống đang quá tải\n\n` +
        `💡 *Gợi ý:* Kiểm tra kết nối mạng và thử lại`;
    } else if (errorMessage.includes('Server error')) {
      friendlyMessage =
        `🔧 *Lỗi hệ thống*\n\n` +
        `Hệ thống tra cứu đang gặp sự cố kỹ thuật. Điều này có thể do:\n` +
        `• Lỗi server tạm thời\n` +
        `• Hệ thống đang được cập nhật\n\n` +
        `💡 *Gợi ý:* Thử lại sau 10-15 phút`;
    } else if (errorMessage.includes('Captcha validation failed')) {
      friendlyMessage =
        `🔐 *Lỗi xác thực Captcha*\n\n` +
        `Không thể xác thực mã captcha. Điều này có thể do:\n` +
        `• Mã captcha không chính xác\n` +
        `• Mã captcha đã hết hạn\n` +
        `• Hệ thống captcha gặp sự cố\n\n` +
        `💡 *Gợi ý:* Thử lại để nhận mã captcha mới`;
    } else {
      friendlyMessage =
        `❌ *Lỗi không xác định*\n\n` +
        `Đã xảy ra lỗi trong quá trình tra cứu:\n` +
        `\`${errorMessage}\`\n\n` +
        `💡 *Gợi ý:* Thử lại sau vài phút`;
    }

    // Create retry options
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔄 Thử lại',
              callback_data: `refresh_${userState.vehicleType}_${userState.plate}`,
            },
            { text: '🔎 Tra cứu khác', callback_data: 'new_search' },
          ],
          [{ text: '📋 Menu chính', callback_data: 'show_menu' }],
        ],
      },
      parse_mode: 'Markdown' as const,
    };

    await this.bot.sendMessage(chatId, friendlyMessage, options);

    // Reset state after showing error
    delete this.userStates[chatId];
  }

  /**
   * Lookup if an error is captcha-related
   * @param errorMessage - Error message to lookup
   * @returns {boolean} True if error is captcha-related
   */
  private isCaptchaError(errorMessage: string): boolean {
    const captchaKeywords = [
      'Captcha validation failed',
      'Tesseract OCR failed',
      'Autocaptcha error',
      'Captcha solving failed',
      'AUTOCAPTCHA_KEY not set',
      'Failed to extract captcha text',
      'Low confidence score',
      'OCR failed to extract text',
    ];

    return captchaKeywords.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase()),
    );
  }

  /**
   * Handle captcha-related errors with friendly Vietnamese messages
   * @param chatId - Chat ID to send message to
   * @param errorMessage - Original error message
   * @param userState - Current user state (optional)
   */
  private async handleCaptchaError(
    chatId: number,
    errorMessage: string,
    userState?: UserState,
  ): Promise<void> {
    let friendlyMessage = '';

    if (errorMessage.includes('Captcha validation failed')) {
      if (errorMessage.includes('404')) {
        friendlyMessage =
          `🔒 *Lỗi xác thực Captcha*\n\n` +
          `Hệ thống không thể xác thực mã captcha. Điều này có thể do:\n` +
          `• Mã captcha đã hết hạn\n` +
          `• Phiên làm việc đã hết hạn\n` +
          `• Website có thể đã thay đổi\n\n` +
          `💡 *Gợi ý:* Thử lại sau vài phút hoặc sử dụng nút "🔄 Cập nhật kết quả mới"`;
      } else if (errorMessage.includes('403')) {
        friendlyMessage =
          `🚫 *Truy cập bị từ chối*\n\n` +
          `Hệ thống đã từ chối yêu cầu của bạn. Có thể do:\n` +
          `• Quá nhiều yêu cầu trong thời gian ngắn\n` +
          `• Hệ thống đang bảo trì\n\n` +
          `💡 *Gợi ý:* Chờ vài phút rồi thử lại`;
      } else if (
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503')
      ) {
        friendlyMessage =
          `🔧 *Lỗi máy chủ*\n\n` +
          `Máy chủ đang gặp sự cố tạm thời. Vui lòng thử lại sau.\n\n` +
          `💡 *Gợi ý:* Chờ 5-10 phút rồi thử lại`;
      } else if (errorMessage.includes('Timeout')) {
        friendlyMessage =
          `⏰ *Hết thời gian chờ*\n\n` +
          `Máy chủ phản hồi quá chậm. Vui lòng thử lại.\n\n` +
          `💡 *Gợi ý:* Thử lại ngay bây giờ`;
      } else {
        friendlyMessage =
          `❌ *Lỗi xác thực Captcha*\n\n` +
          `Không thể xác thực mã captcha. Vui lòng thử lại.\n\n` +
          `💡 *Gợi ý:* Sử dụng nút "🔄 Cập nhật kết quả mới"`;
      }
    } else if (
      errorMessage.includes('Tesseract OCR failed') ||
      errorMessage.includes('OCR failed to extract text')
    ) {
      friendlyMessage =
        `🔍 *Lỗi nhận dạng Captcha*\n\n` +
        `Hệ thống không thể đọc được mã captcha từ hình ảnh.\n\n` +
        `💡 *Gợi ý:* Thử lại để lấy mã captcha mới`;
    } else if (errorMessage.includes('Autocaptcha error')) {
      friendlyMessage =
        `🤖 *Lỗi dịch vụ Captcha*\n\n` +
        `Dịch vụ giải captcha tự động gặp sự cố.\n\n` +
        `💡 *Gợi ý:* Thử lại sau vài phút`;
    } else if (errorMessage.includes('AUTOCAPTCHA_KEY not set')) {
      friendlyMessage =
        `🔑 *Cấu hình thiếu*\n\n` +
        `Dịch vụ giải captcha chưa được cấu hình đầy đủ.\n\n` +
        `💡 *Gợi ý:* Liên hệ quản trị viên`;
    } else if (errorMessage.includes('Low confidence score')) {
      friendlyMessage =
        `⚠️ *Độ tin cậy thấp*\n\n` +
        `Mã captcha được nhận dạng với độ tin cậy thấp.\n\n` +
        `💡 *Gợi ý:* Thử lại để lấy mã captcha rõ ràng hơn`;
    } else {
      friendlyMessage =
        `❌ *Lỗi giải Captcha*\n\n` +
        `Không thể giải mã captcha. Vui lòng thử lại.\n\n` +
        `💡 *Gợi ý:* Sử dụng nút "🔄 Cập nhật kết quả mới"`;
    }

    // Add retry options based on user state
    let retryCallbackData = 'retry_search';
    if (userState?.plate && userState?.vehicleType) {
      retryCallbackData = `refresh_${userState.vehicleType}_${userState.plate}`;
    }

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Thử lại ngay', callback_data: retryCallbackData },
            { text: '🔎 Tra cứu khác', callback_data: 'new_search' },
          ],
          [{ text: '📋 Menu chính', callback_data: 'show_menu' }],
        ],
      },
      parse_mode: 'Markdown' as ParseMode,
    };

    await this.bot.sendMessage(chatId, friendlyMessage, options);
  }

  /**
   * Start the bot
   */
  start(): void {
    console.log('🤖 Telegram Bot started successfully!');
    console.log('📋 Available commands: /start, /help, /menu, /lookup');
  }

  /**
   * Stop the bot
   */
  stop(): void {
    console.log('🛑 Stopping Telegram Bot...');
    this.bot.stopPolling();
    console.log('✅ Telegram Bot stopped successfully!');
  }
}
